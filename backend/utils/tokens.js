import crypto from "crypto";
import jwt from "jsonwebtoken";

// --- Short-lived JWT access token ---
export const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
export const generateAccessToken = (id) =>
  jwt.sign({ id, type: "access" }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });

// --- Short-lived JWT used only to complete a pending 2FA challenge ---
export const generateTwoFactorTempToken = (id) =>
  jwt.sign({ id, type: "2fa_pending" }, process.env.JWT_SECRET, { expiresIn: "5m" });

// --- Opaque, high-entropy tokens for email verify / password reset / refresh ---
// We hand the raw token to the client (in the email link) and store only a
// SHA-256 hash server-side. A leaked DB is then useless for replaying them.
export const generateRawToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// OTPs are shorter-lived than the link tokens they accompany — they're
// meant to be typed in within a couple of minutes of receiving the email.
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const generateOTP = () => crypto.randomInt(100000, 999999).toString();

export const REFRESH_COOKIE_NAME = "refreshToken";

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth", // only sent to auth endpoints that need it
  maxAge: REFRESH_TOKEN_TTL_MS,
});
