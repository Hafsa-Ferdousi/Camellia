import CartItem from "../models/CartItem.js";
import Product from "../models/Product.js";

// GET /api/cart  — returns items with full product populated
export const getCart = async (req, res) => {
  const items = await CartItem.find({ user: req.user._id }).populate("product");
  res.json(items);
};

// POST /api/cart  body: { product, variantSku, quantity }
export const addToCart = async (req, res) => {
  const { product: productId, variantSku = null, quantity = 1 } = req.body;

  // BUG FIX #1: Validate product exists before adding to cart
  const product = await Product.findById(productId);
  if (!product || !product.isActive)
    return res.status(404).json({ message: "Product not found" });

  // BUG FIX #2: Check stock before adding
  if (product.totalStock < quantity)
    return res.status(400).json({ message: "Not enough stock" });

  let item = await CartItem.findOne({ user: req.user._id, product: productId, variantSku });
  if (item) {
    item.quantity += Number(quantity);
    await item.save();
  } else {
    item = await CartItem.create({ user: req.user._id, product: productId, variantSku, quantity });
  }

  // BUG FIX #3: Populate and return the item so the frontend has full data
  await item.populate("product");
  res.status(201).json(item);
};

// PATCH /api/cart/:id  body: { quantity }
export const updateCartItem = async (req, res) => {
  const item = await CartItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) return res.status(404).json({ message: "Cart item not found" });

  // BUG FIX #4: Validate quantity > 0
  const qty = Number(req.body.quantity);
  if (qty < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

  item.quantity = qty;
  await item.save();
  await item.populate("product");
  res.json(item);
};

// DELETE /api/cart/:id
export const removeCartItem = async (req, res) => {
  const item = await CartItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!item) return res.status(404).json({ message: "Cart item not found" });
  res.json({ message: "Removed from cart" });
};
