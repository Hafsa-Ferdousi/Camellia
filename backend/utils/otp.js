import bcrypt from "bcryptjs";

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

export async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

export async function compareOtp(otp, hash) {
  if (!hash) return false;
  return bcrypt.compare(otp, hash);
}

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
