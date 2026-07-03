import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { apiLimiter } from "./middleware/rateLimiters.js";

dotenv.config();
connectDB();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// --- Security headers ---
app.use(helmet());

// --- CORS with credentials (refresh token cookies) ---
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // required for httpOnly cookies
  })
);

// --- Body parsing & cookies ---
app.use(express.json());
app.use(cookieParser());

// --- Global rate limiting (applied to all API routes) ---
app.use(apiLimiter);

// --- Serve product images from frontend/public ---
const frontendPublic = path.join(__dirname, "../frontend/public");
app.use(express.static(frontendPublic));

// --- Health check ---
app.get("/health", (req, res) => res.send("Camellia API ✓"));

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error." });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));