import easyocr
import torch

_reader_instance = None

def get_ocr_reader():
    """
    Retrieves a cached instance of the EasyOCR English Reader.
    Loads it into memory once and reuses it for subsequent requests.
    Supports CUDA / MPS / CPU fallback gracefully.
    """
    global _reader_instance
    if _reader_instance is None:
        print("🤖 Initializing EasyOCR Reader (English)...")
        use_gpu = torch.cuda.is_available()
        try:
            _reader_instance = easyocr.Reader(['en'], gpu=use_gpu)
        except Exception as e:
            print(f"⚠️ EasyOCR GPU initialization failed: {e}. Falling back to CPU mode.")
            _reader_instance = easyocr.Reader(['en'], gpu=False)
        print("✅ EasyOCR Reader Initialized Successfully!")
    return _reader_instance
