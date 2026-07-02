import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  color: String,
  size: String,
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
});

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
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    basePrice: { type: Number, required: true },
    images: [String],
    variants: [variantSchema],
    totalStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // BUG FIX #16: Added isFeatured field (was missing, breaking featured filter)
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);
export default Product;
