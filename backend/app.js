import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import couponRoutes, {
  adminCouponRouter,
} from "./routes/couponRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

import { apiLimiter } from "./middleware/rateLimiters.js";
import { sanitizeInputs } from "./middleware/sanitize.js";

const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

const app = express();

/* =========================================================
   SECURITY
========================================================= */

app.use(helmet());

/* =========================================================
   CORS
========================================================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(express.json());

app.use(cookieParser());

/* =========================================================
   SANITIZATION
========================================================= */

app.use(sanitizeInputs);

/* =========================================================
   RATE LIMITER
========================================================= */

app.use(apiLimiter);

/* =========================================================
   STATIC FILES
========================================================= */

const frontendPublic = path.join(
  __dirname,
  "../frontend/public"
);

app.use(
  express.static(frontendPublic)
);

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/health", (req, res) => {
  res.send("Camellia API ✓");
});

/* =========================================================
   ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/cart",
  cartRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/admin/coupons",
  adminCouponRouter
);

app.use(
  "/api/settings",
  settingsRoutes
);

app.use(
  "/api/upload",
  uploadRoutes
);

app.use(
  "/api/coupons",
  couponRoutes
);

app.use(
  "/api/contact",
  contactRoutes
);

app.use(
  "/api/wishlist",
  wishlistRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/reviews",
  reviewRoutes
);

app.use(
  "/api/chat",
  chatRoutes
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {
    console.error(err.stack);

    res.status(500).json({
      message: "Server error.",
    });
  }
);

export default app;