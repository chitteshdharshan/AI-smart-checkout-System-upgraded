import json
import re

DEFAULT_VLM_SCHEMA = {
    "brand": "Generic",
    "product_name": "Product",
    "flavor": "Regular",
    "weight": "N/A",
    "variant": "Standard",
    "category": "General Goods",
    "confidence": 0.85
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
        # Match content inside ```json ... ``` or ``` ... ```
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
                        result["confidence"] = 0.85
                else:
                    result[key] = str(val).strip()

    return result
