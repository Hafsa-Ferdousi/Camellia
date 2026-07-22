// backend/routes/reviewRoutes.js
import express from "express";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── GET /api/reviews/:productId ─────────────────────────────────────────────
// Public — get all reviews for a product + average rating
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(20);

    const product = await Product.findById(productId);
    const averageRating = product?.averageRating || 0;
    const totalReviews = product?.totalReviews || 0;

    res.json({
      reviews,
      averageRating,
      totalReviews,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/reviews/:productId ────────────────────────────────────────────
// Protected — create a new review (user must be logged in)
router.post("/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const alreadyReviewed = await Review.findOne({
      product: productId,
      user: req.user._id,
    });
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      userName: req.user.name || "User",
      rating: Number(rating),
      comment: comment.trim(),
    });

    // Update product average rating
    const allReviews = await Review.find({ product: productId });
    const total = allReviews.reduce((acc, item) => acc + item.rating, 0);
    const average = total / allReviews.length;

    product.averageRating = average;
    product.totalReviews = allReviews.length;
    await product.save();

    res.status(201).json({
      message: "Review submitted successfully!",
      review,
      averageRating: product.averageRating,
      totalReviews: product.totalReviews,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You have already reviewed this product." });
    }
    res.status(500).json({ message: error.message });
  }
});

export default router;