const Category = require("../models/Category");

// @desc Get all categories
const getCategories = async (req, res) => {
  try {
    let categories = await Category.find().sort({ name: 1 });
    
    // Seed default categories if none exist in database
    if (categories.length === 0) {
      const defaultCategories = [
        { name: "Biscuit", slug: "biscuit", description: "Biscuits & Cookies" },
        { name: "Snacks", slug: "snacks", description: "Snacks & Chips" },
      ];
      await Category.insertMany(defaultCategories);
      categories = await Category.find().sort({ name: 1 });
    }
    
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Create new category
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const trimmedName = name.trim();

    // Case-insensitive duplicate check
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i") },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const category = await Category.create({ name: trimmedName, slug, description: description || "" });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};
