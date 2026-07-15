import CartItem from "../models/CartItem.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Setting from "../models/Setting.js";

const getDeliveryCharge = (settings, district) => {
  const match = settings.districtDeliveryCharges.find((d) => d.district === district);
  return match ? match.charge : settings.defaultDeliveryCharge;
};

// ── POST /api/orders/checkout ──────────────────────────────────────────────
export const checkout = async (req, res) => {
  const { address, paymentMethod = "cod", items } = req.body;

  if (!address || !address.addressLine || !address.district || !address.city || !address.phone) {
    return res.status(400).json({ message: "Delivery address is required (addressLine, district, city, phone)." });
  }

  // Cart lives client-side (localStorage); the client sends its current lines
  // directly, the same shape as guestCheckout, rather than relying on CartItem
  // records that would need to be synced to the backend first.
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  try {
    const settings = await Setting.getSingleton();
    let subtotal = 0;
    const orderItems = [];
    const productsToSave = [];

    for (const line of items) {
      const quantity = Number(line.quantity) || 0;
      const productId = line.productId || line.product;
      if (!productId || quantity < 1) {
        return res.status(400).json({ message: "Invalid item in cart." });
      }

      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: "A product in your cart is no longer available. Please refresh your cart." });
      }
      if (product.totalStock < quantity) {
        throw new Error(`Not enough stock for ${product.name.en}`);
      }

      const price = product.basePrice;
      product.totalStock = Math.max(0, product.totalStock - quantity);
      productsToSave.push(product);

      subtotal += price * quantity;
      orderItems.push({
        product: product._id,
        nameSnapshot: product.name.en,
        quantity,
        price,
      });
    }

    await Promise.all(productsToSave.map((p) => p.save()));

    const deliveryCharge = getDeliveryCharge(settings, address.district);
    const vat = Math.round(subtotal * settings.vatRate * 100) / 100;
    const totalAmount = subtotal + vat + deliveryCharge;

    const order = await Order.create({
      user: req.user._id,
      address,
      items: orderItems,
      subtotal,
      vat,
      deliveryCharge,
      totalAmount,
      payment: { method: paymentMethod, amount: totalAmount, status: paymentMethod === "cod" ? "pending" : "paid" },
    });

    await CartItem.deleteMany({ user: req.user._id });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/orders/guest-checkout  (no account required) ─────────────────
export const guestCheckout = async (req, res) => {
  const { items, address, paymentMethod = "cod", guestInfo } = req.body;

  if (!address || !address.addressLine || !address.district || !address.city || !address.phone) {
    return res.status(400).json({ message: "Delivery address is required (addressLine, district, city, phone)." });
  }
  if (!guestInfo || !guestInfo.name || !guestInfo.email || !guestInfo.phone) {
    return res.status(400).json({ message: "Guest name, email, and phone are required." });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  try {
    const settings = await Setting.getSingleton();
    let subtotal = 0;
    const orderItems = [];
    const productsToSave = [];

    for (const line of items) {
      const quantity = Number(line.quantity) || 0;
      if (!line.productId || quantity < 1) {
        return res.status(400).json({ message: "Invalid item in cart." });
      }

      const product = await Product.findById(line.productId);
      if (!product || !product.isActive) {
        return res.status(400).json({ message: "A product in your cart is no longer available. Please refresh your cart." });
      }
      if (product.totalStock < quantity) {
        throw new Error(`Not enough stock for ${product.name.en}`);
      }

      const price = product.basePrice;
      product.totalStock = Math.max(0, product.totalStock - quantity);
      productsToSave.push(product);

      subtotal += price * quantity;
      orderItems.push({
        product: product._id,
        nameSnapshot: product.name.en,
        quantity,
        price,
      });
    }

    await Promise.all(productsToSave.map((p) => p.save()));

    const deliveryCharge = getDeliveryCharge(settings, address.district);
    const vat = Math.round(subtotal * settings.vatRate * 100) / 100;
    const totalAmount = subtotal + vat + deliveryCharge;

    const order = await Order.create({
      user: null,
      isGuest: true,
      guestInfo: { name: guestInfo.name, email: guestInfo.email, phone: guestInfo.phone },
      address,
      items: orderItems,
      subtotal,
      vat,
      deliveryCharge,
      totalAmount,
      payment: { method: paymentMethod, amount: totalAmount, status: paymentMethod === "cod" ? "pending" : "paid" },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/orders/guest-lookup  (public — no account required) ──────────
// Guests have no login, so they can't hit the normal /orders endpoint. Instead
// they look an order up with the two things only they (and the order) would
// know: the order ID from their confirmation page/receipt, and the email
// they checked out with.
export const guestLookupOrder = async (req, res) => {
  try {
    const { orderId, email } = req.body;
    if (!orderId || !email) {
      return res.status(400).json({ message: "Order ID and email are required." });
    }

    // A malformed/garbage ID should look the same as a valid-but-not-found one.
    const notFound = () => res.status(404).json({ message: "No order found for that order ID and email." });
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) return notFound();

    const order = await Order.findOne({
      _id: orderId,
      isGuest: true,
      "guestInfo.email": new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    }).populate("items.product", "name images");

    if (!order) return notFound();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to look up order." });
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

    // Guest orders (order.user is null) can only be viewed by an admin —
    // there's no account to authorize the requester against.
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
    if (req.body.status === "delivered" && order.payment.method === "cod") {
      order.payment.status = "paid";
    }
    await order.save();
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

    // Restore stock for each item
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