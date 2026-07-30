import Contact from "../models/Contact.js";

// ── POST /api/contact  (anyone can send a message) ────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required." });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ message: "Message must be at least 10 characters." });
    }

    const contact = await Contact.create({ name, email, message });

    res.status(201).json({
      message: "Your message has been sent successfully! We will get back to you soon.",
      contact,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to send message. Please try again." });
  }
};

// ── GET /api/contact  (admin only — view all messages) ────────────────────
export const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages." });
  }
};

// ── PATCH /api/contact/:id/status  (admin only — mark as read/replied) ────
export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["unread", "read", "replied"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!contact) return res.status(404).json({ message: "Message not found." });

    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Failed to update message status." });
  }
};

// ── DELETE /api/contact/:id  (admin only) ─────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: "Message not found." });
    res.json({ message: "Message deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message." });
  }
};