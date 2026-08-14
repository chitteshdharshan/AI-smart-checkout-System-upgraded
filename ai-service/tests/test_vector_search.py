import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.product_embedding import build_product_text, generate_embedding
from services.vector_search import VectorSearchEngine
from services.match_service import match_product_from_vlm, DEFAULT_CATALOG_PRODUCTS

class TestVectorSearch(unittest.TestCase):

    def test_build_product_text(self):
        vlm_data = {
            "brand": "Maggi",
            "product_name": "2 Minute Noodles",
            "flavor": "Masala",
            "weight": "70g",
            "category": "Instant Noodles"
        }
        text = build_product_text(vlm_data)
        self.assertIn("Maggi", text)
        self.assertIn("Masala", text)
        self.assertIn("70g", text)

    def test_embedding_generation_shape(self):
        text = "Maggi 2 Minute Noodles Masala 70g"
        vec = generate_embedding(text)
        self.assertEqual(len(vec), 384)

    def test_vector_search_matching(self):
        vlm_data = {
            "brand": "Maggi",
            "product_name": "2 Minute Noodles",
            "flavor": "Masala",
            "weight": "70g"
        }
        res = match_product_from_vlm(vlm_data)
        self.assertTrue(res["matched"])
        self.assertEqual(res["name"], "Maggi 2 Minute Noodles Masala 70g")
        self.assertGreaterEqual(res["similarity"], 0.70)
        self.assertEqual(res["price"], 20.00)

    def test_marie_gold_vector_search_matching(self):
        vlm_data = {
            "brand": "Britannia",
            "product_name": "Marie Gold Biscuits",
            "flavor": "Gold",
            "weight": "250g",
            "category": "Biscuits & Bakery"
        }
        res = match_product_from_vlm(vlm_data, ocr_text="BRITANNIA MARIE GOLD")
        self.assertTrue(res["matched"])
        self.assertIn("Marie Gold", res["name"])
        self.assertGreaterEqual(res["similarity"], 0.70)
        self.assertEqual(res["price"], 35.00)

if __name__ == "__main__":
    unittest.main()
