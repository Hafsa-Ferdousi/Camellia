import Refund from "../models/Refund.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { notifyAdmins } from "../utils/notifyAdmins.js";
import { sendRefundStatusEmail } from "../utils/mailer.js";

const REASONS = ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"];
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shared by the logged-in and guest creation endpoints: validates the
// request body + the order's eligibility (delivered, within the 7-day
// window, item exists, quantity in range, exchange target valid), then
// builds (but does not save) the Refund document. Throws { status, message }
// on any validation failure so both callers can respond the same way.
const buildRefundDoc = async (order, body, submitter) => {
  const { productId, quantity, requestType = "refund", reason, details = "", exchangeProductId, images = [] } = body;

  if (!productId || !reason) {
    throw { status: 400, message: "productId and reason are required." };
  }
  if (!REASONS.includes(reason)) {
    throw { status: 400, message: "Invalid reason." };
  }
  if (!["refund", "replacement", "exchange"].includes(requestType)) {
    throw { status: 400, message: "Invalid request type." };
  }
  if (requestType === "exchange" && !exchangeProductId) {
    throw { status: 400, message: "Please choose which product you'd like to exchange for." };
  }
  if (!Array.isArray(images) || images.length === 0) {
    throw { status: 400, message: "Please attach at least one photo of the product so we can verify your request." };
  }
  if (images.length > 5 || images.some((u) => typeof u !== "string" || !u)) {
    throw { status: 400, message: "Please attach up to 5 valid photos." };
  }

  if (order.status !== "delivered") {
    throw { status: 400, message: "Only delivered orders are eligible for a return or exchange." };
  }

  // Returns are only accepted within 7 days of delivery. Orders delivered
  // before this feature shipped have no deliveredAt on record — fall back
  // to the order's own updatedAt so they aren't permanently blocked, but
  // any order delivered from now on is timed off the real delivery date.
  const deliveredAt = order.deliveredAt || order.updatedAt;
  const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    throw { status: 400, message: "The 7-day return window for this order has passed." };
  }

  const item = order.items.find((i) => i.product && i.product.toString() === productId);
  if (!item) throw { status: 404, message: "That product is not part of this order." };

  // The unique index on (order, item.product) only blocks a second *open*
  // (pending/approved) request — once one is processed it falls outside
  // that partial index, so without this check the same item could be
  // returned/exchanged and restocked over and over within the return
  // window. A rejected request is deliberately NOT checked here so the
  // customer can still resubmit after a fixable rejection.
  const alreadyProcessed = await Refund.findOne({
    order: order._id,
    "item.product": item.product,
    status: "processed",
  });
  if (alreadyProcessed) {
    throw { status: 400, message: "This item has already been refunded or exchanged." };
  }

  const qty = Number(quantity) || item.quantity;
  if (qty < 1 || qty > item.quantity) {
    throw { status: 400, message: `Quantity must be between 1 and ${item.quantity}.` };
  }

  let exchangeProduct;
  if (requestType === "exchange") {
    const targetProduct = await Product.findById(exchangeProductId);
    if (!targetProduct || !targetProduct.isActive) {
      throw { status: 404, message: "The product you selected for exchange is not available." };
    }
    exchangeProduct = {
      product: targetProduct._id,
      nameSnapshot: targetProduct.name?.en || targetProduct.name || "",
    };
  }

  return {
    order: order._id,
    ...submitter,
    item: {
      product: item.product,
      nameSnapshot: item.nameSnapshot,
      quantity: qty,
      price: item.price,
    },
    requestType,
    reason,
    details,
    images,
    refundAmount: Math.round(item.price * qty * 100) / 100,
    ...(exchangeProduct ? { exchangeProduct } : {}),
  };
};

export const createRefundRequest = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: "orderId is required." });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to request a return on this order." });
    }

    const doc = await buildRefundDoc(order, req.body, { user: req.user._id });
    const refund = await Refund.create(doc);

    notifyAdmins({
      type: "refund",
      title: "New return request",
      message: `${req.user.name} requested a ${doc.requestType} for ${doc.item.nameSnapshot} (order ${order.invoiceNumber}).`,
      order: order._id,
    }).catch(() => {});

    res.status(201).json(refund);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A return request is already open for this item." });
    }
    if (error.status) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: "Failed to submit return request." });
  }
};

// ── POST /api/refunds/guest  (public — no account required) ────────────────
// Same eligibility rules as the logged-in flow, but the order is looked up
// by orderId (Mongo _id or friendly ORD- guestOrderId) + a matching guest
// email instead of a JWT — mirrors guestLookupOrder's own verification.
export const createGuestRefundRequest = async (req, res) => {
  try {
    const { orderId, email } = req.body;
    if (!orderId || !email) {
      return res.status(400).json({ message: "orderId and email are required." });
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
    const query = {
      isGuest: true,
      "guestInfo.email": new RegExp(`^${escapeRegex(email.trim())}$`, "i"),
      ...(isObjectId ? { _id: orderId } : { guestOrderId: orderId }),
    };

    const order = await Order.findOne(query);
    if (!order) return res.status(404).json({ message: "Order not found for this email." });

    const doc = await buildRefundDoc(order, req.body, {
      isGuest: true,
      guestInfo: {
        name: order.guestInfo?.name || "",
        email: order.guestInfo?.email || "",
        phone: order.guestInfo?.phone || "",
      },
    });
    const refund = await Refund.create(doc);

    notifyAdmins({
      type: "refund",
      title: "New return request",
      message: `${order.guestInfo?.name || "A guest"} requested a ${doc.requestType} for ${doc.item.nameSnapshot} (order ${order.invoiceNumber}).`,
      order: order._id,
    }).catch(() => {});

    res.status(201).json(refund);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A return request is already open for this item." });
    }
    if (error.status) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: "Failed to submit return request." });
  }
};

export const getMyRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("order", "invoiceNumber guestOrderId");
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your return requests." });
  }
};

// ── POST /api/refunds/guest-lookup  (public — no account required) ─────────
// Return-request status for a guest's order(s), verified the same way as
// guestLookupOrder — so the Track Order page can show "Return Rejected" /
// "Return Requested" badges without an account.
export const getGuestRefunds = async (req, res) => {
  try {
    const { orderIds, email } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0 || !email) {
      return res.status(400).json({ message: "orderIds and email are required." });
    }

    const validOrders = await Order.find({
      _id: { $in: orderIds },
      isGuest: true,
      "guestInfo.email": new RegExp(`^${escapeRegex(email.trim())}$`, "i"),
    }).select("_id");

    // Sorted newest-first: rejected requests can be resubmitted, so the same
    // order+item can have more than one Refund doc — the frontend's
    // find()-based lookup picks whichever comes first, and it should always
    // be the latest request, not a stale rejected one.
    const refunds = await Refund.find({ order: { $in: validOrders.map((o) => o._id) } })
      .select("order item.product status requestType adminNote createdAt")
      .sort({ createdAt: -1 });
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return requests." });
  }
};

export const getAllRefunds = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }
    const refunds = await Refund.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .populate("order", "invoiceNumber guestOrderId totalAmount payment");
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return requests." });
  }
};

export const getRefundById = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id)
      .populate("user", "name email")
      .populate("order", "invoiceNumber guestOrderId totalAmount payment");
    if (!refund) return res.status(404).json({ message: "Return request not found." });

    const isOwner = refund.user && refund.user._id.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Not authorized to view this request." });
    }
    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch return request." });
  }
};

export const updateRefundStatus = async (req, res) => {
  try {
    const { status, adminNote = "" } = req.body;
    const validStatuses = ["approved", "rejected", "processed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    // An approved request can still be rejected (e.g. the admin approved by
    // mistake, or later spots a problem) — only a processed one is final.
    const allowedFrom = {
      approved: ["pending"],
      rejected: ["pending", "approved"],
      processed: ["approved"],
    };

    const update = { status };
    if (adminNote) update.adminNote = adminNote;
    if (status === "processed") {
      update.stockRestored = true;
      update.processedAt = new Date();
    }

    // Atomic find-and-update guarded by the CURRENT status, so two
    // near-simultaneous "Process" clicks can't both pass the status check
    // and both restock the item — only the request that actually wins the
    // status transition (result non-null) runs the stock update below.
    // {new: false} returns the pre-update doc, which still has the correct
    // item/order/user/requestType fields for the stock update and
    // notification below.
    const refund = await Refund.findOneAndUpdate(
      { _id: req.params.id, status: { $in: allowedFrom[status] } },
      update,
      { new: false }
    );

    if (!refund) {
      const existing = await Refund.findById(req.params.id).select("status");
      if (!existing) return res.status(404).json({ message: "Return request not found." });
      return res.status(400).json({
        message: `Cannot move a "${existing.status}" request to "${status}".`,
      });
    }

    if (status === "processed" && !refund.stockRestored) {
      await Product.findByIdAndUpdate(refund.item.product, {
        $inc: { totalStock: refund.item.quantity },
      });
    }

    // `refund` is still the pre-update snapshot ({new: false} above) — patch
    // it in memory with what was just written so the notification and the
    // response payload reflect the new status instead of the stale one.
    Object.assign(refund, update);

    if (refund.user) {
      const messages = {
        approved: `Your return request for ${refund.item.nameSnapshot} was approved.`,
        rejected: `Your return request for ${refund.item.nameSnapshot} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        processed: `Your ${refund.requestType} for ${refund.item.nameSnapshot} has been processed.`,
      };
      Notification.create({
        user: refund.user,
        type: "refund",
        title: "Return request update",
        message: messages[status],
        order: refund.order,
      }).catch(() => {});
    }

    // Best-effort email — guests have no in-app notification bell at all, so
    // this is their only way to find out a status changed (mirrors how
    // orderController.js emails guests unconditionally on order status
    // changes). Registered users additionally get one unless they've turned
    // email notifications off — the bell above always fires for them either
    // way, so this is a bonus channel, not their only one.
    const emailArgs = {
      itemName: refund.item.nameSnapshot,
      requestType: refund.requestType,
      status,
      adminNote,
    };
    if (refund.isGuest) {
      if (refund.guestInfo?.email) {
        sendRefundStatusEmail(refund.guestInfo.email, emailArgs).catch(() => {});
      }
    } else if (refund.user) {
      User.findById(refund.user).select("email notificationsEnabled")
        .then((u) => {
          if (u?.email && u.notificationsEnabled) {
            sendRefundStatusEmail(u.email, emailArgs).catch(() => {});
          }
        })
        .catch(() => {});
    }

    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: "Failed to update return request." });
  }
};