import { jest } from "@jest/globals";

// ======================================================
// MOCK API CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.unstable_mockModule("../../api/client.js", () => ({
  default: mockClient,
}));

// ======================================================
// IMPORT API FUNCTIONS AFTER MOCKING CLIENT
// ======================================================

const {
  getAdminStats,
  getCustomers,
  getCustomerDetail,
  resetCustomerPassword,
  getAllOrders,
  updateOrderStatus,
  getAdminSettings,
  updateAdminSettings,
  getLowStockProducts,
  exportSalesCSV,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllConversations,
  getConversationById,
  deleteConversation,
  uploadImage,
  deleteUploadedImage,
  generateDescription,
} = await import("../../api/admin.js");

// ======================================================
// TEST SUITE
// ======================================================

describe("Admin API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================
  // ADMIN STATS
  // ====================================================

  describe("getAdminStats", () => {
    test("should send GET request to /admin/stats", async () => {
      const response = {
        data: {
          totalSales: 10000,
          totalOrders: 50,
        },
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getAdminStats();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/stats"
      );

      expect(result).toEqual(response);
    });

    test("should propagate API error", async () => {
      const error = new Error("Failed to get admin stats");

      mockClient.get.mockRejectedValue(error);

      await expect(getAdminStats()).rejects.toThrow(
        "Failed to get admin stats"
      );
    });
  });

  // ====================================================
  // CUSTOMERS
  // ====================================================

  describe("getCustomers", () => {
    test("should send GET request to /admin/customers", async () => {
      const response = {
        data: [
          {
            _id: "user1",
            name: "John",
            email: "john@example.com",
          },
        ],
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getCustomers();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/customers"
      );

      expect(result).toEqual(response);
    });
  });

  describe("getCustomerDetail", () => {
    test("should send GET request with customer ID", async () => {
      mockClient.get.mockResolvedValue({
        data: {
          _id: "user123",
          name: "John",
        },
      });

      await getCustomerDetail("user123");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/customers/user123"
      );
    });
  });

  describe("resetCustomerPassword", () => {
    test("should send POST request with new password", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "Password reset successfully",
        },
      });

      await resetCustomerPassword(
        "user123",
        "NewPassword123"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/admin/customers/user123/reset-password",
        {
          newPassword: "NewPassword123",
        }
      );
    });
  });

  // ====================================================
  // ORDERS
  // ====================================================

  describe("getAllOrders", () => {
    test("should send GET request to /orders/all", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getAllOrders();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/orders/all"
      );
    });
  });

  describe("updateOrderStatus", () => {
    test("should send PATCH request with order status", async () => {
      mockClient.patch.mockResolvedValue({
        data: {
          message: "Order status updated",
        },
      });

      await updateOrderStatus(
        "order123",
        "shipped"
      );

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/orders/order123/status",
        {
          status: "shipped",
        }
      );
    });

    test("should support different order statuses", async () => {
      mockClient.patch.mockResolvedValue({});

      await updateOrderStatus(
        "order456",
        "delivered"
      );

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/orders/order456/status",
        {
          status: "delivered",
        }
      );
    });
  });

  // ====================================================
  // ADMIN SETTINGS
  // ====================================================

  describe("getAdminSettings", () => {
    test("should send GET request to /admin/settings", async () => {
      mockClient.get.mockResolvedValue({
        data: {
          storeName: "Camellia",
        },
      });

      await getAdminSettings();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/settings"
      );
    });
  });

  describe("updateAdminSettings", () => {
    test("should send PUT request with settings data", async () => {
      const settings = {
        storeName: "Camellia",
        email: "admin@camellia.com",
        phone: "01700000000",
      };

      mockClient.put.mockResolvedValue({
        data: settings,
      });

      await updateAdminSettings(settings);

      expect(mockClient.put).toHaveBeenCalledWith(
        "/admin/settings",
        settings
      );
    });
  });

  // ====================================================
  // LOW STOCK PRODUCTS
  // ====================================================

  describe("getLowStockProducts", () => {
    test("should send empty params when threshold is not provided", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getLowStockProducts();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/products/low-stock",
        {
          params: {},
        }
      );
    });

    test("should send threshold parameter", async () => {
      mockClient.get.mockResolvedValue({
        data: [
          {
            name: "Rose",
            stock: 3,
          },
        ],
      });

      await getLowStockProducts(5);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/products/low-stock",
        {
          params: {
            threshold: 5,
          },
        }
      );
    });

    test("should send empty params when threshold is zero", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getLowStockProducts(0);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/products/low-stock",
        {
          params: {},
        }
      );
    });
  });

  // ====================================================
  // SALES CSV
  // ====================================================

  describe("exportSalesCSV", () => {
    test("should send GET request with params and blob response type", async () => {
      const params = {
        startDate: "2026-08-01",
        endDate: "2026-08-12",
      };

      mockClient.get.mockResolvedValue({
        data: "csv-data",
      });

      await exportSalesCSV(params);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/sales/export",
        {
          params,
          responseType: "blob",
        }
      );
    });

    test("should support empty params", async () => {
      mockClient.get.mockResolvedValue({
        data: "csv-data",
      });

      await exportSalesCSV({});

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/sales/export",
        {
          params: {},
          responseType: "blob",
        }
      );
    });
  });

  // ====================================================
  // PRODUCTS
  // ====================================================

  describe("getAllProducts", () => {
    test("should send GET request to /products/admin/all", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getAllProducts();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/products/admin/all"
      );
    });
  });

  describe("createProduct", () => {
    test("should send POST request with product data", async () => {
      const product = {
        name: "Red Rose",
        price: 500,
        stock: 20,
        category: "flowers",
      };

      mockClient.post.mockResolvedValue({
        data: product,
      });

      await createProduct(product);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/products",
        product
      );
    });
  });

  describe("updateProduct", () => {
    test("should send PUT request with product ID and data", async () => {
      const product = {
        name: "Updated Rose",
        price: 600,
        stock: 15,
      };

      mockClient.put.mockResolvedValue({
        data: product,
      });

      await updateProduct(
        "product123",
        product
      );

      expect(mockClient.put).toHaveBeenCalledWith(
        "/products/product123",
        product
      );
    });
  });

  describe("deleteProduct", () => {
    test("should send DELETE request with product ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {
          message: "Product deleted",
        },
      });

      await deleteProduct("product123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/products/product123"
      );
    });

    test("should propagate delete error", async () => {
      const error = new Error("Delete failed");

      mockClient.delete.mockRejectedValue(error);

      await expect(
        deleteProduct("product123")
      ).rejects.toThrow("Delete failed");
    });
  });

  // ====================================================
  // CATEGORIES
  // ====================================================

  describe("getCategories", () => {
    test("should send GET request to /categories", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getCategories();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/categories"
      );
    });
  });

  describe("createCategory", () => {
    test("should send POST request with category data", async () => {
      const category = {
        name: {
          en: "Flowers",
          bn: "ফুল",
        },
        slug: "flowers",
      };

      mockClient.post.mockResolvedValue({
        data: category,
      });

      await createCategory(category);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/categories",
        category
      );
    });
  });

  describe("updateCategory", () => {
    test("should send PUT request with category ID and data", async () => {
      const category = {
        name: {
          en: "Updated Flowers",
          bn: "আপডেট ফুল",
        },
        slug: "updated-flowers",
      };

      mockClient.put.mockResolvedValue({
        data: category,
      });

      await updateCategory(
        "category123",
        category
      );

      expect(mockClient.put).toHaveBeenCalledWith(
        "/categories/category123",
        category
      );
    });
  });

  describe("deleteCategory", () => {
    test("should send DELETE request with category ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {
          message: "Category deleted",
        },
      });

      await deleteCategory("category123");

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/categories/category123"
      );
    });
  });

  // ====================================================
  // CONVERSATIONS
  // ====================================================

  describe("getAllConversations", () => {
    test("should send GET request to /admin/chats", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getAllConversations();

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/chats"
      );
    });
  });

  describe("getConversationById", () => {
    test("should send GET request with conversation ID", async () => {
      mockClient.get.mockResolvedValue({
        data: {
          _id: "conversation123",
        },
      });

      await getConversationById(
        "conversation123"
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/chats/conversation123"
      );
    });
  });

  describe("deleteConversation", () => {
    test("should send DELETE request with conversation ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {
          message: "Conversation deleted",
        },
      });

      await deleteConversation(
        "conversation123"
      );

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/admin/chats/conversation123"
      );
    });
  });

  // ====================================================
  // IMAGE UPLOAD
  // ====================================================

  describe("uploadImage", () => {
    test("should create FormData and send POST request", async () => {
      const file = new Blob(
        ["fake image data"],
        {
          type: "image/png",
        }
      );

      mockClient.post.mockResolvedValue({
        data: {
          url: "/uploads/image.png",
        },
      });

      await uploadImage(file);

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      const [
        url,
        formData,
        config,
      ] = mockClient.post.mock.calls[0];

      expect(url).toBe("/upload");

      expect(formData).toBeInstanceOf(
        FormData
      );

      expect(config).toEqual({
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      });

      expect(formData.get("image")).toBe(file);
    });
  });

  describe("deleteUploadedImage", () => {
    test("should send DELETE request with image URL", async () => {
      const imageUrl =
        "https://example.com/image.png";

      mockClient.delete.mockResolvedValue({
        data: {
          message: "Image deleted",
        },
      });

      await deleteUploadedImage(imageUrl);

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/upload",
        {
          data: {
            url: imageUrl,
          },
        }
      );
    });
  });

  // ====================================================
  // AI DESCRIPTION GENERATOR
  // ====================================================

  describe("generateDescription", () => {
    test("should send POST request with product information", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          description:
            "A beautiful premium flower arrangement.",
        },
      });

      await generateDescription(
        "Premium Rose Bouquet",
        "Flowers",
        1200
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/admin/generate-description",
        {
          productName:
            "Premium Rose Bouquet",
          category: "Flowers",
          price: 1200,
        }
      );
    });

    test("should accept different product information", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await generateDescription(
        "Chocolate Gift Box",
        "Gifts",
        1500
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/admin/generate-description",
        {
          productName: "Chocolate Gift Box",
          category: "Gifts",
          price: 1500,
        }
      );
    });
  });

  // ====================================================
  // ERROR PROPAGATION
  // ====================================================

  describe("Error propagation", () => {
    test("getCustomers should propagate API errors", async () => {
      const error = new Error(
        "Customers request failed"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getCustomers()
      ).rejects.toThrow(
        "Customers request failed"
      );
    });

    test("getAllOrders should propagate API errors", async () => {
      const error = new Error(
        "Orders request failed"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getAllOrders()
      ).rejects.toThrow(
        "Orders request failed"
      );
    });

    test("createProduct should propagate API errors", async () => {
      const error = new Error(
        "Product creation failed"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        createProduct({
          name: "Test Product",
          price: 100,
        })
      ).rejects.toThrow(
        "Product creation failed"
      );
    });

    test("updateProduct should propagate API errors", async () => {
      const error = new Error(
        "Product update failed"
      );

      mockClient.put.mockRejectedValue(error);

      await expect(
        updateProduct(
          "product123",
          {
            name: "Updated Product",
          }
        )
      ).rejects.toThrow(
        "Product update failed"
      );
    });

    test("updateOrderStatus should propagate API errors", async () => {
      const error = new Error(
        "Order status update failed"
      );

      mockClient.patch.mockRejectedValue(error);

      await expect(
        updateOrderStatus(
          "order123",
          "cancelled"
        )
      ).rejects.toThrow(
        "Order status update failed"
      );
    });
  });
});