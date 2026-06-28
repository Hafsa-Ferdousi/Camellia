import CartItem from "../models/CartItem.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";

const DELIVERY_CHARGE = 80; // BUG FIX #5: Was 0, should be 80tk for COD

// POST /api/orders/checkout  body: { address, paymentMethod }
export const checkout = async (req, res) => {
  const { address, paymentMethod = "cod" } = req.body;

  // BUG FIX #6: Proper address validation matching frontend fields
  if (!address || !address.addressLine || !address.city || !address.phone) {
    return res.status(400).json({ message: "Delivery address is required (addressLine, city, phone)." });
  }

  const cartItems = await CartItem.find({ user: req.user._id }).populate("product");
  if (cartItems.length === 0) {
    return res.status(400).json({ message: "Cart is empty." });
  }

  try {
    let subtotal = 0;
    const orderItems = [];
    const productsToSave = [];

    for (const item of cartItems) {
      const product = item.product;

      // BUG FIX #7: Guard against deleted products still in cart
      if (!product || !product.isActive) {
        return res.status(400).json({ message: `A product in your cart is no longer available. Please refresh your cart.` });
      }

      let price = product.basePrice;

      if (item.variantSku) {
        const variant = product.variants.find((v) => v.sku === item.variantSku);
        if (!variant) throw new Error(`Variant ${item.variantSku} not found`);
        price = variant.price;
        if (variant.stock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name.en} (${variant.color})`);
        }
        variant.stock -= item.quantity;
      } else {
        if (product.totalStock < item.quantity) {
          throw new Error(`Not enough stock for ${product.name.en}`);
        }
      }

      product.totalStock = Math.max(0, product.totalStock - item.quantity);
      productsToSave.push(product);

      subtotal += price * item.quantity;
      orderItems.push({
        product: product._id,
        nameSnapshot: product.name.en,
        variantSku: item.variantSku,
        quantity: item.quantity,
        price,
      });
    }

    await Promise.all(productsToSave.map((p) => p.save()));

    // BUG FIX #8: COD gets delivery charge, online payment waives it
    const deliveryCharge = paymentMethod === "cod" ? DELIVERY_CHARGE : 0;
    const totalAmount = subtotal + deliveryCharge;

    const order = await Order.create({
      user: req.user._id,
      address,
      items: orderItems,
      subtotal,
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

// GET /api/orders
export const getOrders = async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { user: req.user._id };
  const orders = await Order.find(filter).sort({ createdAt: -1 }).populate("items.product", "name images");
  res.json(orders);
};

// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("items.product", "name images");
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (req.user.role !== "admin" && order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to view this order" });
  }
  res.json(order);
};

// PATCH /api/orders/:id/status  (admin only)
export const updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  order.status = req.body.status;
  // BUG FIX #9: Mark payment as paid when delivered (for COD)
  if (req.body.status === "delivered" && order.payment.method === "cod") {
    order.payment.status = "paid";
  }
  await order.save();
  res.json(order);
};
