const mongoose = require("mongoose");

const captureLogSchema = new mongoose.Schema(
  {
    imagePath: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    status: {
      type: String,
      enum: ["Ready for AI Detection", "Processing", "Completed", "Failed"],
      default: "Ready for AI Detection",
    },
    mimeType: {
      type: String,
      default: "image/jpeg",
    },
    fileSize: {
      type: Number,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    detections: {
      type: Array,
      default: [],
    },
    annotatedImagePath: {
      type: String,
    },
    // AI performance timings (ms)
    yoloTime: { type: Number },
    ocrTime: { type: Number },
    vlmTime: { type: Number },
    embeddingTime: { type: Number },
    faissTime: { type: Number },
    overallAiTime: { type: Number },
    // AI analytics
    detectionConfidence: { type: Number },
    matchedProductId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    similarityScore: { type: Number },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CaptureLog", captureLogSchema);
