import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { normalizeAnswer } from "./securityQuestions.js";

// Runs once on server startup. If no admin account exists yet, creates one
// from ADMIN_* env vars — never from a hardcoded password — so deploys never
// ship a known admin credential in the repo. Idempotent: does nothing once
// an admin already exists, so it's safe to run on every boot.
export async function ensureAdminUser() {
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) return;

  const {
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_USERNAME = "admin",
    ADMIN_NAME = "Admin",
    ADMIN_PHONE,
    ADMIN_SECURITY_QUESTION,
    ADMIN_SECURITY_ANSWER,
  } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_SECURITY_QUESTION || !ADMIN_SECURITY_ANSWER) {
    console.warn(
      "⚠️  No admin account exists yet, and ADMIN_EMAIL / ADMIN_PASSWORD / " +
      "ADMIN_SECURITY_QUESTION / ADMIN_SECURITY_ANSWER are not all set in .env " +
      "— skipping admin bootstrap. Set them and restart the server to create one."
    );
    return;
  }

  const securityAnswerHash = await bcrypt.hash(normalizeAnswer(ADMIN_SECURITY_ANSWER), 10);
  await User.create({
    username: ADMIN_USERNAME,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD, // hashed by User's pre-save hook
    role: "admin",
    phone: ADMIN_PHONE,
    securityQuestion: ADMIN_SECURITY_QUESTION,
    securityAnswerHash,
  });
  console.log(`✅ Admin account bootstrapped: ${ADMIN_EMAIL}`);
}
