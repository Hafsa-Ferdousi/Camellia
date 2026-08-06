import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User from "../models/User.js";
import CartItem from "../models/CartItem.js";
import Wishlist from "../models/Wishlist.js";
import Review from "../models/Review.js";
import { notifyAdmins } from "../utils/notifyAdmins.js";
import { validatePasswordStrength } from "../utils/validators.js";
import { SECURITY_QUESTIONS, normalizeAnswer } from "../utils/securityQuestions.js";
import { generateOtp, hashOtp, compareOtp, OTP_TTL_MS } from "../utils/otp.js";
import { sendVerificationOtpEmail } from "../utils/mailer.js";
import {
  generateAccessToken,
  generateTwoFactorTempToken,
  generateRawToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../utils/tokens.js";

const publicUser = (user) => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  twoFactorEnabled: user.twoFactorEnabled,
  preferredLanguage: user.preferredLanguage,
  addresses: user.addresses,
  notificationsEnabled: user.notificationsEnabled,
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
    const {
      username, name, email, password, phone, securityQuestion, securityAnswer,
      addressLine, district, city,
    } = req.body;

    if (!username || !name || !email || !password || !securityQuestion || !securityAnswer
      || !addressLine || !district || !city) {
      return res.status(400).json({
        message: "Username, name, email, password, security question, answer and shipping address are required.",
      });
    }
    if (!SECURITY_QUESTIONS.includes(securityQuestion)) {
      return res.status(400).json({ message: "Please choose a valid security question." });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    const securityAnswerHash = await bcrypt.hash(normalizeAnswer(securityAnswer), 10);

    const otp = generateOtp();
    const emailOtpHash = await hashOtp(otp);
    const emailOtpExpiry = new Date(Date.now() + OTP_TTL_MS);

    const addresses = [{ addressLine, district, city, phone, isDefault: true }];

    await User.create({
      username, name, email, password, phone, securityQuestion, securityAnswerHash,
      addresses,
      isEmailVerified: false,
      emailOtpHash,
      emailOtpExpiry,
    });

    await sendVerificationOtpEmail(email, otp);

    res.status(201).json({
      message: "Account created. Check your email for a verification code.",
      email,
    });
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
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in.",
        email: user.email,
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

// ──────────────────────  Password reset (security question)  ─────────────
// No email service is configured for this project, so "forgot password" is
// self-service via the secret question/answer chosen at registration
// instead of a mailed link/code.
// Deterministically picks a question from the fixed list based on the
// identifier string, so an unknown account gets a stable-looking (but fake)
// question instead of a 404 — see note below on why that matters.
const fakeQuestionFor = (identifier) => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash * 31 + identifier.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % SECURITY_QUESTIONS.length;
  return SECURITY_QUESTIONS[index];
};

export const getSecurityQuestion = async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ message: "Email or username is required." });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });

    // Always respond 200 with a question, whether or not the account exists —
    // a 404 here would let an attacker enumerate valid emails/usernames one
    // request at a time. The subsequent answer-check step already gives the
    // same "Incorrect answer" response for both wrong answers and unknown
    // accounts, so a made-up (but consistent) question for unknown accounts
    // keeps this step just as non-revealing.
    const question = user ? user.securityQuestion : fakeQuestionFor(identifier);
    res.json({ question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPasswordWithAnswer = async (req, res) => {
  try {
    const { identifier, answer, password } = req.body;
    if (!identifier || !answer || !password) {
      return res.status(400).json({ message: "Identifier, security answer, and new password are required." });
    }
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ message: strength.message });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select("+securityAnswerHash +refreshTokens");

    // Same message whether the account doesn't exist or the answer is
    // wrong, so this endpoint can't be used to enumerate accounts or
    // confirm/deny a guessed answer.
    const incorrect = () => res.status(400).json({ message: "Incorrect answer. Please try again." });
    if (!user) return incorrect();

    const match = await bcrypt.compare(normalizeAnswer(answer), user.securityAnswerHash);
    if (!match) return incorrect();

    user.password = password; // re-hashed by the pre-save hook
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

// ───────────────────────────────  Get profile  ───────────────────────────
export const getMe = async (req, res) => {
  res.json(publicUser(req.user));
};

// ──────────────────────────  Update profile / settings  ───────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, preferredLanguage, notificationsEnabled } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (preferredLanguage !== undefined) {
      if (!["en", "bn"].includes(preferredLanguage)) {
        return res.status(400).json({ message: "Invalid preferred language." });
      }
      user.preferredLanguage = preferredLanguage;
    }
    if (notificationsEnabled !== undefined) user.notificationsEnabled = !!notificationsEnabled;

    await user.save({ validateBeforeSave: false });
    res.json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────  Update default address  ──────────────────────
// This app keeps a single saved (default) address per account rather than a
// full address book — checkout reuses whichever entry has isDefault: true.
export const updateDefaultAddress = async (req, res) => {
  try {
    const { addressLine, district, city, phone } = req.body;
    if (!addressLine || !district || !city || !phone) {
      return res.status(400).json({ message: "Address line, district, city, and phone are required." });
    }

    const user = await User.findById(req.user._id);
    const entry = { addressLine, district, city, phone, isDefault: true };
    const existingIndex = user.addresses.findIndex((a) => a.isDefault);
    if (existingIndex >= 0) {
      user.addresses[existingIndex] = entry;
    } else {
      user.addresses.push(entry);
    }

    await user.save({ validateBeforeSave: false });
    res.json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────  Delete account  ───────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    // Password confirmation guards against a hijacked/left-open session
    // being used to destroy the account.
    const ok = await user.matchPassword(password || "");
    if (!ok) return res.status(401).json({ message: "Incorrect password." });

    // Orders are kept for business/legal record-keeping (Order.user is
    // optional, same as guest checkout) — everything else tied only to this
    // account is removed.
    await Promise.all([
      CartItem.deleteMany({ user: user._id }),
      Wishlist.deleteMany({ user: user._id }),
      Review.deleteMany({ user: user._id }),
    ]);
    await user.deleteOne();

    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
    res.json({ message: "Your account has been deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

// ─────────────────────  Email verification (OTP)  ────────────────────────
export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const user = await User.findOne({ email }).select("+emailOtpHash +emailOtpExpiry");
    if (!user) return res.status(400).json({ message: "Invalid email or code." });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "This account is already verified." });
    }

    if (!user.emailOtpExpiry || user.emailOtpExpiry < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }

    const ok = await compareOtp(otp, user.emailOtpHash);
    if (!ok) return res.status(400).json({ message: "Invalid or incorrect code." });

    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    notifyAdmins({
      type: "new_customer",
      title: "New customer registered",
      message: `${user.name} (${user.email}) just verified their account.`,
    }).catch(() => {});

    res.json({ message: "Email verified. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required." });

    const user = await User.findOne({ email });
    // Deliberately vague response either way, so this can't be used to
    // enumerate which emails have accounts.
    const genericOk = () => res.json({ message: "If that account needs verification, a new code has been sent." });

    if (!user || user.isEmailVerified) return genericOk();

    const otp = generateOtp();
    user.emailOtpHash = await hashOtp(otp);
    user.emailOtpExpiry = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });

    await sendVerificationOtpEmail(email, otp);
    return genericOk();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
