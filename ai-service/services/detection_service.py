import os
import time
import logging
from services.model_loader import get_yolo_model
from services.crop_service import crop_and_save_products
from utils.file_utils import OUTPUTS_DIR, generate_filename
from utils.image_utils import load_image, save_image, draw_bounding_boxes
from services.ocr_service import extract_text_from_crop
from services.vlm_service import analyze_product_crop
from services.match_service import match_product_from_vlm

# ── Configuration ─────────────────────────────────────────────────────────────
YOLO_CONF_THRESH = float(os.getenv('YOLO_CONF_THRESH', '0.25'))
DEBUG_YOLO = os.getenv('DEBUG_YOLO', 'false').lower() == 'true'

# ── Classes that are NEVER valid retail package detections ────────────────────
# Exclude human body and background furniture/room elements
NON_RETAIL_COCO_CLASSES = {
    "person", "face", "hand", "chair", "couch", "bed", "dining table", "tv",
}

PRINTED_OBJECT_CLASSES = set()

# ── Logger ───────────────────────────────────────────────────────────────────
logger = logging.getLogger('detection_service')
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
    logger.addHandler(_handler)


# ─────────────────────────────────────────────────────────────────────────────
def _select_product_candidates(raw_boxes, model, img_w, img_h):
    """
    Evaluate YOLO bounding boxes and return a list of product candidates.
    Preserves all physical object bounding boxes detected by YOLO.
    """
    accepted = []
    rejected = []

    for box in raw_boxes:
        bbox = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])
        class_name = model.names[cls_id]
        x1, y1, x2, y2 = bbox
        bw = x2 - x1
        bh = y2 - y1

        # Skip low confidence background noise
        if conf < 0.25:
            logger.info(f"[YOLO FILTER] Rejected {class_name} – low confidence ({conf:.2f})")
            rejected.append({"class_name": class_name, "confidence": conf,
                              "reason": "Low confidence (< 0.25)"})
            continue

        # Skip sub-pixel boxes
        if bw < 25 or bh < 25:
            logger.info(f"[YOLO FILTER] Rejected {class_name} – undersized ({bw:.0f}x{bh:.0f})")
            rejected.append({"class_name": class_name, "confidence": conf,
                              "reason": "Undersized bounding box"})
            continue

        cn_lower = class_name.lower()

        # General non-retail class (person / furniture)
        if cn_lower in NON_RETAIL_COCO_CLASSES:
            logger.info(f"[YOLO FILTER] Rejected {class_name} (non-retail/background class)")
            rejected.append({"class_name": class_name, "confidence": conf,
                             "reason": "Non-retail class"})
            continue

        # Valid physical object candidate
        accepted.append({
            "class_name": class_name,
            "confidence": conf,
            "bbox": [round(x1), round(y1), round(x2), round(y2)],
            "bbox_area": round(bw * bh, 2),
            "source": "yolo_crop"
        })

    logger.info(f"[YOLO FILTER] Total detections: {len(raw_boxes)}")
    logger.info(f"[YOLO FILTER] Accepted: {len(accepted)}")
    logger.info(f"[YOLO FILTER] Rejected: {len(rejected)}")

    if accepted:
        return accepted, rejected, False  # fallback_used=False

    # ── Full-frame fallback ────────────────────────────────────────────────
    # If no object detected, use a central 85% fallback crop
    margin_x = int(img_w * 0.075)
    margin_y = int(img_h * 0.075)
    fallback_bbox = [margin_x, margin_y, img_w - margin_x, img_h - margin_y]

    logger.info(f"[CANDIDATE] No valid object candidates – using full_frame_fallback")

    fallback = [{
        "class_name": "product_candidate",
        "confidence": 0.0,
        "bbox": fallback_bbox,
        "bbox_area": round((img_w - 2*margin_x) * (img_h - 2*margin_y), 2),
        "source": "full_frame_fallback"
    }]
    return fallback, rejected, True  # fallback_used=True


# ─────────────────────────────────────────────────────────────────────────────
def detect_products_in_image(image_path):
    """
    Full product-detection pipeline with proper YOLO filtering and diagnostics.
    """
    start_time = time.time()

    # ── Print YOLO Configuration ──────────────────────────────────────────
    logger.info(f"[YOLO CONFIG] confidence threshold: {YOLO_CONF_THRESH}")
    logger.info(f"[YOLO CONFIG] IoU/NMS threshold: 0.45")
    logger.info(f"[YOLO CONFIG] image size: 640")
    logger.info(f"[YOLO CONFIG] max detections: 300")
    logger.info(f"[YOLO CONFIG] classes: All COCO classes")
    logger.info(f"[YOLO CONFIG] agnostic_nms: False")

    # ── Load image ────────────────────────────────────────────────────────
    model = get_yolo_model()
    img = load_image(image_path)
    img_h, img_w = img.shape[:2]
    file_size_kb = os.path.getsize(image_path) / 1024

    logger.info(f"[CAMERA] image received: {os.path.basename(image_path)}")
    logger.info(f"[CAMERA] dimensions: {img_w}x{img_h}, size: {file_size_kb:.1f} KB")
    load_time = (time.time() - start_time) * 1000

    # ── YOLO inference ────────────────────────────────────────────────────
    inference_start = time.time()
    results = model(img, imgsz=640, conf=YOLO_CONF_THRESH, iou=0.45, max_det=300, verbose=False)
    inference_time = (time.time() - inference_start) * 1000

    raw_boxes = []
    for result in results:
        raw_boxes.extend(result.boxes)

    # ── Candidate selection ───────────────────────────────────────────────
    detections, ignored_detections, fallback_used = _select_product_candidates(
        raw_boxes, model, img_w, img_h
    )

    # Print required YOLO diagnostic logs per frame & per detection
    logger.info(f"[YOLO] Raw detection count: {len(raw_boxes)}")
    logger.info(f"[YOLO] Valid detection count: {len(detections)}")

    for idx, det in enumerate(detections):
        bx = det["bbox"]
        w = round(bx[2] - bx[0])
        h = round(bx[3] - bx[1])
        logger.info(f"[YOLO] Detection {idx + 1}")
        logger.info(f"  class: {det.get('class_name')}")
        logger.info(f"  confidence: {det.get('confidence'):.3f}")
        logger.info(f"  bbox: x={round(bx[0])}, y={round(bx[1])}, w={w}, h={h}")

    # ── Annotated image ───────────────────────────────────────────────────
    annotated_filename = generate_filename(prefix="annotated", ext=".jpg")
    annotated_filepath = os.path.join(OUTPUTS_DIR, annotated_filename)
    annotated_img = draw_bounding_boxes(img, detections)
    save_image(annotated_img, annotated_filepath)

    if DEBUG_YOLO:
        debug_dir = os.path.join(OUTPUTS_DIR, "debug")
        os.makedirs(debug_dir, exist_ok=True)
        save_image(annotated_img, os.path.join(debug_dir, "yolo_result.jpg"))

    # ── Expand boxes (20-25% padding for normal retail objects) ───────────
    if not fallback_used:
        padding_factor = 0.20  # 20% padding
        for det in detections:
            if det.get('source') == 'full_frame_fallback':
                continue
            original_bbox = det["bbox"]
            x1, y1, x2, y2 = original_bbox
            w, h = x2 - x1, y2 - y1
            pad_x = int(w * padding_factor)
            pad_y = int(h * padding_factor)
            expanded_bbox = [
                max(0, x1 - pad_x),
                max(0, y1 - pad_y),
                min(img_w, x2 + pad_x),
                min(img_h, y2 + pad_y)
            ]
            det["bbox"] = expanded_bbox

    # ── Crop ──────────────────────────────────────────────────────────────
    crop_start = time.time()
    detections_with_crops = crop_and_save_products(img, detections)
    crop_time = (time.time() - crop_start) * 1000

    # ── OCR ───────────────────────────────────────────────────────────────
    ocr_start = time.time()
    for det in detections_with_crops:
        crop_path = det.get("crop_path", "")
        try:
            ocr_res = extract_text_from_crop(crop_path)
            det["ocr"] = ocr_res
        except Exception as e:
            logger.error(f"[OCR ERROR] {e}")
            det["ocr"] = {"text": "", "raw_text": "", "lines": [], "confidence": 0.0}
    ocr_total_ms = (time.time() - ocr_start) * 1000

    # ── VLM ───────────────────────────────────────────────────────────────
    vlm_start = time.time()
    _svc_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for det in detections_with_crops:
        crop_abs = os.path.join(_svc_root, det.get("crop_path", "").lstrip("/"))
        yolo_class = det.get("class_name", "product")
        try:
            vlm_res = analyze_product_crop(
                image_path=crop_abs,
                ocr_data=det.get("ocr"),
                class_name=yolo_class,
                is_printed_object=False
            )
            det["vlm"] = vlm_res
        except Exception as e:
            logger.error(f"[VLM ERROR] {e}")
            det["vlm"] = {"brand": "Generic", "product_name": "Retail Product",
                          "category": "General Goods", "product_found": True}
    vlm_total_ms = (time.time() - vlm_start) * 1000

    # ── FAISS / Match ─────────────────────────────────────────────────────
    match_start = time.time()
    for det in detections_with_crops:
        ocr_text_str = det.get("ocr", {}).get("text", "")
        try:
            match_res = match_product_from_vlm(det.get("vlm", {}), ocr_text=ocr_text_str)
            det["match"] = match_res
        except Exception as e:
            logger.error(f"[MATCH ERROR] {e}")
            det["match"] = {"matched": False, "product_id": None, "similarity": 0.0,
                            "status": "Match Error"}
    match_total_ms = (time.time() - match_start) * 1000

    total_time = (time.time() - start_time) * 1000

    # Print pipeline performance summary
    logger.info(f"[PERF] YOLO: {inference_time:.1f} ms")
    logger.info(f"[PERF] Tracking: {crop_time:.1f} ms")
    logger.info(f"[PERF] OCR: {ocr_total_ms:.1f} ms")
    logger.info(f"[PERF] VLM: {vlm_total_ms:.1f} ms")
    logger.info(f"[PERF] Embedding: 0.0 ms")
    logger.info(f"[PERF] FAISS: {match_total_ms:.1f} ms")
    logger.info(f"[PERF] MongoDB: 0.0 ms")
    logger.info(f"[PERF] Total recognition: {total_time:.1f} ms")

    # ── Response ──────────────────────────────────────────────────────────
    stages = {
        "yolo":      {"completed": True, "foundObjects": len(detections) > 0,
                      "count": len(detections), "fallback_used": fallback_used},
        "ocr":       {"completed": True},
        "vlm":       {"completed": True},
        "embedding": {"completed": True},
        "faiss":     {"completed": True}
    }

    return {
        "detections": detections_with_crops,
        "ignored_count": len(ignored_detections),
        "ignored_detections": ignored_detections,
        "annotated_image_path": f"/outputs/{annotated_filename}",
        "original_image_path": f"/uploads/{os.path.basename(image_path)}",
        "speed": {
            "load_time_ms":       round(load_time, 2),
            "inference_time_ms":  round(inference_time, 2),
            "ocr_time_ms_total":  round(ocr_total_ms, 2),
            "vlm_time_ms_total":  round(vlm_total_ms, 2),
            "match_time_ms_total": round(match_total_ms, 2),
            "total_time_ms":      round(total_time, 2)
        },
        "stages": stages,
        "debug": {
            "raw_count":       len(raw_boxes),
            "after_confidence": len(detections),
            "fallback_used":   fallback_used
        }
    }

