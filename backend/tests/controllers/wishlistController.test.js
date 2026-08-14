import {
  describe,
  test,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";

// ============================================================
// MOCK MODEL BEFORE DYNAMIC IMPORT
// ============================================================

jest.unstable_mockModule("../../models/Wishlist.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

// Dynamic imports AFTER mocking
const Wishlist = (await import("../../models/Wishlist.js")).default;

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = await import("../../controllers/wishlistController.js");

// ============================================================
// TEST SUITE
// ============================================================

describe("Wishlist Controller", () => {
  let mockReq;
  let mockRes;
  let mockWishlist;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      user: {
        _id: "user123",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockWishlist = {
      _id: "wishlist123",
      user: "user123",
      product: "product123",
      createdAt: new Date(),
      populate: jest.fn().mockResolvedValue(undefined),
    };
  });

  // ==========================================================
  // GET WISHLIST
  // ==========================================================

  describe("getWishlist", () => {
    test("should successfully retrieve wishlist", async () => {
      const wishlistItems = [mockWishlist];

      const sortMock = jest.fn().mockResolvedValue(wishlistItems);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(Wishlist.find).toHaveBeenCalledWith({
        user: "user123",
      });

      expect(populateMock).toHaveBeenCalledWith(
        "product",
        "name images basePrice totalStock isActive"
      );

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(mockRes.json).toHaveBeenCalledWith(wishlistItems);
    });

    test("should return empty array when wishlist is empty", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    test("should retrieve multiple wishlist items", async () => {
      const wishlistItems = Array.from({ length: 5 }, (_, i) => ({
        ...mockWishlist,
        _id: `wishlist${i}`,
        product: `product${i}`,
      }));

      const sortMock = jest.fn().mockResolvedValue(wishlistItems);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(wishlistItems);
      expect(wishlistItems).toHaveLength(5);
    });

    test("should only retrieve current user's wishlist", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(Wishlist.find).toHaveBeenCalledWith({
        user: "user123",
      });
    });

    test("should populate product information", async () => {
      const sortMock = jest.fn().mockResolvedValue([mockWishlist]);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(populateMock).toHaveBeenCalledWith(
        "product",
        "name images basePrice totalStock isActive"
      );
    });

    test("should sort wishlist by createdAt descending", async () => {
      const sortMock = jest.fn().mockResolvedValue([mockWishlist]);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    test("should handle database error", async () => {
      Wishlist.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await getWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to fetch wishlist.",
      });
    });

    test("should handle populate database error", async () => {
      const sortMock = jest
        .fn()
        .mockRejectedValue(new Error("Populate error"));

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to fetch wishlist.",
      });
    });
  });

  // ==========================================================
  // ADD TO WISHLIST
  // ==========================================================

  describe("addToWishlist", () => {
    test("should successfully add product to wishlist", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(Wishlist.findOne).toHaveBeenCalledWith({
        user: "user123",
        product: "product123",
      });

      expect(Wishlist.create).toHaveBeenCalledWith({
        user: "user123",
        product: "product123",
      });

      expect(mockWishlist.populate).toHaveBeenCalledWith(
        "product",
        "name images basePrice totalStock isActive"
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockWishlist);
    });

    test("should reject missing product ID", async () => {
      mockReq.body = {};

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product ID is required.",
      });

      expect(Wishlist.findOne).not.toHaveBeenCalled();
      expect(Wishlist.create).not.toHaveBeenCalled();
    });

    test("should reject empty product ID", async () => {
      mockReq.body = {
        productId: "",
      };

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product ID is required.",
      });
    });

    test("should reject null product ID", async () => {
      mockReq.body = {
        productId: null,
      };

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product ID is required.",
      });
    });

    test("should reject duplicate wishlist item", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(Wishlist.findOne).toHaveBeenCalledWith({
        user: "user123",
        product: "product123",
      });

      expect(Wishlist.create).not.toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Product already in wishlist.",
      });
    });

    test("should create wishlist item for correct user", async () => {
      mockReq.body = {
        productId: "product999",
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(Wishlist.create).toHaveBeenCalledWith({
        user: "user123",
        product: "product999",
      });
    });

    test("should populate product after creation", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(mockWishlist.populate).toHaveBeenCalledWith(
        "product",
        "name images basePrice totalStock isActive"
      );
    });

    test("should return created wishlist item with 201 status", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockWishlist);
    });

    test("should handle findOne database error", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockRejectedValue(
        new Error("Database error")
      );

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to add to wishlist.",
      });
    });

    test("should handle create database error", async () => {
      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(null);

      Wishlist.create.mockRejectedValue(
        new Error("Create error")
      );

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to add to wishlist.",
      });
    });

    test("should handle populate error after creation", async () => {
      mockReq.body = {
        productId: "product123",
      };

      const item = {
        ...mockWishlist,
        populate: jest
          .fn()
          .mockRejectedValue(new Error("Populate error")),
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(item);

      await addToWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to add to wishlist.",
      });
    });
  });

  // ==========================================================
  // REMOVE FROM WISHLIST
  // ==========================================================

  describe("removeFromWishlist", () => {
    test("should successfully remove wishlist item", async () => {
      mockReq.params = {
        productId: "product123",
      };

      Wishlist.findOneAndDelete.mockResolvedValue(mockWishlist);

      await removeFromWishlist(mockReq, mockRes);

      expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
        user: "user123",
        product: "product123",
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Removed from wishlist.",
      });
    });

    test("should return 404 when item does not exist", async () => {
      mockReq.params = {
        productId: "product123",
      };

      Wishlist.findOneAndDelete.mockResolvedValue(null);

      await removeFromWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Item not found in wishlist.",
      });
    });

    test("should remove only current user's item", async () => {
      mockReq.params = {
        productId: "product123",
      };

      Wishlist.findOneAndDelete.mockResolvedValue(mockWishlist);

      await removeFromWishlist(mockReq, mockRes);

      expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
        user: "user123",
        product: "product123",
      });
    });

    test("should handle database error", async () => {
      mockReq.params = {
        productId: "product123",
      };

      Wishlist.findOneAndDelete.mockRejectedValue(
        new Error("Database error")
      );

      await removeFromWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to remove from wishlist.",
      });
    });
  });

  // ==========================================================
  // CLEAR WISHLIST
  // ==========================================================

  describe("clearWishlist", () => {
    test("should successfully clear wishlist", async () => {
      Wishlist.deleteMany.mockResolvedValue({
        deletedCount: 3,
      });

      await clearWishlist(mockReq, mockRes);

      expect(Wishlist.deleteMany).toHaveBeenCalledWith({
        user: "user123",
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Wishlist cleared.",
      });
    });

    test("should clear only current user's wishlist", async () => {
      Wishlist.deleteMany.mockResolvedValue({
        deletedCount: 5,
      });

      await clearWishlist(mockReq, mockRes);

      expect(Wishlist.deleteMany).toHaveBeenCalledWith({
        user: "user123",
      });
    });

    test("should successfully clear an already empty wishlist", async () => {
      Wishlist.deleteMany.mockResolvedValue({
        deletedCount: 0,
      });

      await clearWishlist(mockReq, mockRes);

      expect(Wishlist.deleteMany).toHaveBeenCalledWith({
        user: "user123",
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Wishlist cleared.",
      });
    });

    test("should handle database error while clearing", async () => {
      Wishlist.deleteMany.mockRejectedValue(
        new Error("Database error")
      );

      await clearWishlist(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to clear wishlist.",
      });
    });

    test("should delete all wishlist items for current user", async () => {
      Wishlist.deleteMany.mockResolvedValue({
        deletedCount: 100,
      });

      await clearWishlist(mockReq, mockRes);

      expect(Wishlist.deleteMany).toHaveBeenCalledTimes(1);

      expect(Wishlist.deleteMany).toHaveBeenCalledWith({
        user: "user123",
      });
    });
  });

  // ==========================================================
  // EDGE CASES
  // ==========================================================

  describe("Edge Cases", () => {
    test("should work with different user IDs", async () => {
      mockReq.user._id = "differentUser";

      mockReq.body = {
        productId: "product123",
      };

      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      await addToWishlist(mockReq, mockRes);

      expect(Wishlist.findOne).toHaveBeenCalledWith({
        user: "differentUser",
        product: "product123",
      });

      expect(Wishlist.create).toHaveBeenCalledWith({
        user: "differentUser",
        product: "product123",
      });
    });

    test("should retrieve a large wishlist", async () => {
      const largeWishlist = Array.from(
        { length: 1000 },
        (_, i) => ({
          ...mockWishlist,
          _id: `wishlist${i}`,
          product: `product${i}`,
        })
      );

      const sortMock = jest
        .fn()
        .mockResolvedValue(largeWishlist);

      const populateMock = jest.fn().mockReturnValue({
        sort: sortMock,
      });

      Wishlist.find.mockReturnValue({
        populate: populateMock,
      });

      await getWishlist(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        largeWishlist
      );

      expect(largeWishlist).toHaveLength(1000);
    });
  });
});