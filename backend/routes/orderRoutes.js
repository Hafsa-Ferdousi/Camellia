import express from "express";
import {
  checkout,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout", checkout);
router.get("/", getOrders);
router.get("/all", adminOnly, getOrders);   // alias for admin dashboard
router.get("/:id", getOrderById);
router.patch("/:id/status", adminOnly, updateOrderStatus);

export default router;
