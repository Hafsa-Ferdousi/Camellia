// backend/controllers/paymentController.js
import Order from "../models/Order.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { notifyAdmins } from "../utils/notifyAdmins.js";
import { sendBkashStatusEmail } from "../utils/mailer.js";

// A bKash "Send Money" transaction ID: 10 characters, letters + digits.
// Real IDs look like "9G7A1B2C3D" — validated loosely since bKash doesn't
// publish a formal spec, but this catches obvious typos/garbage.
const TRXID_PATTERN = /^[A-Z0-9]{8,12}$/;
const BD_MOBILE_PATTERN = /^01[3-9]\d{8}$/;

// Ownership check: which rule applies depends on what kind of order this
// actually is — NOT on whether the caller happens to be logged in right
// now. A guest order has no account attached, so even a logged-in request
// (e.g. an admin testing in the same browser tab) must still be checked
// against the guest email, not against req.user.
const loadOwnedOrder = async (req, orderId, guestEmail) => {
  const order = await Order.findById(orderId);
  if (!order) return { order: null, error: { status: 404, message: "Order not found." } };

  if (order.isGuest) {
    const email = (guestEmail || "").trim().toLowerCase();
    if (!email || !order.guestInfo?.email || order.guestInfo.email.toLowerCase() !== email) {
      return { order: null, error: { status: 403, message: "Order email does not match." } };
    }
  } else {
    if (!req.user || !order.user || order.user.toString() !== req.user._id.toString()) {
      return { order: null, error: { status: 403, message: "Not authorized for this order." } };
    }
  }
  return { order, error: null };
};

// ── GET /api/payments/bkash/order/:orderId ──────────────────────────────────
// Lets the customer poll/read the current verification state of their own
// order's bKash payment (used by the confirmation + order history pages).
export const getBkashPaymentStatus = async (req, res) => {
  try {
    const { order, error } = await loadOwnedOrder(req, req.params.orderId, req.query.email);
    if (error) return res.status(error.status).json({ message: error.message });
    if (order.payment.method !== "bkash") {
      return res.status(400).json({ message: "This order was not placed with bKash." });
    }
    res.json({ payment: order.payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/payments/bkash/:orderId ────────────────────────────────────────
// Body: { senderNumber, trxId, screenshot, guestEmail }
// Customer submits proof of a "Send Money" transfer for an admin to verify
// manually — this never marks the order paid by itself.
export const submitBkashPayment = async (req, res) => {
  try {
    const { senderNumber, trxId, screenshot, guestEmail } = req.body;

    if (!senderNumber || !BD_MOBILE_PATTERN.test(senderNumber)) {
      return res.status(400).json({ message: "Enter the valid 11-digit bKash number you sent the payment from." });
    }
    const cleanTrxId = String(trxId || "").trim().toUpperCase();
    if (!TRXID_PATTERN.test(cleanTrxId)) {
      return res.status(400).json({ message: "Enter a valid bKash Transaction ID (found in your bKash confirmation SMS)." });
    }

    const { order, error } = await loadOwnedOrder(req, req.params.orderId, guestEmail);
    if (error) return res.status(error.status).json({ message: error.message });

    if (order.payment.method !== "bkash") {
      return res.status(400).json({ message: "This order was not placed with bKash." });
    }
    if (order.payment.status === "paid") {
      return res.status(400).json({ message: "This order is already marked as paid." });
    }
    const currentStatus = order.payment.bkash?.verificationStatus;
    if (currentStatus === "pending_verification") {
      return res.status(400).json({ message: "A payment submission for this order is already awaiting review." });
    }
    if (currentStatus === "verified") {
      return res.status(400).json({ message: "This order's payment has already been verified." });
    }

    // Each real bKash transaction ID must be globally unique — someone
    // reusing (or mistyping into) an ID already tied to another order is
    // exactly the kind of thing manual verification exists to catch, but we
    // can reject the obvious case (exact duplicate) immediately.
    const duplicate = await Order.findOne({
      _id: { $ne: order._id },
      "payment.bkash.trxId": cleanTrxId,
      "payment.bkash.verificationStatus": { $in: ["pending_verification", "verified"] },
    });
    if (duplicate) {
      return res.status(400).json({ message: "This transaction ID has already been submitted for another order." });
    }

    order.payment.bkash = {
      senderNumber,
      trxId: cleanTrxId,
      screenshot: screenshot || null,
      submittedAt: new Date(),
      verificationStatus: "pending_verification",
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
    };
    await order.save();

    notifyAdmins({
      type: "payment",
      title: "bKash payment awaiting verification",
      message: `Order ${order.invoiceNumber} — TrxID ${cleanTrxId} needs manual verification.`,
      order: order._id,
    }).catch(() => {});

    res.status(201).json({ message: "Payment submitted for review.", payment: order.payment });
  } catch (err) {
    // A near-simultaneous duplicate can slip past the pre-check and hit the
    // unique index instead — surface that as the same friendly message.
    if (err.code === 11000) {
      return res.status(400).json({ message: "This transaction ID has already been submitted for another order." });
    }
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/payments/bkash/admin  (admin only) ──────────────────────────────
// ?status=pending_verification|verified|rejected|awaiting_submission (default: pending_verification)
export const getBkashSubmissions = async (req, res) => {
  try {
    const status = req.query.status || "pending_verification";
    const filter = { "payment.method": "bkash" };
    if (status !== "all") filter["payment.bkash.verificationStatus"] = status;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort({ "payment.bkash.submittedAt": -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PATCH /api/payments/bkash/:orderId/verify  (admin only) ─────────────────
// Body: { approve: boolean, rejectionReason }
export const verifyBkashPayment = async (req, res) => {
  try {
    const { approve, rejectionReason } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.payment.method !== "bkash") {
      return res.status(400).json({ message: "This order was not placed with bKash." });
    }
    if (order.payment.bkash?.verificationStatus !== "pending_verification") {
      return res.status(400).json({ message: "This payment isn't currently awaiting verification." });
    }

    if (approve) {
      order.payment.status = "paid";
      order.payment.transactionId = order.payment.bkash.trxId;
      order.payment.bkash.verificationStatus = "verified";
      order.payment.bkash.rejectionReason = null;
    } else {
      order.payment.bkash.verificationStatus = "rejected";
      order.payment.bkash.rejectionReason = (rejectionReason || "").trim() || "Could not be matched to a bKash transaction.";
    }
    order.payment.bkash.verifiedBy = req.user._id;
    order.payment.bkash.verifiedAt = new Date();
    await order.save();

    const recipientEmail = order.isGuest ? order.guestInfo?.email : (await User.findById(order.user).select("email"))?.email;
    if (recipientEmail) {
      sendBkashStatusEmail(recipientEmail, {
        invoiceNumber: order.invoiceNumber,
        approved: !!approve,
        rejectionReason: order.payment.bkash.rejectionReason,
      }).catch(() => {});
    }

    if (!order.isGuest && order.user) {
      Notification.create({
        user: order.user,
        type: "payment",
        title: approve ? "Payment verified" : "Payment could not be verified",
        message: approve
          ? `Your bKash payment for order ${order.invoiceNumber} has been verified.`
          : `Your bKash payment for order ${order.invoiceNumber} could not be verified. Please check and resubmit.`,
        order: order._id,
      }).catch(() => {});
    }

    res.json({ message: approve ? "Payment verified." : "Payment rejected.", payment: order.payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};