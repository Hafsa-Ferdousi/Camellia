import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  nameSnapshot: String, // product name at time of order (in case product changes later)
  variantSku: String,
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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    address: {
      label: String,
      addressLine: String,
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
    deliveryCharge: { type: Number, default: 60 },
    totalAmount: { type: Number, required: true },
    payment: paymentSchema,
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
