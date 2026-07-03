import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  label: String,
  addressLine: String,
  city: String,
  phone: String,
  isDefault: { type: Boolean, default: false },
});

<<<<<<< HEAD
// One entry per device/session that currently holds a valid refresh token.
// We never store the raw token — only its hash — so a DB leak can't be
// replayed directly.
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: String,
  },
  { _id: false }
);

=======
>>>>>>> develop
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: [addressSchema],
    preferredLanguage: { type: String, enum: ["en", "bn"], default: "en" },
<<<<<<< HEAD

    // --- Email verification ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationOtpHash: { type: String, select: false },
    emailVerificationOtpExpires: { type: Date, select: false },

    // --- Password reset ---
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpires: { type: Date, select: false },

    // --- Account lockout (brute-force protection) ---
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    // --- Two-factor authentication (TOTP) ---
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },        // active secret, once enabled
    twoFactorTempSecret: { type: String, select: false },    // pending, until confirmed

    // --- Refresh tokens (multi-device) ---
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
=======
>>>>>>> develop
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

<<<<<<< HEAD
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

userSchema.methods.registerFailedLogin = async function () {
  // If a previous lock has already expired, start counting fresh.
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts = (this.loginAttempts || 0) + 1;
    if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = async function () {
  if (this.loginAttempts || this.lockUntil) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save({ validateBeforeSave: false });
  }
};

=======
>>>>>>> develop
const User = mongoose.model("User", userSchema);
export default User;
