import { jest } from "@jest/globals";

jest.unstable_mockModule("../../api/client", () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const { default: client } = await import("../../api/client");

const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} = await import("../../api/wishlist");

describe("Wishlist API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getWishlist", () => {
    test("should call GET /wishlist", async () => {
      const response = {
        data: [
          {
            id: "1",
            name: "Laptop",
          },
        ],
      };

      client.get.mockResolvedValue(response);

      const result = await getWishlist();

      expect(client.get).toHaveBeenCalledWith("/wishlist");
      expect(result).toBe(response);
    });
  });

  describe("addToWishlist", () => {
    test("should call POST /wishlist with productId", async () => {
      const response = {
        data: {
          message: "Product added to wishlist",
        },
      };

      client.post.mockResolvedValue(response);

      const result = await addToWishlist("product-123");

      expect(client.post).toHaveBeenCalledWith("/wishlist", {
        productId: "product-123",
      });

      expect(result).toBe(response);
    });
  });

  describe("removeFromWishlist", () => {
    test("should call DELETE /wishlist/:productId", async () => {
      const response = {
        data: {
          message: "Product removed from wishlist",
        },
      };

      client.delete.mockResolvedValue(response);

      const result = await removeFromWishlist("product-123");

      expect(client.delete).toHaveBeenCalledWith(
        "/wishlist/product-123"
      );

      expect(result).toBe(response);
    });
  });

  describe("clearWishlist", () => {
    test("should call DELETE /wishlist/clear", async () => {
      const response = {
        data: {
          message: "Wishlist cleared",
        },
      };

      client.delete.mockResolvedValue(response);

      const result = await clearWishlist();

      expect(client.delete).toHaveBeenCalledWith("/wishlist/clear");

      expect(result).toBe(response);
    });
  });
});