import os
import uuid
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
CROPS_DIR = os.path.join(BASE_DIR, "crops")
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")

def ensure_directories():
    for d in [UPLOADS_DIR, OUTPUTS_DIR, CROPS_DIR, WEIGHTS_DIR]:
        os.makedirs(d, exist_ok=True)

def generate_filename(prefix="file", ext=".jpg"):
    timestamp = int(time.time() * 1000)
    rand_str = uuid.uuid4().hex[:8]
    return f"{prefix}_{timestamp}_{rand_str}{ext}"
