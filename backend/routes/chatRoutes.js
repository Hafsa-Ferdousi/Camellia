import express from "express";
import { sendChatMessage, getChatHistory, getUserConversations } from "../controllers/chatController.js";
import { optionalAuth, protect } from "../middleware/authMiddleware.js";
import { chatLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Public — guests and logged-in users both use the widget; optionalAuth lets
// the controller personalize order lookups for logged-in users without
// blocking guests.
router.post("/message", chatLimiter, optionalAuth, sendChatMessage);

// Public — sessionId is an unguessable random token generated client-side,
// so knowing it is the same "auth" a guest chat session already relies on.
// optionalAuth lets the controller check the requester's identity against
// the conversation's owner (see getChatHistory) without blocking guests.
router.get("/history/:sessionId", optionalAuth, getChatHistory);

// Requires login — powers the account's chat history sidebar, so there's
// no "guest" case to support here unlike the routes above.
router.get("/conversations", protect, getUserConversations);

export default router;
