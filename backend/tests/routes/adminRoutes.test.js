import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK ADMIN CONTROLLERS
// ======================================================

const mockGetStats = jest.fn();
const mockGetCustomers = jest.fn();
const mockGetCustomerDetail = jest.fn();
const mockResetCustomerPassword = jest.fn();
const mockGetSettings = jest.fn();
const mockUpdateSettings = jest.fn();
const mockGetLowStockProducts = jest.fn();
const mockExportSalesCSV = jest.fn();

// ======================================================
// MOCK CHAT CONTROLLERS
// ======================================================

const mockGetAllConversations = jest.fn();
const mockGetConversationById = jest.fn();
const mockDeleteConversation = jest.fn();

// ======================================================
// MOCK DESCRIPTION CONTROLLER
// ======================================================

const mockGenerateDescription = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

// ======================================================
// MOCK MODULES
// ======================================================

jest.unstable_mockModule(
  "../../controllers/adminController.js",
  () => ({
    getStats: mockGetStats,
    getCustomers: mockGetCustomers,
    getCustomerDetail: mockGetCustomerDetail,
    resetCustomerPassword:
      mockResetCustomerPassword,
    getSettings: mockGetSettings,
    updateSettings: mockUpdateSettings,
    getLowStockProducts:
      mockGetLowStockProducts,
    exportSalesCSV: mockExportSalesCSV,
  })
);

jest.unstable_mockModule(
  "../../controllers/chatController.js",
  () => ({
    getAllConversations:
      mockGetAllConversations,
    getConversationById:
      mockGetConversationById,
    deleteConversation:
      mockDeleteConversation,
  })
);

jest.unstable_mockModule(
  "../../controllers/descriptionController.js",
  () => ({
    generateDescription:
      mockGenerateDescription,
  })
);

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
    adminOnly: mockAdminOnly,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: adminRouter } =
  await import("../../routes/adminRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/admin", adminRouter);

// ======================================================
// HELPER
// ======================================================

function resetMocks() {
  jest.clearAllMocks();

  mockGetStats.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Stats retrieved",
      });
    }
  );

  mockGetCustomers.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        customers: [],
      });
    }
  );

  mockGetCustomerDetail.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        userId: req.params.userId,
      });
    }
  );

  mockResetCustomerPassword.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Password reset",
      });
    }
  );

  mockGetSettings.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        settings: {},
      });
    }
  );

  mockUpdateSettings.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        settings: req.body,
      });
    }
  );

  mockGetLowStockProducts.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        products: [],
      });
    }
  );

  mockExportSalesCSV.mockImplementation(
    (req, res) => {
      res.status(200).send("csv,data");
    }
  );

  mockGetAllConversations.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        conversations: [],
      });
    }
  );

  mockGetConversationById.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        id: req.params.id,
      });
    }
  );

  mockDeleteConversation.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Conversation deleted",
      });
    }
  );

  mockGenerateDescription.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        description:
          "A beautiful jewellery product.",
      });
    }
  );
}

// ======================================================
// TESTS
// ======================================================

describe("Admin Routes", () => {
  beforeEach(() => {
    resetMocks();
  });

  // ====================================================
  // MIDDLEWARE
  // ====================================================

  describe("Middleware", () => {
    test("should execute protect middleware", async () => {
      await request(app)
        .get("/admin/stats")
        .expect(200);

      expect(mockProtect).toHaveBeenCalled();
    });

    test("should execute adminOnly middleware", async () => {
      await request(app)
        .get("/admin/stats")
        .expect(200);

      expect(mockAdminOnly).toHaveBeenCalled();
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
        .get("/admin/stats")
        .expect(200);

      expect(order).toEqual([
        "protect",
        "adminOnly",
      ]);
    });
  });

  // ====================================================
  // STATS
  // ====================================================

  describe("GET /admin/stats", () => {
    test("should call getStats controller", async () => {
      const response = await request(app)
        .get("/admin/stats")
        .expect(200);

      expect(mockGetStats).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        message: "Stats retrieved",
      });
    });
  });

  // ====================================================
  // CUSTOMERS
  // ====================================================

  describe("GET /admin/customers", () => {
    test("should call getCustomers controller", async () => {
      await request(app)
        .get("/admin/customers")
        .expect(200);

      expect(
        mockGetCustomers
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /admin/customers/:userId", () => {
    test("should pass userId to controller", async () => {
      const response = await request(app)
        .get("/admin/customers/user123")
        .expect(200);

      expect(
        mockGetCustomerDetail
      ).toHaveBeenCalledTimes(1);

      expect(response.body.userId).toBe(
        "user123"
      );
    });
  });

  describe(
    "POST /admin/customers/:userId/reset-password",
    () => {
      test("should call resetCustomerPassword", async () => {
        await request(app)
          .post(
            "/admin/customers/user123/reset-password"
          )
          .send({
            newPassword: "NewPassword123!",
          })
          .expect(200);

        expect(
          mockResetCustomerPassword
        ).toHaveBeenCalledTimes(1);
      });
    }
  );

  // ====================================================
  // SETTINGS
  // ====================================================

  describe("GET /admin/settings", () => {
    test("should call getSettings controller", async () => {
      await request(app)
        .get("/admin/settings")
        .expect(200);

      expect(
        mockGetSettings
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("PUT /admin/settings", () => {
    test("should call updateSettings controller", async () => {
      const settings = {
        siteName: "Camellia",
        language: "bn",
      };

      const response = await request(app)
        .put("/admin/settings")
        .send(settings)
        .expect(200);

      expect(
        mockUpdateSettings
      ).toHaveBeenCalledTimes(1);

      expect(response.body.settings).toEqual(
        settings
      );
    });
  });

  // ====================================================
  // LOW STOCK
  // ====================================================

  describe(
    "GET /admin/products/low-stock",
    () => {
      test("should call getLowStockProducts", async () => {
        await request(app)
          .get(
            "/admin/products/low-stock"
          )
          .expect(200);

        expect(
          mockGetLowStockProducts
        ).toHaveBeenCalledTimes(1);
      });

      test("should pass query parameters", async () => {
        await request(app)
          .get(
            "/admin/products/low-stock?threshold=5"
          )
          .expect(200);

        expect(
          mockGetLowStockProducts
        ).toHaveBeenCalledTimes(1);
      });
    }
  );

  // ====================================================
  // SALES EXPORT
  // ====================================================

  describe("GET /admin/sales/export", () => {
    test("should call exportSalesCSV", async () => {
      const response = await request(app)
        .get(
          "/admin/sales/export?startDate=2026-08-01&endDate=2026-08-14"
        )
        .expect(200);

      expect(
        mockExportSalesCSV
      ).toHaveBeenCalledTimes(1);

      expect(response.text).toBe(
        "csv,data"
      );
    });
  });

  // ====================================================
  // CHATS
  // ====================================================

  describe("GET /admin/chats", () => {
    test("should call getAllConversations", async () => {
      await request(app)
        .get("/admin/chats")
        .expect(200);

      expect(
        mockGetAllConversations
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /admin/chats/:id", () => {
    test("should pass conversation ID", async () => {
      const response = await request(app)
        .get(
          "/admin/chats/conversation123"
        )
        .expect(200);

      expect(
        mockGetConversationById
      ).toHaveBeenCalledTimes(1);

      expect(response.body.id).toBe(
        "conversation123"
      );
    });
  });

  describe("DELETE /admin/chats/:id", () => {
    test("should call deleteConversation", async () => {
      const response = await request(app)
        .delete(
          "/admin/chats/conversation123"
        )
        .expect(200);

      expect(
        mockDeleteConversation
      ).toHaveBeenCalledTimes(1);

      expect(response.body.message).toBe(
        "Conversation deleted"
      );
    });
  });

  // ====================================================
  // AI DESCRIPTION
  // ====================================================

  describe(
    "POST /admin/generate-description",
    () => {
      test("should call generateDescription controller", async () => {
        const product = {
          productName: "Gold Necklace",
          category: "Jewellery",
          price: 4500,
        };

        const response = await request(app)
          .post(
            "/admin/generate-description"
          )
          .send(product)
          .expect(200);

        expect(
          mockGenerateDescription
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body.description
        ).toBe(
          "A beautiful jewellery product."
        );
      });
    }
  );

  // ====================================================
  // METHOD VALIDATION
  // ====================================================

  describe("HTTP methods", () => {
    test("should not allow POST for /admin/stats", async () => {
      await request(app)
        .post("/admin/stats")
        .expect(404);

      expect(
        mockGetStats
      ).not.toHaveBeenCalled();
    });

    test("should not allow DELETE for /admin/settings", async () => {
      await request(app)
        .delete("/admin/settings")
        .expect(404);

      expect(
        mockGetSettings
      ).not.toHaveBeenCalled();

      expect(
        mockUpdateSettings
      ).not.toHaveBeenCalled();
    });

    test("should not allow GET for /admin/generate-description", async () => {
      await request(app)
        .get(
          "/admin/generate-description"
        )
        .expect(404);

      expect(
        mockGenerateDescription
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown admin route", async () => {
      await request(app)
        .get("/admin/unknown-route")
        .expect(404);
    });
  });
});