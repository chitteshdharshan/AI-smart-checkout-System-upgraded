import os
import cv2
import numpy as np
from models.ocr_model import get_ocr_reader
from services.text_cleaner import clean_ocr_text, clean_ocr_lines, normalize_ocr_text

# AI-service root directory (parent of services/)
_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _resolve_crop_path(image_path: str) -> str:
    """
    Resolves a crop path to an absolute filesystem path.
    Handles paths like '/crops/xxx.jpg' that have a leading slash but are
    relative to the ai-service directory, not the filesystem root.
    """
    if not image_path:
        return image_path
    # Already absolute and exists → use as-is
    if os.path.isabs(image_path) and os.path.exists(image_path):
        return image_path
    # Leading-slash paths like '/crops/xxx.jpg' → resolve from ai-service root
    resolved = os.path.join(_SERVICE_DIR, image_path.lstrip("/"))
    if os.path.exists(resolved):
        return resolved
    # Try stripping leading slash and resolving from CWD
    stripped = os.path.join(os.getcwd(), image_path.lstrip("/"))
    return stripped

def extract_text_from_crop(image_path):
    """
    Executes EasyOCR text extraction on a single image crop file across multiple
    preprocessing passes (original, 2x upscale, CLAHE contrast, sharpen+denoise).
    Returns structured JSON with source metadata.
    """
    reader = get_ocr_reader()

    # --- Resolve path: fixes '/crops/xxx.jpg' leading-slash root bug ---
    resolved_path = _resolve_crop_path(image_path)

    print(f"[OCR INPUT] image path: {image_path}")
    print(f"[OCR INPUT] resolved path: {resolved_path}")

    if not resolved_path or not os.path.exists(resolved_path):
        print(f"[OCR INPUT] ERROR: Crop file NOT FOUND at '{resolved_path}' (original: '{image_path}')")
        print(f"[OCR INPUT] This is the root cause of empty OCR. Check crop_service produces absolute paths.")
        return {"text": "", "raw_text": "", "normalized_text": "", "lines": [], "confidence": 0.0, "source": "crop"}

    img = cv2.imread(resolved_path)
    if img is None:
        print(f"[OCR INPUT] ERROR: cv2.imread failed for: {resolved_path}")
        return {"text": "", "raw_text": "", "normalized_text": "", "lines": [], "confidence": 0.0, "source": "crop"}

    h, w = img.shape[:2]
    channels = img.shape[2] if len(img.shape) > 2 else 1
    file_size_kb = os.path.getsize(resolved_path) // 1024
    print(f"[OCR INPUT] image dimensions: {w}x{h}")
    print(f"[OCR INPUT] image mode: {'BGR' if channels == 3 else 'GRAY'} ({channels} channels)")
    print(f"[OCR INPUT] image size: {file_size_kb} KB")

    def parse_result(ocr_res):
        raw_lines = []
        confidences = []
        for bounding_box, text, confidence in ocr_res:
            if text and text.strip():
                raw_lines.append(text)
                confidences.append(float(confidence))
        avg_conf = float(np.mean(confidences)) if confidences else 0.0
        cleaned_text = clean_ocr_text(" ".join(raw_lines))
        cleaned_lines = clean_ocr_lines(raw_lines)
        return cleaned_text, cleaned_lines, round(avg_conf, 4)

    candidates = []

    # 1. Original image pass
    try:
        res1 = reader.readtext(resolved_path)
        t1, l1, c1 = parse_result(res1) if res1 else ("", [], 0.0)
        candidates.append({"pass": "original", "text": t1, "lines": l1, "confidence": c1})
        print(f"[OCR RAW RESPONSE] Original pass: {[r[1] for r in res1] if res1 else []}")
        print(f"[OCR] Original result: '{t1}' (conf: {c1})")
    except Exception as e:
        print(f"[OCR] Original pass notice: {e}")

    # 2. Upscaled 2x pass (helps for small/low-res crops)
    try:
        scaled = cv2.resize(img, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        res2 = reader.readtext(scaled)
        t2, l2, c2 = parse_result(res2) if res2 else ("", [], 0.0)
        candidates.append({"pass": "upscaled", "text": t2, "lines": l2, "confidence": c2})
        print(f"[OCR RAW RESPONSE] Upscaled pass: {[r[1] for r in res2] if res2 else []}")
        print(f"[OCR] Upscaled result: '{t2}' (conf: {c2})")
    except Exception as e:
        print(f"[OCR] Upscaled pass notice: {e}")

    # 3. Grayscale + CLAHE contrast enhancement pass
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        if w < 400 or h < 400:
            gray = cv2.resize(gray, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        res3 = reader.readtext(enhanced)
        t3, l3, c3 = parse_result(res3) if res3 else ("", [], 0.0)
        candidates.append({"pass": "enhanced", "text": t3, "lines": l3, "confidence": c3})
        print(f"[OCR RAW RESPONSE] Enhanced pass: {[r[1] for r in res3] if res3 else []}")
        print(f"[OCR] Enhanced result: '{t3}' (conf: {c3})")
    except Exception as e:
        print(f"[OCR] Enhanced pass notice: {e}")

    # 4. Sharpen + Bilateral Denoise pass (helps for blurry or noisy product packaging)
    try:
        gray4 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Upscale before sharpening for small images
        if w < 400 or h < 400:
            gray4 = cv2.resize(gray4, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        # Bilateral filter to reduce noise while keeping edges sharp
        denoised = cv2.bilateralFilter(gray4, d=9, sigmaColor=75, sigmaSpace=75)
        # Unsharp mask sharpening
        blur = cv2.GaussianBlur(denoised, (0, 0), 3)
        sharpened = cv2.addWeighted(denoised, 1.5, blur, -0.5, 0)
        res4 = reader.readtext(sharpened)
        t4, l4, c4 = parse_result(res4) if res4 else ("", [], 0.0)
        candidates.append({"pass": "sharpened", "text": t4, "lines": l4, "confidence": c4})
        print(f"[OCR RAW RESPONSE] Sharpened pass: {[r[1] for r in res4] if res4 else []}")
        print(f"[OCR] Sharpened result: '{t4}' (conf: {c4})")
    except Exception as e:
        print(f"[OCR] Sharpened pass notice: {e}")

    # Select candidate with longest informative text and best confidence
    valid_candidates = [c for c in candidates if c["text"].strip()]
    if valid_candidates:
        # Sort by combination of text length and confidence
        best = max(valid_candidates, key=lambda x: (len(x["text"]), x["confidence"]))
    else:
        best = {"pass": "none", "text": "", "lines": [], "confidence": 0.0}

    normalized = normalize_ocr_text(best["text"])
    print(f"[OCR NORMALIZED] '{normalized}'")

    return {
        "text": best["text"],
        "raw_text": best["text"],
        "normalized_text": normalized,
        "lines": best["lines"],
        "confidence": best["confidence"],
        "source": "crop"
    }
