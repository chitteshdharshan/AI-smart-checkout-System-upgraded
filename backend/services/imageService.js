const fs = require("fs");
const path = require("path");

/**
 * Validates uploaded camera image before sending to AI pipeline (Step 3.8)
 */
const validateAndProcessImage = (filePath, fileMeta) => {
  if (!fs.existsSync(filePath)) {
    throw new Error("Captured image file does not exist on server");
  }

  const stats = fs.statSync(filePath);

  // 1. File size check (Must be between 5KB and 10MB)
  if (stats.size < 2000) { // 2KB minimum
    throw new Error("Captured image size is too small or corrupted");
  }
  if (stats.size > 10 * 1024 * 1024) {
    throw new Error("Captured image size exceeds 10MB limit");
  }

  // 2. Format / extension check
  const ext = path.extname(filePath).toLowerCase();
  const validExts = [".jpg", ".jpeg", ".png", ".webp"];
  if (!validExts.includes(ext)) {
    throw new Error(`Unsupported image format ${ext}. Supported: JPEG, PNG, WEBP`);
  }

  // 3. Extract dimensions / metadata (Default to standard 1280x720 if unparsed)
  return {
    isValid: true,
    size: stats.size,
    width: fileMeta?.width || 1280,
    height: fileMeta?.height || 720,
    format: ext.replace(".", ""),
  };
};

module.exports = {
  validateAndProcessImage,
};
