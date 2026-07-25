import client from "./client";

// ── Customer ────────────────────────────────────────────────────────────
// items: optional [{ product, category }] cart lines for restriction checks.
export const validateCoupon = (couponCode, cartTotal, items, guestEmail) =>
  client.post("/coupons/validate", { couponCode, cartTotal, items, guestEmail });

// ── Admin ───────────────────────────────────────────────────────────────
export const getAllCoupons = (params) => client.get("/admin/coupons", { params });
export const getCouponById  = (id)     => client.get(`/admin/coupons/${id}`);
export const createCoupon   = (data)   => client.post("/admin/coupons", data);
export const updateCoupon   = (id, data) => client.put(`/admin/coupons/${id}`, data);
export const deleteCoupon   = (id)     => client.delete(`/admin/coupons/${id}`);
export const setCouponStatus = (id, isActive) =>
  client.patch(`/admin/coupons/${id}/status`, { isActive });
