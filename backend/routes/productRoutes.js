// backend/routes/productRoutes.js
import express from "express";
import {
  getProducts,
  getProductById,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getRecommendations,   // 👈 AI RECOMMENDATIONS IMPORT
} from "../controllers/productController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── PUBLIC ROUTES ──
// ✅ Autocomplete search (MUST come before /:id)
router.get("/search", searchProducts);

// ✅ AI Recommendations (MUST come before /:id)
router.get("/recommendations/:productId", getRecommendations);

router.get("/", getProducts);
router.get("/:id", getProductById);

// ── ADMIN ROUTES ──
router.get("/admin/all", protect, adminOnly, getAllProductsAdmin);
router.post("/", protect, adminOnly, createProduct);
router.put("/:id", protect, adminOnly, updateProduct);
router.delete("/:id", protect, adminOnly, deleteProduct);

export default router;