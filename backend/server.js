import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes     from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes  from "./routes/productRoutes.js";
import cartRoutes     from "./routes/cartRoutes.js";
import orderRoutes    from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
dotenv.config();
connectDB();


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();


app.use(cors());
app.use(express.json());


// Serve product images from frontend/public/products/
const frontendPublic = path.join(__dirname, "../frontend/public");
app.use(express.static(frontendPublic));


app.get("/health", (req, res) => res.send("Camellia API ✓"));
app.use("/api/auth",       authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products",   productRoutes);
app.use("/api/cart",       cartRoutes);
app.use("/api/orders",     orderRoutes);
app.use("/api/admin",      adminRoutes);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error." });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
