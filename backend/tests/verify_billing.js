const { calculateBillTotals } = require("../services/billingEngine");

function runBillingTests() {
  console.log("🧪 Running Billing Engine Financial Tests...");

  const sampleItems = [
    { name: "Maggi Masala 70g", price: 20.00, quantity: 2, similarity: 0.98 },
    { name: "Amul Taaza Milk 500ml", price: 27.00, quantity: 1, similarity: 0.95 },
  ];

  const totals = calculateBillTotals(sampleItems, 5.00); // ₹5 discount

  console.log("Calculated Totals:", totals);

  if (totals.subtotal !== 67.00) {
    throw new Error(`Subtotal mismatch! Expected 67.00, got ${totals.subtotal}`);
  }

  // Taxable = 67 - 5 = 62.00. Tax = 62 * 0.05 = 3.10. GrandTotal = 62 + 3.10 = 65.10
  if (totals.tax !== 3.10) {
    throw new Error(`Tax mismatch! Expected 3.10, got ${totals.tax}`);
  }

  if (totals.grandTotal !== 65.10) {
    throw new Error(`Grand total mismatch! Expected 65.10, got ${totals.grandTotal}`);
  }

  console.log("✅ All Billing Engine tests passed successfully!");
}

runBillingTests();
