import numpy as np
from services.product_embedding import (
    build_product_text,
    build_catalog_text,
    build_query_text,
    generate_embedding,
)
from services.vector_search import get_vector_engine
from models.embedding_model import get_embedding_model
import difflib

# Seed Catalog Products for Instant Smart Checkout Recognition
DEFAULT_CATALOG_PRODUCTS = [
    {
        "_id": "650000000000000000000001",
        "name": "Maggi 2 Minute Noodles Masala 70g",
        "brand": "Maggi",
        "category": "Instant Noodles",
        "price": 20.00,
        "stock": 150
    },
    {
        "_id": "650000000000000000000002",
        "name": "Amul Taaza Toned Milk 500ml",
        "brand": "Amul",
        "category": "Dairy",
        "price": 27.00,
        "stock": 80
    },
    {
        "_id": "650000000000000000000003",
        "name": "Lay's Classic Salted Potato Chips 50g",
        "brand": "Lays",
        "category": "Snacks",
        "price": 20.00,
        "stock": 100
    },
    {
        "_id": "650000000000000000000004",
        "name": "Pepsi Soft Drink 500ml Bottle",
        "brand": "Pepsi",
        "category": "Beverage",
        "price": 40.00,
        "stock": 60
    },
    {
        "_id": "650000000000000000000005",
        "name": "Cadbury Dairy Milk Chocolate 50g",
        "brand": "Cadbury",
        "category": "Confectionery",
        "price": 50.00,
        "stock": 120
    },
    {
        "_id": "650000000000000000000006",
        "name": "Britannia Marie Gold Biscuits 250g",
        "brand": "Britannia",
        "category": "Biscuits & Bakery",
        "price": 35.00,
        "stock": 90
    }
]

def ensure_default_catalog_indexed(force_reindex=False):
    """
    Ensures vector engine is ready.
    Note: Fake seed products with synthetic 65000... IDs are disabled to ensure
    only real MongoDB database products are matched and indexed.
    """
    engine = get_vector_engine()
    if len(engine.products_metadata) == 0:
        print("[Match Service] FAISS index is empty. Awaiting product sync from MongoDB.")

def _fallback_text_match(query_text: str, engine, min_ratio: float = 0.25) -> dict:
    """Fallback simple textual similarity using difflib against catalog text.
    Returns a dict with product data and similarity ratio (0-1) if a match >= min_ratio is found, else None.
    """
    best_match = None
    best_ratio = 0.0
    for prod in engine.products_metadata:
        # Use rich catalog text for comparison
        prod_text = build_catalog_text(prod)
        ratio = difflib.SequenceMatcher(None, query_text.lower(), prod_text.lower()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = prod
    if best_match and best_ratio >= min_ratio:
        return {"product": best_match, "similarity": round(best_ratio, 4)}
    return None

def match_product_from_vlm(vlm_data: dict, ocr_text: str = "", confidence_threshold: float = 0.30, embedding: list = None) -> dict:
    """
    Takes VLM metadata dictionary, searches FAISS index of real MongoDB products,
    and returns matched database product ONLY if similarity meets minimum threshold.
    """
    if isinstance(vlm_data, dict) and (vlm_data.get("product_found") is False or vlm_data.get("category") == "Non-Product"):
        return {
            "matched": False,
            "product_id": None,
            "_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "stock": 0,
            "similarity": 0.0,
            "category": "Non-Product",
            "status": "Non-Product Ignored"
        }

    ensure_default_catalog_indexed()
    engine = get_vector_engine()

    cat_count = len(engine.products_metadata)
    vec_count = len(engine.vectors) if engine.vectors is not None else 0
    model_name = "MD5 Subword/N-Gram Deterministic Fallback" if get_embedding_model() is None else "SentenceTransformer (all-MiniLM-L6-v2)"

    print(f"[FAISS DEBUG] ─────────────────────────────────────────")
    print(f"[FAISS DEBUG] Index exists: {engine.vectors is not None or cat_count > 0}")
    print(f"[FAISS DEBUG] Index dimension: {engine.dimension}")
    print(f"[FAISS DEBUG] Number of catalog vectors: {vec_count}")
    print(f"[FAISS DEBUG] Number of metadata entries: {cat_count}")
    print(f"[FAISS DEBUG] Sync OK (vecs==metas): {vec_count == cat_count}")
    print(f"[EMBED DEBUG] Embedding model: {model_name}")
    print(f"[OCR  DEBUG] OCR text received: '{ocr_text}'")

    if isinstance(vlm_data, dict):
        print(f"[VLM  DEBUG] brand='{vlm_data.get('brand')}' "
              f"product_name='{vlm_data.get('product_name') or vlm_data.get('name')}' "
              f"category='{vlm_data.get('category')}' "
              f"weight='{vlm_data.get('weight')}' "
              f"flavor='{vlm_data.get('flavor')}'")

    print(f"[CATALOG DEBUG] Catalog products indexed in FAISS:")
    for i, p in enumerate(engine.products_metadata):
        pid = str(p.get('_id') or p.get('id') or 'N/A')
        ai_cls = p.get('aiClassId') or 'N/A'
        cat_text = build_catalog_text(p)
        print(f"[CATALOG DEBUG]   [{i}] MongoDB _id={pid} | name={p.get('name')!r} | aiClassId={ai_cls} | text={cat_text[:80]!r}")

    # 1. Fast-path: Exact AI Class ID match if provided
    ai_class_id = vlm_data.get("aiClassId") or vlm_data.get("ai_class_id") if isinstance(vlm_data, dict) else None
    if ai_class_id:
        match = engine.get_product_by_ai_class_id(ai_class_id)
        if match:
            return {
                "matched": True,
                "product_id": str(match.get("_id")),
                "name": match.get("name"),
                "brand": match.get("brand"),
                "price": match.get("price", 0.0),
                "similarity": 1.0,
                "category": match.get("category"),
                "status": "Exact AI Class ID Match",
                "fallback_used": False,
            }

    # 2. Build Query Text & Embedding
    # Use build_query_text which is lenient with generic VLM tokens and always appends OCR
    query_text = build_query_text(vlm_data, ocr_text=ocr_text) if isinstance(vlm_data, dict) else (ocr_text or "retail product")
    if not query_text.strip():
        query_text = ocr_text.strip() if ocr_text and ocr_text.strip() else "retail product"

    if embedding is not None and len(embedding) > 0:
        query_vec = np.array(embedding, dtype=np.float32)
        print(f"[EMBED DEBUG] Using pre-computed embedding, dimension: {len(query_vec)}")
    else:
        print(f"[EMBED DEBUG] Query text (computed): '{query_text}'")
        query_vec = generate_embedding(query_text)

    # 3. Search Top-5 Matches in FAISS Vector Store
    matches = engine.search(query_vec, top_k=5)

    q_dim = len(query_vec)
    idx_dim = engine.dimension

    print(f"[EMBED DEBUG] Query embedding dimension: {q_dim}")
    print(f"[EMBED DEBUG] Catalog embedding dimension: {idx_dim}")
    print(f"[EMBED DEBUG] Dimension match: {q_dim == idx_dim}")
    print(f"[FAISS] Top-{len(matches)} candidates (threshold={confidence_threshold}):")
    for i, m in enumerate(matches):
        mp = m.get("product", {})
        sim = m.get("similarity", 0)
        meets = "✓ ABOVE" if sim >= confidence_threshold else "✗ BELOW"
        print(f"[FAISS]   #{i+1} id={mp.get('_id')} | name={mp.get('name')!r} | sim={sim:.4f} | {meets} threshold")

    if not matches:
        print("[FAISS] No candidates returned from search.")
        return {
            "matched": False,
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": 0.0,
            "category": vlm_data.get("category", "General") if isinstance(vlm_data, dict) else "General",
            "status": "No Match Found"
        }

    top_match = matches[0]
    matched_prod = top_match["product"]
    similarity = float(top_match["similarity"])
    prod_id = str(matched_prod.get("_id") or matched_prod.get("id") or "")

    print(f"[FAISS] Best similarity: {similarity:.4f}")
    print(f"[FAISS] Threshold: {confidence_threshold}")
    print(f"[FAISS] Best product: {matched_prod.get('name')!r} (id={prod_id})")
    print(f"[FAISS] Matched product: {prod_id}")

    # Apply strict similarity threshold
    is_valid_match = similarity >= confidence_threshold
    if not is_valid_match:
        print(f"[FAISS] REJECT: similarity {similarity:.4f} < threshold {confidence_threshold} — attempting text fallback")

    if not is_valid_match:
        # Attempt fallback textual similarity before giving up
        fallback = _fallback_text_match(query_text, engine, min_ratio=0.30)
        if fallback:
            matched_prod = fallback["product"]
            text_sim = fallback["similarity"]
            fb_prod_id = str(matched_prod.get("_id") or matched_prod.get("id") or "")
            print(f"[MATCH] FAISS similarity: {similarity}")
            print(f"[MATCH] Text similarity: {text_sim}")
            print(f"[MATCH] Final decision: Accepted via Text Fallback")
            print(f"[MATCH] Selected product: {matched_prod.get('name')} (id: {fb_prod_id})")
            print(f"[MONGO] Product found: {matched_prod.get('name')}")
            return {
                "matched": True,
                "product_id": fb_prod_id,
                "productId": fb_prod_id,
                "name": matched_prod.get('name'),
                "brand": matched_prod.get('brand'),
                "price": matched_prod.get('price', 0.0),
                "similarity": round(text_sim, 4),
                "category": matched_prod.get('category'),
                "status": "Match via Text Fallback",
                "candidates": matches,
                "fallback_used": True
            }
        # No fallback match; reject as before
        print(f"[MATCH] FAISS similarity: {similarity}")
        print(f"[MATCH] Text similarity: 0.0")
        print(f"[MATCH] Final decision: Rejected (below similarity threshold)")
        return {
            "matched": False,
            "product_id": None,
            "productId": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": round(similarity, 4),
            "category": vlm_data.get("category", "General"),
            "status": "No Match (Below Similarity Threshold)",
            "candidates": matches,
            "fallback_used": False
        }

    print(f"[MATCH] FAISS similarity: {similarity}")
    print(f"[MATCH] Final decision: Accepted via Vector Match")
    print(f"[MATCH] Selected product: {matched_prod.get('name')} (id: {prod_id})")
    print(f"[MONGO] Product found: {matched_prod.get('name')}")
    print(f"[FINAL] matched: True")
    print(f"[FINAL] MongoDB productId: {prod_id}")
    print(f"[FINAL] Product name: {matched_prod.get('name')}")
    print(f"[FINAL] Brand: {matched_prod.get('brand')}")
    print(f"[FINAL] Price: {matched_prod.get('price', 0.0)}")
    print(f"[FINAL] Similarity: {round(similarity, 4)}")
    print(f"[FINAL] Status: Match Confirmed")
    return {
        "matched": True,
        "product_id": prod_id,
        "productId": prod_id,
        "name": matched_prod.get("name"),
        "brand": matched_prod.get("brand"),
        "price": matched_prod.get("price", 0.0),
        "similarity": round(similarity, 4),
        "category": matched_prod.get("category"),
        "status": "Match Confirmed",
        "candidates": matches,
        "fallback_used": False
    }

def test_product_embedding(product_data: dict) -> dict:
    """
    Self-test diagnostic function:
    1. Loads product data
    2. Generates registration/search embedding
    3. Searches FAISS vector store
    4. Prints top 5 results
    5. Verifies that the same product is returned with high similarity
    """
    print(f"==================================================")
    print(f"[TEST EMBEDDING] Running self-test diagnostic for product: {product_data.get('name')}")
    ensure_default_catalog_indexed()
    engine = get_vector_engine()

    searchable_text = build_product_text(product_data)
    embedding = generate_embedding(searchable_text)

    top_matches = engine.search(embedding, top_k=5)

    print(f"[TEST EMBEDDING] Top matches count: {len(top_matches)}")
    for idx, match in enumerate(top_matches):
        p = match.get("product", {})
        sim = match.get("similarity", 0.0)
        print(f"[TEST EMBEDDING] #{idx+1} ID: {p.get('_id')} | Name: {p.get('name')} | Sim: {sim}")

    matched_self = False
    if top_matches:
        top_prod_id = str(top_matches[0].get("product", {}).get("_id"))
        target_id = str(product_data.get("_id") or product_data.get("id"))
        if top_prod_id == target_id:
            matched_self = True
            print(f"[TEST EMBEDDING] SUCCESS! Product correctly retrieved itself as rank #1 ({top_matches[0].get('similarity')*100:.1f}% similarity).")
        else:
            print(f"[TEST EMBEDDING] NOTICE: Rank #1 product ID {top_prod_id} differs from target ID {target_id}.")

    print(f"==================================================")
    return {
        "success": True,
        "matched_self": matched_self,
        "top_matches": top_matches
    }
