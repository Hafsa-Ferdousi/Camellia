import Conversation from "../models/Conversation.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import { getChatCompletion } from "../services/aiService.js";

const FALLBACK_REPLY =
  "Sorry, I'm having trouble answering right now. Please try again in a moment, or use the Contact page for help.";

// Builds the grounding context the model needs to answer store questions —
// categories, a sample of in-stock products, and (if logged in) the user's
// recent orders so it can answer "where's my order" without guessing.
async function buildSystemPrompt(user) {
  const [categories, products] = await Promise.all([
    Category.find().select("name").limit(20),
    Product.find({ isActive: true }).select("name basePrice totalStock").limit(30),
  ]);

  const categoryList = categories.map((c) => c.name.en).join(", ") || "none";
  const productList =
    products
      .map((p) => `${p.name.en} — ৳${p.basePrice} (${p.totalStock > 0 ? "in stock" : "out of stock"})`)
      .join("\n") || "No products currently listed.";

  let orderContext = "The visitor is not logged in, so you cannot look up their orders — direct them to the Track Order page or ask them to log in.";
  if (user) {
    const orders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("invoiceNumber status totalAmount createdAt");
    orderContext = orders.length
      ? "The logged-in customer's recent orders:\n" +
        orders
          .map((o) => `Invoice ${o.invoiceNumber}: status "${o.status}", total ৳${o.totalAmount}`)
          .join("\n")
      : "The logged-in customer has no orders yet.";
  }

  return `You are the customer support assistant for Camellia, an online jewelry store. Be friendly, concise, and helpful. Answer in the same language the customer writes in.

Store categories: ${categoryList}

Sample of currently listed products:
${productList}

${orderContext}

Rules:
- Only discuss Camellia products, orders, shipping, returns, and general shopping help.
- If asked something you don't have data for (e.g. a very specific order not listed above), tell the customer to check the Track Order page or contact support.
- Never invent prices, stock, or order statuses that aren't in the context above.
- Keep replies short — a few sentences, not an essay.`;
}

// Store-management grounding for admins — order/revenue/stock overview
// instead of the customer's own order history, since an admin isn't shopping.
async function buildAdminSystemPrompt() {
  const [totalOrders, totalUsers, totalProducts, revenueAgg, statusAgg, settings] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Order.aggregate([
      { $match: { "payment.status": "paid" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Setting.getSingleton(),
  ]);

  const statusSummary = statusAgg.map((s) => `${s._id}: ${s.count}`).join(", ") || "no orders yet";

  const lowStockProducts = await Product.find({ isActive: true, totalStock: { $lte: settings.lowStockThreshold } })
    .select("name totalStock")
    .sort({ totalStock: 1 })
    .limit(10);
  const lowStockList =
    lowStockProducts.map((p) => `${p.name.en} — ${p.totalStock} left`).join("\n") || "None currently low on stock.";

  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "name")
    .select("invoiceNumber status totalAmount user guestInfo createdAt");
  const recentOrdersList =
    recentOrders
      .map((o) => `Invoice ${o.invoiceNumber}: ${o.user?.name || o.guestInfo?.name || "guest"} — "${o.status}", ৳${o.totalAmount}`)
      .join("\n") || "No orders yet.";

  return `You are the store-management assistant for Camellia, an online jewelry store, speaking with a logged-in ADMIN — not a customer. Be concise and helpful. Answer in the same language they write in.

Store snapshot:
- Total orders: ${totalOrders}
- Total customers: ${totalUsers}
- Active products: ${totalProducts}
- Total revenue (paid orders): ৳${revenueAgg[0]?.total || 0}
- Orders by status: ${statusSummary}
- Low-stock threshold: ${settings.lowStockThreshold}

Products low on stock (threshold ${settings.lowStockThreshold}):
${lowStockList}

Most recent orders:
${recentOrdersList}

Rules:
- Help with store-management questions: inventory, order status, sales figures, customers.
- The admin is not a shopper — never suggest they add items to a cart or place an order; admin accounts can't check out on this store.
- Never invent numbers, order statuses, or stock levels that aren't in the context above — for anything more specific, point them to the Admin dashboard.
- Keep replies short — a few sentences, not an essay.`;
}

// ── POST /api/chat/message  (public — works for guests and logged-in users) ─
export const sendChatMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ message: "sessionId is required." });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "message is required." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ message: "Message is too long (max 2000 characters)." });
    }

    let conversation = await Conversation.findOne({ sessionId });
    if (!conversation) {
      conversation = await Conversation.create({
        sessionId,
        user: req.user?._id || null,
        messages: [],
      });
    } else if (req.user && !conversation.user) {
      // A session that started as a guest chat and later logs in — credit
      // it to that account now rather than leaving it permanently unowned.
      // Never reassign a conversation that already belongs to someone else;
      // the frontend is responsible for starting a fresh sessionId whenever
      // the logged-in identity changes (see AuthContext login/logout).
      conversation.user = req.user._id;
    }

    const history = conversation.messages.map((m) => ({ role: m.role, content: m.content }));

    let reply;
    try {
      const systemPrompt =
        req.user?.role === "admin" ? await buildAdminSystemPrompt() : await buildSystemPrompt(req.user);
      reply = await getChatCompletion({ systemPrompt, history, message: message.trim() });
    } catch (aiError) {
      console.error("AI chat completion failed:", aiError.message);
      reply = FALLBACK_REPLY;
    }

    conversation.messages.push({ role: "user", content: message.trim() });
    conversation.messages.push({ role: "model", content: reply });
    // Cap history so a single long-running session doesn't grow unbounded.
    if (conversation.messages.length > 60) {
      conversation.messages = conversation.messages.slice(-60);
    }
    await conversation.save();

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Failed to process chat message." });
  }
};

// ── GET /api/chat/history/:sessionId  (public — restores the widget on reopen) ─
export const getChatHistory = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId }).select("user messages");
    // If the conversation belongs to a logged-in account, only that account
    // (or a guest, before it's claimed) can read it back — otherwise User B
    // logging in on the same browser as User A could read A's history.
    if (conversation?.user && String(conversation.user) !== String(req.user?._id)) {
      return res.json({ messages: [] });
    }
    res.json({ messages: conversation?.messages || [] });
  } catch (error) {
    res.status(500).json({ message: "Failed to load chat history." });
  }
};

// ── GET /api/chat/conversations  (own account — powers the history sidebar) ─
export const getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select("sessionId messages updatedAt createdAt");

    const list = conversations
      .filter((c) => c.messages.length > 0)
      .map((c) => {
        const firstUserMessage = c.messages.find((m) => m.role === "user")?.content || "New chat";
        return {
          sessionId: c.sessionId,
          title: firstUserMessage.length > 40 ? `${firstUserMessage.slice(0, 40)}…` : firstUserMessage,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        };
      });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations." });
  }
};

// ── GET /api/admin/chats  (admin only) ─────────────────────────────────────
export const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .populate("user", "name email")
      .select("sessionId user messages createdAt updatedAt");

    // Summarize instead of shipping every message to the list view.
    const summaries = conversations.map((c) => ({
      _id: c._id,
      sessionId: c.sessionId,
      user: c.user,
      messageCount: c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content || "",
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }));

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations." });
  }
};

// ── GET /api/admin/chats/:id  (admin only) ─────────────────────────────────
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate("user", "name email");
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversation." });
  }
};

// ── DELETE /api/admin/chats/:id  (admin only) ──────────────────────────────
export const deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    res.json({ message: "Conversation deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete conversation." });
  }
};
