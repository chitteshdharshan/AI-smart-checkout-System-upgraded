const path = require("path");
const CaptureLog = require("../models/CaptureLog");
const { validateAndProcessImage } = require("../services/imageService");
const aiService = require("../services/aiService");

// @desc    Upload camera capture image for AI detection pipeline (Step 3.6 & 3.14)
// @route   POST /api/camera/upload
// @access  Public / Private
const uploadCapture = async (req, res) => {
  try {
    console.log("[CAMERA] Request received");
    if (!req.file) {
      console.log("[CAMERA] Upload failed: No file provided");
      return res.status(400).json({ success: false, message: "No image file provided in request" });
    }

    const relativePath = "/uploads/captured/" + req.file.filename;
    const absolutePath = req.file.path;
    console.log(`[CAMERA] Image received: ${req.file.filename} (${req.file.size} bytes)`);
    console.log(`[CAMERA] Image path: ${absolutePath}`);

    // Step 3.8: Validate Image
    const validation = validateAndProcessImage(absolutePath, req.body);

    // Call Python AI Service automatically
    let aiResponse = null;
    let status = "Completed";
    let aiErrorStage = null;
    let aiErrorMessage = null;
    try {
      console.log(`[AI] Calling FastAPI: detectProducts endpoint`);
      aiResponse = await aiService.detectProducts(absolutePath);
    } catch (aiErr) {
      console.error("[CAMERA] AI Service Error:", aiErr.message);
      status = "Failed";
      aiErrorStage = aiErr.stage || "ai_service";
      aiErrorMessage = aiErr.message;
    }

    // Step 3.9: Create Capture History Log
    const captureLog = await CaptureLog.create({
      imagePath: relativePath,
      filename: req.file.filename,
      user: req.user?._id || null,
      status: status,
      mimeType: req.file.mimetype,
      fileSize: validation.size,
      width: validation.width,
      height: validation.height,
      detections: aiResponse ? aiResponse.detections : [],
      annotatedImagePath: aiResponse ? (aiResponse.annotated_image || aiResponse.annotated_image_path) : null,
    });

    console.log(`[RESPONSE] Camera upload completed for log ${captureLog._id} (status: ${status})`);
    console.log(`[RESPONSE] Detections count: ${aiResponse?.detections?.length || 0}`);

    // Step 3.14: Prepare AI Interface Output Format with rich metadata & stages
    res.status(201).json({
      success: status === "Completed",
      imagePath: relativePath,
      status: status,
      logId: captureLog._id,
      annotatedImage: aiResponse ? (aiResponse.annotated_image || aiResponse.annotated_image_path) : null,
      detections: aiResponse ? aiResponse.detections : [],
      stages: aiResponse?.stages || {
        camera: { completed: true },
        yolo: { completed: status === "Completed" },
        crop: { completed: status === "Completed" },
        ocr: { completed: status === "Completed" },
        vlm: { completed: status === "Completed" },
        embedding: { completed: status === "Completed" },
        faiss: { completed: status === "Completed" },
        mongodb: { completed: status === "Completed" },
      },
      speed: aiResponse?.speed || null,
      errorStage: aiErrorStage,
      error: aiErrorMessage,
      metadata: {
        filename: req.file.filename,
        fileSize: validation.size,
        width: validation.width,
        height: validation.height,
        uploadedAt: captureLog.createdAt,
      },
    });
  } catch (error) {
    console.error("[CAMERA] Upload Exception:", error.message);
    res.status(400).json({ success: false, stage: "camera", error: error.message });
  }
};

// @desc    Get capture history audit log (Step 3.9)
// @route   GET /api/camera/history
// @access  Public / Private
const getCaptureHistory = async (req, res) => {
  try {
    const logs = await CaptureLog.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      count: logs.length,
      history: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadCapture,
  getCaptureHistory,
};
