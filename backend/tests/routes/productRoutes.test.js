import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK PRODUCT CONTROLLERS
// ======================================================

const mockGetProducts = jest.fn();
const mockGetProductById = jest.fn();
const mockGetAllProductsAdmin = jest.fn();
const mockCreateProduct = jest.fn();
const mockUpdateProduct = jest.fn();
const mockDeleteProduct = jest.fn();
const mockSearchProducts = jest.fn();
const mockGetRecommendations = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "admin123",
    email: "admin@camellia.com",
    role: "admin",
  };

  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

// ======================================================
// MOCK CONTROLLER MODULE
// ======================================================

jest.unstable_mockModule(
  "../../controllers/productController.js",
  () => ({
    getProducts: mockGetProducts,
    getProductById: mockGetProductById,
    getAllProductsAdmin: mockGetAllProductsAdmin,
    createProduct: mockCreateProduct,
    updateProduct: mockUpdateProduct,
    deleteProduct: mockDeleteProduct,
    searchProducts: mockSearchProducts,
    getRecommendations: mockGetRecommendations,
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
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: productRouter } =
  await import("../../routes/productRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/products", productRouter);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  // ----------------------------------------------------
  // GET PRODUCTS
  // ----------------------------------------------------

  mockGetProducts.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        products: [
          {
            _id: "product123",
            name: "Gold Necklace",
            price: 5000,
          },
        ],
      });
    }
  );

  // ----------------------------------------------------
  // GET PRODUCT BY ID
  // ----------------------------------------------------

  mockGetProductById.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        productId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // ADMIN GET ALL PRODUCTS
  // ----------------------------------------------------

  mockGetAllProductsAdmin.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        products: [
          {
            _id: "product123",
            name: "Gold Necklace",
            price: 5000,
          },
          {
            _id: "product456",
            name: "Diamond Ring",
            price: 12000,
          },
        ],
      });
    }
  );

  // ----------------------------------------------------
  // CREATE PRODUCT
  // ----------------------------------------------------

  mockCreateProduct.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        product: req.body,
      });
    }
  );

  // ----------------------------------------------------
  // UPDATE PRODUCT
  // ----------------------------------------------------

  mockUpdateProduct.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        productId: req.params.id,
        product: req.body,
      });
    }
  );

  // ----------------------------------------------------
  // DELETE PRODUCT
  // ----------------------------------------------------

  mockDeleteProduct.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Product deleted",
        productId: req.params.id,
      });
    }
  );

  // ----------------------------------------------------
  // SEARCH PRODUCTS
  // ----------------------------------------------------

  mockSearchProducts.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        products: [
          {
            _id: "product123",
            name: "Gold Necklace",
          },
        ],
        query: req.query.q,
      });
    }
  );

  // ----------------------------------------------------
  // AI RECOMMENDATIONS
  // ----------------------------------------------------

  mockGetRecommendations.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        productId: req.params.productId,
        recommendations: [
          {
            _id: "product456",
            name: "Diamond Ring",
          },
        ],
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Product Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // PUBLIC GET PRODUCTS
  // ====================================================

  describe("GET /products", () => {
    test("should call getProducts controller", async () => {
      const response = await request(app)
        .get("/products")
        .expect(200);

      expect(
        mockGetProducts
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        products: [
          {
            _id: "product123",
            name: "Gold Necklace",
            price: 5000,
          },
        ],
      });
    });

    test("should not require authentication", async () => {
      await request(app)
        .get("/products")
        .expect(200);

      expect(
        mockProtect
      ).not.toHaveBeenCalled();

      expect(
        mockAdminOnly
      ).not.toHaveBeenCalled();
    });

    test("should pass query parameters to controller", async () => {
      await request(app)
        .get("/products")
        .query({
          category: "necklaces",
          page: 2,
          limit: 10,
        })
        .expect(200);

      const [req] =
        mockGetProducts.mock.calls[0];

      expect(req.query).toEqual({
        category: "necklaces",
        page: "2",
        limit: "10",
      });
    });
  });

  // ====================================================
  // SEARCH PRODUCTS
  // ====================================================

  describe("GET /products/search", () => {
    test("should call searchProducts controller", async () => {
      const response = await request(app)
        .get("/products/search")
        .query({
          q: "gold",
        })
        .expect(200);

      expect(
        mockSearchProducts
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        products: [
          {
            _id: "product123",
            name: "Gold Necklace",
          },
        ],
        query: "gold",
      });
    });

    test("should pass search query to controller", async () => {
      await request(app)
        .get("/products/search")
        .query({
          q: "diamond ring",
        })
        .expect(200);

      const [req] =
        mockSearchProducts.mock.calls[0];

      expect(req.query.q).toBe(
        "diamond ring"
      );
    });

    test("should be public", async () => {
      await request(app)
        .get("/products/search")
        .query({
          q: "necklace",
        })
        .expect(200);

      expect(
        mockProtect
      ).not.toHaveBeenCalled();

      expect(
        mockAdminOnly
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // AI RECOMMENDATIONS
  // ====================================================

  describe(
    "GET /products/recommendations/:productId",
    () => {
      test("should call getRecommendations controller", async () => {
        const response = await request(app)
          .get(
            "/products/recommendations/product123"
          )
          .expect(200);

        expect(
          mockGetRecommendations
        ).toHaveBeenCalledTimes(1);

        expect(
          response.body.productId
        ).toBe("product123");
      });

      test("should pass productId from URL", async () => {
        await request(app)
          .get(
            "/products/recommendations/product456"
          )
          .expect(200);

        const [req] =
          mockGetRecommendations.mock.calls[0];

        expect(req.params.productId).toBe(
          "product456"
        );
      });

      test("should be public", async () => {
        await request(app)
          .get(
            "/products/recommendations/product123"
          )
          .expect(200);

        expect(
          mockProtect
        ).not.toHaveBeenCalled();

        expect(
          mockAdminOnly
        ).not.toHaveBeenCalled();
      });

      test("should pass query parameters", async () => {
        await request(app)
          .get(
            "/products/recommendations/product123"
          )
          .query({
            limit: 4,
          })
          .expect(200);

        const [req] =
          mockGetRecommendations.mock.calls[0];

        expect(req.query.limit).toBe("4");
      });
    }
  );

  // ====================================================
  // ADMIN GET ALL PRODUCTS
  // ====================================================

  describe("GET /products/admin/all", () => {
    test("should require authentication", async () => {
      await request(app)
        .get("/products/admin/all")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .get("/products/admin/all")
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call getAllProductsAdmin controller", async () => {
      const response = await request(app)
        .get("/products/admin/all")
        .expect(200);

      expect(
        mockGetAllProductsAdmin
      ).toHaveBeenCalledTimes(1);

      expect(response.body.products).toHaveLength(
        2
      );
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
        .get("/products/admin/all")
        .expect(200);

      expect(order).toEqual([
        "protect",
        "adminOnly",
      ]);
    });
  });

  // ====================================================
  // CREATE PRODUCT
  // ====================================================

  describe("POST /products", () => {
    test("should require authentication", async () => {
      await request(app)
        .post("/products")
        .send({
          name: "Gold Necklace",
          price: 5000,
        })
        .expect(201);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .post("/products")
        .send({
          name: "Gold Necklace",
          price: 5000,
        })
        .expect(201);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call createProduct controller", async () => {
      const product = {
        name: "Gold Necklace",
        price: 5000,
        category: "necklaces",
      };

      const response = await request(app)
        .post("/products")
        .send(product)
        .expect(201);

      expect(
        mockCreateProduct
      ).toHaveBeenCalledTimes(1);

      expect(response.body.product).toEqual(
        product
      );
    });

    test("should pass request body to controller", async () => {
      const product = {
        name: "Diamond Ring",
        price: 12000,
      };

      await request(app)
        .post("/products")
        .send(product)
        .expect(201);

      const [req] =
        mockCreateProduct.mock.calls[0];

      expect(req.body).toEqual(product);
    });
  });

  // ====================================================
  // GET PRODUCT BY ID
  // ====================================================

  describe("GET /products/:id", () => {
    test("should call getProductById controller", async () => {
      const response = await request(app)
        .get("/products/product123")
        .expect(200);

      expect(
        mockGetProductById
      ).toHaveBeenCalledTimes(1);

      expect(response.body.productId).toBe(
        "product123"
      );
    });

    test("should pass product ID from URL", async () => {
      await request(app)
        .get(
          "/products/jewellery-product-456"
        )
        .expect(200);

      const [req] =
        mockGetProductById.mock.calls[0];

      expect(req.params.id).toBe(
        "jewellery-product-456"
      );
    });

    test("should be public", async () => {
      await request(app)
        .get("/products/product123")
        .expect(200);

      expect(
        mockProtect
      ).not.toHaveBeenCalled();

      expect(
        mockAdminOnly
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UPDATE PRODUCT
  // ====================================================

  describe("PUT /products/:id", () => {
    test("should require authentication", async () => {
      await request(app)
        .put("/products/product123")
        .send({
          price: 5500,
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .put("/products/product123")
        .send({
          price: 5500,
        })
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call updateProduct controller", async () => {
      const update = {
        price: 5500,
        stock: 20,
      };

      const response = await request(app)
        .put("/products/product123")
        .send(update)
        .expect(200);

      expect(
        mockUpdateProduct
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.productId
      ).toBe("product123");

      expect(response.body.product).toEqual(
        update
      );
    });

    test("should pass ID and body to controller", async () => {
      const update = {
        price: 7500,
        stock: 15,
      };

      await request(app)
        .put("/products/product456")
        .send(update)
        .expect(200);

      const [req] =
        mockUpdateProduct.mock.calls[0];

      expect(req.params.id).toBe(
        "product456"
      );

      expect(req.body).toEqual(update);
    });
  });

  // ====================================================
  // DELETE PRODUCT
  // ====================================================

  describe("DELETE /products/:id", () => {
    test("should require authentication", async () => {
      await request(app)
        .delete("/products/product123")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .delete("/products/product123")
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call deleteProduct controller", async () => {
      const response = await request(app)
        .delete("/products/product123")
        .expect(200);

      expect(
        mockDeleteProduct
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.message
      ).toBe("Product deleted");

      expect(
        response.body.productId
      ).toBe("product123");
    });

    test("should pass product ID to controller", async () => {
      await request(app)
        .delete(
          "/products/jewellery-product-789"
        )
        .expect(200);

      const [req] =
        mockDeleteProduct.mock.calls[0];

      expect(req.params.id).toBe(
        "jewellery-product-789"
      );
    });
  });

  // ====================================================
  // ROUTE ORDERING
  // ====================================================

  describe("Route matching and ordering", () => {
    test("should match /search before /:id", async () => {
      await request(app)
        .get("/products/search")
        .query({
          q: "gold",
        })
        .expect(200);

      expect(
        mockSearchProducts
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetProductById
      ).not.toHaveBeenCalled();
    });

    test("should match /recommendations/:productId before /:id", async () => {
      await request(app)
        .get(
          "/products/recommendations/product123"
        )
        .expect(200);

      expect(
        mockGetRecommendations
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetProductById
      ).not.toHaveBeenCalled();
    });

    test("should match /admin/all before /:id", async () => {
      await request(app)
        .get("/products/admin/all")
        .expect(200);

      expect(
        mockGetAllProductsAdmin
      ).toHaveBeenCalledTimes(1);

      expect(
        mockGetProductById
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for POST /products/search", async () => {
      await request(app)
        .post("/products/search")
        .send({
          q: "gold",
        })
        .expect(404);

      expect(
        mockSearchProducts
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /products/recommendations/:productId", async () => {
      await request(app)
        .post(
          "/products/recommendations/product123"
        )
        .expect(404);

      expect(
        mockGetRecommendations
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /products/:id", async () => {
      await request(app)
        .post("/products/product123")
        .send({
          name: "Test",
        })
        .expect(404);

      expect(
        mockGetProductById
      ).not.toHaveBeenCalled();

      expect(
        mockUpdateProduct
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for PATCH /products/:id", async () => {
      await request(app)
        .patch("/products/product123")
        .send({
          price: 5000,
        })
        .expect(404);

      expect(
        mockUpdateProduct
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for DELETE /products", async () => {
      await request(app)
        .delete("/products")
        .expect(404);

      expect(
        mockDeleteProduct
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown product route", async () => {
      await request(app)
        .get("/products/unknown/path")
        .expect(404);
    });

    test("should return 404 for unknown recommendation route", async () => {
      await request(app)
        .get(
          "/products/recommendations/product123/extra"
        )
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getProducts error", async () => {
      mockGetProducts.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to load products"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .get("/products")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to load products",
      });

      expect(
        mockGetProducts
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle searchProducts error", async () => {
      mockSearchProducts.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Product search failed"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .get("/products/search")
        .query({
          q: "gold",
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Product search failed",
      });

      expect(
        mockSearchProducts
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle getRecommendations error", async () => {
      mockGetRecommendations.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Recommendation service failed"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .get(
          "/products/recommendations/product123"
        )
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message:
          "Recommendation service failed",
      });

      expect(
        mockGetRecommendations
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle createProduct error", async () => {
      mockCreateProduct.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to create product"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .post("/products")
        .send({
          name: "Gold Necklace",
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to create product",
      });

      expect(
        mockCreateProduct
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle updateProduct error", async () => {
      mockUpdateProduct.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to update product"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .put("/products/product123")
        .send({
          price: 6000,
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to update product",
      });

      expect(
        mockUpdateProduct
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle deleteProduct error", async () => {
      mockDeleteProduct.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to delete product"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/products",
        productRouter
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
        .delete("/products/product123")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to delete product",
      });

      expect(
        mockDeleteProduct
      ).toHaveBeenCalledTimes(1);
    });
  });
});