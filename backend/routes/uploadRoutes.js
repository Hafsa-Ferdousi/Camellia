import express from "express";
import fs from "fs";
import path from "path";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { upload, uploadDir } from "../middleware/upload.js";

const router = express.Router();

// POST /api/upload (admin only) — accepts a single "image" file, saves it to
// frontend/public/uploads/, and returns the public URL to store on the
// product/category record.
router.post("/", protect, adminOnly, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// DELETE /api/upload (admin only) — removes a previously uploaded file from
// disk once it's no longer referenced by a product/category, so replacing
// or removing an image doesn't leave orphaned files behind. Only accepts
// URLs pointing inside uploadDir to prevent path traversal.
router.delete("/", protect, adminOnly, (req, res) => {
  const { url } = req.body || {};
  if (typeof url !== "string" || !url.startsWith("/uploads/")) {
    return res.status(400).json({ message: "Invalid image url." });
  }
  const filePath = path.join(uploadDir, path.basename(url));
  if (path.dirname(filePath) !== uploadDir) {
    return res.status(400).json({ message: "Invalid image url." });
  }
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") return res.status(500).json({ message: "Failed to delete image." });
    res.json({ message: "Image deleted." });
  });
});

export default router;
