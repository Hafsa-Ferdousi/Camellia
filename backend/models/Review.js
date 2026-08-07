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
// Partial (not sparse) indexes — every review document has both `user` and
// `guestEmail` present, just set to null for whichever type doesn't apply.
// A sparse index still indexes explicit nulls, so it would treat every
// logged-in review as a duplicate of every other one (all sharing
// guestEmail: null), and likewise for guest reviews sharing user: null. The
// partial filter restricts the uniqueness check to only real values.
reviewSchema.index(
  { product: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: "objectId" } } }
);
reviewSchema.index(
  { product: 1, guestEmail: 1 },
  { unique: true, partialFilterExpression: { guestEmail: { $type: "string" } } }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;