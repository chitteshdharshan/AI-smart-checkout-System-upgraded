const multer = require("multer");
const path = require("path");

// Use memory storage so buffers are available in req.files[].buffer.
// Images are uploaded directly to Cloudinary from the buffer —
// nothing is written to local disk permanently.
const storage = multer.memoryStorage();

// File Filter — accept jpeg, jpg, png, webp only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, webp) are allowed!"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter,
});

module.exports = upload;
