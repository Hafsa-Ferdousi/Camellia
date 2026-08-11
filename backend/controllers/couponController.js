import Coupon from "../models/Coupon.js";
import { findAndValidateCoupon } from "../utils/couponEngine.js";
import { sendError } from "../utils/errorResponse.js";

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const buildCouponPayload = (body) => {
  const payload = {
    code: String(body.code || "").trim().toUpperCase(),
    title: String(body.title || "").trim(),
    description: body.description ? String(body.description).trim() : "",
    discountType: body.discountType,
    discountValue: Number(body.discountValue),
    minimumPurchase: body.minimumPurchase !== undefined && body.minimumPurchase !== ""
      ? Number(body.minimumPurchase) : 0,
    maximumDiscount: body.maximumDiscount !== undefined && body.maximumDiscount !== "" && body.maximumDiscount !== null
      ? Number(body.maximumDiscount) : null,
    usageLimit: body.usageLimit !== undefined && body.usageLimit !== "" && body.usageLimit !== null
      ? Number(body.usageLimit) : null,
    perUserLimit: body.perUserLimit !== undefined && body.perUserLimit !== "" && body.perUserLimit !== null
      ? Number(body.perUserLimit) : null,
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    endDate: body.endDate ? new Date(body.endDate) : undefined,
    applicableProducts: asArray(body.applicableProducts),
    applicableCategories: asArray(body.applicableCategories),
    excludedProducts: asArray(body.excludedProducts),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };
  return payload;
};

const validateCouponFields = (payload, { isUpdate = false } = {}) => {
  if (!payload.code) return "Coupon code is required.";
  if (!payload.title) return "Title is required.";
  if (!["percentage", "fixed"].includes(payload.discountType)) {
    return "Discount type must be 'percentage' or 'fixed'.";
  }
  if (!Number.isFinite(payload.discountValue) || payload.discountValue <= 0) {
    return "Discount value must be a positive number.";
  }
  if (payload.discountType === "percentage" && payload.discountValue > 100) {
    return "Percentage discount cannot exceed 100.";
  }
  if (payload.minimumPurchase < 0) return "Minimum purchase cannot be negative.";
  if (payload.maximumDiscount != null && payload.maximumDiscount < 0) {
    return "Maximum discount cannot be negative.";
  }
  if (payload.usageLimit != null && payload.usageLimit < 0) return "Usage limit cannot be negative.";
  if (payload.perUserLimit != null && payload.perUserLimit < 0) return "Per-user limit cannot be negative.";
  if (!isUpdate || payload.startDate !== undefined) {
    if (!payload.startDate || isNaN(payload.startDate.getTime())) return "A valid start date is required.";
  }
  if (!isUpdate || payload.endDate !== undefined) {
    if (!payload.endDate || isNaN(payload.endDate.getTime())) return "A valid end date is required.";
  }
  if (payload.startDate && payload.endDate && payload.startDate >= payload.endDate) {
    return "End date must be after start date.";
  }
  return null;
};

// ── Admin: POST /api/admin/coupons ─────────────────────────────────────────
export const createCoupon = async (req, res) => {
  try {
    const payload = buildCouponPayload(req.body);
    const err = validateCouponFields(payload);
    if (err) return res.status(400).json({ message: err });

    const existing = await Coupon.findOne({ code: payload.code });
    if (existing) return res.status(409).json({ message: "A coupon with this code already exists." });

    const coupon = await Coupon.create({ ...payload, createdBy: req.user._id });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A coupon with this code already exists." });
    sendError(res, err);
  }
};

// ── Admin: GET /api/admin/coupons ──────────────────────────────────────────
// Supports ?search=&status=active|inactive for the admin table's search/filter.
export const getCoupons = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ code: re }, { title: re }];
    }

    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .populate("excludedProducts", "name")
      .populate("createdBy", "name email");

    res.json(coupons);
  } catch (err) {
    sendError(res, err);
  }
};

// ── Admin: GET /api/admin/coupons/:id ──────────────────────────────────────
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .populate("excludedProducts", "name")
      .populate("createdBy", "name email");
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.json(coupon);
  } catch (err) {
    sendError(res, err);
  }
};

// ── Admin: PUT /api/admin/coupons/:id ───────────────────────────────────────
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });

    const payload = buildCouponPayload({
      code: req.body.code ?? coupon.code,
      title: req.body.title ?? coupon.title,
      description: req.body.description ?? coupon.description,
      discountType: req.body.discountType ?? coupon.discountType,
      discountValue: req.body.discountValue ?? coupon.discountValue,
      minimumPurchase: req.body.minimumPurchase ?? coupon.minimumPurchase,
      maximumDiscount: req.body.maximumDiscount !== undefined ? req.body.maximumDiscount : coupon.maximumDiscount,
      usageLimit: req.body.usageLimit !== undefined ? req.body.usageLimit : coupon.usageLimit,
      perUserLimit: req.body.perUserLimit !== undefined ? req.body.perUserLimit : coupon.perUserLimit,
      startDate: req.body.startDate ?? coupon.startDate,
      endDate: req.body.endDate ?? coupon.endDate,
      applicableProducts: req.body.applicableProducts ?? coupon.applicableProducts,
      applicableCategories: req.body.applicableCategories ?? coupon.applicableCategories,
      excludedProducts: req.body.excludedProducts ?? coupon.excludedProducts,
      isActive: req.body.isActive !== undefined ? req.body.isActive : coupon.isActive,
    });

    const err = validateCouponFields(payload, { isUpdate: true });
    if (err) return res.status(400).json({ message: err });

    if (payload.code !== coupon.code) {
      const dupe = await Coupon.findOne({ code: payload.code, _id: { $ne: coupon._id } });
      if (dupe) return res.status(409).json({ message: "A coupon with this code already exists." });
    }

    Object.assign(coupon, payload);
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "A coupon with this code already exists." });
    sendError(res, err);
  }
};

// ── Admin: DELETE /api/admin/coupons/:id ───────────────────────────────────
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    res.json({ message: "Coupon deleted." });
  } catch (err) {
    sendError(res, err);
  }
};

// ── Admin: PATCH /api/admin/coupons/:id/status ─────────────────────────────
// Body: { isActive: boolean }. If omitted, just flips the current value.
export const setCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found." });
    coupon.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !coupon.isActive;
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    sendError(res, err);
  }
};

// ── Customer: POST /api/coupons/validate ───────────────────────────────────
// Body: { couponCode, cartTotal, items? } where items is optional
// [{ product, category }] for restriction checks. req.user is set when a
// logged-in customer calls this (optionalAuth middleware).
export const validateCoupon = async (req, res) => {
  try {
    const { couponCode, cartTotal, items } = req.body;
    const { coupon, discount, newTotal } = await findAndValidateCoupon({
      code: couponCode,
      cartTotal,
      items,
      userId: req.user?._id || null,
      guestEmail: req.body.guestEmail || null,
    });

    res.json({
      success: true,
      coupon: coupon.code,
      discount,
      newTotal,
      message: "Coupon Applied Successfully",
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};