import numpy as np

_EMBEDDING_MODEL = None
_MODEL_NAME = "all-MiniLM-L6-v2"

def get_embedding_model():
    """
    Singleton pattern for SentenceTransformer embedding model.
    """
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is not None:
        return _EMBEDDING_MODEL

    try:
        from sentence_transformers import SentenceTransformer
        print(f"[Embedding Model Loader] Loading {_MODEL_NAME}...")
        _EMBEDDING_MODEL = SentenceTransformer(_MODEL_NAME)
        print("[Embedding Model Loader] Model loaded successfully!")
    except Exception as e:
        print(f"[Embedding Model Loader] Model loading notice: {e}")
        _EMBEDDING_MODEL = None

    return _EMBEDDING_MODEL
