import { jest } from "@jest/globals";

jest.unstable_mockModule("../../api/client", () => ({
  default: {
    get: jest.fn(),
  },
}));

const { default: client } = await import("../../api/client");

const { getPricing } = await import("../../api/settings");

describe("Settings API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPricing", () => {
    test("should call GET /settings/pricing", async () => {
      client.get.mockResolvedValue({
        data: {
          deliveryFee: 100,
          vat: 5,
        },
      });

      const result = await getPricing();

      expect(client.get).toHaveBeenCalledWith("/settings/pricing");

      expect(result).toEqual({
        data: {
          deliveryFee: 100,
          vat: 5,
        },
      });
    });

    test("should return the API response", async () => {
      const response = {
        data: {
          deliveryFee: 80,
          vat: 10,
          language: "en",
        },
      };

      client.get.mockResolvedValue(response);

      const result = await getPricing();

      expect(result).toBe(response);
    });
  });
});