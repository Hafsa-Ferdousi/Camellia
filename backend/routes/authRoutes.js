import express from "express";
import {
  registerUser,
  loginUser,
  verifyTwoFactorLogin,
  refreshAccessToken,
  logoutUser,
  getMe,
  verifyEmail,
  verifyEmailOtp,
  resendVerification,
  forgotPassword,
  resetPassword,
  resetPasswordWithOtp,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { loginLimiter, sensitiveActionLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// --- Core authentication ---
router.post("/register", sensitiveActionLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/2fa/verify", loginLimiter, verifyTwoFactorLogin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);

// --- Email verification (link + OTP) ---
router.post("/verify-email/:token", verifyEmail);
router.post("/verify-email-otp", sensitiveActionLimiter, verifyEmailOtp);
router.post("/resend-verification", sensitiveActionLimiter, resendVerification);

// --- Password reset (link + OTP) ---
router.post("/forgot-password", sensitiveActionLimiter, forgotPassword);
router.post("/reset-password/:token", sensitiveActionLimiter, resetPassword);
router.post("/reset-password-otp", sensitiveActionLimiter, resetPasswordWithOtp);

// --- 2FA management (authenticated) ---
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/verify-setup", protect, verifyTwoFactorSetup);
router.post("/2fa/disable", protect, disableTwoFactor);

export default router;