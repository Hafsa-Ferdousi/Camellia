import express from "express";
import {
  sendMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
} from "../controllers/contactController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — anyone can send a message
router.post("/", sendMessage);

// Admin only — view, update, delete messages
router.get("/",           protect, adminOnly, getMessages);
router.patch("/:id/status", protect, adminOnly, updateMessageStatus);
router.delete("/:id",     protect, adminOnly, deleteMessage);

export default router;