const mongoose = require("mongoose");

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    default: "Generic",
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  similarity: {
    type: Number,
    default: 1.0,
  },
  status: {
    type: String,
    enum: ["Match Confirmed", "Uncertain Match (Needs Review)", "Manual Entry"],
    default: "Match Confirmed",
  },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    items: [billItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    tax: {
      type: Number,
      required: true,
      default: 0.0, // GST Tax
    },
    taxRate: {
      type: Number,
      default: 0.05, // 5% GST
    },
    discount: {
      type: Number,
      default: 0.0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0.0,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "AI-Scan"],
      default: "AI-Scan",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Cancelled"],
      default: "Paid",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Bill", billSchema);