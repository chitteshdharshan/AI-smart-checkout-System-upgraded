import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.product_embedding import build_product_text, generate_embedding
from services.vector_search import rebuild_faiss_index
from services.match_service import match_product_from_vlm
from services.text_cleaner import normalize_ocr_text

SAMPLE_PRODUCTS = [
    {
        "_id": "6a83dc7a08d2bc88d09df6fb",
        "id": "6a83dc7a08d2bc88d09df6fb",
        "name": "Coca cola Classic",
        "brand": "Coca Cola",
        "price": 2.00,
        "stock": 50,
        "category": "Drinks",
        "searchableText": "Coca cola Classic 300ml drinks original taste carbonated water Drinks Classic",
        "aliases": ["Coke", "Coca Cola", "Coca-Cola", "Coca-Cola Classic", "Coca cola Classic"]
    },
    {
        "_id": "6a799cdd97ad364a1d616686",
        "id": "6a799cdd97ad364a1d616686",
        "name": "marie gold",
        "brand": "Britannia",
        "price": 2.00,
        "stock": 28,
        "category": "General Goods",
        "searchableText": "marie gold britannia pack 950g general goods product biscuits",
        "aliases": ["Marie Gold", "Britannia Marie", "Marie Gold Biscuit", "marie gold"]
    },
    {
        "_id": "6a76eae213931c1ca76b284b",
        "id": "6a76eae213931c1ca76b284b",
        "name": "Park Avenue",
        "brand": "Voyage",
        "price": 10.00,
        "stock": 29,
        "category": "Perfume",
        "searchableText": "park avenue voyage pack 167g perfume generic product mega voyage premium body spray",
        "aliases": ["Park Avenue Voyage", "Park Avenue Deo", "Park Avenue"]
    }
]

class TestVectorSearch(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        rebuild_faiss_index(SAMPLE_PRODUCTS)

    def test_text_normalization(self):
        self.assertEqual(normalize_ocr_text("COCA-COLA® 500 ML!"), "coca cola 500ml")
        self.assertEqual(normalize_ocr_text("C0CA C0LA 500ml"), "coca cola 500ml")
        self.assertEqual(normalize_ocr_text("MARIE GOLD 250 G"), "marie gold 250g")

    def test_embedding_generation_shape(self):
        text = "Coca-Cola Original Taste Soft Drink 500ml"
        vec = generate_embedding(text)
        self.assertEqual(len(vec), 384)

    # TEST 1: Coca-Cola with noisy OCR and imperfect VLM (Ccacla Classic)
    def test_coca_cola_noisy_ocr_and_vlm_fusion(self):
        vlm_data = {
            "brand": "Ccacla",
            "product_name": "Ccacla Classic Ccacla Classic",
            "category": "Drinks",
            "confidence": 0.88
        }
        res = match_product_from_vlm(vlm_data, ocr_text="7 Ccacla Classic J 1")
        self.assertTrue(res["matched"], f"Failed to match Coca-Cola: {res}")
        self.assertEqual(res["status"], "CONFIRMED")
        self.assertEqual(res["name"], "Coca cola Classic")
        self.assertEqual(res["product_id"], "6a83dc7a08d2bc88d09df6fb")
        self.assertGreaterEqual(res["final_score"], 0.50)

    # TEST 2: Marie Gold with OCR typos (MARIE G0LD)
    def test_marie_gold_ocr_typo_match(self):
        vlm_data = {
            "brand": "Britannia",
            "product_name": "Marie Gold Biscuits",
            "weight": "250g",
            "category": "Biscuits & Bakery",
            "confidence": 0.90
        }
        res = match_product_from_vlm(vlm_data, ocr_text="BRITANNIA MARIE G0LD 250G")
        self.assertTrue(res["matched"])
        self.assertEqual(res["status"], "CONFIRMED")
        self.assertIn("marie gold", res["name"].lower())
        self.assertEqual(res["product_id"], "6a799cdd97ad364a1d616686")
        self.assertGreaterEqual(res["final_score"], 0.50)

    # TEST 3: Park Avenue match
    def test_park_avenue_match(self):
        vlm_data = {
            "brand": "Park Avenue",
            "product_name": "Voyage Body Spray",
            "weight": "150ml",
            "category": "Perfume",
            "confidence": 0.90
        }
        res = match_product_from_vlm(vlm_data, ocr_text="PARK AVENUE VOYAGE 150ml")
        self.assertTrue(res["matched"])
        self.assertEqual(res["status"], "CONFIRMED")
        self.assertEqual(res["name"], "Park Avenue")
        self.assertEqual(res["product_id"], "6a76eae213931c1ca76b284b")
        self.assertGreaterEqual(res["final_score"], 0.50)

    # TEST 4: Unknown product rejection (Apple iPhone)
    def test_unknown_product_rejection(self):
        vlm_data = {
            "brand": "Apple",
            "product_name": "iPhone 15 Pro Max 256GB",
            "category": "Electronics",
            "confidence": 0.90
        }
        res = match_product_from_vlm(vlm_data, ocr_text="APPLE IPHONE 15 PRO TITANIUM")
        self.assertFalse(res["matched"])
        self.assertEqual(res["status"], "UNCERTAIN")
        self.assertEqual(res["reason"], "NO_CONFIDENT_PRODUCT_MATCH")

    # TEST 5 & 6: Sequential independent product matching (simulating Cancel -> New Scan)
    def test_sequential_scan_isolation(self):
        # Scan 1: Marie Gold
        res1 = match_product_from_vlm({"brand": "Britannia", "product_name": "Marie Gold"}, ocr_text="MARIE GOLD")
        self.assertEqual(res1["name"], "marie gold")

        # Scan 2: Coca-Cola (must not be contaminated by Marie Gold)
        res2 = match_product_from_vlm({"brand": "Ccacla", "product_name": "Ccacla Classic"}, ocr_text="Ccacla Classic")
        self.assertEqual(res2["name"], "Coca cola Classic")

        # Scan 3: Park Avenue (must not be contaminated by Coca-Cola)
        res3 = match_product_from_vlm({"brand": "Park Avenue", "product_name": "Voyage"}, ocr_text="PARK AVENUE")
        self.assertEqual(res3["name"], "Park Avenue")

    # TEST 7 & 8: Multi-product in same frame independent matching
    def test_multi_product_independent_matching(self):
        # Object A: Coca-Cola
        resA = match_product_from_vlm({"brand": "Coca-Cola", "product_name": "Classic"}, ocr_text="COCA COLA")
        # Object B: Marie Gold
        resB = match_product_from_vlm({"brand": "Britannia", "product_name": "Marie Gold"}, ocr_text="MARIE GOLD")
        # Object C: Park Avenue
        resC = match_product_from_vlm({"brand": "Park Avenue", "product_name": "Voyage Deo"}, ocr_text="PARK AVENUE")

        self.assertEqual(resA["name"], "Coca cola Classic")
        self.assertEqual(resB["name"], "marie gold")
        self.assertEqual(resC["name"], "Park Avenue")

if __name__ == "__main__":
    unittest.main()
