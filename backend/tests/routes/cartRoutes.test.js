import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CART CONTROLLERS
// ======================================================

const mockGetCart = jest.fn();
const mockAddToCart = jest.fn();
const mockUpdateCartItem = jest.fn();
const mockRemoveCartItem = jest.fn();

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
// MOCK MODULES
// ======================================================

jest.unstable_mockModule(
  "../../controllers/cartController.js",
  () => ({
    getCart: mockGetCart,
    addToCart: mockAddToCart,
    updateCartItem: mockUpdateCartItem,
    removeCartItem: mockRemoveCartItem,
  })
);

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKING
// ======================================================

const { default: cartRouter } =
  await import("../../routes/cartRoutes.js");

// ======================================================
// MAIN TEST APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/cart", cartRouter);

// ======================================================
// DEFAULT CONTROLLER RESPONSES
// ======================================================

function setupControllerMocks() {
  mockGetCart.mockImplementation((req, res) => {
    res.status(200).json({
      success: true,
      cart: {
        items: [],
      },
    });
  });

  mockAddToCart.mockImplementation((req, res) => {
    res.status(201).json({
      success: true,
      message: "Item added to cart",
      productId: req.body.productId,
    });
  });

  mockUpdateCartItem.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart item updated",
        itemId: req.params.id,
      });
    }
  );

  mockRemoveCartItem.mockImplementation(
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart item removed",
        itemId: req.params.id,
      });
    }
  );
}

// ======================================================
// TEST SUITE
// ======================================================

describe("Cart Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    setupControllerMocks();
  });

  // ====================================================
  // AUTHENTICATION MIDDLEWARE
  // ====================================================

  describe("Authentication middleware", () => {
    test("should use protect middleware for GET /cart", async () => {
      await request(app)
        .get("/cart")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should use protect middleware for POST /cart", async () => {
      await request(app)
        .post("/cart")
        .send({
          productId: "product123",
          quantity: 1,
        })
        .expect(201);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should use protect middleware for PATCH /cart/:id", async () => {
      await request(app)
        .patch("/cart/item123")
        .send({
          quantity: 2,
        })
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });

    test("should use protect middleware for DELETE /cart/:id", async () => {
      await request(app)
        .delete("/cart/item123")
        .expect(200);

      expect(mockProtect).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================
  // GET CART
  // ====================================================

  describe("GET /cart", () => {
    test("should call getCart controller", async () => {
      const response = await request(app)
        .get("/cart")
        .expect(200);

      expect(mockGetCart).toHaveBeenCalledTimes(1);

      expect(response.body).toEqual({
        success: true,
        cart: {
          items: [],
        },
      });
    });
  });

  // ====================================================
  // ADD TO CART
  // ====================================================

  describe("POST /cart", () => {
    test("should call addToCart controller", async () => {
      const product = {
        productId: "product123",
        quantity: 2,
      };

      const response = await request(app)
        .post("/cart")
        .send(product)
        .expect(201);

      expect(mockAddToCart).toHaveBeenCalledTimes(1);

      expect(response.body.productId).toBe(
        "product123"
      );
    });

    test("should pass request body to controller", async () => {
      const product = {
        productId: "gold-necklace",
        quantity: 3,
      };

      await request(app)
        .post("/cart")
        .send(product)
        .expect(201);

      const controllerCall =
        mockAddToCart.mock.calls[0];

      const req = controllerCall[0];

      expect(req.body).toEqual(product);
    });
  });

  // ====================================================
  // UPDATE CART ITEM
  // ====================================================

  describe("PATCH /cart/:id", () => {
    test("should call updateCartItem controller", async () => {
      const response = await request(app)
        .patch("/cart/item123")
        .send({
          quantity: 4,
        })
        .expect(200);

      expect(
        mockUpdateCartItem
      ).toHaveBeenCalledTimes(1);

      expect(response.body.itemId).toBe(
        "item123"
      );
    });

    test("should pass item ID from URL", async () => {
      await request(app)
        .patch("/cart/jewellery-item-456")
        .send({
          quantity: 2,
        })
        .expect(200);

      const controllerCall =
        mockUpdateCartItem.mock.calls[0];

      const req = controllerCall[0];

      expect(req.params.id).toBe(
        "jewellery-item-456"
      );
    });

    test("should pass quantity in request body", async () => {
      await request(app)
        .patch("/cart/item123")
        .send({
          quantity: 5,
        })
        .expect(200);

      const controllerCall =
        mockUpdateCartItem.mock.calls[0];

      const req = controllerCall[0];

      expect(req.body.quantity).toBe(5);
    });
  });

  // ====================================================
  // REMOVE CART ITEM
  // ====================================================

  describe("DELETE /cart/:id", () => {
    test("should call removeCartItem controller", async () => {
      const response = await request(app)
        .delete("/cart/item123")
        .expect(200);

      expect(
        mockRemoveCartItem
      ).toHaveBeenCalledTimes(1);

      expect(response.body.itemId).toBe(
        "item123"
      );
    });

    test("should pass item ID from URL", async () => {
      await request(app)
        .delete(
          "/cart/jewellery-item-789"
        )
        .expect(200);

      const controllerCall =
        mockRemoveCartItem.mock.calls[0];

      const req = controllerCall[0];

      expect(req.params.id).toBe(
        "jewellery-item-789"
      );
    });
  });

  // ====================================================
  // INVALID HTTP METHODS
  // ====================================================

  describe("Invalid HTTP methods", () => {
    test("should return 404 for PUT /cart", async () => {
      await request(app)
        .put("/cart")
        .send({
          productId: "product123",
        })
        .expect(404);

      expect(
        mockGetCart
      ).not.toHaveBeenCalled();

      expect(
        mockAddToCart
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for GET /cart/:id", async () => {
      await request(app)
        .get("/cart/item123")
        .expect(404);

      expect(
        mockUpdateCartItem
      ).not.toHaveBeenCalled();

      expect(
        mockRemoveCartItem
      ).not.toHaveBeenCalled();
    });

    test("should return 404 for POST /cart/:id", async () => {
      await request(app)
        .post("/cart/item123")
        .send({
          quantity: 2,
        })
        .expect(404);

      expect(
        mockAddToCart
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // UNKNOWN ROUTES
  // ====================================================

  describe("Unknown routes", () => {
    test("should return 404 for unknown cart route", async () => {
      await request(app)
        .get("/cart/unknown/path")
        .expect(404);
    });
  });

  // ====================================================
  // CONTROLLER ERROR HANDLING
  // ====================================================

  describe("Controller errors", () => {
    test("should handle getCart controller error", async () => {
      mockGetCart.mockImplementation(
        (req, res, next) => {
          next(
            new Error("Failed to load cart")
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use("/cart", cartRouter);

      // Express error handler
      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .get("/cart")
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to load cart",
      });

      expect(
        mockGetCart
      ).toHaveBeenCalledTimes(1);
    });

    test("should handle addToCart controller error", async () => {
      mockAddToCart.mockImplementation(
        (req, res, next) => {
          next(
            new Error("Failed to add item")
          );
        }
      );

      const errorApp = express();

      errorApp.use(express.json());

      errorApp.use("/cart", cartRouter);

      // Express error handler
      errorApp.use(
        (err, req, res, next) => {
          res.status(500).json({
            success: false,
            message: err.message,
          });
        }
      );

      const response = await request(errorApp)
        .post("/cart")
        .send({
          productId: "product123",
          quantity: 1,
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: "Failed to add item",
      });

      expect(
        mockAddToCart
      ).toHaveBeenCalledTimes(1);
    });
  });
});