// backend/utils/autoCancelUnpaidBkash.js
//
// Auto-cancels bKash orders that have sat in "awaiting_submission" (i.e. the
// customer never submitted a sender number + Transaction ID) for more than
// AUTO_CANCEL_HOURS. Restocks the items and emails/notifies the customer
// so they know the order didn't just silently vanish.
//
// This intentionally does NOT touch orders in "pending_verification" —
// those already have a trxId submitted and are waiting on an admin, not
// on the customer, so they should never be auto-cancelled here.

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import { sendOrderAutoCancelledEmail } from "./mailer.js";
import { notifyAdmins } from "./notifyAdmins.js";

const AUTO_CANCEL_HOURS = 48;

async function restockItems(items) {
  for (const item of items) {
    if (!item.product) continue;
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (item.variantSku) {
      const variant = product.variants?.find((v) => v.sku === item.variantSku);
      if (variant) variant.stock += item.quantity;
      await product.save();
    } else {
      await Product.findByIdAndUpdate(product._id, { $inc: { totalStock: item.quantity } });
    }
  }
}

export async function cancelUnpaidBkashOrders() {
  const cutoff = new Date(Date.now() - AUTO_CANCEL_HOURS * 60 * 60 * 1000);

  const staleOrders = await Order.find({
    "payment.method": "bkash",
    "payment.bkash.verificationStatus": "awaiting_submission",
    status: { $ne: "cancelled" },
    createdAt: { $lte: cutoff },
  }).populate("user", "email notificationsEnabled");

  for (const order of staleOrders) {
    try {
      await restockItems(order.items);

      order.status = "cancelled";
      order.payment.bkash.verificationStatus = "not_applicable";
      order.cancelReason = "Payment not received within 48 hours of placing the order.";
      await order.save();

      const recipientEmail = order.isGuest ? order.guestInfo?.email : order.user?.email;
      if (recipientEmail) {
        sendOrderAutoCancelledEmail(recipientEmail, {
          orderId: order._id,
          invoiceNumber: order.invoiceNumber,
          amount: order.totalAmount,
        }).catch(() => {});
      }

      if (!order.isGuest && order.user) {
        Notification.create({
          user: order.user._id,
          type: "order_status",
          title: "Order cancelled",
          message: `Your order ${order.invoiceNumber} was cancelled automatically because payment wasn't received within 48 hours.`,
          order: order._id,
        }).catch(() => {});
      }

      notifyAdmins({
        type: "order_status",
        title: "Order auto-cancelled (unpaid bKash)",
        message: `Order ${order.invoiceNumber} was auto-cancelled — no bKash payment submitted within 48 hours.`,
        order: order._id,
      }).catch(() => {});
    } catch (err) {
      console.error(`[autoCancelUnpaidBkash] Failed to cancel order ${order._id}:`, err.message);
    }
  }

  if (staleOrders.length > 0) {
    console.log(`[autoCancelUnpaidBkash] Cancelled ${staleOrders.length} unpaid bKash order(s).`);
  }

  return staleOrders.length;
}

// Runs immediately on server start (catches anything that went stale while
// the server was down), then every hour after that. An hourly check keeps
// the 48h cutoff accurate to within an hour without needing a separate
// cron dependency.
export function startAutoCancelScheduler() {
  cancelUnpaidBkashOrders().catch((err) =>
    console.error("[autoCancelUnpaidBkash] Initial run failed:", err.message)
  );

  setInterval(() => {
    cancelUnpaidBkashOrders().catch((err) =>
      console.error("[autoCancelUnpaidBkash] Scheduled run failed:", err.message)
    );
  }, 60 * 60 * 1000);
}
