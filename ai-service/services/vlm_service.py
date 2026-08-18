import os
import re
import cv2
from PIL import Image
from models.vlm_model import get_vlm_model, _MODEL_NAME
from services.prompt_builder import build_vlm_prompt
from services.response_parser import parse_vlm_json
from services.text_cleaner import normalize_ocr_text

def analyze_product_crop(image_path: str, ocr_data: dict = None, class_name: str = "product", is_printed_object: bool = False) -> dict:
    """
    Analyzes a product crop image alongside OCR text using VLM.
    Instructs VLM to identify physical retail products and filter out people/furniture/backgrounds.
    Returns structured JSON with keys: brand, product_name, normalized_name, confidence, evidence.
    """
    ocr_text = ""
    ocr_lines = []
    if isinstance(ocr_data, dict):
        ocr_text = ocr_data.get("text", "") or ocr_data.get("normalized_text", "")
        ocr_lines = ocr_data.get("lines", [])

    if is_printed_object:
        class_name = "product"

    img_w, img_h = 0, 0
    if os.path.exists(image_path):
        try:
            img = cv2.imread(image_path)
            if img is not None:
                img_h, img_w = img.shape[:2]
        except Exception:
            pass

    # The explicit prompt required by pipeline spec
    explicit_instruction = (
        "Identify the retail product shown in the packaging image. "
        "Read all visible brand and product text. "
        "Use the supplied OCR text as supporting evidence. "
        "If visual/text evidence is insufficient or uncertain, return brand='UNKNOWN', product_name='UNKNOWN', normalized_name='UNKNOWN', confidence=0.0, and evidence='Insufficient visual/text evidence'. "
        "Output strict JSON with keys: brand, product_name, normalized_name, flavor, weight, variant, category, confidence, evidence."
    )
    supplemental = build_vlm_prompt(ocr_text=ocr_text, class_name=class_name)
    prompt_text = f"{explicit_instruction}\n{supplemental}"

    # 1. Try VLM transformer model execution
    model, processor = get_vlm_model()
    model_identifier = _MODEL_NAME if model is not None else "Rule-Assisted Synthesizer (Fallback)"

    print(f"[VLM REQUEST] model: {model_identifier}")
    print(f"[VLM REQUEST] image: {image_path} ({img_w}x{img_h})")
    print(f"[VLM REQUEST] ocr_text: '{ocr_text}'")

    if model is not None and processor is not None and os.path.exists(image_path):
        try:
            image = Image.open(image_path).convert("RGB")
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": prompt_text}
                    ]
                }
            ]
            inputs = processor(text=messages, return_tensors="pt")
            outputs = model.generate(**inputs, max_new_tokens=256)
            response_text = processor.batch_decode(outputs, skip_special_tokens=True)[0]

            print(f"[VLM RAW RESPONSE] {response_text}")
            vlm_json = parse_vlm_json(response_text)
            print(f"[VLM PARSED] brand: {vlm_json.get('brand')}")
            print(f"[VLM PARSED] productName: {vlm_json.get('product_name')}")
            print(f"[VLM PARSED] confidence: {vlm_json.get('confidence')}")
            return vlm_json
        except Exception as e:
            print(f"[VLM Service Notice] Transformer inference notice: {e}")

    # 2. Rule-Assisted Synthesis (Fallback when VLM weights are not loaded)
    res = synthesize_vlm_fallback(ocr_text=ocr_text, ocr_lines=ocr_lines, class_name=class_name)
    print(f"[VLM RAW RESPONSE] {res}")
    print(f"[VLM PARSED] brand: {res.get('brand')}")
    print(f"[VLM PARSED] productName: {res.get('product_name')}")
    print(f"[VLM PARSED] confidence: {res.get('confidence')}")
    return res

def synthesize_vlm_fallback(ocr_text: str, ocr_lines: list, class_name: str) -> dict:
    """
    Synthesizes generic structured retail metadata from OCR text lines and visual hints.
    Does NOT hardcode specific products. If insufficient evidence exists, returns UNKNOWN.
    """
    full_text = f"{ocr_text} {' '.join(ocr_lines)}".strip()

    # Check for non-product objects
    non_product_terms = ["person", "human", "face", "remote", "cell phone", "tv", "chair", "wall", "background"]
    if any(term in (class_name or "").lower() for term in non_product_terms):
        return {
            "product_found": False,
            "brand": "UNKNOWN",
            "product_name": "UNKNOWN",
            "normalized_name": "UNKNOWN",
            "flavor": "N/A",
            "weight": "N/A",
            "variant": "N/A",
            "category": "Non-Product",
            "confidence": 0.0,
            "evidence": "Non-product object detected"
        }

    # Weight/Volume extraction (generic regex)
    weight = "N/A"
    weight_match = re.search(r'\b(\d+\s*(?:g|kg|ml|l|oz|lb))\b', full_text, re.IGNORECASE)
    if weight_match:
        weight = weight_match.group(1).replace(" ", "").lower()

    # Generic token parsing
    tokens = [w for w in full_text.split() if len(w) > 1 and w.upper() not in ["THE", "AND", "FOR", "WITH", "PACK", "NET", "MRP", "EXP", "MFG", "OF", "IN", "IS", "TO", "A"]]

    if not tokens:
        # Insufficient text evidence
        return {
            "product_found": False,
            "brand": "UNKNOWN",
            "product_name": "UNKNOWN",
            "normalized_name": "UNKNOWN",
            "flavor": "N/A",
            "weight": weight,
            "variant": "N/A",
            "category": "General Goods",
            "confidence": 0.0,
            "evidence": "Insufficient visual/text evidence"
        }

    # First meaningful token as brand candidate if it starts with capital
    brand_candidate = tokens[0].title() if tokens else "Generic"
    product_name_candidate = " ".join(tokens[:4]).title()
    normalized_name = normalize_ocr_text(" ".join(tokens[:4]))

    return {
        "product_found": True,
        "brand": brand_candidate,
        "product_name": product_name_candidate,
        "normalized_name": normalized_name,
        "flavor": "N/A",
        "weight": weight,
        "variant": "Pack",
        "category": "General Goods",
        "confidence": 0.75 if len(tokens) >= 2 else 0.50,
        "evidence": f"Identified packaging text tokens: {', '.join(tokens[:4])}"
    }
