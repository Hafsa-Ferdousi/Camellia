import client from "./client";

export const requestRefund = ({ orderId, productId, quantity, requestType, reason, details, exchangeProductId, images }) =>
  client.post("/refunds", { orderId, productId, quantity, requestType, reason, details, exchangeProductId, images });

// Guest equivalent — no login, verified by orderId + the email used at
// checkout (same trust model as guestLookupOrder).
export const requestGuestRefund = ({ orderId, email, productId, quantity, requestType, reason, details, exchangeProductId, images }) =>
  client.post("/refunds/guest", { orderId, email, productId, quantity, requestType, reason, details, exchangeProductId, images });

// Uploads a single proof photo (e.g. damage, wrong item) for a return/refund
// request and returns its Cloudinary URL — called once per photo from the
// request modal, mirroring how product images are uploaded. Works for both
// logged-in and guest customers (the endpoint itself is public).
export const uploadRefundImage = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return client.post("/refunds/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getMyRefunds = () => client.get("/refunds/my");

// Return-request statuses for a guest's looked-up order(s), so Track Order
// can show the same "Return Rejected" / "Return Requested" badges
// OrderHistory shows for logged-in customers.
export const getGuestRefunds = (orderIds, email) =>
  client.post("/refunds/guest-lookup", { orderIds, email });

export const getAllRefunds = (status) =>
  client.get("/refunds", { params: status && status !== "all" ? { status } : {} });

export const updateRefundStatus = (id, status, adminNote) =>
  client.patch(`/refunds/${id}/status`, { status, adminNote });