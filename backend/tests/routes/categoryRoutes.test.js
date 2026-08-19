import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CATEGORY CONTROLLERS
// ======================================================

const mockGetCategories = jest.fn();
const mockCreateCategory = jest.fn();
const mockUpdateCategory = jest.fn();
const mockDeleteCategory = jest.fn();

// ======================================================
// MOCK AUTH MIDDLEWARE
// ======================================================

const mockProtect = jest.fn((req, res, next) => {
  req.user = {
    id: "admin123",
    email: "admin@camellia.com",
  };

  next();
});

const mockAdminOnly = jest.fn((req, res, next) => {
  next();
});

// ======================================================
// MOCK MODULES
// ======================================================

jest.unstable_mockModule(
  "../../controllers/categoryController.js",
  () => ({
    getCategories: mockGetCategories,
    createCategory: mockCreateCategory,
    updateCategory: mockUpdateCategory,
    deleteCategory: mockDeleteCategory,
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

const { default: categoryRouter } =
  await import("../../routes/categoryRoutes.js");

// ======================================================
// TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/categories", categoryRouter);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  mockGetCategories.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        categories: [
          {
            _id: "category123",
            name: {
              en: "Jewellery",
              bn: "গহনা",
            },
          },
        ],
      });
    }
  );

  mockCreateCategory.mockImplementation(
    (req, res) => {
      res.status(201).json({
        success: true,
        category: req.body,
      });
    }
  );

  mockUpdateCategory.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        categoryId: req.params.id,
        category: req.body,
      });
    }
  );

  mockDeleteCategory.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Category deleted",
        categoryId: req.params.id,
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Category Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // PUBLIC GET CATEGORIES
  // ====================================================

  describe("GET /categories", () => {
    test("should call getCategories controller", async () => {
      const response = await request(app)
        .get("/categories")
        .expect(200);

      expect(
        mockGetCategories
      ).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        categories: [
          {
            _id: "category123",
            name: {
              en: "Jewellery",
              bn: "গহনা",
            },
          },
        ],
      });
    });

    test("should not require authentication", async () => {
      await request(app)
        .get("/categories")
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
  // CREATE CATEGORY
  // ====================================================

  describe("POST /categories", () => {
    test("should require authentication", async () => {
      await request(app)
        .post("/categories")
        .send({
          name: {
            en: "Necklaces",
            bn: "হার",
          },
        })
        .expect(201);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .post("/categories")
        .send({
          name: {
            en: "Necklaces",
            bn: "হার",
          },
        })
        .expect(201);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should execute protect before adminOnly", async () => {
      const middlewareOrder = [];

      mockProtect.mockImplementation(
        (req, res, next) => {
          middlewareOrder.push("protect");
          next();
        }
      );

      mockAdminOnly.mockImplementation(
        (req, res, next) => {
          middlewareOrder.push("adminOnly");
          next();
        }
      );

      await request(app)
        .post("/categories")
        .send({
          name: {
            en: "Bracelets",
            bn: "ব্রেসলেট",
          },
        })
        .expect(201);

      expect(middlewareOrder).toEqual([
        "protect",
        "adminOnly",
      ]);
    });

    test("should call createCategory controller", async () => {
      const category = {
        name: {
          en: "Earrings",
          bn: "কানের দুল",
        },
      };

      const response = await request(app)
        .post("/categories")
        .send(category)
        .expect(201);

      expect(
        mockCreateCategory
      ).toHaveBeenCalledTimes(1);

      expect(response.body.category).toEqual(
        category
      );
    });

    test("should pass request body to controller", async () => {
      const category = {
        name: {
          en: "Rings",
          bn: "আংটি",
        },
      };

      await request(app)
        .post("/categories")
        .send(category)
        .expect(201);

      const controllerCall =
        mockCreateCategory.mock.calls[0];

      const req = controllerCall[0];

      expect(req.body).toEqual(category);
    });
  });

  // ====================================================
  // UPDATE CATEGORY
  // ====================================================

  describe("PUT /categories/:id", () => {
    test("should require authentication", async () => {
      await request(app)
        .put("/categories/category123")
        .send({
          name: {
            en: "Gold Rings",
            bn: "সোনার আংটি",
          },
        })
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .put("/categories/category123")
        .send({
          name: {
            en: "Gold Rings",
            bn: "সোনার আংটি",
          },
        })
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call updateCategory controller", async () => {
      const category = {
        name: {
          en: "Gold Rings",
          bn: "সোনার আংটি",
        },
      };

      const response = await request(app)
        .put("/categories/category123")
        .send(category)
        .expect(200);

      expect(
        mockUpdateCategory
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.categoryId
      ).toBe("category123");

      expect(response.body.category).toEqual(
        category
      );
    });

    test("should pass category ID from URL", async () => {
      await request(app)
        .put(
          "/categories/jewellery-category-456"
        )
        .send({
          name: {
            en: "Necklaces",
            bn: "হার",
          },
        })
        .expect(200);

      const controllerCall =
        mockUpdateCategory.mock.calls[0];

      const req = controllerCall[0];

      expect(req.params.id).toBe(
        "jewellery-category-456"
      );
    });

    test("should pass request body to controller", async () => {
      const category = {
        name: {
          en: "Pearl Earrings",
          bn: "মুক্তার কানের দুল",
        },
      };

      await request(app)
        .put("/categories/category789")
        .send(category)
        .expect(200);

      const controllerCall =
        mockUpdateCategory.mock.calls[0];

      const req = controllerCall[0];

      expect(req.body).toEqual(category);
    });
  });

  // ====================================================
  // DELETE CATEGORY
  // ====================================================

  describe("DELETE /categories/:id", () => {
    test("should require authentication", async () => {
      await request(app)
        .delete("/categories/category123")
        .expect(200);

      expect(
        mockProtect
      ).toHaveBeenCalledTimes(1);
    });

    test("should require admin authorization", async () => {
      await request(app)
        .delete("/categories/category123")
        .expect(200);

      expect(
        mockAdminOnly
      ).toHaveBeenCalledTimes(1);
    });

    test("should call deleteCategory controller", async () => {
      const response = await request(app)
        .delete("/categories/category123")
        .expect(200);

      expect(
        mockDeleteCategory
      ).toHaveBeenCalledTimes(1);

      expect(
        response.body.categoryId
      ).toBe("category123");

      expect(
        response.body.message
      ).toBe("Category deleted");
    });

    test("should pass category ID from URL", async () => {
      await request(app)
        .delete(
          "/categories/jewellery-category-789"
        )
        .expect(200);

      const controllerCall =
        mockDeleteCategory.mock.calls[0];

      const req = controllerCall[0];

      expect(req.params.id).toBe(
        "jewellery-category-789"
      );
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for POST with invalid category ID path", async () => {
      await request(app)
        .post("/categories/category123")
        .send({
          name: {
            en: "Bracelets",
          },
        })
        .expect(404);

      expect(
        mockCreateCategory
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for PATCH /categories", async () => {
      await request(app)
        .patch("/categories")
        .send({
          name: {
            en: "Bracelets",
          },
        })
        .expect(404);

      expect(
        mockCreateCategory
      ).not.toHaveBeenCalled();

      expect(
        mockUpdateCategory
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /categories/:id", async () => {
      await request(app)
        .get("/categories/category123")
        .expect(404);

      expect(
        mockGetCategories
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown category route", async () => {
      await request(app)
        .get("/categories/unknown/path")
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getCategories controller error", async () => {
      mockGetCategories.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to load categories"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/categories",
        categoryRouter
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
        .get("/categories")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to load categories",
      });

      expect(
        mockGetCategories
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle createCategory controller error", async () => {
      mockCreateCategory.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to create category"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/categories",
        categoryRouter
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
        .post("/categories")
        .send({
          name: {
            en: "Bracelets",
            bn: "ব্রেসলেট",
          },
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to create category",
      });

      expect(
        mockCreateCategory
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle updateCategory controller error", async () => {
      mockUpdateCategory.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to update category"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/categories",
        categoryRouter
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
        .put("/categories/category123")
        .send({
          name: {
            en: "Updated Rings",
            bn: "আপডেট আংটি",
          },
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to update category",
      });

      expect(
        mockUpdateCategory
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle deleteCategory controller error", async () => {
      mockDeleteCategory.mockImplementation(
        (req, res, next) => {
          next(
            new Error(
              "Failed to delete category"
            )
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use(
        "/categories",
        categoryRouter
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
        .delete(
          "/categories/category123"
        )
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to delete category",
      });

      expect(
        mockDeleteCategory
      ).toHaveBeenCalledTimes(1);
    });
  });
});