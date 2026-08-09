import client from "./client";

export const getBkashPaymentStatus = (orderId, guestEmail) =>
  client.get(`/payments/bkash/order/${orderId}`, { params: guestEmail ? { email: guestEmail } : {} });

export const submitBkashPayment = (orderId, payload) =>
  client.post(`/payments/bkash/${orderId}`, payload);

// Screenshot of the bKash confirmation SMS/app — form-data, returns { url }.
export const uploadBkashScreenshot = (file) => {
  const formData = new FormData();
  formData.append("image", file);
  return client.post("/payments/bkash/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
};

// Admin
export const getBkashSubmissions = (status) =>
  client.get("/payments/bkash/admin", { params: { status: status || "pending_verification" } });

export const verifyBkashPayment = (orderId, payload) =>
  client.patch(`/payments/bkash/${orderId}/verify`, payload);
