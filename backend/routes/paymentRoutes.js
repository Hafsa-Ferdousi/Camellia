import express from "express";
import {
  getBkashPaymentStatus,
  submitBkashPayment,
  getBkashSubmissions,
  verifyBkashPayment,
} from "../controllers/paymentController.js";
import { optionalAuth, protect, adminOnly } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Admin — placed first so "/admin" can't be shadowed by an :orderId route.
router.get("/bkash/admin", protect, adminOnly, getBkashSubmissions);
router.patch("/bkash/:orderId/verify", protect, adminOnly, verifyBkashPayment);

// POST /api/payments/bkash/upload — screenshot of the bKash confirmation,
// open to guests and logged-in customers alike (same pattern as returns/upload).
router.post("/bkash/upload", optionalAuth, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

router.get("/bkash/order/:orderId", optionalAuth, getBkashPaymentStatus);
router.post("/bkash/:orderId", optionalAuth, submitBkashPayment);

export default router;
