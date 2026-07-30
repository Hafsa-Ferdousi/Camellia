import express from "express";
import {
  getStats,
  getCustomers,
  getCustomerDetail,
  resetCustomerPassword,
  getSettings,
  updateSettings,
  getLowStockProducts,
  exportSalesCSV,
} from "../controllers/adminController.js";
import {
  getAllConversations,
  getConversationById,
  deleteConversation,
} from "../controllers/chatController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);
router.get("/stats", getStats);
router.get("/customers", getCustomers);
router.get("/customers/:userId", getCustomerDetail);
router.post("/customers/:userId/reset-password", resetCustomerPassword);
router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.get("/products/low-stock", getLowStockProducts);
router.get("/sales/export", exportSalesCSV);
router.get("/chats", getAllConversations);
router.get("/chats/:id", getConversationById);
router.delete("/chats/:id", deleteConversation);

export default router;