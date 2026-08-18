import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CONTROLLERS
// ======================================================

const mockGetNotifications = jest.fn();
const mockMarkAsRead = jest.fn();
const mockMarkAllAsRead = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "user123",
    email: "customer@example.com",
  };

  next();
});

// ======================================================
// MOCK CONTROLLER MODULE
// ======================================================

jest.unstable_mockModule(
  "../../controllers/notificationController.js",
  () => ({
    getNotifications: mockGetNotifications,
    markAsRead: mockMarkAsRead,
    markAllAsRead: mockMarkAllAsRead,
  })
);

// ======================================================
// MOCK AUTH MODULE
// ======================================================

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: notificationRouter } =
  await import(
    "../../routes/notificationRoutes.js"
  );

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use(
  "/notifications",
  notificationRouter
);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  // ----------------------------------------------------
  // GET NOTIFICATIONS
  // ----------------------------------------------------

  mockGetNotifications.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        notifications: [
          {
            _id: "notification123",
            message:
              "Your jewellery order has been shipped.",
            read: false,
          },
        ],
      });
    }
  );

  // ----------------------------------------------------
  // MARK ONE AS READ
  // ----------------------------------------------------

  mockMarkAsRead.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        notificationId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // MARK ALL AS READ
  // ----------------------------------------------------

  mockMarkAllAsRead.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message:
          "All notifications marked as read",
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Notification Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // AUTHENTICATION
  // ====================================================

  describe("Authentication middleware", () => {
    test("should use protect middleware for GET /notifications", async () => {
      await request(app)
        .get("/notifications")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should use protect middleware for PATCH /notifications/read-all", async () => {
      await request(app)
        .patch(
          "/notifications/read-all"
        )
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should use protect middleware for PATCH /notifications/:id/read", async () => {
      await request(app)
        .patch(
          "/notifications/notification123/read"
        )
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // GET NOTIFICATIONS
  // ====================================================

  describe("GET /notifications", () => {
    test("should call getNotifications controller", async () => {
      const response = await request(app)
        .get("/notifications")
        .expect(200);

      expect(
        mockGetNotifications
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        notifications: [
          {
            _id: "notification123",
            message:
              "Your jewellery order has been shipped.",
            read: false,
          },
        ],
      });
    });

    test("should pass authenticated user to controller", async () => {
      await request(app)
        .get("/notifications")
        .expect(200);

      const [req] =
        mockGetNotifications.mock.calls[0];

      expect(req.user).toEqual({
        id: "user123",
        email: "customer@example.com",
      });
    });
  });

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  describe(
    "PATCH /notifications/read-all",
    () => {
      test("should call markAllAsRead controller", async () => {
        const response = await request(app)
          .patch(
            "/notifications/read-all"
          )
          .expect(200);

        expect(
          mockMarkAllAsRead
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body
        ).toEqual({
          success: true,
          message:
            "All notifications marked as read",
        });
      });

      test("should use authentication middleware", async () => {
        await request(app)
          .patch(
            "/notifications/read-all"
          )
          .expect(200);

        expect(
          mockProtect
        ).toHaveBeenCalledTimes(1);
      });
    }
  );

  // ====================================================
  // MARK ONE AS READ
  // ====================================================

  describe(
    "PATCH /notifications/:id/read",
    () => {
      test("should call markAsRead controller", async () => {
        const response = await request(app)
          .patch(
            "/notifications/notification123/read"
          )
          .expect(200);

        expect(
          mockMarkAsRead
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body.notificationId
        ).toBe("notification123");
      });

      test("should pass notification ID from URL", async () => {
        await request(app)
          .patch(
            "/notifications/jewellery-notification-456/read"
          )
          .expect(200);

        const [req] =
          mockMarkAsRead.mock.calls[0];

        expect(req.params.id).toBe(
          "jewellery-notification-456"
        );
      });

      test("should pass authenticated user to controller", async () => {
        await request(app)
          .patch(
            "/notifications/notification789/read"
          )
          .expect(200);

        const [req] =
          mockMarkAsRead.mock.calls[0];

        expect(req.user).toEqual({
          id: "user123",
          email: "customer@example.com",
        });
      });
    }
  );

  // ====================================================
  // ROUTE ORDER
  // ====================================================

  describe("Route matching", () => {
    test("should match /read-all before /:id/read", async () => {
      await request(app)
        .patch(
          "/notifications/read-all"
        )
        .expect(200);

      expect(
        mockMarkAllAsRead
      ).toHaveBeenCalledTimes(1);

      expect(
        mockMarkAsRead
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for POST /notifications", async () => {
      await request(app)
        .post("/notifications")
        .send({
          message: "Test",
        })
        .expect(404);

      expect(
        mockGetNotifications
      ).not.toHaveBeenCalled();

      expect(
        mockMarkAllAsRead
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for PUT /notifications/read-all", async () => {
      await request(app)
        .put(
          "/notifications/read-all"
        )
        .expect(404);

      expect(
        mockMarkAllAsRead
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /notifications/:id/read", async () => {
      await request(app)
        .get(
          "/notifications/notification123/read"
        )
        .expect(404);

      expect(
        mockMarkAsRead
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for DELETE /notifications/:id/read", async () => {
      await request(app)
        .delete(
          "/notifications/notification123/read"
        )
        .expect(404);

      expect(
        mockMarkAsRead
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown notification route", async () => {
      await request(app)
        .get(
          "/notifications/unknown/path"
        )
        .expect(404);
    });

    test("should return 404 for unknown notification action", async () => {
      await request(app)
        .patch(
          "/notifications/notification123/archive"
        )
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getNotifications error", async () => {
      mockGetNotifications.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to load notifications"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/notifications",
        notificationRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .get("/notifications")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Failed to load notifications",
      });

      expect(
        mockGetNotifications
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle markAsRead error", async () => {
      mockMarkAsRead.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to mark notification as read"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/notifications",
        notificationRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .patch(
          "/notifications/notification123/read"
        )
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Failed to mark notification as read",
      });

      expect(
        mockMarkAsRead
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle markAllAsRead error", async () => {
      mockMarkAllAsRead.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to mark all notifications as read"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/notifications",
        notificationRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .patch(
          "/notifications/read-all"
        )
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Failed to mark all notifications as read",
      });

      expect(
        mockMarkAllAsRead
      ).toHaveBeenCalledTimes(1);
    });
  });
});