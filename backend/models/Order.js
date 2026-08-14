// backend/models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  nameSnapshot: String,
  quantity: Number,
  price: Number,
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ["cod", "bkash", "nagad", "bank"], required: true },
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  transactionId: { type: String, default: null },
  amount: { type: Number, required: true },

  // When the order's payment actually got marked "paid". For bKash this
  // duplicates bkash.verifiedAt (kept separate so all payment methods —
  // including future ones — have one common place to check "when was this
  // paid"). For COD, set automatically when an admin marks the order
  // delivered (see updateOrderStatus in orderController.js).
  paidAt: { type: Date, default: null },

  // Free-text note for admin/staff eyes only — never shown to the
  // customer. E.g. "confirmed by phone call" or "customer paid extra for
  // express delivery, refund 50tk". Optional, no format requirements.
  adminNote: { type: String, default: null, trim: true },

  // Manual bKash "send money" verification — the customer pays a merchant/
  // personal bKash number outside the app, then submits the transaction id
  // here for an admin to cross-check against their bKash statement.
  bkash: {
    senderNumber: { type: String, default: null },
    // No `default: null` here on purpose — Mongoose would then write an
    // explicit `null` into every order's document (even non-bKash ones),
    // and a sparse index only skips a field that's truly absent, not one
    // that's present-but-null. Leaving it undefined when unset lets the
    // sparse unique index below skip non-bKash orders as intended.
    trxId: { type: String, uppercase: true, trim: true },
    screenshot: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    verificationStatus: {
      type: String,
      enum: ["not_applicable", "awaiting_submission", "pending_verification", "verified", "rejected"],
      default: "not_applicable",
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
    isGuest: { type: Boolean, default: false },
    guestInfo: {
      name: String,
      email: String,
      phone: String,
    },
    address: {
      label: String,
      addressLine: String,
      district: String,
      city: String,
      phone: String,
    },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    // Set once, the first time status transitions to "delivered" (see
    // updateOrderStatus). Anchors the 7-day return/refund eligibility
    // window — using this instead of updatedAt means a later, unrelated
    // edit (e.g. an admin note) can never accidentally extend or shift it.
    deliveredAt: { type: Date, default: null },
    subtotal: { type: Number, required: true },
    vat: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 60 },
    // Coupon snapshot at time of order
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    originalTotal: { type: Number, default: null },
    totalAmount: { type: Number, required: true },
    payment: paymentSchema,

    // Customer-facing reason when an order is cancelled automatically
    // (e.g. unpaid bKash order past the 48h window). Null for manual
    // cancellations (customer/admin already know why those happened).
    cancelReason: { type: String, default: null },

    // Invoice number (e.g., INV-20260730-1234)
    invoiceNumber: {
      type: String,
      unique: true,
    },

    // ✅ NEW: Customer‑friendly order ID for easy tracking (e.g., ORD-JOHN-789-42)
    guestOrderId: {
      type: String,
      unique: true,
      index: true, // for faster lookups in tracking page
    },
  },
  { timestamps: true }
);

// A given bKash transaction ID should never be attached to more than one
// order — sparse so orders that never submit a bKash payment (null trxId)
// don't collide with each other.
orderSchema.index({ "payment.bkash.trxId": 1 }, { unique: true, sparse: true });

// Every customer "My Orders" request filters by { user: req.user._id } and
// sorts newest-first (orderController.js) — without this every such request
// was a full collection scan.
orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;