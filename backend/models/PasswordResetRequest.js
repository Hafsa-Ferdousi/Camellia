// backend/models/PasswordResetRequest.js
//
// Created when a customer can't complete the self-service security-question
// reset (ForgotPassword.jsx "forgot your answer too?" fallback). Admin
// reviews these in the "Password Requests" queue and resets the password
// manually from the customer's detail modal (adminController.resetCustomerPassword),
// which auto-resolves any pending request for that user.
import mongoose from "mongoose";

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, default: null, trim: true },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passwordResetRequestSchema.index({ status: 1, createdAt: -1 });

const PasswordResetRequest = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
export default PasswordResetRequest;
