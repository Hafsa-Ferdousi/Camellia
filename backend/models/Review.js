// backend/models/Review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // 👇 MAKE USER OPTIONAL (so guests can review)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    // 👇 NEW FIELDS FOR GUESTS
    guestName: {
      type: String,
      default: null,
    },
    guestEmail: {
      type: String,
      default: null,
    },
    // 👇 THIS WILL STORE THE DISPLAY NAME (either user.name or guestName)
    userName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate reviews:
// - For logged-in users: same user + product
// - For guests: same guestEmail + product
reviewSchema.index({ product: 1, user: 1 }, { unique: true, sparse: true });
reviewSchema.index({ product: 1, guestEmail: 1 }, { unique: true, sparse: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;