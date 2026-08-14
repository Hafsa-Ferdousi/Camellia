import express from "express";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  setCouponStatus,
  validateCoupon,
  getActiveCoupons,
  getUpcomingCoupons,
} from "../controllers/couponController.js";
import { protect, adminOnly, optionalAuth } from "../middleware/authMiddleware.js";

// ── Admin coupon management — mounted at /api/admin/coupons ────────────────
export const adminCouponRouter = express.Router();
adminCouponRouter.use(protect, adminOnly);
adminCouponRouter.post("/", createCoupon);
adminCouponRouter.get("/", getCoupons);
adminCouponRouter.get("/:id", getCouponById);
adminCouponRouter.put("/:id", updateCoupon);
adminCouponRouter.delete("/:id", deleteCoupon);
adminCouponRouter.patch("/:id/status", setCouponStatus);

// ── Customer coupon endpoints — mounted at /api/coupons ─────────────────────
export const customerCouponRouter = express.Router();
// optionalAuth: logged-in customers get their per-user usage enforced;
// guests can still validate a code (per-user limits just won't apply to them
// unless they're checking out and pass a guestEmail).
customerCouponRouter.get("/active", getActiveCoupons);
customerCouponRouter.get("/upcoming", getUpcomingCoupons);
customerCouponRouter.post("/validate", optionalAuth, validateCoupon);

export default customerCouponRouter;