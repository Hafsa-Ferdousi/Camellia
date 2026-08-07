import Refund from "../models/Refund.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import { notifyAdmins } from "../utils/notifyAdmins.js";

const REASONS = ["damaged", "wrong_item", "not_as_described", "changed_mind", "size_issue", "other"];

export const createRefundRequest = async (req, res) => {
  try {
    const { orderId, productId, quantity, requestType = "refund", reason, details = "" } = req.body;

    if (!orderId || !productId || !reason) {
      return res.status(400).json({ message: "orderId, productId, and reason are required." });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: "Invalid reason." });
    }
    if (!["refund", "exchange"].includes(requestType)) {
      return res.status(400).json({ message: "Invalid request type." });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to request a return on this order." });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders are eligible for a return or exchange." });
    }

    const item = order.items.find((i) => i.product && i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "That product is not part of this order." });

    const qty = Number(quantity) || item.quantity;
    if (qty < 1 || qty > item.quantity) {
      return res.status(400).json({ message: `Quantity must be between 1 and ${item.quantity}.` });
    }

    const refund = await Refund.create({
      order: order._id,
      user: req.user._id,
      item: {
        product: item.product,
        nameSnapshot: item.nameSnapshot,
        quantity: qty,
        price: item.price,
      },
      requestType,
      reason,
      details,
      refundAmount: Math.round(item.price * qty * 100) / 100,
    });

    notifyAdmins({
      type: "refund",
      title: "New return request",
      message: `${req.user.name} requested a ${requestType} for ${item.nameSnapshot} (order ${order.invoiceNumber}).`,
      order: order._id,
    }).catch(() => {});

    res.status(201).json(refund);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A return request is already open for this item." });
    }
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

    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: "Return request not found." });

    const allowedFrom = {
      approved: ["pending"],
      rejected: ["pending"],
      processed: ["approved"],
    };
    if (!allowedFrom[status].includes(refund.status)) {
      return res.status(400).json({
        message: `Cannot move a "${refund.status}" request to "${status}".`,
      });
    }

    refund.status = status;
    if (adminNote) refund.adminNote = adminNote;

    if (status === "processed" && !refund.stockRestored) {
      await Product.findByIdAndUpdate(refund.item.product, {
        $inc: { totalStock: refund.item.quantity },
      });
      refund.stockRestored = true;
      refund.processedAt = new Date();
    }

    await refund.save();

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

    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: "Failed to update return request." });
  }
};