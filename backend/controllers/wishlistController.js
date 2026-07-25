import Wishlist from "../models/Wishlist.js";

// ── GET /api/wishlist ─────────────────────────────────────────────────────
export const getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.find({ user: req.user._id })
      .populate("product", "name images basePrice totalStock isActive")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch wishlist." });
  }
};

// ── POST /api/wishlist ────────────────────────────────────────────────────
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "Product ID is required." });

    const existing = await Wishlist.findOne({ user: req.user._id, product: productId });
    if (existing) return res.status(400).json({ message: "Product already in wishlist." });

    const item = await Wishlist.create({ user: req.user._id, product: productId });
    await item.populate("product", "name images basePrice totalStock isActive");
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to add to wishlist." });
  }
};

// ── DELETE /api/wishlist/:productId ──────────────────────────────────────
export const removeFromWishlist = async (req, res) => {
  try {
    const item = await Wishlist.findOneAndDelete({
      user: req.user._id,
      product: req.params.productId,
    });
    if (!item) return res.status(404).json({ message: "Item not found in wishlist." });
    res.json({ message: "Removed from wishlist." });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from wishlist." });
  }
};

// ── DELETE /api/wishlist/clear ────────────────────────────────────────────
export const clearWishlist = async (req, res) => {
  try {
    await Wishlist.deleteMany({ user: req.user._id });
    res.json({ message: "Wishlist cleared." });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear wishlist." });
  }
};