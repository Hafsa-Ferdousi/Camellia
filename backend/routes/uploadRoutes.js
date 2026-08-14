import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { upload, CLOUDINARY_UPLOAD_FOLDER } from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";

const router = express.Router();

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_UPLOAD_FOLDER,
        resource_type: "image",
        // Cap dimensions and auto-optimize format/quality (mirrors upload-products.js's
        // seed pipeline) so admin-uploaded originals — often multi-MB phone photos —
        // aren't stored and served at full size to a small product thumbnail.
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });

// POST /api/upload (admin only) — accepts a single "image" file, uploads it
// to Cloudinary, and returns the delivery URL to store on the product/category
// record.
router.post("/", protect, adminOnly, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    try {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      res.status(201).json({ url: result.secure_url, publicId: result.public_id });
    } catch {
      res.status(500).json({ message: "Failed to upload image." });
    }
  });
});

// Cloudinary delivery URLs always contain "/<folder>/<public_id>[.ext]",
// optionally preceded by transformation segments and a version segment
// (v123) and followed by a query string — extracting the substring from the
// known folder prefix onward works regardless of which of those are present.
const extractPublicId = (url) => {
  const marker = `/${CLOUDINARY_UPLOAD_FOLDER}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url
    .slice(idx + 1)
    .split("?")[0]
    .replace(/\.[a-zA-Z0-9]+$/, "");
};

// DELETE /api/upload (admin only) — removes a previously uploaded image from
// Cloudinary once it's no longer referenced by a product/category, so
// replacing or removing an image doesn't leave orphaned media behind. Only
// accepts URLs whose public ID resolves inside the camellia/products folder,
// preventing callers from deleting arbitrary media in the account.
router.delete("/", protect, adminOnly, async (req, res) => {
  const { url } = req.body || {};
  const publicId = typeof url === "string" ? extractPublicId(url) : null;
  if (!publicId) {
    return res.status(400).json({ message: "Invalid image url." });
  }
  try {
    await cloudinary.uploader.destroy(publicId);
    res.json({ message: "Image deleted." });
  } catch {
    res.status(500).json({ message: "Failed to delete image." });
  }
});

export default router;
