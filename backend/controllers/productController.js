// backend/controllers/productController.js
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { sendError } from "../utils/errorResponse.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Only these fields may be written via the admin product form — prevents
// arbitrary/unexpected keys (e.g. isActive, averageRating) from being set
// straight from req.body.
const ALLOWED_PRODUCT_FIELDS = [
  "name", "description", "category", "basePrice", "images",
  "totalStock", "isFeatured", "isBestSeller", "isActive",
];

const pickProductFields = (body) => {
  const payload = {};
  for (const key of ALLOWED_PRODUCT_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  return payload;
};

// Regex-special characters in user search input (e.g. "(", "[", "*") would
// otherwise throw an invalid-regex error and turn a normal search into a 500.
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      const searchRegex = escapeRegex(search);
      query.$or = [
        { "name.en": { $regex: searchRegex, $options: "i" } },
        { "name.bn": { $regex: searchRegex, $options: "i" } },
        { "description.en": { $regex: searchRegex, $options: "i" } },
        { "description.bn": { $regex: searchRegex, $options: "i" } },
      ];
    }
    if (category) {
      if (!isValidObjectId(category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      query.category = category;
    }
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) {
        const min = Number(minPrice);
        if (Number.isNaN(min)) return res.status(400).json({ message: "Invalid minPrice" });
        query.basePrice.$gte = min;
      }
      if (maxPrice) {
        const max = Number(maxPrice);
        if (Number.isNaN(max)) return res.status(400).json({ message: "Invalid maxPrice" });
        query.basePrice.$lte = max;
      }
    }
    if (featured === "true") query.isFeatured = true;
    if (req.query.bestSeller === "true") query.isBestSeller = true;

    const total = await Product.countDocuments(query);

    // Handle limit parameter (for backward compatibility)
    if (limit) {
      const limitNum = Number(limit);
      if (Number.isNaN(limitNum)) return res.status(400).json({ message: "Invalid limit" });
      let q = Product.find(query).populate("category", "name slug");
      if (sort === "price-asc") q = q.sort({ basePrice: 1 });
      else if (sort === "price-desc") q = q.sort({ basePrice: -1 });
      else q = q.sort({ createdAt: -1 });
      q = q.limit(limitNum);
      const products = await q;
      return res.json(products);
    }

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    if (Number.isNaN(pageNum) || Number.isNaN(pageSizeNum)) {
      return res.status(400).json({ message: "Invalid page or pageSize" });
    }
    const currentPage = Math.max(1, pageNum);
    const size = Math.max(1, pageSizeNum);

    const rankBySearchRelevance = (products, term) => {
      const searchLower = term.toLowerCase();
      // Name match = 3 points (highest), description match = 1 point (lower)
      const scoreOf = (p) => {
        const name = (p.name?.en || "").toLowerCase();
        const desc = (p.description?.en || "").toLowerCase();
        let score = 0;
        if (name.includes(searchLower)) score += 3;
        if (desc.includes(searchLower)) score += 1;
        return score;
      };
      return [...products].sort((a, b) => {
        const scoreA = scoreOf(a), scoreB = scoreOf(b);
        if (scoreA === scoreB) return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        return scoreB - scoreA;
      });
    };

    let products;
    if (searchTerm) {
      // ✅ SMART SEARCH RANKING: rank the FULL match set before paginating,
      // so a better match on a later page can't be hidden by DB sort order.
      const allMatches = await Product.find(query)
        .select("name description category basePrice images totalStock isFeatured isBestSeller createdAt")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .lean();
      const ranked = rankBySearchRelevance(allMatches, searchTerm);
      products = ranked.slice((currentPage - 1) * size, currentPage * size);
    } else {
      let q = Product.find(query).populate("category", "name slug");
      if (sort === "price-asc") q = q.sort({ basePrice: 1 });
      else if (sort === "price-desc") q = q.sort({ basePrice: -1 });
      else q = q.sort({ createdAt: -1 });
      q = q.skip((currentPage - 1) * size).limit(size);
      products = await q;
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
    sendError(res, error);
  }
};

// ── GET /api/products/best-sellers?limit= ────────────────────────────────────
// Admin-curated via the isBestSeller flag (set from the product form), same
// pattern as isFeatured — deliberately NOT computed from Order history, so it
// can't go empty just because orders/products got reseeded, and admins can
// promote a new product before it has any sales.
export const getBestSellers = async (req, res) => {
  try {
    const limitNum = Math.min(Math.max(Number(req.query.limit) || 4, 1), 20);

    // Excludes isFeatured products so the homepage's Featured and Best
    // Selling sections never show the same item twice.
    const bestSellers = await Product.find({ isActive: true, isBestSeller: true, isFeatured: false })
      .populate("category", "name slug")
      .sort({ updatedAt: -1 })
      .limit(limitNum);

    res.json(bestSellers);
  } catch (error) {
    sendError(res, error);
  }
};

// ── GET /api/products/admin/all ──────────────────────────────────────────────
export const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .lean();
    res.json(products);
  } catch (error) {
    sendError(res, error);
  }
};

// ── GET /api/products/:id ────────────────────────────────────────────────────
export const getProductById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    sendError(res, error);
  }
};

// ── POST /api/products (admin only) ─────────────────────────────────────────
export const createProduct = async (req, res) => {
  try {
    const product = await Product.create(pickProductFields(req.body));
    await product.populate("category", "name slug");
    res.status(201).json(product);
  } catch (error) {
    sendError(res, error, 400);
  }
};

// ── PUT /api/products/:id (admin only) ──────────────────────────────────────
export const updateProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      pickProductFields(req.body),
      { new: true, runValidators: true }
    ).populate("category", "name slug");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    sendError(res, error, 400);
  }
};

// ── DELETE /api/products/:id (admin only) ───────────────────────────────────
export const deleteProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Product not found" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product removed" });
  } catch (error) {
    sendError(res, error);
  }
};

// ================================================================
// ✅ AI RECOMMENDATIONS ── ONLY FROM SAME CATEGORY (NO FALLBACK!)
// ── GET /api/products/recommendations/:productId ──────────────────
export const getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 8, 12);

    if (!isValidObjectId(productId)) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 1. Get the source product to find its category
    const source = await Product.findById(productId).select("category");
    if (!source) return res.status(404).json({ message: "Product not found" });

    // 2. Find ONLY products from the SAME category, excluding current product
    const recommendations = await Product.find({
      _id: { $ne: productId },
      category: source.category,
      isActive: true,
      totalStock: { $gt: 0 },
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 }) // Newest first within the category
      .limit(limit)
      .lean();

    // ✅ NO FALLBACK! If there are only 2 products, we return only 2.
    // We do NOT add random products from other categories.

    res.json(recommendations);
  } catch (error) {
    sendError(res, error);
  }
};

// ================================================================
// ✅ SMART SEARCH / AUTOCOMPLETE ──────────────────────────────────
// ── GET /api/products/search?q=... ──────────────────────────────
export const searchProducts = async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query || query.length < 1) {
      return res.json({ products: [], categories: [] });
    }

    const regex = new RegExp(escapeRegex(query), 'i');

    // 1. Search Products (name only, for speed)
    const products = await Product.find({
      isActive: true,
      $or: [
        { 'name.en': regex },
        { 'name.bn': regex },
      ],
    })
    .select('_id name images basePrice')
    .limit(8)
    .lean();

    // 2. Search Categories
    const categories = await Category.find({
      $or: [
        { 'name.en': regex },
        { 'name.bn': regex },
      ],
    })
    .select('_id name slug')
    .limit(4)
    .lean();

    res.json({ products, categories });
  } catch (error) {
    sendError(res, error);
  }
};