import rateLimit from "express-rate-limit";

// Generous global ceiling so the whole API can't be hammered.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tight limiter for login: this is the endpoint brute-force attacks target.
// Account lockout (in the User model) handles a single account being
// guessed repeatedly; this handles an attacker spraying many accounts/IPs.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in a few minutes." },
});

// Shared by register / forgot-password — all of
// these can be used to spam a victim's inbox or enumerate accounts.
export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

// Guest order lookup accepts an email + order ID/phone with no account —
// without a tight limiter, an attacker could iterate guesses to find valid
// combinations and pull someone else's order details.
export const guestLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many lookup attempts. Please try again later." },
});

// Chat widget hits an external AI API on every message — capped tighter than
// the general API limiter so one visitor can't burn through the free-tier
// quota (or run up cost on a paid key) by spamming messages.
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You're sending messages too quickly. Please slow down." },
});
