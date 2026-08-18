import difflib
import re
import numpy as np
from services.product_embedding import (
    build_product_text,
    build_catalog_text,
    build_query_text,
    generate_embedding,
)
from services.vector_search import get_vector_engine
from services.text_cleaner import normalize_ocr_text
from models.embedding_model import get_embedding_model

# ─────────────────────────────────────────────────────────────
# CONFIGURABLE MULTI-SIGNAL MATCHING PARAMETERS
# ─────────────────────────────────────────────────────────────
TOP_K_CANDIDATES = 5

# Scoring Weights (Must sum to 1.0)
WEIGHT_FAISS = 0.40
WEIGHT_OCR = 0.25
WEIGHT_VLM_NAME = 0.20
WEIGHT_BRAND = 0.15

# Confidence Thresholds
MIN_FAISS_SIMILARITY = 0.50      # Minimum raw vector cosine similarity
MIN_FINAL_SCORE = 0.50           # Minimum multi-signal blended score to confirm
MIN_MATCH_MARGIN = 0.05          # Minimum score gap between Top-1 and Top-2 candidate


def ensure_default_catalog_indexed(force_reindex=False):
    """
    Ensures vector engine is ready.
    """
    engine = get_vector_engine()
    if len(engine.products_metadata) == 0:
        print("[Match Service] FAISS index is empty. Awaiting product sync from MongoDB.")


def _clean_str(val) -> str:
    if not val:
        return ""
    text = str(val).lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _char_ngrams(s: str, n: int = 3) -> set:
    s_compact = s.replace(" ", "")
    if len(s_compact) < n:
        return {s_compact} if s_compact else set()
    return {s_compact[i:i+n] for i in range(len(s_compact) - n + 1)}


def _ngram_dice(s1: str, s2: str, n: int = 3) -> float:
    ng1 = _char_ngrams(s1, n)
    ng2 = _char_ngrams(s2, n)
    if not ng1 or not ng2:
        return 0.0
    return 2.0 * len(ng1 & ng2) / (len(ng1) + len(ng2))


def calculate_text_similarity(query_text: str, target_text: str, aliases: list = None) -> float:
    """
    Calculates generic string & token similarity (0.0 to 1.0) between query and target.
    Handles OCR errors (e.g. 'Ccacla' -> 'Coca-Cola', 'MARIE G0LD' -> 'MARIE GOLD',
    missing/transposed letters, punctuation, compact spacing) for ANY inventory product.
    """
    q_clean = _clean_str(query_text)
    t_clean = _clean_str(target_text)

    if not q_clean or not t_clean:
        return 0.0

    targets_to_test = [t_clean]
    if aliases and isinstance(aliases, list):
        for a in aliases:
            a_clean = _clean_str(a)
            if a_clean and a_clean not in targets_to_test:
                targets_to_test.append(a_clean)

    q_tokens = [w for w in q_clean.split() if len(w) > 0]
    q_compact = q_clean.replace(" ", "")

    best_score = 0.0

    for target in targets_to_test:
        t_tokens = [w for w in target.split() if len(w) > 0]
        t_compact = target.replace(" ", "")

        # 1. Exact match
        if q_clean == target or q_compact == t_compact:
            return 1.0

        # 2. Substring containment
        if target in q_clean or q_clean in target:
            len_ratio = min(len(q_clean), len(target)) / max(len(q_clean), len(target))
            best_score = max(best_score, max(0.85, len_ratio))

        # 3. Compact string SequenceMatcher (bypasses space/hyphen differences)
        compact_ratio = difflib.SequenceMatcher(None, q_compact, t_compact).ratio()

        # 4. Whole-string SequenceMatcher
        seq_ratio = difflib.SequenceMatcher(None, q_clean, target).ratio()

        # 5. Character 3-gram & 4-gram Dice similarity (robust to character dropouts/typos)
        dice_3 = _ngram_dice(q_clean, target, n=3)
        dice_4 = _ngram_dice(q_clean, target, n=4)
        char_ngram_score = max(dice_3, dice_4)

        # 6. Token-level fuzzy alignment
        # For each target token, find the best matching query token
        token_match_weights = []
        for t_tok in t_tokens:
            best_tok_match = 0.0
            for q_tok in q_tokens:
                if q_tok == t_tok:
                    best_tok_match = max(best_tok_match, 1.0)
                elif len(t_tok) >= 3 and (t_tok in q_tok or q_tok in t_tok):
                    best_tok_match = max(best_tok_match, 0.85)
                else:
                    tok_ratio = difflib.SequenceMatcher(None, q_tok, t_tok).ratio()
                    compact_tok_ratio = difflib.SequenceMatcher(None, q_tok.replace(" ", ""), t_tok.replace(" ", "")).ratio()
                    best_tok_match = max(best_tok_match, tok_ratio, compact_tok_ratio)
            token_match_weights.append(best_tok_match)

        token_recall = sum(token_match_weights) / len(t_tokens) if t_tokens else 0.0

        # Query precision (fraction of query tokens that match some target token)
        q_match_weights = []
        for q_tok in q_tokens:
            best_q_match = 0.0
            for t_tok in t_tokens:
                if q_tok == t_tok:
                    best_q_match = max(best_q_match, 1.0)
                elif len(q_tok) >= 3 and (t_tok in q_tok or q_tok in t_tok):
                    best_q_match = max(best_q_match, 0.85)
                else:
                    tok_ratio = difflib.SequenceMatcher(None, q_tok, t_tok).ratio()
                    compact_tok_ratio = difflib.SequenceMatcher(None, q_tok.replace(" ", ""), t_tok.replace(" ", "")).ratio()
                    best_q_match = max(best_q_match, tok_ratio, compact_tok_ratio)
            q_match_weights.append(best_q_match)

        token_prec = sum(q_match_weights) / len(q_tokens) if q_tokens else 0.0

        token_score = 0.0
        if token_recall + token_prec > 0:
            token_f1 = (2 * token_recall * token_prec) / (token_recall + token_prec)
            token_score = max(token_f1, token_recall * 0.85 + token_prec * 0.15)

        score = max(seq_ratio, compact_ratio, char_ngram_score, token_score, token_recall)
        best_score = max(best_score, score)

    return min(1.0, max(0.0, round(best_score, 4)))


def match_product_from_vlm(vlm_data: dict, ocr_text: str = "", confidence_threshold: float = MIN_FINAL_SCORE, embedding: list = None) -> dict:
    """
    Multi-stage, database-driven product verification engine.
    Retrieves Top-K FAISS vector candidates and ranks them using multi-signal scoring:
      finalScore = FAISS*0.40 + OCR*0.25 + VLM_NAME*0.20 + BRAND*0.15 + consensus_boost
    Enforces minimum similarity, final score threshold, and Top-1 vs Top-2 margin checks.
    """
    if isinstance(vlm_data, dict) and (vlm_data.get("product_found") is False or vlm_data.get("category") == "Non-Product"):
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NON_PRODUCT_OBJECT",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": 0.0,
            "final_score": 0.0,
            "candidates": []
        }

    ensure_default_catalog_indexed()
    engine = get_vector_engine()

    if len(engine.products_metadata) == 0:
        print("[MATCH] Vector engine has no registered products.")
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NO_CATALOG_PRODUCTS_INDEXED",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": 0.0,
            "final_score": 0.0,
            "candidates": []
        }

    # 1. Normalize query inputs
    norm_ocr = normalize_ocr_text(ocr_text)
    vlm_payload = vlm_data if isinstance(vlm_data, dict) else {}

    vlm_brand = vlm_payload.get("brand", "")
    if vlm_brand.upper() in ["UNKNOWN", "GENERIC", "NONE", "N/A"]:
        vlm_brand = ""

    vlm_name = vlm_payload.get("product_name", "") or vlm_payload.get("name", "")
    if vlm_name.upper() in ["UNKNOWN", "PRODUCT", "RETAIL PRODUCT", "NONE", "N/A"]:
        vlm_name = ""

    print(f"[OCR RAW] '{ocr_text}'")
    print(f"[OCR NORMALIZED] '{norm_ocr}'")
    print(f"[VLM] brand='{vlm_brand}', product_name='{vlm_name}', confidence={vlm_payload.get('confidence', 0.0)}")

    # 2. Build Query Vector via Recognition Fusion
    query_text = build_query_text(vlm_payload, ocr_text=norm_ocr or ocr_text)
    if not query_text.strip():
        query_text = norm_ocr or ocr_text or "retail product"

    print(f"[FUSION] OCR='{norm_ocr}' VLM='{vlm_brand} {vlm_name}' combined='{query_text}'")

    if embedding is not None and len(embedding) > 0:
        query_vec = np.array(embedding, dtype=np.float32)
    else:
        query_vec = generate_embedding(query_text)

    # 3. Retrieve Top-K FAISS Candidates
    raw_candidates = engine.search(query_vec, top_k=TOP_K_CANDIDATES)

    if not raw_candidates:
        print("[FAISS] No candidates returned from vector search.")
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NO_FAISS_CANDIDATES",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": 0.0,
            "final_score": 0.0,
            "candidates": []
        }

    # 4. Multi-Signal Candidate Evaluation
    scored_candidates = []
    print(f"[FAISS] Top-{len(raw_candidates)} Candidates:")

    for idx, cand in enumerate(raw_candidates):
        prod = cand.get("product", {})
        faiss_sim = float(cand.get("similarity", 0.0))

        prod_name = prod.get("name", "")
        prod_brand = prod.get("brand", "")
        prod_aliases = prod.get("aliases", [])
        prod_searchable = prod.get("searchableText", "") or build_catalog_text(prod)

        # Signal 1: FAISS Vector similarity (0.0 to 1.0)
        faiss_score = max(0.0, min(1.0, faiss_sim))

        # Signal 2: OCR text similarity against product name, brand, and aliases
        ocr_score = max(
            calculate_text_similarity(norm_ocr, prod_name, prod_aliases),
            calculate_text_similarity(norm_ocr, prod_brand),
            calculate_text_similarity(norm_ocr, prod_searchable) * 0.90
        )

        # Signal 3: VLM product name similarity
        vlm_name_score = calculate_text_similarity(vlm_name, prod_name, prod_aliases) if vlm_name else 0.0

        # Signal 4: VLM brand similarity
        brand_score = calculate_text_similarity(vlm_brand, prod_brand) if vlm_brand else 0.0

        # Signal 5: Consensus Boost between independent OCR and VLM signals
        consensus_boost = 0.0
        if ocr_score >= 0.60 and (vlm_name_score >= 0.60 or brand_score >= 0.60):
            consensus_boost = 0.05

        # Blended Multi-Signal Final Score
        final_score = min(1.0, round(
            (faiss_score * WEIGHT_FAISS) +
            (ocr_score * WEIGHT_OCR) +
            (vlm_name_score * WEIGHT_VLM_NAME) +
            (brand_score * WEIGHT_BRAND) +
            consensus_boost,
            4
        ))

        cand_data = {
            "product_id": str(prod.get("_id") or prod.get("id")),
            "_id": str(prod.get("_id") or prod.get("id")),
            "name": prod_name,
            "brand": prod_brand,
            "price": prod.get("price", 0.0),
            "stock": prod.get("stock", 0),
            "category": prod.get("category", "General"),
            "similarity": faiss_sim,
            "faissScore": faiss_score,
            "ocrScore": ocr_score,
            "vlmNameScore": vlm_name_score,
            "brandScore": brand_score,
            "consensusBoost": consensus_boost,
            "finalScore": final_score,
        }
        scored_candidates.append(cand_data)

        print(f"[FAISS] Candidate #{idx+1}: {prod_name!r} (Brand: {prod_brand!r}) | FAISS={faiss_score:.2f}, OCR={ocr_score:.2f}, VLM={vlm_name_score:.2f}, Brand={brand_score:.2f}, Consensus={consensus_boost:.2f} -> Final={final_score:.4f}")

    # 5. Sort by finalScore descending
    scored_candidates.sort(key=lambda c: c["finalScore"], reverse=True)

    best = scored_candidates[0]
    second = scored_candidates[1] if len(scored_candidates) > 1 else None

    margin = round(best["finalScore"] - (second["finalScore"] if second else 0.0), 4)

    print(f"[MATCH] Best Candidate: {best['name']} (ID: {best['product_id']})")
    print(f"[MATCH]   FAISS Score: {best['faissScore']:.4f} (Min: {MIN_FAISS_SIMILARITY})")
    print(f"[MATCH]   OCR Score:   {best['ocrScore']:.4f}")
    print(f"[MATCH]   VLM Score:   {best['vlmNameScore']:.4f}")
    print(f"[MATCH]   Brand Score: {best['brandScore']:.4f}")
    print(f"[MATCH]   Final Score: {best['finalScore']:.4f} (Threshold: {confidence_threshold})")
    print(f"[MATCH]   Margin:      {margin:.4f} (Min Margin: {MIN_MATCH_MARGIN})")

    # 6. Verification and Confidence Decisions
    # Gate failure if final blended score is below threshold
    if best["finalScore"] < confidence_threshold:
        print(f"[MATCH] Rejected: Final score ({best['finalScore']:.2f}) below threshold ({confidence_threshold:.2f}).")
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NO_CONFIDENT_PRODUCT_MATCH",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": best["similarity"],
            "final_score": best["finalScore"],
            "margin": margin,
            "candidates": scored_candidates
        }

    # Gate failure if both vector similarity and text recognition are ungrounded
    if best["faissScore"] < 0.25 and best["ocrScore"] < 0.50 and best["vlmNameScore"] < 0.50 and best["brandScore"] < 0.50:
        print(f"[MATCH] Rejected: Ungrounded candidate (FAISS={best['faissScore']:.2f}, OCR={best['ocrScore']:.2f}, VLM={best['vlmNameScore']:.2f}).")
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NO_CONFIDENT_PRODUCT_MATCH",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": best["similarity"],
            "final_score": best["finalScore"],
            "margin": margin,
            "candidates": scored_candidates
        }

    # Gate failure if ambiguous match between top candidates with small margin
    if second and margin < MIN_MATCH_MARGIN and best["finalScore"] < 0.75:
        print(f"[MATCH] Rejected: Ambiguous match between Top-1 and Top-2 (margin: {margin:.4f} < {MIN_MATCH_MARGIN}).")
        return {
            "matched": False,
            "status": "UNCERTAIN",
            "reason": "NO_CONFIDENT_PRODUCT_MATCH",
            "product_id": None,
            "name": None,
            "brand": None,
            "price": 0.0,
            "similarity": best["similarity"],
            "final_score": best["finalScore"],
            "margin": margin,
            "candidates": scored_candidates
        }

    # Case: Confident Match Accepted
    print(f"[MATCH] Accepted! Confirmed product: {best['name']} (Score: {best['finalScore']:.4f})")
    return {
        "matched": True,
        "status": "CONFIRMED",
        "product_id": best["product_id"],
        "productId": best["product_id"],
        "_id": best["product_id"],
        "name": best["name"],
        "brand": best["brand"],
        "price": best["price"],
        "stock": best["stock"],
        "category": best["category"],
        "similarity": best["similarity"],
        "final_score": best["finalScore"],
        "margin": margin,
        "candidates": scored_candidates
    }


def test_product_embedding(product_data: dict) -> dict:
    """
    Self-test diagnostic function.
    """
    ensure_default_catalog_indexed()
    engine = get_vector_engine()

    searchable_text = build_product_text(product_data)
    embedding = generate_embedding(searchable_text)

    top_matches = engine.search(embedding, top_k=5)
    return {
        "success": True,
        "top_matches": top_matches
    }
