const express = require("express");
const router = express.Router();
const cameraUpload = require("../middleware/cameraUpload");
const { uploadCapture, getCaptureHistory } = require("../controllers/cameraController");

// Upload captured camera frame (Step 3.6)
router.post("/upload", cameraUpload.single("image"), uploadCapture);

// Audit history of captured images (Step 3.9)
router.get("/history", getCaptureHistory);

module.exports = router;
