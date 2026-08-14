import os
import pickle
import numpy as np

INDEX_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "indexes"
)
INDEX_FILE = os.path.join(INDEX_DIR, "product.index")
METADATA_FILE = os.path.join(INDEX_DIR, "product_metadata.pkl")

class VectorSearchEngine:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.products_metadata = []
        self.vectors = None
        self.faiss_index = None

        os.makedirs(INDEX_DIR, exist_ok=True)
        self.load_index()

    def get_product_by_ai_class_id(self, ai_class_id: str):
        """Return product dict matching the given AI Class ID, or None."""
        for prod in self.products_metadata:
            if prod.get("aiClassId") == ai_class_id or prod.get("ai_class_id") == ai_class_id:
                return prod
        return None

    def build_index(self, product_items: list, embeddings: np.ndarray):
        """
        Builds FAISS index (or Cosine Similarity matrix) for a list of products.
        """
        if not product_items or len(embeddings) == 0:
            print("[Vector Search Engine] No products provided to index.")
            return

        self.products_metadata = product_items
        self.vectors = np.array(embeddings, dtype=np.float32)

        # Normalize vectors for Cosine Similarity
        norms = np.linalg.norm(self.vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.vectors /= norms

        try:
            import faiss
            self.faiss_index = faiss.IndexFlatIP(self.dimension)
            self.faiss_index.add(self.vectors)
            faiss.write_index(self.faiss_index, INDEX_FILE)
            print(f"[Vector Search Engine] Built & saved FAISS index with {len(product_items)} products.")
        except Exception as e:
            print(f"[Vector Search Engine] FAISS notice (using NumPy Cosine engine): {e}")

        # Save metadata to disk
        with open(METADATA_FILE, "wb") as f:
            pickle.dump({"metadata": self.products_metadata, "vectors": self.vectors}, f)

    def print_index_stats(self):
        index_exists = os.path.exists(INDEX_FILE) or self.vectors is not None
        total_vecs = len(self.vectors) if self.vectors is not None else 0
        print(f"[FAISS] index path: {INDEX_FILE}")
        print(f"[FAISS] index exists: {index_exists}")
        print(f"[FAISS] total vectors: {total_vecs}")
        print(f"[FAISS] vector dimension: {self.dimension}")
        print(f"[FAISS] metadata count: {len(self.products_metadata)}")

    def load_index(self):
        """
        Loads saved index and metadata from disk if available.
        """
        if os.path.exists(METADATA_FILE):
            try:
                with open(METADATA_FILE, "rb") as f:
                    data = pickle.load(f)
                    self.products_metadata = data.get("metadata", [])
                    self.vectors = data.get("vectors")
                print(f"[Vector Search Engine] Loaded {len(self.products_metadata)} products from index cache.")
            except Exception as e:
                print(f"[Vector Search Engine] Cache load exception: {e}")

        if os.path.exists(INDEX_FILE):
            try:
                import faiss
                self.faiss_index = faiss.read_index(INDEX_FILE)
            except Exception as e:
                pass

        self.print_index_stats()

    def search(self, query_vector: np.ndarray, top_k: int = 5) -> list:
        """
        Performs Top-K nearest neighbor search given a query embedding.
        Returns a list of dicts with keys: product, similarity.
        """
        self.print_index_stats()

        if self.vectors is None or len(self.products_metadata) == 0:
            print("[FAISS] Vector store is empty! No products indexed.")
            return []

        # Normalize query vector
        q_vec = np.array(query_vector, dtype=np.float32).reshape(1, -1)
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec /= q_norm

        print(f"[FAISS] query dimension: {q_vec.shape[1]}")
        top_k = min(top_k, len(self.products_metadata))

        # FAISS search if available
        if self.faiss_index is not None:
            try:
                similarities, indices = self.faiss_index.search(q_vec, top_k)
                results = []
                for score, idx in zip(similarities[0], indices[0]):
                    if idx >= 0 and idx < len(self.products_metadata):
                        results.append({
                            "product": self.products_metadata[idx],
                            "similarity": round(float(score), 4)
                        })
                return results
            except Exception as e:
                print(f"[Vector Search Engine] FAISS search exception: {e}")

        # Fallback NumPy Dot-Product (Cosine Similarity)
        sim_scores = np.dot(self.vectors, q_vec.T).flatten()
        top_indices = np.argsort(sim_scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "product": self.products_metadata[idx],
                "similarity": round(float(sim_scores[idx]), 4)
            })

        if results:
            print(f"[FAISS] Top K results: {len(results)}")
            print(f"[FAISS] Similarity scores: {[r['similarity'] for r in results]}")
            print(f"[FAISS] Matched product IDs: {[str(r['product'].get('_id')) for r in results]}")

        return results

def rebuild_faiss_index(products: list):
    """
    Rebuilds FAISS vector store from a list of products.

    Uses build_catalog_text (which prioritises the rich `searchableText` field
    stored in MongoDB) so that every catalog embedding is built from the same
    vocabulary the backend saw at product-registration time.  This is critical
    for consistent similarity scoring against real scan-time query embeddings.
    """
    from services.product_embedding import build_catalog_text, generate_embedding
    engine = get_vector_engine()
    print(f"[FAISS] Rebuilding FAISS index for {len(products)} products...")
    embeddings = []
    for p in products:
        text = build_catalog_text(p)
        if not text.strip():
            # Absolute last resort — use the product name + brand
            text = f"{p.get('name', '')} {p.get('brand', '')}".strip() or "product"
        emb = generate_embedding(text)
        embeddings.append(emb)
    engine.build_index(products, np.array(embeddings, dtype=np.float32))
    print(f"[FAISS] Rebuild complete. Index has {len(engine.products_metadata)} vectors.")
    return engine

# Singleton vector engine instance
_VECTOR_ENGINE_INSTANCE = None

def get_vector_engine():
    global _VECTOR_ENGINE_INSTANCE
    if _VECTOR_ENGINE_INSTANCE is None:
        _VECTOR_ENGINE_INSTANCE = VectorSearchEngine()
    return _VECTOR_ENGINE_INSTANCE

