import express from "express";
import {
  createRefundRequest,
  createGuestRefundRequest,
  getMyRefunds,
  getGuestRefunds,
  getAllRefunds,
  getRefundById,
  updateRefundStatus,
} from "../controllers/refundController.js";
import { protect, adminOnly, optionalAuth } from "../middleware/authMiddleware.js";
import { upload, CLOUDINARY_REFUND_FOLDER } from "../middleware/upload.js";
import cloudinary from "../config/cloudinary.js";
import { guestLookupLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_REFUND_FOLDER,
        resource_type: "image",
        transformation: [
          { width: 1600, height: 1600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });

// POST /api/refunds/upload — proof photo(s) for a return/refund request.
// Open to guests and logged-in customers alike (optionalAuth, same pattern
// as bKash's own screenshot upload) since a guest has no JWT to send;
// createGuestRefundRequest below re-verifies the order/email regardless of
// which images were attached, so an unauthenticated upload here can't be
// used to do anything but get a Cloudinary URL back.
router.post("/upload", optionalAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    try {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      res.status(201).json({ url: result.secure_url });
    } catch {
      res.status(500).json({ message: "Failed to upload image." });
    }
  });
});

// Guest routes — verified by matching orderId + guest email instead of a
// JWT (same trust model as /orders/guest-lookup). Rate-limited for the same
// reason that lookup is: it's an unauthenticated endpoint doing an email
// match against order data.
router.post("/guest", guestLookupLimiter, createGuestRefundRequest);
router.post("/guest-lookup", guestLookupLimiter, getGuestRefunds);

router.post("/", protect, createRefundRequest);
router.get("/my", protect, getMyRefunds);
router.get("/", protect, adminOnly, getAllRefunds);
router.patch("/:id/status", protect, adminOnly, updateRefundStatus);
router.get("/:id", protect, getRefundById);

export default router;