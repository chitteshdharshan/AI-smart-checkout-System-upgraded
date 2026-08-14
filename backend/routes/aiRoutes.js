const express = require("express");
const router = express.Router();
const cameraUpload = require("../middleware/cameraUpload");
const { detectProductsController } = require("../controllers/aiController");
const { ocrController, vlmController, embedController, faissSearchController } = require("../controllers/aiController");

router.get("/test", (req, res) => {
  res.json({ success: true, message: "AI route active" });
});

router.post("/detect", cameraUpload.single("image"), detectProductsController);
router.post("/ocr", cameraUpload.single("image"), ocrController);
router.post("/vlm", cameraUpload.single("image"), vlmController);
router.post("/embed", embedController);
router.post("/faiss/search", faissSearchController);

module.exports = router;
