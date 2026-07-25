import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes     from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes  from "./routes/productRoutes.js";
import cartRoutes     from "./routes/cartRoutes.js";
import orderRoutes    from "./routes/orderRoutes.js";
import adminRoutes    from "./routes/adminRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import couponRoutes, { adminCouponRouter } from "./routes/couponRoutes.js";
import contactRoutes  from "./routes/contactRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import reviewRoutes from "./routes/reviewRoutes.js";

dotenv.config();
connectDB();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

app.use(express.json());
app.use(cookieParser());
app.use(apiLimiter);

const frontendPublic = path.join(__dirname, "../frontend/public");
app.use(express.static(frontendPublic));

app.get("/health", (req, res) => res.send("Camellia API ✓"));
app.use("/api/auth",          authRoutes);
app.use("/api/categories",    categoryRoutes);
app.use("/api/products",      productRoutes);
app.use("/api/cart",          cartRoutes);
app.use("/api/orders",        orderRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/admin/coupons", adminCouponRouter);
app.use("/api/settings",      settingsRoutes);
app.use("/api/coupons",       couponRoutes);
app.use("/api/contact",       contactRoutes);
app.use("/api/wishlist",      wishlistRoutes);

// ✅ Routes – combined from both branches
app.use("/api/auth",       authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products",   productRoutes);
app.use("/api/cart",       cartRoutes);
app.use("/api/orders",     orderRoutes);
app.use("/api/admin",      adminRoutes);
app.use("/api/settings",   settingsRoutes);
app.use("/api/coupons",    couponRoutes);          // Coupon system
app.use("/api/admin/coupons", adminCouponRouter);  // Admin coupon routes
app.use("/api/reviews",    reviewRoutes);          // Reviews system

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));