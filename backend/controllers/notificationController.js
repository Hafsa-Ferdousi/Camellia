import Notification from "../models/Notification.js";

// ── GET /api/notifications ────────────────────────────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
};

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification." });
  }
};

// ── PATCH /api/notifications/read-all ──────────────────────────────────────
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications." });
  }
};
