import CartItem from "../models/CartItem.js";
import Product from "../models/Product.js";

// ================= GET CART =================
export const getCart = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Unauthorized access" });

    const cartItems = await CartItem.find({
      user: req.user._id,
    }).populate("product");

    const totalItems = cartItems.length;

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + (item.price || item.product?.price || 0) * item.quantity,
      0
    );

    res.json({
      cartItems,
      totalItems,
      totalPrice,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= ADD =================
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId)
      return res.status(400).json({
        message: "Product ID is required",
      });

    if (!quantity || quantity < 1)
      return res.status(400).json({
        message: "Invalid quantity",
      });

    const product = await Product.findById(productId);

    if (!product)
      return res.status(404).json({
        message: "Product not found",
      });

    const stock = product.stock ?? product.totalStock ?? 0;

    if (quantity > stock)
      return res.status(400).json({
        message: "Quantity exceeds stock",
      });

    let cartItem = await CartItem.findOne({
      user: req.user._id,
      product: productId,
    });

    if (cartItem) {
      cartItem.quantity += quantity;
      await cartItem.save();

      return res.json({
        message: "Cart item updated",
        cartItem,
      });
    }

    cartItem = await CartItem.create({
      user: req.user._id,
      product: productId,
      quantity,
      price: product.price,
    });

    res.status(201).json({
      message: "Item added to cart",
      cartItem,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= INCREASE =================
export const increaseQuantity = async (req, res) => {
  try {
    const item = await CartItem.findById(req.params.cartItemId);

    if (!item)
      return res.status(404).json({
        message: "Cart item not found",
      });

    const product = await Product.findById(item.product);

    const stock = product.stock ?? product.totalStock ?? 0;

    if (item.quantity >= stock)
      return res.status(400).json({
        message: "Not enough stock",
      });

    item.quantity++;

    await item.save();

    res.json({
      message: "Quantity increased",
      cartItem: item,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= DECREASE =================
export const decreaseQuantity = async (req, res) => {
  try {
    const item = await CartItem.findById(req.params.cartItemId);

    if (!item)
      return res.status(404).json({
        message: "Cart item not found",
      });

    if (item.quantity <= 1) {
      await item.deleteOne();

      return res.json({
        message: "Item removed",
      });
    }

    item.quantity--;

    await item.save();

    res.json({
      message: "Quantity decreased",
      cartItem: item,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= REMOVE =================
export const removeFromCart = async (req, res) => {
  try {
    const item = await CartItem.findById(req.params.cartItemId);

    if (!item)
      return res.status(404).json({
        message: "Cart item not found",
      });

    if (String(item.user) !== String(req.user._id))
      return res.status(403).json({
        message: "Unauthorized access",
      });

    await CartItem.findByIdAndDelete(req.params.cartItemId);

    res.json({
      message: "Item removed from cart",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= EMPTY =================
export const emptyCart = async (req, res) => {
  try {
    await CartItem.deleteMany({
      user: req.user._id,
    });

    res.json({
      message: "Cart emptied successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// ================= UPDATE =================
export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity < 0)
      return res.status(400).json({
        message: "Invalid quantity",
      });

    const item = await CartItem.findById(req.params.cartItemId);

    if (!item)
      return res.status(404).json({
        message: "Cart item not found",
      });

    if (quantity === 0) {
      await item.deleteOne();

      return res.json({
        message: "Item removed",
      });
    }

    const product = await Product.findById(item.product);

    const stock = product.stock ?? product.totalStock ?? 0;

    if (quantity > stock)
      return res.status(400).json({
        message: "Quantity exceeds stock",
      });

    item.quantity = quantity;

    await item.save();

    res.json({
      message: "Cart item updated",
      cartItem: item,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};