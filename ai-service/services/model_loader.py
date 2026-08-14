import os
from ultralytics import YOLO
from utils.file_utils import WEIGHTS_DIR

_model_instance = None

def get_yolo_model(model_name="yolov8n.pt"):
    global _model_instance
    if _model_instance is None:
        # Build absolute path to the weight file
        model_path = os.path.abspath(os.path.join(WEIGHTS_DIR, model_name))
        print(f"[YOLO] Model path: {model_path}")
        # Verify the file exists
        exists = os.path.isfile(model_path)
        print(f"[YOLO] Model exists: {exists}")
        if not exists:
            raise FileNotFoundError(
                f"YOLO weight file not found at {model_path}. Please ensure the file exists in 'ai-service/weights/'."
            )
        print("[YOLO] Loading model...")
        try:
            _model_instance = YOLO(model_path)
            print("[YOLO] Model loaded successfully")
        except Exception as e:
            print(f"[YOLO] Error loading model: {e}")
            raise
    return _model_instance
