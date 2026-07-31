// backend/controllers/productController.js
import Product from "../models/Product.js";

const ALLOWED_PRODUCT_FIELDS = [
  "name", "description", "category", "basePrice", "images",
  "totalStock", "isFeatured", "isActive",
];

const pickProductFields = (body) => {
  const payload = {};
  for (const key of ALLOWED_PRODUCT_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  return payload;
};

// ── GET /api/products ────────────────────────────────────────────────────────
export const getProducts = async (req, res) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      limit, featured, sort,
      page = 1, pageSize = 12,
    } = req.query;

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

    const total = await Product.countDocuments(query);

    let q = Product.find(query).populate("category", "name slug");

    if (sort === "price-asc") q = q.sort({ basePrice: 1 });
    else if (sort === "price-desc") q = q.sort({ basePrice: -1 });
    else q = q.sort({ createdAt: -1 });

    if (limit) {
      q = q.limit(Number(limit));
      const products = await q;
      return res.json(products);
    } else {
      const currentPage = Math.max(1, Number(page));
      const size = Math.max(1, Number(pageSize));
      q = q.skip((currentPage - 1) * size).limit(size);
    }

    const products = await q;

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    });
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

// ── GET /api/products/:id ────────────────────────────────────────────────────
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/products (admin only) ─────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(pickProductFields(req.body));
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ── PUT /api/products/:id (admin only) ──────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      pickProductFields(req.body),
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
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

// ── GET /api/products/search?q=... ──────────────────────────────────────────
export const searchProducts = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 1) return res.json([]);

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

// ── GET /api/products/recommendations/:productId ─────────────────────────────
export const getRecommendations = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const recommendations = await Product.find({
      _id: { $ne: req.params.productId },
      category: product.category,
      isActive: true,
    })
      .limit(4)
      .select("name images basePrice totalStock category");

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch recommendations." });
  }
};