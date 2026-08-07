import express from "express";
import {
  createRefundRequest,
  getMyRefunds,
  getAllRefunds,
  getRefundById,
  updateRefundStatus,
} from "../controllers/refundController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createRefundRequest);
router.get("/my", getMyRefunds);
router.get("/", adminOnly, getAllRefunds);
router.patch("/:id/status", adminOnly, updateRefundStatus);
router.get("/:id", getRefundById);

export default router;