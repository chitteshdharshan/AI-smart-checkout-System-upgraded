const mongoose = require("mongoose");

// Sub-document for a single Cloudinary image reference.
// url:      full Cloudinary HTTPS URL (used for display)
// publicId: Cloudinary public_id (used for deletion)
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock count is required"],
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false,
    },
    // ── Images ────────────────────────────────────────────────────────────────
    // Stored as [{url, publicId}] objects.
    // Backward-compat: old records with plain strings are handled in the
    // frontend via: img.url || img
    images: [imageSchema],

    // ── AI Integration Fields ─────────────────────────────────────────────────
    aiClassId: { type: String, default: "" },
    aiFeatureVector: { type: [Number], default: [] },
    searchableText: { type: String, default: "" },

    // ── VLM-enriched fields ───────────────────────────────────────────────────
    brand: { type: String, default: "" },
    variant: { type: String, default: "" },
    weight: { type: String, default: "" },
    subcategory: { type: String, default: "" },
    productType: { type: String, default: "" },

    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Text index for fast search by name & description
productSchema.index({ name: "text", description: "text", barcode: "text" });

module.exports = mongoose.model("Product", productSchema);
