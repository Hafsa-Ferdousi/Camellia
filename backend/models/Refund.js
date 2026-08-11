import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    item: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      nameSnapshot: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
    },

    requestType: {
      type: String,
      enum: ["refund", "replacement", "exchange"],
      default: "refund",
    },
    exchangeProduct: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      nameSnapshot: { type: String, default: "" },
    },
    reason: {
      type: String,
      enum: ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"],
      required: true,
    },
    details: { type: String, default: "", maxlength: 1000 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "processed"],
      default: "pending",
    },

    refundAmount: { type: Number, required: true },

    adminNote: { type: String, default: "" },
    stockRestored: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

refundSchema.index(
  { order: 1, "item.product": 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["pending", "approved"] } } }
);

const Refund = mongoose.model("Refund", refundSchema);
export default Refund;