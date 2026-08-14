const Product = require("../models/Product");

/**
 * Inventory Service
 * Verifies stock availability and handles atomic stock deduction on checkout.
 */

const verifyAndDeductStock = async (items = []) => {
  const stockErrors = [];
  const updatePromises = [];

  for (const item of items) {
    if (!item.product) continue;

    try {
      const product = await Product.findById(item.product);
      if (!product) {
        stockErrors.push(`Product '${item.name}' not found in inventory.`);
        continue;
      }

      if (product.stock < item.quantity) {
        stockErrors.push(
          `Insufficient stock for '${product.name}'. Requested: ${item.quantity}, Available: ${product.stock}`
        );
        continue;
      }

      // Decrement stock atomically
      updatePromises.push(
        Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { new: true }
        )
      );
    } catch (err) {
      stockErrors.push(`Error checking inventory for '${item.name}': ${err.message}`);
    }
  }

  if (stockErrors.length > 0) {
    return { success: false, errors: stockErrors };
  }

  // Execute atomic stock deductions
  await Promise.all(updatePromises);
  return { success: true, errors: [] };
};

module.exports = {
  verifyAndDeductStock,
};
