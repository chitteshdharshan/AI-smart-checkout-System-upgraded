const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { enrichProduct } = require("../controllers/productEnrichmentController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes (Search & Filter)
router.get("/", getProducts);
router.get("/:id", getProductById);

// Image enrichment & Product CRUD routes
router.post("/enrich", upload.array("images", 5), enrichProduct);
router.post("/", protect, upload.array("images", 5), createProduct);
router.put("/:id", protect, upload.array("images", 5), updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;
