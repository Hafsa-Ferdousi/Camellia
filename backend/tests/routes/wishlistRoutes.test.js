import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";

// ======================================================
// MOCK CONTROLLERS
// ======================================================

const mockGetWishlist = jest.fn();
const mockAddToWishlist = jest.fn();
const mockRemoveFromWishlist = jest.fn();
const mockClearWishlist = jest.fn();

// ======================================================
// MOCK AUTH
// ======================================================

const mockProtect = jest.fn(
  (req, res, next) => {
    req.user = {
      _id: "user123",
    };

    next();
  }
);

// ======================================================
// MOCK MODULES
// ======================================================

jest.unstable_mockModule(
  "../../controllers/wishlistController.js",
  () => ({
    getWishlist: mockGetWishlist,
    addToWishlist: mockAddToWishlist,
    removeFromWishlist:
      mockRemoveFromWishlist,
    clearWishlist: mockClearWishlist,
  })
);

jest.unstable_mockModule(
  "../../middleware/authMiddleware.js",
  () => ({
    protect: mockProtect,
  })
);

// ======================================================
// IMPORT ROUTER AFTER MOCKS
// ======================================================

const { default: wishlistRouter } =
  await import("../../routes/wishlistRoutes.js");

// ======================================================
// APP
// ======================================================

const app = express();

app.use(express.json());

app.use("/wishlist", wishlistRouter);

// ======================================================
// SETUP
// ======================================================

beforeEach(() => {
  jest.clearAllMocks();

  mockProtect.mockImplementation(
    (req, res, next) => {
      req.user = {
        _id: "user123",
      };

      next();
    }
  );

  mockGetWishlist.mockImplementation(
    (req, res) => {
      res.json({
        items: [],
      });
    }
  );

  mockAddToWishlist.mockImplementation(
    (req, res) => {
      res.status(201).json({
        message: "Added to wishlist",
      });
    }
  );

  mockRemoveFromWishlist.mockImplementation(
    (req, res) => {
      res.json({
        message: "Removed from wishlist",
      });
    }
  );

  mockClearWishlist.mockImplementation(
    (req, res) => {
      res.json({
        message: "Wishlist cleared",
      });
    }
  );
});

// ======================================================
// TESTS
// ======================================================

describe("Wishlist Routes", () => {
  // ====================================================
  // 1. GET WISHLIST
  // ====================================================

  test("should get wishlist", async () => {
    const response = await request(app)
      .get("/wishlist")
      .expect(200);

    expect(response.body).toEqual({
      items: [],
    });

    expect(
      mockProtect
    ).toHaveBeenCalled();

    expect(
      mockGetWishlist
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 2. ADD TO WISHLIST
  // ====================================================

  test("should add product to wishlist", async () => {
    const response = await request(app)
      .post("/wishlist")
      .send({
        productId: "product123",
      })
      .expect(201);

    expect(response.body).toEqual({
      message: "Added to wishlist",
    });

    expect(
      mockAddToWishlist
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 3. REMOVE PRODUCT
  // ====================================================

  test("should remove product from wishlist", async () => {
    const response = await request(app)
      .delete(
        "/wishlist/product123"
      )
      .expect(200);

    expect(response.body).toEqual({
      message: "Removed from wishlist",
    });

    expect(
      mockRemoveFromWishlist
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 4. CLEAR WISHLIST
  // ====================================================

  test("should clear wishlist", async () => {
    const response = await request(app)
      .delete("/wishlist/clear")
      .expect(200);

    expect(response.body).toEqual({
      message: "Wishlist cleared",
    });

    expect(
      mockClearWishlist
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 5. INVALID METHODS
  // ====================================================

  test("should return 404 for invalid HTTP methods", async () => {
    await request(app)
      .put("/wishlist")
      .send({
        productId: "product123",
      })
      .expect(404);

    await request(app)
      .get("/wishlist/product123")
      .expect(404);

    expect(
      mockAddToWishlist
    ).not.toHaveBeenCalled();

    expect(
      mockRemoveFromWishlist
    ).not.toHaveBeenCalled();
  });

  // ====================================================
  // 6. PROTECT MIDDLEWARE
  // ====================================================

  test("should use protect middleware for all wishlist routes", async () => {
    await request(app)
      .get("/wishlist")
      .expect(200);

    await request(app)
      .post("/wishlist")
      .send({
        productId: "product123",
      })
      .expect(201);

    await request(app)
      .delete("/wishlist/product123")
      .expect(200);

    await request(app)
      .delete("/wishlist/clear")
      .expect(200);

    expect(
      mockProtect
    ).toHaveBeenCalledTimes(4);
  });
});