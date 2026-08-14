import os
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import numpy as np
from utils.file_utils import ensure_directories, UPLOADS_DIR, generate_filename
from services.ocr_service import extract_text_from_crop
from services.vlm_service import analyze_product_crop
from services.match_service import match_product_from_vlm
from services.product_embedding import build_product_text, generate_embedding, build_catalog_text
from services.vector_search import get_vector_engine
from services.detection_service import detect_products_in_image

# 1. Initialize FastAPI & directories
app = FastAPI(
    title="AI Smart Checkout - Detection Service",
    description="YOLOv8 + OCR + VLM + FAISS Vector Matching Pipeline",
    version="1.0.0"
)

# Allow CORS for backend and frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_directories()

# 2. Mount static folders for images retrieval
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/crops", StaticFiles(directory="crops"), name="crops")

@app.get("/")
def read_root():
    return {"status": "online", "service": "YOLOv8 + EasyOCR + VLM + FAISS Vector Search"}

@app.get("/health")
def health_check():
    """
    Health-check endpoint for Node.js Express backend service verification.
    """
    return {
        "status": "ok",
        "service": "ai-service",
        "ocr": True,
        "vlm": True,
        "faiss": True
    }

@app.post("/detect")
async def detect_products(image: UploadFile = File(...)):
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    input_filename = generate_filename(prefix="detect_input", ext=".jpg")
    input_filepath = os.path.join(UPLOADS_DIR, input_filename)

    try:
        with open(input_filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        results = detect_products_in_image(input_filepath)

        return {
            "success": True,
            "message": f"Successfully processed {len(results['detections'])} products",
            "original_image": results["original_image_path"],
            "annotated_image": results["annotated_image_path"],
            "detections": results["detections"],
            "speed": results.get("speed"),
            "debug": results.get("debug")
        }
    except Exception as e:
        if os.path.exists(input_filepath):
            os.remove(input_filepath)
        print(f"[AI Service Error] /detect endpoint exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/ocr")
async def ocr_crop(image: UploadFile = File(...)):
    """
    Direct endpoint to extract OCR text from a single image crop.
    """
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    input_filename = generate_filename(prefix="ocr_input", ext=".jpg")
    input_filepath = os.path.join(UPLOADS_DIR, input_filename)

    try:
        with open(input_filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        print(f"[OCR Endpoint] Running EasyOCR on: {input_filepath}")
        ocr_res = extract_text_from_crop(input_filepath)
        print(f"[OCR Endpoint] Completed OCR text: '{ocr_res.get('text')}' (confidence: {ocr_res.get('confidence')})")
        return {"success": True, "ocr": ocr_res}
    except Exception as e:
        print(f"[OCR Endpoint Error]: {str(e)}")
        if os.path.exists(input_filepath):
            os.remove(input_filepath)
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")

@app.post("/vlm")
async def vlm_crop(image: UploadFile = File(...)):
    """
    Direct endpoint to run Vision Language Model (VLM) structured extraction on a single image crop.
    """
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    input_filename = generate_filename(prefix="vlm_input", ext=".jpg")
    input_filepath = os.path.join(UPLOADS_DIR, input_filename)

    try:
        with open(input_filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        print(f"[VLM Endpoint] Processing image: {input_filepath}")
        ocr_res = extract_text_from_crop(input_filepath)
        vlm_res = analyze_product_crop(input_filepath, ocr_data=ocr_res)
        print(f"[VLM Endpoint] VLM Result → Brand: {vlm_res.get('brand')}, Product: {vlm_res.get('product_name')}")
        return {"success": True, "ocr": ocr_res, "vlm": vlm_res}
    except Exception as e:
        print(f"[VLM Endpoint Error]: {str(e)}")
        if os.path.exists(input_filepath):
            os.remove(input_filepath)
        raise HTTPException(status_code=500, detail=f"VLM error: {str(e)}")

@app.post("/debug/vlm")
async def debug_vlm(image: UploadFile = File(...)):
    """
    Debug endpoint to test VLM directly on an uploaded crop image file.
    Returns raw OCR and VLM responses.
    """
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image")

    input_filename = generate_filename(prefix="debug_vlm", ext=".jpg")
    input_filepath = os.path.join(UPLOADS_DIR, input_filename)

    try:
        with open(input_filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        print(f"==================================================")
        print(f"[DEBUG VLM] Testing direct VLM inference on: {input_filepath}")
        ocr_res = extract_text_from_crop(input_filepath)
        vlm_res = analyze_product_crop(input_filepath, ocr_data=ocr_res)
        print(f"[DEBUG VLM] Result: {vlm_res}")
        print(f"==================================================")

        return {
            "success": True,
            "filename": input_filename,
            "ocr": ocr_res,
            "vlm": vlm_res
        }
    except Exception as e:
        print(f"[DEBUG VLM Error]: {str(e)}")
        if os.path.exists(input_filepath):
            os.remove(input_filepath)
        raise HTTPException(status_code=500, detail=f"Debug VLM error: {str(e)}")


@app.post("/embed")
async def embed_text(payload: dict):
    text = payload.get("text", "")
    if not text or not isinstance(text, str):
        raise HTTPException(status_code=400, detail="Text must be provided for embedding")

    try:
        embedding = generate_embedding(text)
        return {"success": True, "embedding": embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)}
    except Exception as e:
        print(f"[Embed Endpoint Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding error: {str(e)}")

@app.post("/match")
async def match_product(payload: dict):
    try:
        vlm_data = payload.get("vlm", payload)
        ocr_text = payload.get("ocr_text", "")
        emb_data = payload.get("embedding") or (vlm_data.get("embedding") if isinstance(vlm_data, dict) else None)
        match_res = match_product_from_vlm(vlm_data, ocr_text=ocr_text, embedding=emb_data)
        return {"success": True, "match": match_res}
    except Exception as e:
        print(f"[Match Endpoint Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vector matching error: {str(e)}")

@app.post("/test_product_embedding")
async def test_product_embedding_endpoint(payload: dict):
    product_data = payload.get("product", payload)
    try:
        res = test_product_embedding(product_data)
        return res
    except Exception as e:
        print(f"[Test Embedding Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test embedding error: {str(e)}")

@app.post("/index_products")
async def index_products(payload: dict):
    products = payload.get("products", [])
    if not products:
        raise HTTPException(status_code=400, detail="No products array provided")

    try:
        engine = get_vector_engine()
        embeddings = []
        for p in products:
            text = build_catalog_text(p)
            if not text.strip():
                text = f"{p.get('name', '')} {p.get('brand', '')}".strip() or "product"
            emb = generate_embedding(text)
            embeddings.append(emb)

        engine.build_index(products, np.array(embeddings, dtype=np.float32))
        print(f"[FAISS Index] Successfully indexed {len(products)} products")
        return {
            "success": True,
            "message": f"Successfully indexed {len(products)} products in FAISS vector store"
        }
    except Exception as e:
        print(f"[FAISS Index Error]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vector indexing error: {str(e)}")
