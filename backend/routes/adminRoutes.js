import express from "express";
import {
  getStats,
  getCustomers,
  getCustomerDetail,
  resetCustomerPassword,
  getPasswordResetRequests,
  dismissPasswordResetRequest,
  getSettings,
  updateSettings,
  getLowStockProducts,
  exportSalesCSV,
} from "../controllers/adminController.js";
import {
  getAllConversations,
  getConversationById,
  deleteConversation,
  sendAdminAssistantMessage,
  getAdminAssistantHistory,
  getAdminAssistantConversations,
} from "../controllers/chatController.js";
import { generateDescription } from "../controllers/descriptionController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { chatLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.use(protect, adminOnly);
router.get("/stats", getStats);
router.get("/customers", getCustomers);
router.get("/customers/:userId", getCustomerDetail);
router.post("/customers/:userId/reset-password", resetCustomerPassword);
router.get("/password-reset-requests", getPasswordResetRequests);
router.patch("/password-reset-requests/:id/dismiss", dismissPasswordResetRequest);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/products/low-stock", getLowStockProducts);
router.get("/sales/export", exportSalesCSV);
router.get("/chats", getAllConversations);
router.get("/chats/:id", getConversationById);
router.delete("/chats/:id", deleteConversation);

// ── AI Assistant (admin's own store-management chatbot) ──
router.post("/ai-assistant/message", chatLimiter, sendAdminAssistantMessage);
router.get("/ai-assistant/history/:sessionId", getAdminAssistantHistory);
router.get("/ai-assistant/conversations", getAdminAssistantConversations);

// ── AI Description Generator ──
router.post("/generate-description", generateDescription);

export default router;