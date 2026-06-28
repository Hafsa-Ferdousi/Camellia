import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String, default: null }, // which variant, if any
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

cartItemSchema.index({ user: 1, product: 1, variantSku: 1 }, { unique: true });

const CartItem = mongoose.model("CartItem", cartItemSchema);
export default CartItem;
