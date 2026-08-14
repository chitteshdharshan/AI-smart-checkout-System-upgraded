const cloudinary = require("cloudinary").v2;

// Configure Cloudinary from environment variables only — never hardcode credentials.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Delete a single image from Cloudinary by its public_id.
 * Logs errors but does NOT throw — caller decides how to handle.
 */
const deleteCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok" && result.result !== "not found") {
      console.error(`[CLOUDINARY] Failed to delete ${publicId}:`, result);
    } else {
      console.log(`[CLOUDINARY] Deleted image: ${publicId}`);
    }
  } catch (err) {
    console.error(`[CLOUDINARY] Error deleting ${publicId}:`, err.message);
  }
};

module.exports = { cloudinary, deleteCloudinaryImage };