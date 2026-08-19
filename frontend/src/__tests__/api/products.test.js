import { jest } from "@jest/globals";

jest.unstable_mockModule("../../api/client", () => ({
  default: {
    get: jest.fn(),
  },
}));

const { default: client } = await import("../../api/client");

const {
  getProducts,
  getCategories,
  getProductById,
  getRecommendations,
  searchProducts,
} = await import("../../api/products");

describe("Products API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    test("should call GET /products with params", async () => {
      const params = {
        category: "electronics",
        page: 2,
      };

      client.get.mockResolvedValue({
        data: [],
      });

      const result = await getProducts(params);

      expect(client.get).toHaveBeenCalledWith("/products", {
        params,
      });

      expect(result).toEqual({
        data: [],
      });
    });

    test("should use empty params by default", async () => {
      client.get.mockResolvedValue({
        data: [],
      });

      await getProducts();

      expect(client.get).toHaveBeenCalledWith("/products", {
        params: {},
      });
    });
  });

  describe("getCategories", () => {
    test("should call GET /categories", async () => {
      client.get.mockResolvedValue({
        data: ["Electronics", "Clothing"],
      });

      const result = await getCategories();

      expect(client.get).toHaveBeenCalledWith("/categories");

      expect(result).toEqual({
        data: ["Electronics", "Clothing"],
      });
    });
  });

  describe("getProductById", () => {
    test("should call GET /products/:id", async () => {
      client.get.mockResolvedValue({
        data: {
          id: "123",
          name: "Laptop",
        },
      });

      const result = await getProductById("123");

      expect(client.get).toHaveBeenCalledWith("/products/123");

      expect(result).toEqual({
        data: {
          id: "123",
          name: "Laptop",
        },
      });
    });
  });

  describe("getRecommendations", () => {
    test("should use default limit of 4", async () => {
      client.get.mockResolvedValue({
        data: [],
      });

      await getRecommendations("123");

      expect(client.get).toHaveBeenCalledWith(
        "/products/recommendations/123",
        {
          params: {
            limit: 4,
          },
        }
      );
    });

    test("should use custom limit", async () => {
      client.get.mockResolvedValue({
        data: [],
      });

      await getRecommendations("123", 8);

      expect(client.get).toHaveBeenCalledWith(
        "/products/recommendations/123",
        {
          params: {
            limit: 8,
          },
        }
      );
    });
  });

  describe("searchProducts", () => {
    test("should call search endpoint with query and signal", async () => {
      const controller = new AbortController();
      const signal = controller.signal;

      client.get.mockResolvedValue({
        data: [],
      });

      await searchProducts("laptop", signal);

      expect(client.get).toHaveBeenCalledWith("/products/search", {
        params: {
          q: "laptop",
        },
        signal,
      });
    });

    test("should work without signal", async () => {
      client.get.mockResolvedValue({
        data: [],
      });

      await searchProducts("phone");

      expect(client.get).toHaveBeenCalledWith("/products/search", {
        params: {
          q: "phone",
        },
        signal: undefined,
      });
    });
  });
});