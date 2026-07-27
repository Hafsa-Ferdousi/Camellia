import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      bn: { type: String },
    },
    description: {
      en: { type: String },
      bn: { type: String },
    },
    // Rating
averageRating: {
  type: Number,
  default: 0,
},
totalReviews: {
  type: Number,
  default: 0,
},
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    basePrice: { type: Number, required: true, min: 0 },
    images: [String],
    totalStock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    // BUG FIX #16: Added isFeatured field (was missing, breaking featured filter)
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
