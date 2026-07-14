import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User from "../models/User.js";
import { sendEmail, verificationEmailContent, passwordResetEmailContent } from "../utils/email.js";
import { validatePasswordStrength } from "../utils/validators.js";
import {
  generateAccessToken,
  generateTwoFactorTempToken,
  generateRawToken,
  hashToken,
  generateOTP,
  OTP_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../utils/tokens.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  isEmailVerified: user.isEmailVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  preferredLanguage: user.preferredLanguage,
});

// Issues a fresh access token + rotated refresh token (httpOnly cookie) for
// a user who has just completed authentication (password, or password+2FA).
async function issueSession(user, req, res) {
  const accessToken = generateAccessToken(user._id);

  const rawRefresh = generateRawToken();
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Prune anything expired, then record this session.
  user.refreshTokens = (user.refreshTokens || []).filter((t) => t.expiresAt > new Date());
  user.refreshTokens.push({ tokenHash, expiresAt, userAgent: req.headers["user-agent"] });
  await user.save({ validateBeforeSave: false });

  res.cookie(REFRESH_COOKIE_NAME, rawRefresh, refreshCookieOptions());
  return accessToken;
}

// ─────────────────────────────── Register ───────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { username, name, email, password, phone } = req.body;

    if (!username || !name || !email || !password) {
      return res.status(400).json({ message: "Username, name, email and password are required." });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    const user = await User.create({ username, name, email, password, phone });

    const rawToken = generateRawToken();
    const otp = generateOTP();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
    user.emailVerificationOtpHash = hashToken(otp);
    user.emailVerificationOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const link = `${FRONTEND_URL}/verify-email/${rawToken}`;
    await sendEmail({ to: user.email, ...verificationEmailContent(link, otp) });

    res.status(201).json({
      message: "Account created. Please check your email to verify your address before logging in.",
      email: user.email,
      // Convenience for local dev when no SMTP is configured — never sent in production.
      ...(process.env.NODE_ENV !== "production" ? { devVerifyLink: link, devOtp: otp } : {}),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ──────────────────────────── Email verification ────────────────────────
export const verifyEmail = async (req, res) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({ message: "Verification link is invalid or has expired." });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Email verified! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const otpHash = hashToken(otp);
    const user = await User.findOne({
      email,
      emailVerificationOtpHash: otpHash,
      emailVerificationOtpExpires: { $gt: new Date() },
    }).select("+emailVerificationOtpHash +emailVerificationOtpExpires");

    if (!user) {
      return res.status(400).json({ message: "Code is invalid or has expired." });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Email verified! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Same response whether or not the account exists / is already verified,
    // so this endpoint can't be used to enumerate registered emails.
    const genericResponse = { message: "If that account exists and isn't verified yet, a new email has been sent." };
    if (!user || user.isEmailVerified) return res.json(genericResponse);

    const rawToken = generateRawToken();
    const otp = generateOTP();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
    user.emailVerificationOtpHash = hashToken(otp);
    user.emailVerificationOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const link = `${FRONTEND_URL}/verify-email/${rawToken}`;
    await sendEmail({ to: user.email, ...verificationEmailContent(link, otp) });

    res.json({ ...genericResponse, ...(process.env.NODE_ENV !== "production" ? { devVerifyLink: link, devOtp: otp } : {}) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────  Login  ───────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const identifier = email || username;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Email/username and password are required." });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select("+password +loginAttempts +lockUntil +twoFactorSecret");

    // Deliberately identical message for "no such user" and "wrong password"
    // so login can't be used to enumerate valid accounts.
    const invalidCreds = () => res.status(401).json({ message: "Invalid credentials" });

    if (!user) return invalidCreds();

    if (user.isLocked()) {
      const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        message: `Account temporarily locked due to repeated failed logins. Try again in ${minutes} minute(s).`,
      });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      await user.registerFailedLogin();
      return invalidCreds();
    }
    await user.resetLoginAttempts();

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        twoFactorRequired: true,
        tempToken: generateTwoFactorTempToken(user._id),
      });
    }

    const accessToken = await issueSession(user, req, res);
    res.json({ ...publicUser(user), token: accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ───────────────────────────  2FA: complete login  ───────────────────────
export const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ message: "Temp token and code are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "2FA session expired. Please log in again." });
    }
    if (decoded.type !== "2fa_pending") {
      return res.status(401).json({ message: "Invalid 2FA session." });
    }

    const user = await User.findById(decoded.id).select("+twoFactorSecret");
    if (!user || !user.twoFactorEnabled) {
      return res.status(401).json({ message: "Invalid 2FA session." });
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: code,
      window: 1, // allow ±30s clock drift
    });
    if (!valid) return res.status(401).json({ message: "Incorrect authentication code." });

    const accessToken = await issueSession(user, req, res);
    res.json({ ...publicUser(user), token: accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────  Token refresh  ────────────────────────────
export const refreshAccessToken = async (req, res) => {
  try {
    const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawRefresh) return res.status(401).json({ message: "No refresh token." });

    const tokenHash = hashToken(rawRefresh);
    const user = await User.findOne({ "refreshTokens.tokenHash": tokenHash }).select("+refreshTokens");
    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ message: "Refresh token invalid. Please log in again." });
    }

    const entry = user.refreshTokens.find((t) => t.tokenHash === tokenHash);
    if (!entry || entry.expiresAt < new Date()) {
      // Reuse of an expired/stale token — drop it and force re-login.
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
      await user.save({ validateBeforeSave: false });
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
      return res.status(401).json({ message: "Refresh token expired. Please log in again." });
    }

    // Rotate: invalidate the used refresh token and issue a new one, so a
    // stolen-but-unused token can't be replayed after the legitimate client
    // has refreshed.
    user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    const accessToken = await issueSession(user, req, res);

    res.json({ token: accessToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────  Logout  ───────────────────────────────
export const logoutUser = async (req, res) => {
  try {
    const rawRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawRefresh) {
      const tokenHash = hashToken(rawRefresh);
      await User.updateOne({ "refreshTokens.tokenHash": tokenHash }, { $pull: { refreshTokens: { tokenHash } } });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    res.json({ message: "Logged out." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────  Password reset  ───────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return the same message — don't reveal whether the email exists.
    const genericResponse = { message: "If an account with that email exists, a reset link has been sent." };
    if (!user) return res.json(genericResponse);

    const rawToken = generateRawToken();
    const otp = generateOTP();
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    user.passwordResetOtpHash = hashToken(otp);
    user.passwordResetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    const link = `${FRONTEND_URL}/reset-password/${rawToken}`;
    await sendEmail({ to: user.email, ...passwordResetEmailContent(link, otp) });

    res.json({ ...genericResponse, ...(process.env.NODE_ENV !== "production" ? { devResetLink: link, devOtp: otp } : {}) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const tokenHash = hashToken(req.params.token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires +refreshTokens");

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    user.password = password; // re-hashed by the pre-save hook
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpires = undefined;
    // Changing the password invalidates every existing session everywhere —
    // in case the account was compromised.
    user.refreshTokens = [];
    await user.save();

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, code, and new password are required." });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const otpHash = hashToken(otp);
    const user = await User.findOne({
      email,
      passwordResetOtpHash: otpHash,
      passwordResetOtpExpires: { $gt: new Date() },
    }).select("+passwordResetOtpHash +passwordResetOtpExpires +refreshTokens");

    if (!user) {
      return res.status(400).json({ message: "Code is invalid or has expired." });
    }

    user.password = password; // re-hashed by the pre-save hook
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExpires = undefined;
    user.refreshTokens = [];
    await user.save();

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    res.json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ───────────────────────────────  Get profile  ───────────────────────────
export const getMe = async (req, res) => {
  res.json(publicUser(req.user));
};

// ───────────────────────────  2FA: setup / manage  ────────────────────────
export const setupTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled." });
    }

    const secret = speakeasy.generateSecret({
      name: `Camellia (${user.email})`,
    });
    user.twoFactorTempSecret = secret.base32;
    await user.save({ validateBeforeSave: false });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCodeDataUrl, secret: secret.base32 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyTwoFactorSetup = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id).select("+twoFactorTempSecret");
    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: "No two-factor setup in progress. Start setup again." });
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: "base32",
      token: code,
      window: 1,
    });
    if (!valid) return res.status(400).json({ message: "Incorrect code. Please try again." });

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Two-factor authentication is now enabled." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    const ok = await user.matchPassword(password || "");
    if (!ok) return res.status(401).json({ message: "Incorrect password." });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: "Two-factor authentication disabled." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
