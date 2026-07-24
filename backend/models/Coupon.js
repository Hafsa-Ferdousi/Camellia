import mongoose from "mongoose";

// Tracks how many times a coupon has been used by a specific customer so
// perUserLimit can be enforced. Registered customers are tracked by user id;
// guests (no account) are tracked by the email they checked out with.
const couponUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guestEmail: { type: String, default: null },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },

    minimumPurchase: { type: Number, default: 0, min: 0 },
    // Only meaningful for discountType "percentage" — caps how much a single
    // order can be discounted even if the percentage would give more.
    maximumDiscount: { type: Number, default: null, min: 0 },

    usageLimit: { type: Number, default: null, min: 0 }, // null = unlimited total uses
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: null, min: 0 }, // null = unlimited per customer

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    usedBy: [couponUsageSchema],
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;