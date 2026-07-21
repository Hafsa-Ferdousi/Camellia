import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  nameSnapshot: String, // product name at time of order (in case product changes later)
  quantity: Number,
  price: Number, // price at time of order
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ["cod", "bkash", "nagad", "bank"], required: true },
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  transactionId: { type: String, default: null },
  amount: { type: Number, required: true },
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
    subtotal: { type: Number, required: true },
    vat: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 60 },
    // Coupon snapshot at time of order — the discount is a flat amount off
    // the subtotal, computed and re-validated server-side at checkout.
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    originalTotal: { type: Number, default: null }, // subtotal + vat + delivery, before discount
    totalAmount: { type: Number, required: true }, // final total, after discount
    payment: paymentSchema,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;