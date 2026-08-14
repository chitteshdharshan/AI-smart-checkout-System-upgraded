/**
 * Billing Engine Service
 * Handles financial line-item calculations, tax rates (5% GST), discounts, and grand totals.
 */

const DEFAULT_TAX_RATE = 0.05; // 5% GST

const calculateBillTotals = (items = [], discount = 0, taxRate = DEFAULT_TAX_RATE) => {
  if (!Array.isArray(items)) {
    items = [];
  }

  let subtotal = 0;

  const processedItems = items.map((item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    const lineTotal = price * quantity;
    subtotal += lineTotal;

    return {
      product: item.product || item.product_id || null,
      name: item.name || item.product_name || "Unknown Product",
      brand: item.brand || "Generic",
      price: price,
      quantity: quantity,
      similarity: Number(item.similarity) || 1.0,
      status: item.status || "Match Confirmed",
      lineTotal: Number(lineTotal.toFixed(2)),
    };
  });

  const cleanSubtotal = Number(subtotal.toFixed(2));
  const cleanDiscount = Number(Number(discount || 0).toFixed(2));
  const taxableAmount = Math.max(0, cleanSubtotal - cleanDiscount);
  const tax = Number((taxableAmount * taxRate).toFixed(2));
  const grandTotal = Number((taxableAmount + tax).toFixed(2));

  return {
    items: processedItems,
    subtotal: cleanSubtotal,
    discount: cleanDiscount,
    taxableAmount: Number(taxableAmount.toFixed(2)),
    tax: tax,
    taxRate: taxRate,
    grandTotal: grandTotal,
  };
};

module.exports = {
  calculateBillTotals,
  DEFAULT_TAX_RATE,
};
