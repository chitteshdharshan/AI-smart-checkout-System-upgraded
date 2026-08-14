const Bill = require("../models/Bill");
const { calculateBillTotals } = require("../services/billingEngine");
const { verifyAndDeductStock } = require("../services/inventoryService");

// Generate unique invoice number: e.g. INV-20260726-8942
const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
};

// @desc    Calculate cart financial breakdown (Subtotal, GST Tax, Discount, Grand Total)
// @route   POST /api/billing/calculate
// @access  Public / Private
const calculateCart = async (req, res) => {
  try {
    const { items, discount } = req.body;
    const totals = calculateBillTotals(items, discount);
    res.json({ success: true, ...totals });
  } catch (error) {
    console.error("Cart calculation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete checkout, deduct inventory, save Bill transaction
// @route   POST /api/billing/checkout
// @access  Public / Private
const processCheckout = async (req, res) => {
  try {
    const { items, discount, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart cannot be empty" });
    }

    // 1. Calculate financials
    const totals = calculateBillTotals(items, discount);

    // 2. Verify stock & deduct inventory in MongoDB
    const inventoryResult = await verifyAndDeductStock(totals.items);
    if (!inventoryResult.success) {
      return res.status(400).json({
        success: false,
        message: "Inventory stock error",
        errors: inventoryResult.errors,
      });
    }

    // 3. Create Bill transaction record
    const billNumber = generateInvoiceNumber();
    const newBill = await Bill.create({
      billNumber: billNumber,
      user: req.user?._id || null,
      items: totals.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      taxRate: totals.taxRate,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      paymentMethod: paymentMethod || "AI-Scan",
      paymentStatus: "Paid",
    });

    res.status(201).json({
      success: true,
      message: "Checkout completed successfully!",
      bill: newBill,
    });
  } catch (error) {
    console.error("Checkout process error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get billing audit history
// @route   GET /api/billing/history
// @access  Public / Private
const getBillingHistory = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: bills.length,
      bills: bills,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single bill invoice details by ID
// @route   GET /api/billing/:id
// @access  Public / Private
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate("user", "name email");
    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill invoice not found" });
    }

    res.json({
      success: true,
      bill: bill,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  calculateCart,
  processCheckout,
  getBillingHistory,
  getBillById,
};