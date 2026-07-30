// backend/routes/reviewRoutes.js
import express from "express";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A review is only allowed once the reviewer has actually received the
// product — i.e. they have a *delivered* order (not just placed/paid) that
// contains it. Checked server-side; the client never gets to assert this.
const hasDeliveredPurchase = async ({ userId, guestEmail, productId }) => {
  const query = { status: "delivered", "items.product": productId };
  if (userId) {
    query.user = userId;
  } else if (guestEmail) {
    query.isGuest = true;
    query["guestInfo.email"] = new RegExp(`^${escapeRegex(guestEmail)}$`, "i");
  } else {
    return false;
  }
  return !!(await Order.exists(query));
};

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

// ── GET /api/reviews/:productId/eligibility ─────────────────────────────────
// Lets the frontend check (before showing the review form) whether the
// current user/guest email has a delivered order for this product.
router.get("/:productId/eligibility", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { email } = req.query;

    if (req.user) {
      const alreadyReviewed = await Review.exists({ product: productId, user: req.user._id });
      const eligible = !alreadyReviewed && await hasDeliveredPurchase({ userId: req.user._id, productId });
      return res.json({ eligible, reason: alreadyReviewed ? "already_reviewed" : eligible ? null : "not_purchased" });
    }

    if (!email || !email.includes("@")) {
      return res.json({ eligible: false, reason: "email_required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const alreadyReviewed = await Review.exists({ product: productId, guestEmail: normalizedEmail });
    const eligible = !alreadyReviewed && await hasDeliveredPurchase({ guestEmail: normalizedEmail, productId });
    res.json({ eligible, reason: alreadyReviewed ? "already_reviewed" : eligible ? null : "not_purchased" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/reviews/:productId ────────────────────────────────────────────
// Only customers who have a delivered order containing this product — guest
// or logged-in — may post a review for it.
router.post("/:productId", optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment, guestName, guestEmail } = req.body;

    // 1. Validate input
    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    // 2. Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    // 3. Determine if user is logged in or guest
    let user = null;
    let userName = "";
    let guestEmailToCheck = null;

    if (req.user) {
      // LOGGED-IN USER
      user = req.user._id;
      userName = req.user.name || "User";

      // Check if logged-in user already reviewed this product
      const alreadyReviewed = await Review.findOne({
        product: productId,
        user: req.user._id,
      });
      if (alreadyReviewed) {
        return res.status(400).json({ message: "You have already reviewed this product." });
      }

      const purchased = await hasDeliveredPurchase({ userId: req.user._id, productId });
      if (!purchased) {
        return res.status(403).json({ message: "Only customers who have received this product can leave a review." });
      }
    } else {
      // GUEST USER
      if (!guestName || !guestEmail) {
        return res.status(400).json({ message: "Guest name and email are required." });
      }

      // Simple email format validation
      if (!guestEmail.includes("@") || !guestEmail.includes(".")) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }

      userName = guestName.trim();
      guestEmailToCheck = guestEmail.trim().toLowerCase();

      // Check if this guest email already reviewed this product
      const alreadyReviewed = await Review.findOne({
        product: productId,
        guestEmail: guestEmailToCheck,
      });
      if (alreadyReviewed) {
        return res.status(400).json({
          message: "You have already reviewed this product with this email.",
        });
      }

      const purchased = await hasDeliveredPurchase({ guestEmail: guestEmailToCheck, productId });
      if (!purchased) {
        return res.status(403).json({ message: "Only customers who have received this product can leave a review." });
      }
    }

    // 4. Create the review
    const review = await Review.create({
      product: productId,
      user: user, // null for guests
      guestName: guestEmailToCheck ? userName : null,
      guestEmail: guestEmailToCheck || null,
      userName: userName,
      rating: Number(rating),
      comment: comment.trim(),
    });

    // 5. Update product's average rating and total reviews
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
      return res.status(400).json({
        message: "You have already reviewed this product.",
      });
    }
    res.status(500).json({ message: error.message });
  }
});

export default router;