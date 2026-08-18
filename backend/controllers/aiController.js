const { detectProducts, performOCR, performVLM, generateEmbedding, matchProduct } = require("../services/aiService");
const CaptureLog = require("../models/CaptureLog");
const { validateAndProcessImage } = require("../services/imageService");

// Existing YOLO controller
const detectProductsController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const absolutePath = req.file.path;
    const relativePath = "/uploads/captured/" + req.file.filename;
    const validation = validateAndProcessImage(absolutePath, req.body);
    const aiResponse = await detectProducts(absolutePath);
    const captureLog = await CaptureLog.create({
      imagePath: relativePath,
      filename: req.file.filename,
      user: req.user?._id || null,
      status: "Completed",
      mimeType: req.file.mimetype,
      fileSize: validation.size,
      width: validation.width,
      height: validation.height,
      detections: aiResponse.detections,
      annotatedImagePath: aiResponse.annotated_image,
    });
    res.status(200).json({
      success: true,
      logId: captureLog._id,
      original_image: relativePath,
      annotated_image: aiResponse.annotated_image,
      detections: aiResponse.detections,
    });
  } catch (error) {
    console.error("AI Detection Route Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// OCR controller
const ocrController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided for OCR" });
    }
    const result = await performOCR(req.file.path);
    res.status(200).json({ success: true, ocr: result });
  } catch (err) {
    console.error("[OCR Controller] Error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "OCR processing failed" });
  }
};

// VLM controller
const vlmController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided for VLM" });
    }
    const result = await performVLM(req.file.path);
    res.status(200).json({ success: true, vlm: result });
  } catch (err) {
    console.error("[VLM Controller] Error:", err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || "VLM processing failed" });
  }
};

// Embed controller
const embedController = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ success: false, message: "Text string required for embedding generation" });
    }
    console.log(`[EMBED] Generating embedding for input text: "${text.substring(0, 50)}..."`);
    const embedding = await generateEmbedding(text);
    const dimension = Array.isArray(embedding) ? embedding.length : 0;
    console.log(`[EMBED] Embedding dimension: ${dimension}`);

    if (dimension !== 384) {
      console.error(`[EMBED] Dimension mismatch! Expected 384, got ${dimension}`);
      return res.status(400).json({ success: false, message: `Embedding dimension mismatch: ${dimension} != 384` });
    }

    res.status(200).json({ success: true, embedding, dimension });
  } catch (err) {
    console.error("[EMBED Controller] Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Embedding generation failed" });
  }
};

// FAISS search controller
// Contract: POST /api/ai/faiss/search
//   Body: { embedding: [...], vlm: {...}, ocr_text: "...", threshold: 0.8 }
//   Accepts either pre-computed 384-dim embedding OR vlm+ocr_text payload.
const faissSearchController = async (req, res) => {
  try {
    console.log("[FAISS] Request received");

    let { embedding, vlm, ocr_text, threshold } = req.body;

    // Validate embedding if provided
    if (embedding) {
      if (!Array.isArray(embedding)) {
        return res.status(400).json({ success: false, message: "embedding must be an array of numbers" });
      }
      console.log(`[EMBED] Embedding dimension: ${embedding.length}`);
      if (embedding.length !== 384) {
        console.error(`[EMBED] Dimension mismatch: ${embedding.length} != 384`);
        return res.status(400).json({
          success: false,
          message: `Embedding dimension mismatch: expected 384, got ${embedding.length}`,
          stage: "faiss_controller",
        });
      }
      console.log(`[FAISS] Sending embedding (first 3 values: [${embedding.slice(0, 3).map(n => n.toFixed(4)).join(", ")}...])`);
    }

    // Ensure vlm is an object if provided or default to empty object
    const vlmPayload = (vlm && typeof vlm === "object") ? vlm : {};
    const effectiveThreshold = typeof threshold === "number" ? threshold : 0.50;
    const effectiveOcr = typeof ocr_text === "string" ? ocr_text : "";

    // If neither embedding nor valid vlm provided
    if (!embedding && Object.keys(vlmPayload).length === 0 && !effectiveOcr) {
      console.warn("[FAISS] Missing embedding and vlm payload in request body");
      return res.status(400).json({
        success: false,
        message: "Missing embedding or vlm payload for FAISS search.",
        stage: "faiss_controller",
      });
    }

    console.log(`[FAISS] brand=${vlmPayload.brand || "?"} product=${vlmPayload.product_name || "?"}`);
    console.log(`[FAISS] ocr_text length: ${effectiveOcr.length} chars`);

    // Call matchProduct service
    const match = await matchProduct(vlmPayload, effectiveOcr, effectiveThreshold, embedding);

    console.log(`[FAISS] Match result: matched=${match?.matched} similarity=${match?.similarity} productId=${match?.product_id || "none"}`);

    res.status(200).json({ success: true, match });
  } catch (err) {
    console.error("[FAISS Controller] Error:", err.message);
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      message: err.message || "FAISS match failed",
      stage: "faiss_controller",
    });
  }
};

module.exports = {
  detectProductsController,
  ocrController,
  vlmController,
  embedController,
  faissSearchController,
};