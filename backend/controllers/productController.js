import Product from "../models/Product.js";

// GET /api/products?search=&category=&minPrice=&maxPrice=&color=&limit=&featured=
export const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, color, limit, featured, sort } = req.query;
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
    if (color) query["variants.color"] = { $regex: color, $options: "i" };
    // BUG FIX #10: Support featured filter for homepage best sellers
    if (featured === "true") query.isFeatured = true;

    let q = Product.find(query).populate("category", "name slug");

    // BUG FIX #11: Support sort param (newest, price-asc, price-desc)
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

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name slug");
    // BUG FIX #12: Return 404 for inactive products too
    if (!product || !product.isActive) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products (admin only)
export const createProduct = async (req, res) => {
  try {
    // BUG FIX #13: Compute totalStock from variants if variants provided
    const data = { ...req.body };
    if (data.variants && data.variants.length > 0) {
      data.totalStock = data.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/products/:id (admin only)
export const updateProduct = async (req, res) => {
  try {
    const data = { ...req.body };
    // BUG FIX #14: Recompute totalStock on update
    if (data.variants && data.variants.length > 0) {
      data.totalStock = data.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/products/:id (admin only) — soft delete
export const deleteProduct = async (req, res) => {
  try {
    // BUG FIX #15: Soft delete instead of hard delete to preserve order history
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
