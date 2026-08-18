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

def normalize_ocr_text(raw_text):
    """
    Deep normalization of OCR text for robust fuzzy & multi-signal matching.
    Converts to lowercase, cleans punctuation, resolves common OCR visual typos,
    and strips noise without hardcoding specific products.
    """
    if not raw_text:
        return ""

    text = str(raw_text).lower()

    # 1. Replace common symbol confusions
    text = text.replace("@", "a").replace("$", "s").replace("&", " and ")

    # 2. Fix common OCR character substitutions inside words (e.g., 0 inside letters -> o)
    text = re.sub(r"(?<=[a-z])0(?=[a-z])", "o", text)

    # 3. Replace unwanted symbols, punctuation, and brackets with spaces
    text = re.sub(r"[®™!¡?|\[\]{}_;:<>/\\=+~`^*#%]", " ", text)
    text = re.sub(r"[^a-z0-9\s\-.]", " ", text)

    # 4. Standardize unit representations (e.g. "500 ml" -> "500ml", "70 g" -> "70g", "1.5 kg" -> "1.5kg")
    text = re.sub(r"(\d+(?:\.\d+)?)\s*(g|gs|grams)\b", r"\1g", text)
    text = re.sub(r"(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms)\b", r"\1kg", text)
    text = re.sub(r"(\d+(?:\.\d+)?)\s*(ml|mls|milliliters)\b", r"\1ml", text)
    text = re.sub(r"(\d+(?:\.\d+)?)\s*(l|liters)\b", r"\1l", text)
    text = re.sub(r"(\d+(?:\.\d+)?)\s*(oz|lb|lbs)\b", r"\1\2", text)

    # 5. Normalize hyphens and dashes to spaces
    text = re.sub(r"[\-_]+", " ", text)

    # 6. Remove single-character isolated noise tokens (except standalone digits or 'a')
    tokens = text.split()
    clean_tokens = [t for t in tokens if len(t) > 1 or t.isdigit() or t == "a"]

    normalized = " ".join(clean_tokens).strip()
    return normalized
