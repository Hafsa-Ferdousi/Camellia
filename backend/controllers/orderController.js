import CartItem from "../models/CartItem.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Setting from "../models/Setting.js";
import { findAndValidateCoupon, recordCouponUsage } from "../utils/couponEngine.js";
import { sendOrderStatusEmail, sendPaymentConfirmedEmail } from "../utils/mailer.js";
import User from "../models/User.js";

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
};

const getDeliveryCharge = (settings, district) => {
  const match = settings.districtDeliveryCharges.find((d) => d.district === district);
  return match ? match.charge : settings.defaultDeliveryCharge;
};

// Escapes regex metacharacters in user-supplied input before it's used inside
// a RegExp — otherwise a crafted email/name lets a caller inject arbitrary
// regex (ReDoS or overly-broad matches) into the Mongo query.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── POST /api/orders/checkout (logged-in user) ──────────────────────────────
export const checkout = async (req, res) => {
  const { address, paymentMethod = "cod", items, couponCode } = req.body;

  if (!address || !address.addressLine || !address.district || !address.city || !address.phone) {
    return res.status(400).json({ message: "Delivery address is required (addressLine, district, city, phone)." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  const decrements = [];
  const rollbackStock = () =>
    Promise.all(decrements.map((d) => Product.findByIdAndUpdate(d.productId, { $inc: { totalStock: d.quantity } })));

  try {
    const settings = await Setting.getSingleton();
    let subtotal = 0;
    const orderItems = [];
    const couponLines = [];

    for (const line of items) {
      const quantity = Number(line.quantity) || 0;
      const productId = line.productId || line.product;
      if (!productId || quantity < 1) {
        throw new Error("Invalid item in cart.");
      }

      const existing = await Product.findById(productId);
      if (!existing || !existing.isActive) {
        throw new Error("A product in your cart is no longer available. Please refresh your cart.");
      }

      // Atomic conditional decrement — the stock check and the write happen
      // in one operation, so two concurrent checkouts can't both pass the
      // check and oversell the last unit.
      const product = await Product.findOneAndUpdate(
        { _id: productId, totalStock: { $gte: quantity } },
        { $inc: { totalStock: -quantity } },
        { new: true }
      );
      if (!product) {
        throw new Error(`Not enough stock for ${existing.name.en}`);
      }
      decrements.push({ productId, quantity });

      const price = product.basePrice;
      subtotal += price * quantity;
      orderItems.push({
        product: product._id,
        nameSnapshot: product.name.en,
        quantity,
        price,
      });
      couponLines.push({ product: product._id, category: product.category });
    }

    // Coupons are re-validated from scratch here — the discount amount the
    // client showed on the checkout page is never trusted directly.
    let coupon = null;
    let discountAmount = 0;
    if (couponCode) {
      const result = await findAndValidateCoupon({
        code: couponCode,
        cartTotal: subtotal,
        items: couponLines,
        userId: req.user._id,
      });
      coupon = result.coupon;
      discountAmount = result.discount;
    }

    const deliveryCharge = getDeliveryCharge(settings, address.district);
    const vat = Math.round(subtotal * settings.vatRate * 100) / 100;
    const originalTotal = subtotal + vat + deliveryCharge;
    const totalAmount = Math.round((originalTotal - discountAmount) * 100) / 100;

    // Payment status is always "pending" – admin confirms later
    const order = await Order.create({
      user: req.user._id,
      address,
      items: orderItems,
      subtotal,
      vat,
      deliveryCharge,
      couponCode: coupon ? coupon.code : null,
      discountAmount,
      originalTotal,
      totalAmount,
      payment: { method: paymentMethod, amount: totalAmount, status: "pending" },
      invoiceNumber: generateInvoiceNumber(),
    });

    if (coupon) {
      await recordCouponUsage(coupon, { userId: req.user._id });
    }

    await CartItem.deleteMany({ user: req.user._id });

    res.status(201).json(order);
  } catch (error) {
    await rollbackStock();
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/orders/guest-checkout  (no account required) ─────────────────
export const guestCheckout = async (req, res) => {
  const { items, address, paymentMethod = "cod", guestInfo, couponCode } = req.body;

  if (!address || !address.addressLine || !address.district || !address.city || !address.phone) {
    return res.status(400).json({ message: "Delivery address is required (addressLine, district, city, phone)." });
  }
  if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
    return res.status(400).json({ message: "Guest name, email, and phone are required." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  const decrements = [];
  const rollbackStock = () =>
    Promise.all(decrements.map((d) => Product.findByIdAndUpdate(d.productId, { $inc: { totalStock: d.quantity } })));

  try {
    const settings = await Setting.getSingleton();
    let subtotal = 0;
    const orderItems = [];
    const couponLines = [];

    for (const line of items) {
      const quantity = Number(line.quantity) || 0;
      if (!line.productId || quantity < 1) {
        throw new Error("Invalid item in cart.");
      }

      const existing = await Product.findById(line.productId);
      if (!existing || !existing.isActive) {
        throw new Error("A product in your cart is no longer available. Please refresh your cart.");
      }

      // Atomic conditional decrement — see checkout() for why this matters.
      const product = await Product.findOneAndUpdate(
        { _id: line.productId, totalStock: { $gte: quantity } },
        { $inc: { totalStock: -quantity } },
        { new: true }
      );
      if (!product) {
        throw new Error(`Not enough stock for ${existing.name.en}`);
      }
      decrements.push({ productId: line.productId, quantity });

      const price = product.basePrice;
      subtotal += price * quantity;
      orderItems.push({
        product: product._id,
        nameSnapshot: product.name.en,
        quantity,
        price,
      });
      couponLines.push({ product: product._id, category: product.category });
    }

    let coupon = null;
    let discountAmount = 0;
    if (couponCode) {
      const result = await findAndValidateCoupon({
        code: couponCode,
        cartTotal: subtotal,
        items: couponLines,
        guestEmail: guestInfo.email,
      });
      coupon = result.coupon;
      discountAmount = result.discount;
    }

    const deliveryCharge = getDeliveryCharge(settings, address.district);
    const vat = Math.round(subtotal * settings.vatRate * 100) / 100;
    const originalTotal = subtotal + vat + deliveryCharge;
    const totalAmount = Math.round((originalTotal - discountAmount) * 100) / 100;

    // ✅ FIXED: Payment status is always "pending" – admin confirms later
    const order = await Order.create({
      user: null,
      isGuest: true,
      guestInfo: { name: guestInfo.name, email: guestInfo.email, phone: guestInfo.phone },
      address,
      items: orderItems,
      subtotal,
      vat,
      deliveryCharge,
      couponCode: coupon ? coupon.code : null,
      discountAmount,
      originalTotal,
      totalAmount,
      payment: { method: paymentMethod, amount: totalAmount, status: "pending" },
      invoiceNumber: generateInvoiceNumber(),
    });

    if (coupon) {
      await recordCouponUsage(coupon, { guestEmail: guestInfo.email });
    }

    res.status(201).json(order);
  } catch (error) {
    await rollbackStock();
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/orders/guest-lookup  (public — no account required) ──────────
export const guestLookupOrder = async (req, res) => {
  try {
    const { orderId, email, phone, name } = req.body;

    // Email alone is never enough — it must be paired with the order ID or
    // the checkout phone number, otherwise anyone who knows a victim's email
    // could pull their name/address/order history.
    if (!email || (!orderId && !phone)) {
      return res.status(400).json({ message: "Email plus either an Order ID or phone number is required." });
    }

    const query = {
      isGuest: true,
      "guestInfo.email": new RegExp(`^${escapeRegex(email.trim())}$`, "i"),
    };

    // Option 1: Order ID + Email (most accurate)
    if (orderId) {
      if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid order ID format." });
      }
      query._id = orderId;
    }
    // Option 2: Email + Phone
    else {
      query["guestInfo.phone"] = phone.trim();
      if (name) {
        query["guestInfo.name"] = new RegExp(escapeRegex(name.trim()), "i");
      }
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("items.product", "name images");

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found for this email and phone." });
    }

    res.json({ orders });
  } catch (error) {
    console.error("Guest lookup error:", error);
    res.status(500).json({ message: "Failed to look up order. Please try again." });
  }
};

// ── GET /api/orders  (customer sees own, admin sees all) ───────────────────
export const getOrders = async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { user: req.user._id };
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone")
      .populate("items.product", "name images");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};

// ── GET /api/orders/:id ────────────────────────────────────────────────────
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name images");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role !== "admin" && (!order.user || order.user._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order." });
  }
};

// ── PATCH /api/orders/:id/status  (admin only) ────────────────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    order.status = req.body.status;

    const justMarkedPaid = req.body.status === "delivered" && order.payment.method === "cod" && order.payment.status !== "paid";
    if (justMarkedPaid) {
      order.payment.status = "paid";
    }
    await order.save();

    // Best-effort notification — never blocks the response if email fails
    // or isn't configured (see utils/mailer.js).
    const recipientEmail = order.isGuest
      ? order.guestInfo?.email
      : (await User.findById(order.user).select("email"))?.email;

    if (recipientEmail) {
      sendOrderStatusEmail(recipientEmail, {
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        status: order.status,
      }).catch(() => {});

      if (justMarkedPaid) {
        sendPaymentConfirmedEmail(recipientEmail, {
          orderId: order._id,
          invoiceNumber: order.invoiceNumber,
          amount: order.totalAmount,
        }).catch(() => {});
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status." });
  }
};

// ── PATCH /api/orders/:id/cancel  (customer can cancel pending orders) ─────
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        message: `Cannot cancel an order with status "${order.status}". Only pending orders can be cancelled.`,
      });
    }

    for (const item of order.items) {
      if (item.product) {
        if (item.variantSku) {
          const variant = item.product.variants?.find((v) => v.sku === item.variantSku);
          if (variant) variant.stock += item.quantity;
          await item.product.save();
        } else {
          await Product.findByIdAndUpdate(item.product._id, {
            $inc: { totalStock: item.quantity },
          });
        }
      }
    }

    order.status = "cancelled";
    await order.save();
    res.json({ message: "Order cancelled successfully.", order });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel order." });
  }
};

// ── GET /api/orders/summary  (admin only) ─────────────────────────────────
export const getOrderSummary = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const statusCounts = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order summary." });
  }
};