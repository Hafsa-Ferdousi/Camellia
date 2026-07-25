import client from "./client";
import { setAccessToken, clearAccessToken } from "./tokenStore";

export const register = (data) => client.post("/auth/register", data);

// identifier can be email or username — backend accepts both.
// Returns either the logged-in user (with token already stored), or
// { twoFactorRequired: true, tempToken } if the account has 2FA enabled.
export const login = async (identifier, password) => {
  const payload = identifier.includes("@")
    ? { email: identifier, password }
    : { username: identifier, password };
  const res = await client.post("/auth/login", payload);
  if (res.data.twoFactorRequired) return res.data;
  setAccessToken(res.data.token);
  return res.data;
};

export const verifyTwoFactorLogin = async (tempToken, code) => {
  const res = await client.post("/auth/2fa/verify", { tempToken, code });
  setAccessToken(res.data.token);
  return res.data;
};

export const logout = async () => {
  clearAccessToken();
  try { await client.post("/auth/logout"); } catch { /* best-effort */ }
};

export const getMe = () => client.get("/auth/me");

// --- Password reset (via security question — no email service) ---
export const getSecurityQuestion = (identifier) => client.post("/auth/forgot-password/question", { identifier });
export const resetPasswordWithAnswer = (identifier, answer, password) =>
  client.post("/auth/forgot-password/reset", { identifier, answer, password });

// --- Two-factor management (requires being logged in) ---
export const setupTwoFactor = () => client.post("/auth/2fa/setup");
export const confirmTwoFactorSetup = (code) => client.post("/auth/2fa/verify-setup", { code });
export const disableTwoFactor = (password) => client.post("/auth/2fa/disable", { password });
