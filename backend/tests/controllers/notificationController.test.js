import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

// Mock Notification model BEFORE importing controller
jest.unstable_mockModule("../../models/Notification.js", () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const Notification = (await import("../../models/Notification.js")).default;

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = await import("../../controllers/notificationController.js");

describe("Notification Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: {
        _id: "user123",
      },
      params: {
        id: "notification123",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // =========================================================
  // GET NOTIFICATIONS
  // =========================================================

  describe("getNotifications", () => {
    test("should return notifications and unread count", async () => {
      const notifications = [
        {
          _id: "notification1",
          user: "user123",
          message: "Your order has been shipped",
          read: false,
        },
        {
          _id: "notification2",
          user: "user123",
          message: "Welcome to Camellia",
          read: true,
        },
      ];

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue(notifications);

      Notification.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock,
      });

      Notification.countDocuments.mockResolvedValue(1);

      await getNotifications(req, res);

      expect(Notification.find).toHaveBeenCalledWith({
        user: "user123",
      });

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(limitMock).toHaveBeenCalledWith(50);

      expect(Notification.countDocuments).toHaveBeenCalledWith({
        user: "user123",
        read: false,
      });

      expect(res.json).toHaveBeenCalledWith({
        notifications,
        unreadCount: 1,
      });
    });

    test("should return empty notifications when user has none", async () => {
      const notifications = [];

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue(notifications);

      Notification.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock,
      });

      Notification.countDocuments.mockResolvedValue(0);

      await getNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith({
        notifications: [],
        unreadCount: 0,
      });
    });

    test("should return 500 when fetching notifications fails", async () => {
      const error = new Error("Database error");

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockRejectedValue(error);

      Notification.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock,
      });

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch notifications.",
      });
    });

    test("should return 500 when unread count fails", async () => {
      const notifications = [
        {
          _id: "notification1",
          user: "user123",
          read: false,
        },
      ];

      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue(notifications);

      Notification.find.mockReturnValue({
        sort: sortMock,
        limit: limitMock,
      });

      Notification.countDocuments.mockRejectedValue(
        new Error("Count failed")
      );

      await getNotifications(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch notifications.",
      });
    });
  });

  // =========================================================
  // MARK AS READ
  // =========================================================

  describe("markAsRead", () => {
    test("should mark a notification as read", async () => {
      const notification = {
        _id: "notification123",
        user: "user123",
        message: "Your order is ready",
        read: true,
      };

      Notification.findOneAndUpdate.mockResolvedValue(notification);

      await markAsRead(req, res);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "notification123",
          user: "user123",
        },
        {
          read: true,
        },
        {
          new: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith(notification);
    });

    test("should return 404 when notification is not found", async () => {
      Notification.findOneAndUpdate.mockResolvedValue(null);

      await markAsRead(req, res);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "notification123",
          user: "user123",
        },
        {
          read: true,
        },
        {
          new: true,
        }
      );

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Notification not found.",
      });
    });

    test("should return 500 when updating notification fails", async () => {
      Notification.findOneAndUpdate.mockRejectedValue(
        new Error("Database error")
      );

      await markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to update notification.",
      });
    });

    test("should use notification id from request params", async () => {
      req.params.id = "abc123";

      const notification = {
        _id: "abc123",
        user: "user123",
        read: true,
      };

      Notification.findOneAndUpdate.mockResolvedValue(notification);

      await markAsRead(req, res);

      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "abc123",
          user: "user123",
        },
        {
          read: true,
        },
        {
          new: true,
        }
      );
    });

    test("should restrict update to the logged-in user", async () => {
      const notification = {
        _id: "notification123",
        user: "user123",
        read: true,
      };

      Notification.findOneAndUpdate.mockResolvedValue(notification);

      await markAsRead(req, res);

      const query = Notification.findOneAndUpdate.mock.calls[0][0];

      expect(query.user).toBe("user123");
      expect(query._id).toBe("notification123");
    });
  });

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  describe("markAllAsRead", () => {
    test("should mark all unread notifications as read", async () => {
      Notification.updateMany.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 3,
      });

      await markAllAsRead(req, res);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          user: "user123",
          read: false,
        },
        {
          read: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith({
        message: "All notifications marked as read.",
      });
    });

    test("should still return success when there are no unread notifications", async () => {
      Notification.updateMany.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 0,
      });

      await markAllAsRead(req, res);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          user: "user123",
          read: false,
        },
        {
          read: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith({
        message: "All notifications marked as read.",
      });
    });

    test("should return 500 when updateMany fails", async () => {
      Notification.updateMany.mockRejectedValue(
        new Error("Database error")
      );

      await markAllAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to update notifications.",
      });
    });

    test("should only update unread notifications for logged-in user", async () => {
      Notification.updateMany.mockResolvedValue({
        acknowledged: true,
        modifiedCount: 2,
      });

      await markAllAsRead(req, res);

      const query = Notification.updateMany.mock.calls[0][0];

      expect(query).toEqual({
        user: "user123",
        read: false,
      });
    });
  });
});