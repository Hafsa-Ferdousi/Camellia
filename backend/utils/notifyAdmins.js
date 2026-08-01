import User from "../models/User.js";
import Notification from "../models/Notification.js";

// Fans a notification out to every admin account. Best-effort — a failure
// here should never block the request that triggered it (order placed,
// account verified, etc.), so callers should not await this without
// wrapping it, or should chain .catch(() => {}) like the rest of the
// notification call sites in this codebase.
export const notifyAdmins = async ({ type, title, message, order = null }) => {
  const admins = await User.find({ role: "admin" }).select("_id");
  if (!admins.length) return;
  await Notification.insertMany(
    admins.map((admin) => ({ user: admin._id, type, title, message, order }))
  );
};
