import os
import torch

_VLM_MODEL = None
_VLM_PROCESSOR = None
_MODEL_NAME = "Qwen/Qwen2.5-VL-3B-Instruct"

def get_vlm_model():
    """
    Singleton pattern to load and cache the Vision Language Model & Processor in memory.
    Supports Apple Silicon MPS acceleration if available.
    """
    global _VLM_MODEL, _VLM_PROCESSOR

    if _VLM_MODEL is not None and _VLM_PROCESSOR is not None:
        return _VLM_MODEL, _VLM_PROCESSOR

    try:
        from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"[VLM Model Loader] Loading {_MODEL_NAME} on device: {device}...")

        _VLM_PROCESSOR = AutoProcessor.from_pretrained(_MODEL_NAME)
        _VLM_MODEL = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            _MODEL_NAME,
            torch_dtype=torch.float16 if device == "mps" else torch.float32,
            device_map=device
        )
        print("[VLM Model Loader] VLM loaded successfully!")
    except Exception as e:
        print(f"[VLM Model Loader] Model initialization notice: {e}")
        _VLM_MODEL = None
        _VLM_PROCESSOR = None

    return _VLM_MODEL, _VLM_PROCESSOR
