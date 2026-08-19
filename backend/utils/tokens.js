import crypto from "crypto";
import jwt from "jsonwebtoken";

// --- Short-lived JWT access token ---
export const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
export const generateAccessToken = (id) =>
  jwt.sign({ id, type: "access" }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });

// --- Short-lived JWT used only to complete a pending 2FA challenge ---
export const generateTwoFactorTempToken = (id) =>
  jwt.sign({ id, type: "2fa_pending" }, process.env.JWT_SECRET, { expiresIn: "5m" });

// --- Opaque, high-entropy refresh tokens ---
// We hand the raw token to the client (httpOnly cookie) and store only a
// SHA-256 hash server-side. A leaked DB is then useless for replaying them.
export const generateRawToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const REFRESH_COOKIE_NAME = "refreshToken";

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/auth", // only sent to auth endpoints that need it
  maxAge: REFRESH_TOKEN_TTL_MS,
});

// Non-httpOnly companion to the refresh cookie, readable by frontend JS, so
// the app can skip the doomed-to-401 refresh call on mount for a visitor who
// was never logged in (or whose session already ended) instead of firing it
// unconditionally on every page load. Carries no secret — just a same-shaped
// presence/absence signal, always set/cleared together with the real cookie.
export const SESSION_HINT_COOKIE_NAME = "hasSession";

export const sessionHintCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: REFRESH_TOKEN_TTL_MS,
});
