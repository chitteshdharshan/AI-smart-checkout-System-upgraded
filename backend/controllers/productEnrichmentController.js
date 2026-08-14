const { enrichProductImages } = require("../services/productEnrichmentService");
const { writeTempFile, deleteTempFile } = require("../utils/cloudinaryUpload");

/**
 * POST /api/products/enrich
 * Accepts multi-image upload, runs OCR -> VLM -> Category Matching -> AI Class ID -> Embedding -> Duplicate check.
 * Returns enriched AI metadata for front-end review & auto-population.
 */
const enrichProduct = async (req, res) => {
  let tempPaths = [];
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one product image is required for AI enrichment" });
    }

    console.log(`[POST /api/products/enrich] Processing ${req.files.length} images`);

    // Write buffers to temp files for local Python AI service
    for (const file of req.files) {
      const tmpPath = await writeTempFile(file.buffer, file.originalname);
      tempPaths.push(tmpPath);
    }

    const enrichment = await enrichProductImages({
      ownerName: req.body.name || "",
      ownerDescription: req.body.description || "",
      categoryName: req.body.categoryName || "",
      imagePaths: tempPaths,
    });

    // Clean up temp files immediately
    for (const p of tempPaths) {
      await deleteTempFile(p);
    }
    tempPaths = [];

    res.json({
      success: true,
      message: "AI enrichment completed successfully",
      data: enrichment,
    });
  } catch (err) {
    console.error("[POST /api/products/enrich] Error:", err);
    for (const p of tempPaths) {
      await deleteTempFile(p);
    }
    res.status(500).json({ success: false, stage: err.stage || 'UNKNOWN', message: err.message || 'Failed to enrich product' });
  }
};

module.exports = { enrichProduct };
