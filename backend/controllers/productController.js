// backend/controllers/productController.js
import Product from "../models/Product.js";

// ── GET /api/products?search=&category=&minPrice=&maxPrice=&limit=&featured= ──
export const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, limit, featured, sort } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { "name.en": { $regex: search, $options: "i" } },
        { "name.bn": { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }
    if (featured === "true") query.isFeatured = true;

    let q = Product.find(query).populate("category", "name slug");

    if (sort === "price-asc") q = q.sort({ basePrice: 1 });
    else if (sort === "price-desc") q = q.sort({ basePrice: -1 });
    else q = q.sort({ createdAt: -1 });

    if (limit) q = q.limit(Number(limit));

    const products = await q;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products/admin/all ──────────────────────────────────────────────
export const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name slug")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/products/:id ───────────────────────────────────────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/products (admin only) ──────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── PUT /api/products/:id (admin only) ──────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── DELETE /api/products/:id (admin only) ───────────────────────────────────
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================================================================
// ✅ NEW: SEARCH / AUTOCOMPLETE ENDPOINT (Added below)
// ── GET /api/products/search?q=... ──────────────────────────────────────────
export const searchProducts = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const products = await Product.find({
      isActive: true,
      $or: [
        { 'name.en': { $regex: query, $options: 'i' } },
        { 'name.bn': { $regex: query, $options: 'i' } },
      ],
    })
    .select('_id name images basePrice')
    .limit(10)
    .lean();

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};