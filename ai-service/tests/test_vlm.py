import sys
import os
import unittest

# Add parent directory to python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prompt_builder import build_vlm_prompt
from services.response_parser import parse_vlm_json
from services.vlm_service import synthesize_vlm_fallback

class TestVLMModule(unittest.TestCase):

    def test_prompt_builder(self):
        prompt = build_vlm_prompt(ocr_text="MAGGI Masala 70g", class_name="packet")
        self.assertIn("MAGGI Masala 70g", prompt)
        self.assertIn("packet", prompt)

    def test_response_parser_clean_json(self):
        raw_vlm_response = """
        ```json
        {
          "brand": "Maggi",
          "product_name": "2 Minute Noodles",
          "flavor": "Masala",
          "weight": "70g",
          "variant": "Classic",
          "category": "Instant Noodles",
          "confidence": 0.98
        }
        ```
        """
        parsed = parse_vlm_json(raw_vlm_response)
        self.assertEqual(parsed["brand"], "Maggi")
        self.assertEqual(parsed["product_name"], "2 Minute Noodles")
        self.assertEqual(parsed["flavor"], "Masala")
        self.assertEqual(parsed["weight"], "70g")
        self.assertEqual(parsed["confidence"], 0.98)

    def test_vlm_fallback_synthesis(self):
        result = synthesize_vlm_fallback(
            ocr_text="MAGGI Masala 70g",
            ocr_lines=["MAGGI", "Masala", "70g"],
            class_name="product"
        )
        self.assertEqual(result["brand"], "Maggi")
        self.assertEqual(result["weight"], "70g")
        self.assertTrue(result["product_found"])

    def test_vlm_fallback_insufficient_evidence(self):
        result = synthesize_vlm_fallback(
            ocr_text="",
            ocr_lines=[],
            class_name="product"
        )
        self.assertEqual(result["brand"], "UNKNOWN")
        self.assertEqual(result["product_name"], "UNKNOWN")
        self.assertEqual(result["confidence"], 0.0)
        self.assertFalse(result["product_found"])

    def test_vlm_fallback_non_product(self):
        result = synthesize_vlm_fallback(
            ocr_text="Random text",
            ocr_lines=["Random"],
            class_name="person"
        )
        self.assertEqual(result["brand"], "UNKNOWN")
        self.assertEqual(result["confidence"], 0.0)
        self.assertFalse(result["product_found"])

if __name__ == "__main__":
    unittest.main()
