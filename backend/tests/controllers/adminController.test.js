import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

/* =========================================================
   MOCK MODELS / UTILITIES
   ========================================================= */

jest.unstable_mockModule("../../models/Order.js", () => ({
  default: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Setting.js", () => ({
  default: {
    getSingleton: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/validators.js", () => ({
  validatePasswordStrength: jest.fn(),
}));

/* =========================================================
   IMPORT AFTER MOCKS
   ========================================================= */

const { default: Order } = await import("../../models/Order.js");
const { default: Product } = await import("../../models/Product.js");
const { default: User } = await import("../../models/User.js");
const { default: Setting } = await import("../../models/Setting.js");
const { validatePasswordStrength } = await import(
  "../../utils/validators.js"
);

const {
  getStats,
  getLowStockProducts,
  exportSalesCSV,
  getCustomers,
  getCustomerDetail,
  resetCustomerPassword,
  getSettings,
  updateSettings,
} = await import("../../controllers/adminController.js");


/* =========================================================
   TEST SUITE
   ========================================================= */

describe("Admin Controller", () => {
  let mockReq;
  let mockRes;
  let mockSettings;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: "admin123",
        role: "admin",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    mockSettings = {
      vatRate: 0.1,
      defaultDeliveryCharge: 60,
      districtDeliveryCharges: [
        {
          district: "Dhaka",
          charge: 60,
        },
        {
          district: "Chittagong",
          charge: 100,
        },
      ],
      lowStockThreshold: 5,
      defaultLanguage: "en",
      save: jest.fn().mockResolvedValue(true),
    };

    Setting.getSingleton.mockResolvedValue(mockSettings);
  });

  /* =======================================================
     GET STATS
     ======================================================= */

  describe("getStats", () => {
    test("should return admin dashboard statistics", async () => {
      Order.countDocuments.mockResolvedValue(20);
      User.countDocuments.mockResolvedValue(100);
      Product.countDocuments
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(3);

      Order.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 25000,
          },
        ])
        .mockResolvedValueOnce([
          { _id: "pending", count: 5 },
          { _id: "confirmed", count: 4 },
          { _id: "delivered", count: 8 },
          { _id: "cancelled", count: 3 },
        ])
        .mockResolvedValueOnce([
          {
            _id: new Date().toISOString().slice(0, 10),
            total: 5000,
          },
        ]);

      const recentOrders = [
        {
          _id: "order1",
          totalAmount: 500,
          status: "delivered",
        },
      ];

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(recentOrders),
      });

      await getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();

      const response = mockRes.json.mock.calls[0][0];

      expect(response).toEqual(
        expect.objectContaining({
          totalOrders: 20,
          totalUsers: 100,
          totalProducts: 50,
          totalRevenue: 25000,
          recentOrders,
          lowStockCount: 3,
        })
      );

      expect(response.statusCounts).toEqual(
        expect.objectContaining({
          pending: 5,
          confirmed: 4,
          delivered: 8,
          cancelled: 3,
          processing: 0,
          shipped: 0,
        })
      );

      expect(response.revenueTrend).toHaveLength(7);
    });

    test("should return zero values when there is no data", async () => {
      Order.countDocuments.mockResolvedValue(0);
      User.countDocuments.mockResolvedValue(0);

      Product.countDocuments
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      });

      await getStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalOrders: 0,
          totalUsers: 0,
          totalProducts: 0,
          totalRevenue: 0,
          recentOrders: [],
          lowStockCount: 0,
        })
      );
    });

    test("should initialize all order statuses to zero", async () => {
      Order.countDocuments.mockResolvedValue(10);
      User.countDocuments.mockResolvedValue(10);

      Product.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      });

      await getStats(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.statusCounts).toEqual({
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
      });
    });

    test("should handle database errors", async () => {
      Order.countDocuments.mockRejectedValue(
        new Error("Database error")
      );

      await getStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  /* =======================================================
     LOW STOCK PRODUCTS
     ======================================================= */

  describe("getLowStockProducts", () => {
    test("should return products using default threshold", async () => {
      const products = [
        {
          _id: "p1",
          name: "Product 1",
          totalStock: 2,
          isActive: true,
        },
      ];

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(products),
      });

      await getLowStockProducts(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        isActive: true,
        totalStock: {
          $lte: 5,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        threshold: 5,
        products,
      });
    });

    test("should use custom threshold from query", async () => {
      mockReq.query = {
        threshold: "10",
      };

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      });

      await getLowStockProducts(mockReq, mockRes);

      expect(Product.find).toHaveBeenCalledWith({
        isActive: true,
        totalStock: {
          $lte: 10,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        threshold: 10,
        products: [],
      });
    });

    test("should sort low-stock products by stock ascending", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: sortMock,
      });

      await getLowStockProducts(mockReq, mockRes);

      expect(sortMock).toHaveBeenCalledWith({
        totalStock: 1,
      });
    });

    test("should handle database errors", async () => {
      Setting.getSingleton.mockRejectedValue(
        new Error("Settings error")
      );

      await getLowStockProducts(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Settings error",
      });
    });
  });

  /* =======================================================
     EXPORT SALES CSV
     ======================================================= */

  describe("exportSalesCSV", () => {
    test("should export all sales as CSV", async () => {
      const orders = [
        {
          _id: "order123",
          createdAt: new Date("2026-08-01"),
          isGuest: false,
          user: {
            name: "John Doe",
            email: "john@example.com",
          },
          items: [
            {
              nameSnapshot: "Gold Ring",
              quantity: 2,
            },
          ],
          subtotal: 1000,
          vat: 100,
          deliveryCharge: 60,
          totalAmount: 1160,
          payment: {
            method: "cash",
            status: "paid",
          },
          status: "delivered",
        },
      ];

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(orders),
      });

      await exportSalesCSV(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith({});

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv"
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("attachment")
      );

      expect(mockRes.send).toHaveBeenCalled();

      const csv = mockRes.send.mock.calls[0][0];

      expect(csv).toContain("Order ID");
      expect(csv).toContain("Customer");
      expect(csv).toContain("John Doe");
      expect(csv).toContain("Gold Ring x2");
    });

    test("should filter sales by date range", async () => {
      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      });

      mockReq.query = {
        from: "2026-08-01",
        to: "2026-08-10",
      };

      await exportSalesCSV(mockReq, mockRes);

      const query = Order.find.mock.calls[0][0];

      expect(query.createdAt).toBeDefined();
      expect(query.createdAt.$gte).toBeInstanceOf(Date);
      expect(query.createdAt.$lte).toBeInstanceOf(Date);
    });

    test("should filter sales by status", async () => {
      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      });

      mockReq.query = {
        status: "delivered",
      };

      await exportSalesCSV(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith({
        status: "delivered",
      });
    });

    test("should correctly export guest customer information", async () => {
      const guestOrder = {
        _id: "guest-order",
        createdAt: new Date("2026-08-01"),
        isGuest: true,
        guestInfo: {
          name: "Guest Customer",
          email: "guest@example.com",
        },
        items: [
          {
            nameSnapshot: "Necklace",
            quantity: 1,
          },
        ],
        subtotal: 500,
        vat: 50,
        deliveryCharge: 60,
        totalAmount: 610,
        payment: {
          method: "cash",
          status: "paid",
        },
        status: "confirmed",
      };

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([guestOrder]),
      });

      await exportSalesCSV(mockReq, mockRes);

      const csv = mockRes.send.mock.calls[0][0];

      expect(csv).toContain("Guest Customer");
      expect(csv).toContain("guest@example.com");
    });

    test("should handle CSV generation errors", async () => {
      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest
          .fn()
          .mockRejectedValue(new Error("Export error")),
      });

      await exportSalesCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Export error",
      });
    });
  });

  /* =======================================================
     GET CUSTOMERS
     ======================================================= */

  describe("getCustomers", () => {
    test("should return registered customers and guests", async () => {
      const users = [
        {
          _id: "user1",
          name: "John",
          username: "john",
          email: "john@example.com",
          phone: "0123456789",
          role: "user",
          twoFactorEnabled: false,
          createdAt: new Date("2026-01-01"),
        },
        {
          _id: "admin1",
          name: "Admin",
          username: "admin",
          email: "admin@example.com",
          phone: "",
          role: "admin",
          twoFactorEnabled: true,
          createdAt: new Date("2026-01-02"),
        },
      ];

      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(users),
        }),
      });

      Order.aggregate
        .mockResolvedValueOnce([
          {
            _id: "user1",
            orderCount: 5,
            totalSpent: 5000,
            lastOrderAt: new Date("2026-08-01"),
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "guest@example.com",
            name: "Guest",
            email: "guest@example.com",
            phone: "0111111111",
            orderCount: 2,
            totalSpent: 1000,
            lastOrderAt: new Date("2026-08-02"),
          },
        ]);

      await getCustomers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();

      const result = mockRes.json.mock.calls[0][0];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);

      const registered = result.find(
        (customer) => customer._id === "user1"
      );

      expect(registered).toEqual(
        expect.objectContaining({
          type: "registered",
          name: "John",
          email: "john@example.com",
          orderCount: 5,
          totalSpent: 5000,
        })
      );

      const guest = result.find(
        (customer) => customer.type === "guest"
      );

      expect(guest).toEqual(
        expect.objectContaining({
          type: "guest",
          email: "guest@example.com",
          orderCount: 2,
          totalSpent: 1000,
        })
      );
    });

    test("should mark admin users as admin type", async () => {
      const users = [
        {
          _id: "admin1",
          name: "Admin",
          username: "admin",
          email: "admin@example.com",
          phone: "",
          role: "admin",
          twoFactorEnabled: true,
          createdAt: new Date(),
        },
      ];

      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(users),
        }),
      });

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getCustomers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith([
        expect.objectContaining({
          type: "admin",
          role: "admin",
        }),
      ]);
    });

    test("should return registered users with zero order statistics", async () => {
      const users = [
        {
          _id: "user1",
          name: "New User",
          username: "newuser",
          email: "new@example.com",
          phone: "",
          role: "user",
          twoFactorEnabled: false,
          createdAt: new Date(),
        },
      ];

      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(users),
        }),
      });

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getCustomers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith([
        expect.objectContaining({
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: null,
        }),
      ]);
    });

    test("should handle customer database errors", async () => {
      User.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockRejectedValue(new Error("Customer error")),
        }),
      });

      await getCustomers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Customer error",
      });
    });
  });

  /* =======================================================
     GET CUSTOMER DETAIL
     ======================================================= */

  describe("getCustomerDetail", () => {
    test("should return customer profile and orders", async () => {
      const user = {
        _id: "user123",
        name: "John Doe",
        email: "john@example.com",
        role: "user",
      };

      const orders = [
        {
          _id: "order1",
          totalAmount: 500,
        },
      ];

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      Order.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(orders),
      });

      mockReq.params = {
        userId: "user123",
      };

      await getCustomerDetail(mockReq, mockRes);

      expect(User.findById).toHaveBeenCalledWith("user123");

      expect(mockRes.json).toHaveBeenCalledWith({
        user,
        orders,
      });
    });

    test("should return 404 when customer does not exist", async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      mockReq.params = {
        userId: "invalid",
      };

      await getCustomerDetail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Customer not found.",
      });
    });

    test("should handle database errors", async () => {
      User.findById.mockReturnValue({
        select: jest
          .fn()
          .mockRejectedValue(new Error("Database error")),
      });

      mockReq.params = {
        userId: "user123",
      };

      await getCustomerDetail(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  /* =======================================================
     RESET CUSTOMER PASSWORD
     ======================================================= */

  describe("resetCustomerPassword", () => {
    test("should reset customer password successfully", async () => {
      const user = {
        _id: "user123",
        password: "oldPassword",
        refreshTokens: ["token1", "token2"],
        save: jest.fn().mockResolvedValue(true),
      };

      mockReq.params = {
        userId: "user123",
      };

      mockReq.body = {
        newPassword: "StrongPassword123!",
      };

      validatePasswordStrength.mockReturnValue({
        valid: true,
        message: "",
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(user),
      });

      await resetCustomerPassword(mockReq, mockRes);

      expect(validatePasswordStrength).toHaveBeenCalledWith(
        "StrongPassword123!"
      );

      expect(user.password).toBe("StrongPassword123!");
      expect(user.refreshTokens).toEqual([]);

      expect(user.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Password reset. Share the new password with the customer securely.",
      });
    });

    test("should reject weak password", async () => {
      mockReq.body = {
        newPassword: "123",
      };

      validatePasswordStrength.mockReturnValue({
        valid: false,
        message: "Password is too weak.",
      });

      await resetCustomerPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Password is too weak.",
      });

      expect(User.findById).not.toHaveBeenCalled();
    });

    test("should return 404 when customer does not exist", async () => {
      mockReq.body = {
        newPassword: "StrongPassword123!",
      };

      validatePasswordStrength.mockReturnValue({
        valid: true,
      });

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      mockReq.params = {
        userId: "invalid",
      };

      await resetCustomerPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Customer not found.",
      });
    });

    test("should handle password reset database errors", async () => {
      mockReq.body = {
        newPassword: "StrongPassword123!",
      };

      validatePasswordStrength.mockReturnValue({
        valid: true,
      });

      User.findById.mockReturnValue({
        select: jest
          .fn()
          .mockRejectedValue(new Error("Reset error")),
      });

      await resetCustomerPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Reset error",
      });
    });
  });

  /* =======================================================
     GET SETTINGS
     ======================================================= */

  describe("getSettings", () => {
    test("should return application settings", async () => {
      await getSettings(mockReq, mockRes);

      expect(Setting.getSingleton).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(
        mockSettings
      );
    });

    test("should handle settings database errors", async () => {
      Setting.getSingleton.mockRejectedValue(
        new Error("Settings database error")
      );

      await getSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Settings database error",
      });
    });
  });

  /* =======================================================
     UPDATE SETTINGS
     ======================================================= */

  describe("updateSettings", () => {
    test("should update valid settings", async () => {
      mockReq.body = {
        vatRate: 0.15,
        defaultDeliveryCharge: 80,
        districtDeliveryCharges: [
          {
            district: "Dhaka",
            charge: 80,
          },
          {
            district: "Sylhet",
            charge: 120,
          },
        ],
        lowStockThreshold: 10,
        defaultLanguage: "bn",
      };

      await updateSettings(mockReq, mockRes);

      expect(mockSettings.vatRate).toBe(0.15);
      expect(mockSettings.defaultDeliveryCharge).toBe(80);

      expect(mockSettings.districtDeliveryCharges).toEqual([
        {
          district: "Dhaka",
          charge: 80,
        },
        {
          district: "Sylhet",
          charge: 120,
        },
      ]);

      expect(mockSettings.lowStockThreshold).toBe(10);
      expect(mockSettings.defaultLanguage).toBe("bn");

      expect(mockSettings.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(
        mockSettings
      );
    });

    test("should reject VAT rate below zero", async () => {
      mockReq.body = {
        vatRate: -0.1,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "VAT rate must be a number between 0 and 1 (e.g. 0.10 for 10%).",
      });

      expect(mockSettings.save).not.toHaveBeenCalled();
    });

    test("should reject VAT rate greater than one", async () => {
      mockReq.body = {
        vatRate: 1.5,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "VAT rate must be a number between 0 and 1 (e.g. 0.10 for 10%).",
      });
    });

    test("should reject negative delivery charge", async () => {
      mockReq.body = {
        defaultDeliveryCharge: -50,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Default delivery charge must be a non-negative number.",
      });
    });

    test("should reject invalid district delivery charges", async () => {
      mockReq.body = {
        districtDeliveryCharges: [
          {
            district: "",
            charge: 50,
          },
        ],
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Each district charge needs a district name and a non-negative charge.",
      });
    });

    test("should reject negative low stock threshold", async () => {
      mockReq.body = {
        lowStockThreshold: -1,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Low stock threshold must be a non-negative number.",
      });
    });

    test("should reject unsupported language", async () => {
      mockReq.body = {
        defaultLanguage: "fr",
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Default language must be 'en' or 'bn'.",
      });
    });

    test("should update only provided settings", async () => {
      mockReq.body = {
        vatRate: 0.2,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockSettings.vatRate).toBe(0.2);

      expect(mockSettings.defaultDeliveryCharge).toBe(60);
      expect(mockSettings.lowStockThreshold).toBe(5);
      expect(mockSettings.defaultLanguage).toBe("en");

      expect(mockSettings.save).toHaveBeenCalled();
    });

    test("should trim district names before saving", async () => {
      mockReq.body = {
        districtDeliveryCharges: [
          {
            district: "  Dhaka  ",
            charge: "75",
          },
        ],
      };

      await updateSettings(mockReq, mockRes);

      expect(mockSettings.districtDeliveryCharges).toEqual([
        {
          district: "Dhaka",
          charge: 75,
        },
      ]);
    });

    test("should handle settings update database errors", async () => {
      mockSettings.save.mockRejectedValue(
        new Error("Save failed")
      );

      mockReq.body = {
        vatRate: 0.2,
      };

      await updateSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Save failed",
      });
    });
  });
});