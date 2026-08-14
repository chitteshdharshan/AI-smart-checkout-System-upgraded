import os

PROMPT_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "prompts",
    "product_prompt.txt"
)

def build_vlm_prompt(ocr_text: str = "", class_name: str = "product") -> str:
    """
    Reads product_prompt.txt template and populates OCR text and class hints.
    """
    if os.path.exists(PROMPT_FILE_PATH):
        with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        # Fallback template if prompt file is missing
        template = """
You are a retail product identification assistant.
OCR Text: {ocr_text}
Class Hint: {class_name}
Return ONLY JSON with keys: brand, product_name, flavor, weight, variant, category, confidence.
        """
    
    clean_ocr = ocr_text.strip() if ocr_text else "None detected"
    clean_class = class_name.strip() if class_name else "Unknown"

    prompt = template.format(
        ocr_text=clean_ocr,
        class_name=clean_class
    )
    return prompt
