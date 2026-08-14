const Product = require("../models/Product");
require("../models/Category"); // Ensure Category model registered for populate

/**
 * @desc    Add product to cart using exact MongoDB database record
 * @route   POST /api/cart/update
 * @access  Public / Private
 */
const updateCart = async (req, res) => {
  try {
    const { productId, quantity = 1, matchScore } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        matched: false,
        message: "productId is required",
      });
    }

    console.log(`[CART] Adding catalog product: ${productId}`);
    console.log(`[CART] Looking up MongoDB product for ID: ${productId}`);

    // Query MongoDB using Product model by _id, aiClassId, or barcode
    let product = null;
    if (String(productId).match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(productId).populate("category", "name").lean();
    }

    if (!product) {
      product = await Product.findOne({
        $or: [{ aiClassId: productId }, { barcode: productId }],
      }).populate("category", "name").lean();
    }

    if (!product) {
      console.warn(`[CART] Product ID ${productId} not found in MongoDB Product collection.`);
      return res.status(404).json({
        success: false,
        matched: false,
        message: `Product ID ${productId} not found in database catalog`,
      });
    }

    const dbCategoryName = typeof product.category === "object" ? product.category?.name : (product.category || "General Goods");
    const requestedQty = Number(quantity) || 1;
    const availableStock = product.stock !== undefined ? product.stock : 0;
    const score = Number(matchScore) || 1.0;

    console.log(`[CART] Product loaded from database: ${product.name}`);
    console.log(`[CART] Product ID: ${product._id}`);
    console.log(`[CART] Price: ₹${product.price}`);
    console.log(`[CART] Stock: ${availableStock}`);
    console.log(`[CART] Quantity: ${requestedQty}`);
    console.log(`[CART] Cart update successful`);

    const dbProductObject = {
      _id: String(product._id),
      name: product.name,
      brand: product.brand || "Generic",
      price: product.price,
      stock: availableStock,
      category: dbCategoryName,
      aiClassId: product.aiClassId || "",
    };

    const cartItem = {
      product: String(product._id),
      productId: String(product._id),
      _id: String(product._id),
      name: product.name,
      brand: product.brand || "Generic",
      price: product.price,
      quantity: requestedQty,
      stock: availableStock,
      category: dbCategoryName,
      aiClassId: product.aiClassId || "",
      similarity: score,
      status: "Match Confirmed",
    };

    return res.status(200).json({
      success: true,
      matched: true,
      message: "Product added to cart",
      product: dbProductObject,
      quantity: requestedQty,
      matchScore: score,
      item: cartItem,
      cart: [cartItem],
    });
  } catch (error) {
    console.error("[Cart Controller Error]:", error);
    return res.status(500).json({
      success: false,
      matched: false,
      message: error.message || "Failed to update cart",
    });
  }
};

module.exports = {
  updateCart,
};
