const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const { cloudinary } = require("../config/cloud");

/**
 * Upload a file buffer directly to Cloudinary.
 *
 * @param {Buffer}  buffer        - The raw image buffer from multer memoryStorage.
 * @param {string}  originalname  - Original filename (used to detect format).
 * @param {string}  folderSlug    - Sub-folder slug inside smart-checkout/products/
 * @returns {{ url: string, publicId: string }}
 */
const uploadBufferToCloudinary = (buffer, originalname, folderSlug = "general") => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(originalname).replace(".", "").toLowerCase() || "jpg";
    const folder = `smart-checkout/products/${folderSlug}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: ext === "jpg" ? "jpeg" : ext,
        overwrite: false,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload error: ${error.message}`));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Write a buffer to a temporary file so the Python AI service can read it.
 * Temp files are stored in the OS temp directory.
 *
 * @param {Buffer} buffer
 * @param {string} originalname
 * @returns {string} absolute path to temp file
 */
const writeTempFile = async (buffer, originalname) => {
  const ext = path.extname(originalname) || ".jpg";
  const tmpDir = path.join(os.tmpdir(), "smart-checkout-tmp");
  await fsp.mkdir(tmpDir, { recursive: true });

  const tmpPath = path.join(tmpDir, `ai-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  await fsp.writeFile(tmpPath, buffer);
  return tmpPath;
};

/**
 * Delete a temporary file after AI processing. Errors are swallowed — not critical.
 *
 * @param {string} filePath
 */
const deleteTempFile = async (filePath) => {
  if (!filePath) return;
  try {
    await fsp.unlink(filePath);
  } catch (_) {
    // ignore — temp file may already be gone
  }
};

/**
 * Build a URL-safe folder slug from a product name.
 * Example: "Britannia Milk Bikis 60g" → "britannia-milk-bikis-60g"
 *
 * @param {string} name
 * @returns {string}
 */
const slugify = (name = "") =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";

module.exports = {
  uploadBufferToCloudinary,
  writeTempFile,
  deleteTempFile,
  slugify,
};
