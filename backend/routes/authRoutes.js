import express from "express";
import {
  registerUser,
  loginUser,
  verifyTwoFactorLogin,
  refreshAccessToken,
  logoutUser,
  getMe,
  updateProfile,
  updateDefaultAddress,
  deleteAccount,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  verifyEmailOtp,
  resendEmailOtp,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { loginLimiter, sensitiveActionLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Core auth
router.post("/register", sensitiveActionLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/2fa/verify", loginLimiter, verifyTwoFactorLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.put("/me/address", protect, updateDefaultAddress);
router.delete("/me", protect, sensitiveActionLimiter, deleteAccount);

// Email verification (OTP sent at registration)
router.post("/verify-email", sensitiveActionLimiter, verifyEmailOtp);
router.post("/resend-otp", sensitiveActionLimiter, resendEmailOtp);

// Email verification (OTP sent at registration)
router.post("/verify-email", sensitiveActionLimiter, verifyEmailOtp);
router.post("/resend-otp", sensitiveActionLimiter, resendEmailOtp);

// Password reset — via the security question chosen at registration (no email service)
router.post("/forgot-password/question", sensitiveActionLimiter, getSecurityQuestion);
router.post("/forgot-password/reset", sensitiveActionLimiter, resetPasswordWithAnswer);

// 2FA management (requires being logged in)
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/verify-setup", protect, verifyTwoFactorSetup);
router.post("/2fa/disable", protect, disableTwoFactor);

export default router;
