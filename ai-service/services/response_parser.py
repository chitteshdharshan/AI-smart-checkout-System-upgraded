import json
import re

DEFAULT_VLM_SCHEMA = {
    "brand": "UNKNOWN",
    "product_name": "UNKNOWN",
    "normalized_name": "UNKNOWN",
    "flavor": "N/A",
    "weight": "N/A",
    "variant": "N/A",
    "category": "General Goods",
    "confidence": 0.0,
    "evidence": "Insufficient visual/text evidence",
    "product_found": False
}

def parse_vlm_json(response_text: str) -> dict:
    """
    Extracts JSON from VLM text response, handles markdown code fences,
    validates schema fields, and provides defaults for missing keys.
    """
    if not response_text or not isinstance(response_text, str):
        return DEFAULT_VLM_SCHEMA.copy()

    text = response_text.strip()

    # 1. Remove markdown code fences if present (e.g. ```json ... ```)
    if "```" in text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
        if match:
            text = match.group(1)
        else:
            text = re.sub(r"```[a-zA-Z]*", "", text).replace("```", "").strip()

    # 2. Extract first valid JSON object using regex if text contains extra commentary
    if not (text.startswith("{") and text.endswith("}")):
        json_match = re.search(r"(\{.*\})", text, re.DOTALL)
        if json_match:
            text = json_match.group(1)

    # 3. Parse JSON
    try:
        parsed_data = json.loads(text)
    except Exception as e:
        print(f"[VLM Response Parser] JSON parse error: {e}. Raw text: {response_text[:100]}")
        parsed_data = {}

    # 4. Enforce schema & sanitize fields
    result = DEFAULT_VLM_SCHEMA.copy()
    if isinstance(parsed_data, dict):
        for key in DEFAULT_VLM_SCHEMA.keys():
            if key in parsed_data and parsed_data[key] is not None:
                val = parsed_data[key]
                if key == "confidence":
                    try:
                        conf = float(val)
                        result["confidence"] = round(max(0.0, min(1.0, conf)), 2)
                    except (ValueError, TypeError):
                        result["confidence"] = 0.0
                elif key == "product_found":
                    result["product_found"] = bool(val)
                else:
                    result[key] = str(val).strip()

        # Compute normalized_name if empty or missing
        p_name = result.get("product_name", "")
        if p_name and p_name != "UNKNOWN" and result.get("normalized_name") in ["", "UNKNOWN", None]:
            clean_norm = re.sub(r"[^a-z0-9\s]", " ", p_name.lower())
            result["normalized_name"] = re.sub(r"\s+", " ", clean_norm).strip()

        # Set product_found based on brand / product_name
        if result["product_name"] not in ["UNKNOWN", "", "None", "Non-Product Object"] or result["brand"] not in ["UNKNOWN", "", "None", "Generic"]:
            result["product_found"] = True

    return result
