import multer from "multer";
import path from "path";

// Uploaded images are buffered in memory and streamed straight to Cloudinary
// by uploadRoutes.js — nothing is written to local disk, so this works the
// same whether backend and frontend are deployed together or separately.
export const CLOUDINARY_UPLOAD_FOLDER = "camellia/products";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, or GIF images are allowed."));
  }
  cb(null, true);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
