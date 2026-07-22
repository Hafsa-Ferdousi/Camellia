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
    totalAmount: { type: Number, required: true },
    payment: paymentSchema,

    //  INVOICE NUMBER FIELD ADDED HERE
    invoiceNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;