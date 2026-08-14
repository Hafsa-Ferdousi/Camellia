import { jest } from "@jest/globals";

// ======================================================
// MOCK CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.unstable_mockModule(
  "../../api/client.js",
  () => ({
    default: mockClient,
  })
);

// ======================================================
// IMPORT NOTIFICATION API
// ======================================================

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = await import(
  "../../api/notifications.js"
);

// ======================================================
// TEST SUITE
// ======================================================

describe("Notification API", () => {
  beforeEach(() => {
    mockClient.get.mockClear();
    mockClient.post.mockClear();
    mockClient.put.mockClear();
    mockClient.patch.mockClear();
    mockClient.delete.mockClear();
  });

  // ====================================================
  // getNotifications
  // ====================================================

  describe("getNotifications", () => {
    test("should send GET request to /notifications", async () => {
      const response = {
        data: [
          {
            _id: "notification123",
            title: "Order Update",
            message: "Your order has been shipped",
            read: false,
          },
        ],
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getNotifications();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/notifications"
      );

      expect(result).toEqual(response);
    });

    test("should return notification response", async () => {
      const response = {
        data: [
          {
            _id: "notification1",
            type: "order_status",
            title: "Order shipped",
          },
          {
            _id: "notification2",
            type: "payment",
            title: "Payment successful",
          },
        ],
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getNotifications();

      expect(result).toEqual(response);
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to fetch notifications"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getNotifications()
      ).rejects.toThrow(
        "Failed to fetch notifications"
      );
    });
  });

  // ====================================================
  // markAsRead
  // ====================================================

  describe("markAsRead", () => {
    test("should send PATCH request with notification ID", async () => {
      const response = {
        data: {
          message: "Notification marked as read",
        },
      };

      mockClient.patch.mockResolvedValue(response);

      const result = await markAsRead(
        "notification123"
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/notification123/read"
      );

      expect(result).toEqual(response);
    });

    test("should correctly insert notification ID into URL", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAsRead(
        "notification456"
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/notification456/read"
      );
    });

    test("should support different notification IDs", async () => {
      mockClient.patch.mockResolvedValue({
        data: {
          success: true,
        },
      });

      await markAsRead("abc789");

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/abc789/read"
      );
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to mark notification as read"
      );

      mockClient.patch.mockRejectedValue(error);

      await expect(
        markAsRead("notification123")
      ).rejects.toThrow(
        "Failed to mark notification as read"
      );
    });
  });

  // ====================================================
  // markAllAsRead
  // ====================================================

  describe("markAllAsRead", () => {
    test("should send PATCH request to /notifications/read-all", async () => {
      const response = {
        data: {
          message:
            "All notifications marked as read",
        },
      };

      mockClient.patch.mockResolvedValue(response);

      const result =
        await markAllAsRead();

      expect(
        mockClient.patch
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/read-all"
      );

      expect(result).toEqual(response);
    });

    test("should not send any request body", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAllAsRead();

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/read-all"
      );

      expect(
        mockClient.patch.mock.calls[0]
      ).toHaveLength(1);
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to mark all notifications as read"
      );

      mockClient.patch.mockRejectedValue(error);

      await expect(
        markAllAsRead()
      ).rejects.toThrow(
        "Failed to mark all notifications as read"
      );
    });
  });

  // ====================================================
  // HTTP METHOD VERIFICATION
  // ====================================================

  describe("HTTP method verification", () => {
    test("getNotifications should use GET", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getNotifications();

      expect(
        mockClient.get
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });

    test("markAsRead should use PATCH", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAsRead(
        "notification123"
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalled();

      expect(
        mockClient.get
      ).not.toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });

    test("markAllAsRead should use PATCH", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAllAsRead();

      expect(
        mockClient.patch
      ).toHaveBeenCalled();

      expect(
        mockClient.get
      ).not.toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // ENDPOINT VERIFICATION
  // ====================================================

  describe("Endpoint verification", () => {
    test("getNotifications should use correct endpoint", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getNotifications();

      expect(
        mockClient.get
      ).toHaveBeenCalledWith(
        "/notifications"
      );
    });

    test("markAsRead should use correct endpoint", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAsRead(
        "notification123"
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/notification123/read"
      );
    });

    test("markAllAsRead should use correct endpoint", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await markAllAsRead();

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/notifications/read-all"
      );
    });
  });
});