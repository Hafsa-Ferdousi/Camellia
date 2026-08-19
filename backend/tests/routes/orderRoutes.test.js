import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK ORDER CONTROLLERS
// ======================================================

const mockCheckout = jest.fn();
const mockGuestCheckout = jest.fn();
const mockGuestLookupOrder = jest.fn();
const mockGetOrders = jest.fn();
const mockGetOrderById = jest.fn();
const mockUpdateOrderStatus = jest.fn();
const mockCancelOrder = jest.fn();
const mockGetOrderSummary = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "user123",
    email: "customer@example.com",
    role: "customer",
  };

  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

// ======================================================
// MOCK RATE LIMITER
// ======================================================

const mockGuestLookupLimiter = jest.fn(
  (req, res, next) => {
    next();
  }
);

// ======================================================
// MOCK CONTROLLER MODULE
// ======================================================

jest.unstable_mockModule(
  "../../controllers/orderController.js",
  () => ({
    checkout: mockCheckout,
    guestCheckout: mockGuestCheckout,
    guestLookupOrder: mockGuestLookupOrder,
    getOrders: mockGetOrders,
    getOrderById: mockGetOrderById,
    updateOrderStatus: mockUpdateOrderStatus,
    cancelOrder: mockCancelOrder,
    getOrderSummary: mockGetOrderSummary,
  })
);

// ======================================================
// MOCK AUTH MODULE
// ======================================================

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
    adminOnly: mockAdminOnly,
  })
);

// ======================================================
// MOCK RATE LIMITER MODULE
// ======================================================

jest.unstable_mockModule(
  "../../middleware/rateLimiters.js",
  () => ({
    guestLookupLimiter: mockGuestLookupLimiter,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: orderRouter } =
  await import("../../routes/orderRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/orders", orderRouter);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  // ----------------------------------------------------
  // GUEST CHECKOUT
  // ----------------------------------------------------

  mockGuestCheckout.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        message: "Guest checkout successful",
      });
    }
  );

  // ----------------------------------------------------
  // GUEST LOOKUP
  // ----------------------------------------------------

  mockGuestLookupOrder.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        order: {
          _id: "order123",
        },
      });
    }
  );

  // ----------------------------------------------------
  // CHECKOUT
  // ----------------------------------------------------

  mockCheckout.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        message: "Checkout successful",
      });
    }
  );

  // ----------------------------------------------------
  // GET ORDERS
  // ----------------------------------------------------

  mockGetOrders.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        orders: [
          {
            _id: "order123",
            total: 2500,
          },
        ],
      });
    }
  );

  // ----------------------------------------------------
  // GET ORDER BY ID
  // ----------------------------------------------------

  mockGetOrderById.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        orderId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // CANCEL ORDER
  // ----------------------------------------------------

  mockCancelOrder.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Order cancelled",
        orderId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // UPDATE ORDER STATUS
  // ----------------------------------------------------

  mockUpdateOrderStatus.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Order status updated",
        orderId: req.params.id,
        status: req.body.status,
      });
    }
  );

  // ----------------------------------------------------
  // ORDER SUMMARY
  // ----------------------------------------------------

  mockGetOrderSummary.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        summary: {
          totalOrders: 10,
          totalSales: 25000,
        },
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Order Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // GUEST CHECKOUT
  // ====================================================

  describe("POST /orders/guest-checkout", () => {
    test("should call guestCheckout controller", async () => {
      const checkoutData = {
        email: "guest@example.com",
        items: [
          {
            productId: "product123",
            quantity: 2,
          },
        ],
        address: {
          city: "Dhaka",
        },
      };

      const response = await request(app)
        .post("/orders/guest-checkout")
        .send(checkoutData)
        .expect(201);

      expect(mockGuestCheckout).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        message: "Guest checkout successful",
      });
    });

    test("should not require authentication", async () => {
      await request(app)
        .post("/orders/guest-checkout")
        .send({
          email: "guest@example.com",
        })
        .expect(201);

      expect(mockProtect).not.toHaveBeenCalled();
    });

    test("should pass request body to controller", async () => {
      const data = {
        email: "guest@example.com",
        total: 3500,
      };

      await request(app)
        .post("/orders/guest-checkout")
        .send(data)
        .expect(201);

      const [req] =
        mockGuestCheckout.mock.calls[0];

      expect(req.body).toEqual(data);
    });
  });

  // ====================================================
  // GUEST ORDER LOOKUP
  // ====================================================

  describe("POST /orders/guest-lookup", () => {
    test("should call guestLookupOrder controller", async () => {
      const response = await request(app)
        .post("/orders/guest-lookup")
        .send({
          orderNumber: "ORD-12345",
          email: "guest@example.com",
        })
        .expect(200);

      expect(
        mockGuestLookupOrder
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        order: {
          _id: "order123",
        },
      });
    });

    test("should use guestLookupLimiter", async () => {
      await request(app)
        .post("/orders/guest-lookup")
        .send({
          orderNumber: "ORD-12345",
        })
        .expect(200);

      expect(
        mockGuestLookupLimiter
      ).toHaveBeenCalledTimes(1);
    });

    test("should not require protect middleware", async () => {
      await request(app)
        .post("/orders/guest-lookup")
        .send({
          orderNumber: "ORD-12345",
        })
        .expect(200);

      expect(mockProtect).not.toHaveBeenCalled();
    });

    test("should pass request body to controller", async () => {
      const lookupData = {
        orderNumber: "ORD-98765",
        email: "guest@example.com",
      };

      await request(app)
        .post("/orders/guest-lookup")
        .send(lookupData)
        .expect(200);

      const [req] =
        mockGuestLookupOrder.mock.calls[0];

      expect(req.body).toEqual(lookupData);
    });
  });

  // ====================================================
  // AUTHENTICATED CHECKOUT
  // ====================================================

  describe("POST /orders/checkout", () => {
    test("should require authentication", async () => {
      await request(app)
        .post("/orders/checkout")
        .send({
          items: [
            {
              productId: "product123",
              quantity: 1,
            },
          ],
        })
        .expect(201);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should call checkout controller", async () => {
      await request(app)
        .post("/orders/checkout")
        .send({
          items: [
            {
              productId: "product123",
              quantity: 1,
            },
          ],
        })
        .expect(201);

      expect(mockCheckout).toHaveBeenCalledTimes(1);
    });

    test("should pass authenticated user", async () => {
      await request(app)
        .post("/orders/checkout")
        .send({
          items: [],
        })
        .expect(201);

      const [req] =
        mockCheckout.mock.calls[0];

      expect(req.user).toEqual({
        id: "user123",
        email: "customer@example.com",
        role: "customer",
      });
    });
  });

  // ====================================================
  // GET USER ORDERS
  // ====================================================

  describe("GET /orders", () => {
    test("should require authentication", async () => {
      await request(app)
        .get("/orders")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should call getOrders controller", async () => {
      const response = await request(app)
        .get("/orders")
        .expect(200);

      expect(mockGetOrders).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        orders: [
          {
            _id: "order123",
            total: 2500,
          },
        ],
      });
    });
  });

  // ====================================================
  // ADMIN GET ALL ORDERS
  // ====================================================

  describe("GET /orders/all", () => {
    test("should require authentication", async () => {
      await request(app)
        .get("/orders/all")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .get("/orders/all")
        .expect(200);

      expect(mockAdminOnly).toHaveBeenCalledTimes(1);
    });

    test("should call getOrders controller", async () => {
      await request(app)
        .get("/orders/all")
        .expect(200);

      expect(mockGetOrders).toHaveBeenCalledTimes(1);
    });

    test("should execute protect before adminOnly", async () => {
      const order = [];

      mockProtect.mockImplementation(
        (req, res, next) => {
          order.push("protect");
          next();
        }
      );

      mockAdminOnly.mockImplementation(
        (req, res, next) => {
          order.push("adminOnly");
          next();
        }
      );

      await request(app)
        .get("/orders/all")
        .expect(200);

      expect(order).toEqual([
        "protect",
        "adminOnly",
      ]);
    });
  });

  // ====================================================
  // ADMIN ORDER SUMMARY
  // ====================================================

  describe("GET /orders/summary", () => {
    test("should require authentication", async () => {
      await request(app)
        .get("/orders/summary")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .get("/orders/summary")
        .expect(200);

      expect(mockAdminOnly).toHaveBeenCalledTimes(1);
    });

    test("should call getOrderSummary controller", async () => {
      const response = await request(app)
        .get("/orders/summary")
        .expect(200);

      expect(
        mockGetOrderSummary
      ).toHaveBeenCalledTimes(1);

      expect(response.body.summary).toEqual({
        totalOrders: 10,
        totalSales: 25000,
      });
    });
  });

  // ====================================================
  // GET ORDER BY ID
  // ====================================================

  describe("GET /orders/:id", () => {
    test("should require authentication", async () => {
      await request(app)
        .get("/orders/order123")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should call getOrderById controller", async () => {
      const response = await request(app)
        .get("/orders/order123")
        .expect(200);

      expect(
        mockGetOrderById
      ).toHaveBeenCalledTimes(1);

      expect(response.body.orderId).toBe(
        "order123"
      );
    });

    test("should pass order ID from URL", async () => {
      await request(app)
        .get("/orders/jewellery-order-456")
        .expect(200);

      const [req] =
        mockGetOrderById.mock.calls[0];

      expect(req.params.id).toBe(
        "jewellery-order-456"
      );
    });
  });

  // ====================================================
  // CANCEL ORDER
  // ====================================================

  describe("PATCH /orders/:id/cancel", () => {
    test("should require authentication", async () => {
      await request(app)
        .patch("/orders/order123/cancel")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should call cancelOrder controller", async () => {
      const response = await request(app)
        .patch("/orders/order123/cancel")
        .expect(200);

      expect(
        mockCancelOrder
      ).toHaveBeenCalledTimes(1);

      expect(response.body.message).toBe(
        "Order cancelled"
      );
    });

    test("should pass order ID from URL", async () => {
      await request(app)
        .patch(
          "/orders/jewellery-order-789/cancel"
        )
        .expect(200);

      const [req] =
        mockCancelOrder.mock.calls[0];

      expect(req.params.id).toBe(
        "jewellery-order-789"
      );
    });
  });

  // ====================================================
  // UPDATE ORDER STATUS
  // ====================================================

  describe("PATCH /orders/:id/status", () => {
    test("should require authentication", async () => {
      await request(app)
        .patch("/orders/order123/status")
        .send({
          status: "shipped",
        })
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .patch("/orders/order123/status")
        .send({
          status: "shipped",
        })
        .expect(200);

      expect(mockAdminOnly).toHaveBeenCalledTimes(1);
    });

    test("should call updateOrderStatus controller", async () => {
      const response = await request(app)
        .patch("/orders/order123/status")
        .send({
          status: "shipped",
        })
        .expect(200);

      expect(
        mockUpdateOrderStatus
      ).toHaveBeenCalledTimes(1);

      expect(response.body.orderId).toBe(
        "order123"
      );

      expect(response.body.status).toBe(
        "shipped"
      );
    });

    test("should pass ID and status to controller", async () => {
      await request(app)
        .patch("/orders/order456/status")
        .send({
          status: "delivered",
        })
        .expect(200);

      const [req] =
        mockUpdateOrderStatus.mock.calls[0];

      expect(req.params.id).toBe(
        "order456"
      );

      expect(req.body.status).toBe(
        "delivered"
      );
    });
  });

  // ====================================================
  // ROUTE MATCHING
  // ====================================================

  describe("Route matching", () => {
    test("should match /all before /:id", async () => {
      await request(app)
        .get("/orders/all")
        .expect(200);

      expect(
        mockGetOrders
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();
    });

    test("should match /summary before /:id", async () => {
      await request(app)
        .get("/orders/summary")
        .expect(200);

      expect(
        mockGetOrderSummary
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();
    });

    test("GET /guest-checkout should match /:id, not guestCheckout", async () => {
      await request(app)
        .get("/orders/guest-checkout")
        .expect(200);

      expect(
        mockGuestCheckout
      ).not.toHaveBeenCalled();

      expect(
        mockGetOrderById
      ).toHaveBeenCalledTimes(1);

      const [req] =
        mockGetOrderById.mock.calls[0];

      expect(req.params.id).toBe(
        "guest-checkout"
      );
    });

    test("GET /guest-lookup should match /:id, not guestLookupOrder", async () => {
      await request(app)
        .get("/orders/guest-lookup")
        .expect(200);

      expect(
        mockGuestLookupOrder
      ).not.toHaveBeenCalled();

      expect(
        mockGetOrderById
      ).toHaveBeenCalledTimes(1);

      const [req] =
        mockGetOrderById.mock.calls[0];

      expect(req.params.id).toBe(
        "guest-lookup"
      );
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for GET /orders/guest-checkout with an extra path", async () => {
      await request(app)
        .get(
          "/orders/guest-checkout/invalid"
        )
        .expect(404);

      expect(
        mockGuestCheckout
      ).not.toHaveBeenCalled();

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /orders/guest-lookup with an extra path", async () => {
      await request(app)
        .get(
          "/orders/guest-lookup/invalid"
        )
        .expect(404);

      expect(
        mockGuestLookupOrder
      ).not.toHaveBeenCalled();

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /orders/order123/cancel", async () => {
      await request(app)
        .get(
          "/orders/order123/cancel"
        )
        .expect(404);

      expect(
        mockCancelOrder
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /orders/order123/status", async () => {
      await request(app)
        .post(
          "/orders/order123/status"
        )
        .send({
          status: "shipped",
        })
        .expect(404);

      expect(
        mockUpdateOrderStatus
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for PUT /orders/order123", async () => {
      await request(app)
        .put("/orders/order123")
        .send({
          status: "shipped",
        })
        .expect(404);

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for DELETE /orders/order123", async () => {
      await request(app)
        .delete("/orders/order123")
        .expect(404);

      expect(
        mockGetOrderById
      ).not.toHaveBeenCalled();

      expect(
        mockCancelOrder
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown order route", async () => {
      await request(app)
        .get("/orders/unknown/path")
        .expect(404);
    });

    test("should return 404 for unknown guest route", async () => {
      await request(app)
        .post("/orders/guest")
        .send({})
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getOrders error", async () => {
      mockGetOrders.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to load orders"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/orders",
        orderRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(
        errorApp
      )
        .get("/orders")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to load orders",
      });

      expect(
        mockGetOrders
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle guestCheckout error", async () => {
      mockGuestCheckout.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Guest checkout failed"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/orders",
        orderRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(
        errorApp
      )
        .post("/orders/guest-checkout")
        .send({
          email: "guest@example.com",
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Guest checkout failed",
      });

      expect(
        mockGuestCheckout
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle updateOrderStatus error", async () => {
      mockUpdateOrderStatus.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to update order status"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/orders",
        orderRouter
      );

      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(
        errorApp
      )
        .patch(
          "/orders/order123/status"
        )
        .send({
          status: "shipped",
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Failed to update order status",
      });

      expect(
        mockUpdateOrderStatus
      ).toHaveBeenCalledTimes(1);
    });
  });
});