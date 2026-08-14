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
    // Admin-curated "Best Selling" flag for the homepage section — a manual
    // pick rather than a live units-sold aggregate, so it can't be silently
    // emptied by re-seeding/reordering products (see seedKey below) and lets
    // admins promote a new product before it has real sales history.
    isBestSeller: { type: Boolean, default: false },
    // Stable natural key ("<categorySlug>-<productNo>") used only by seed.js to
    // upsert instead of delete+recreate, so re-seeding never changes a seeded
    // product's _id and never orphans orders that reference it. Admin-created
    // products don't set this, hence sparse.
    seedKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Mirrors the actual filters used in productController.js's list/search/
// recommendation queries — every public product listing filters on
// isActive plus one of these.
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, isBestSeller: 1 });
productSchema.index({ isActive: 1, totalStock: 1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
