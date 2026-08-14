import re

def clean_ocr_text(raw_text):
    """
    Cleans raw OCR strings by removing symbols, normalising spacing,
    capitalising correctly, and standardising unit expressions (70 G -> 70g).
    """
    if not raw_text:
        return ""

    # 1. Remove unwanted symbols like ®, ™, !, ?, etc.
    cleaned = re.sub(r"[®™!¡?|\[\]]", "", raw_text)

    # 2. Normalize unit expressions (e.g. "70 G" -> "70g", "1.5 KG" -> "1.5kg")
    cleaned = re.sub(r"(\d+(?:\.\d+)?)\s*(?i:G|gs|grams)\b", r"\1g", cleaned)
    cleaned = re.sub(r"(\d+(?:\.\d+)?)\s*(?i:KG|kgs|kilograms)\b", r"\1kg", cleaned)
    cleaned = re.sub(r"(\d+(?:\.\d+)?)\s*(?i:ML|mls|milliliters)\b", r"\1ml", cleaned)
    cleaned = re.sub(r"(\d+(?:\.\d+)?)\s*(?i:L|liters)\b", r"\1l", cleaned)

    # 3. Capitalize words properly (e.g. "MAGGI" -> "Maggi", "2-MINUTE" -> "2-Minute")
    words = cleaned.split()
    capitalized_words = []
    for word in words:
        if re.search(r"[a-zA-Z]", word):
            capitalized_words.append(word.title())
        else:
            capitalized_words.append(word)
    cleaned = " ".join(capitalized_words)

    # 4. Remove extra whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned

def clean_ocr_lines(raw_lines):
    """
    Cleans a list of individual OCR lines, removing empty lines.
    """
    cleaned_lines = []
    for line in raw_lines:
        c_line = clean_ocr_text(line)
        if c_line:
            cleaned_lines.append(c_line)
    return cleaned_lines
