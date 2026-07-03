import client from "./client";

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
  localStorage.setItem("token", res.data.token);
  return res.data;
};

export const verifyTwoFactorLogin = async (tempToken, code) => {
  const res = await client.post("/auth/2fa/verify", { tempToken, code });
  localStorage.setItem("token", res.data.token);
  return res.data;
};

export const logout = async () => {
  localStorage.removeItem("token");
  try { await client.post("/auth/logout"); } catch { /* best-effort */ }
};

export const getMe = () => client.get("/auth/me");

// --- Email verification ---
export const verifyEmail = (token) => client.post(`/auth/verify-email/${token}`);
export const verifyEmailOtp = (email, otp) => client.post("/auth/verify-email-otp", { email, otp });
export const resendVerification = (email) => client.post("/auth/resend-verification", { email });

// --- Password reset ---
export const forgotPassword = (email) => client.post("/auth/forgot-password", { email });
export const resetPassword = (token, password) => client.post(`/auth/reset-password/${token}`, { password });
export const resetPasswordWithOtp = (email, otp, password) =>
  client.post("/auth/reset-password-otp", { email, otp, password });

// --- Two-factor management (requires being logged in) ---
export const setupTwoFactor = () => client.post("/auth/2fa/setup");
export const confirmTwoFactorSetup = (code) => client.post("/auth/2fa/verify-setup", { code });
export const disableTwoFactor = (password) => client.post("/auth/2fa/disable", { password });
