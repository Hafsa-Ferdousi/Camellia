import express from "express";
import {
  checkout,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderSummary,
} from "../controllers/orderController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout", checkout);
router.get("/", getOrders);
router.get("/all", adminOnly, getOrders);
router.get("/summary", adminOnly, getOrderSummary);
router.get("/:id", getOrderById);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/status", adminOnly, updateOrderStatus);

export default router;