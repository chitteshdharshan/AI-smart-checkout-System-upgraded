const express = require("express");
const router = express.Router();
const { getCategories, createCategory, deleteCategory } = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", getCategories);
router.post("/", protect, createCategory);
router.delete("/:id", protect, deleteCategory);

module.exports = router;
