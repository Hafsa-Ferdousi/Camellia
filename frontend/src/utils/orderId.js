// Single source of truth for how an order's ID is displayed anywhere in the
// app (customer confirmation/history/tracking, admin order management,
// refunds, bKash review, invoice PDF). The backend assigns `guestOrderId` to
// every order at creation time (backend/controllers/orderController.js) —
// every UI must show that same value instead of deriving its own from `_id`.
export function getOrderDisplayId(order) {
  if (!order) return "";
  return order.guestOrderId || order._id?.toString().slice(-8).toUpperCase() || "";
}
