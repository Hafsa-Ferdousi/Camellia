import client from "./client";

export const requestRefund = ({ orderId, productId, quantity, requestType, reason, details }) =>
  client.post("/refunds", { orderId, productId, quantity, requestType, reason, details });

export const getMyRefunds = () => client.get("/refunds/my");

export const getAllRefunds = (status) =>
  client.get("/refunds", { params: status && status !== "all" ? { status } : {} });

export const updateRefundStatus = (id, status, adminNote) =>
  client.patch(`/refunds/${id}/status`, { status, adminNote });