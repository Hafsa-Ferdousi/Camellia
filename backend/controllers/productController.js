// backend/controllers/productController.js
import Product from "../models/Product.js";

// Only these fields may be written via the admin product form — prevents
// arbitrary/unexpected keys (e.g. isActive, averageRating) from being set
// straight from req.body.
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

// ── GET /api/products?search=&category=&minPrice=&maxPrice=&limit=&page=&pageSize=&featured=&sort= ──
export const getProducts = async (req, res) => {
  try {
    const {
      search, category, minPrice, maxPrice,
      limit, featured, sort,
      page = 1, pageSize = 12,
    } = req.query;

    const query = { isActive: true };

    // Save search term for ranking
    const searchTerm = search;

    if (search) {
      // ✅ SMART: Search in name AND description
      query.$or = [
        { "name.en": { $regex: search, $options: "i" } },
        { "name.bn": { $regex: search, $options: "i" } },
        { "description.en": { $regex: search, $options: "i" } },
        { "description.bn": { $regex: search, $options: "i" } },
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

    // Handle limit parameter (for backward compatibility)
    if (limit) {
      q = q.limit(Number(limit));
      const products = await q;
      return res.json(products);
    }

    // Handle pagination (default behavior)
    const currentPage = Math.max(1, Number(page));
    const size = Math.max(1, Number(pageSize));
    q = q.skip((currentPage - 1) * size).limit(size);

    let products = await q;

    // ✅ SMART SEARCH RANKING: Name matches > Description matches > Featured
    if (searchTerm && products.length > 0) {
      const searchLower = searchTerm.toLowerCase();
      products.sort((a, b) => {
        const nameA = (a.name?.en || '').toLowerCase();
        const nameB = (b.name?.en || '').toLowerCase();
        const descA = (a.description?.en || '').toLowerCase();
        const descB = (b.description?.en || '').toLowerCase();

        let scoreA = 0, scoreB = 0;

        // Name match = 3 points (highest)
        if (nameA.includes(searchLower)) scoreA += 3;
        if (nameB.includes(searchLower)) scoreB += 3;

        // Description match = 1 point (lower)
        if (descA.includes(searchLower)) scoreA += 1;
        if (descB.includes(searchLower)) scoreB += 1;

        // If scores are equal, featured products come first
        if (scoreA === scoreB) {
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }
        return scoreB - scoreA;
      });
    }

    res.json({
      products,
      pagination: {
        total,
        page: currentPage,
        pageSize: size,
        totalPages: Math.ceil(total / size),
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
        { 'description.en': { $regex: query, $options: 'i' } },
        { 'description.bn': { $regex: query, $options: 'i' } },
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