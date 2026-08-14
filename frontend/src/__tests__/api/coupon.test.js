import { jest } from "@jest/globals";

// ======================================================
// MOCK CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.unstable_mockModule(
  "../../api/client.js",
  () => ({
    default: mockClient,
  })
);

// ======================================================
// IMPORT COUPON API
// ======================================================

const {
  validateCoupon,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  setCouponStatus,
} = await import("../../api/coupons.js");

// ======================================================
// TEST SUITE
// ======================================================

describe("Coupon API", () => {
  beforeEach(() => {
    mockClient.get.mockClear();
    mockClient.post.mockClear();
    mockClient.put.mockClear();
    mockClient.patch.mockClear();
    mockClient.delete.mockClear();
  });

  // ====================================================
  // validateCoupon
  // ====================================================

  describe("validateCoupon", () => {
    test("should validate coupon successfully", async () => {
      const response = {
        data: {
          valid: true,
          discount: 100,
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await validateCoupon(
        "SAVE100",
        1000,
        [
          {
            product: "product123",
            category: "flowers",
          },
        ],
        "customer@example.com"
      );

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/coupons/validate",
        {
          couponCode: "SAVE100",
          cartTotal: 1000,
          items: [
            {
              product: "product123",
              category: "flowers",
            },
          ],
          guestEmail: "customer@example.com",
        }
      );

      expect(result).toEqual(response);
    });

    test("should work without optional items and guest email", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          valid: true,
        },
      });

      await validateCoupon(
        "WELCOME10",
        500
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/coupons/validate",
        {
          couponCode: "WELCOME10",
          cartTotal: 500,
          items: undefined,
          guestEmail: undefined,
        }
      );
    });

    test("should support guest email", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          valid: true,
        },
      });

      await validateCoupon(
        "GUEST10",
        500,
        [],
        "guest@example.com"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/coupons/validate",
        {
          couponCode: "GUEST10",
          cartTotal: 500,
          items: [],
          guestEmail: "guest@example.com",
        }
      );
    });

    test("should propagate validation error", async () => {
      const error = new Error(
        "Coupon validation failed"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        validateCoupon(
          "INVALID",
          500,
          [],
          "test@example.com"
        )
      ).rejects.toThrow(
        "Coupon validation failed"
      );
    });
  });

  // ====================================================
  // getAllCoupons
  // ====================================================

  describe("getAllCoupons", () => {
    test("should get all coupons", async () => {
      const response = {
        data: [
          {
            _id: "coupon123",
            code: "SAVE20",
          },
        ],
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getAllCoupons();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/coupons",
        {
          params: undefined,
        }
      );

      expect(result).toEqual(response);
    });

    test("should send query parameters", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      const params = {
        page: 1,
        limit: 10,
        search: "SAVE",
        isActive: true,
      };

      await getAllCoupons(params);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/coupons",
        {
          params,
        }
      );
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to get coupons"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getAllCoupons()
      ).rejects.toThrow(
        "Failed to get coupons"
      );
    });
  });

  // ====================================================
  // getCouponById
  // ====================================================

  describe("getCouponById", () => {
    test("should get coupon by ID", async () => {
      const response = {
        data: {
          _id: "coupon123",
          code: "SAVE20",
        },
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getCouponById(
        "coupon123"
      );

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/coupons/coupon123"
      );

      expect(result).toEqual(response);
    });

    test("should correctly use different coupon IDs", async () => {
      mockClient.get.mockResolvedValue({
        data: {},
      });

      await getCouponById("abc456");

      expect(mockClient.get).toHaveBeenCalledWith(
        "/admin/coupons/abc456"
      );
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Coupon not found"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getCouponById("invalid")
      ).rejects.toThrow(
        "Coupon not found"
      );
    });
  });

  // ====================================================
  // createCoupon
  // ====================================================

  describe("createCoupon", () => {
    test("should create coupon", async () => {
      const data = {
        code: "SAVE20",
        discountType: "percentage",
        discountValue: 20,
        isActive: true,
      };

      const response = {
        data: {
          _id: "coupon123",
          ...data,
        },
      };

      mockClient.post.mockResolvedValue(response);

      const result = await createCoupon(data);

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/admin/coupons",
        data
      );

      expect(result).toEqual(response);
    });

    test("should send coupon data unchanged", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      const data = {
        code: "WELCOME10",
        discountType: "fixed",
        discountValue: 100,
        minOrderAmount: 500,
        maxDiscount: 200,
        usageLimit: 100,
        perUserLimit: 2,
        isActive: true,
      };

      await createCoupon(data);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/admin/coupons",
        data
      );
    });

    test("should propagate create error", async () => {
      const error = new Error(
        "Failed to create coupon"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        createCoupon({
          code: "TEST",
        })
      ).rejects.toThrow(
        "Failed to create coupon"
      );
    });
  });

  // ====================================================
  // updateCoupon
  // ====================================================

  describe("updateCoupon", () => {
    test("should update coupon", async () => {
      const data = {
        discountValue: 25,
        isActive: true,
      };

      const response = {
        data: {
          _id: "coupon123",
          ...data,
        },
      };

      mockClient.put.mockResolvedValue(response);

      const result = await updateCoupon(
        "coupon123",
        data
      );

      expect(mockClient.put).toHaveBeenCalledTimes(1);

      expect(mockClient.put).toHaveBeenCalledWith(
        "/admin/coupons/coupon123",
        data
      );

      expect(result).toEqual(response);
    });

    test("should correctly insert coupon ID", async () => {
      mockClient.put.mockResolvedValue({
        data: {},
      });

      await updateCoupon(
        "coupon789",
        {
          code: "NEWCODE",
        }
      );

      expect(mockClient.put).toHaveBeenCalledWith(
        "/admin/coupons/coupon789",
        {
          code: "NEWCODE",
        }
      );
    });

    test("should propagate update error", async () => {
      const error = new Error(
        "Failed to update coupon"
      );

      mockClient.put.mockRejectedValue(error);

      await expect(
        updateCoupon(
          "coupon123",
          {
            discountValue: 50,
          }
        )
      ).rejects.toThrow(
        "Failed to update coupon"
      );
    });
  });

  // ====================================================
  // deleteCoupon
  // ====================================================

  describe("deleteCoupon", () => {
    test("should delete coupon", async () => {
      const response = {
        data: {
          message:
            "Coupon deleted successfully",
        },
      };

      mockClient.delete.mockResolvedValue(response);

      const result = await deleteCoupon(
        "coupon123"
      );

      expect(
        mockClient.delete
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.delete
      ).toHaveBeenCalledWith(
        "/admin/coupons/coupon123"
      );

      expect(result).toEqual(response);
    });

    test("should correctly insert coupon ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {},
      });

      await deleteCoupon("coupon789");

      expect(
        mockClient.delete
      ).toHaveBeenCalledWith(
        "/admin/coupons/coupon789"
      );
    });

    test("should propagate delete error", async () => {
      const error = new Error(
        "Failed to delete coupon"
      );

      mockClient.delete.mockRejectedValue(error);

      await expect(
        deleteCoupon("coupon123")
      ).rejects.toThrow(
        "Failed to delete coupon"
      );
    });
  });

  // ====================================================
  // setCouponStatus
  // ====================================================

  describe("setCouponStatus", () => {
    test("should activate coupon", async () => {
      const response = {
        data: {
          _id: "coupon123",
          isActive: true,
        },
      };

      mockClient.patch.mockResolvedValue(response);

      const result = await setCouponStatus(
        "coupon123",
        true
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/admin/coupons/coupon123/status",
        {
          isActive: true,
        }
      );

      expect(result).toEqual(response);
    });

    test("should deactivate coupon", async () => {
      mockClient.patch.mockResolvedValue({
        data: {
          isActive: false,
        },
      });

      await setCouponStatus(
        "coupon123",
        false
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalledWith(
        "/admin/coupons/coupon123/status",
        {
          isActive: false,
        }
      );
    });

    test("should propagate status update error", async () => {
      const error = new Error(
        "Failed to update coupon status"
      );

      mockClient.patch.mockRejectedValue(error);

      await expect(
        setCouponStatus(
          "coupon123",
          false
        )
      ).rejects.toThrow(
        "Failed to update coupon status"
      );
    });
  });

  // ====================================================
  // HTTP METHOD VERIFICATION
  // ====================================================

  describe("HTTP method verification", () => {
    test("validateCoupon should use POST", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await validateCoupon(
        "SAVE10",
        1000,
        [],
        "test@example.com"
      );

      expect(
        mockClient.post
      ).toHaveBeenCalled();

      expect(
        mockClient.get
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });

    test("getAllCoupons should use GET", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getAllCoupons();

      expect(
        mockClient.get
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();
    });

    test("getCouponById should use GET", async () => {
      mockClient.get.mockResolvedValue({
        data: {},
      });

      await getCouponById("coupon123");

      expect(
        mockClient.get
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();
    });

    test("createCoupon should use POST", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await createCoupon({
        code: "TEST",
      });

      expect(
        mockClient.post
      ).toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();
    });

    test("updateCoupon should use PUT", async () => {
      mockClient.put.mockResolvedValue({
        data: {},
      });

      await updateCoupon(
        "coupon123",
        {
          code: "UPDATED",
        }
      );

      expect(
        mockClient.put
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();
    });

    test("deleteCoupon should use DELETE", async () => {
      mockClient.delete.mockResolvedValue({
        data: {},
      });

      await deleteCoupon("coupon123");

      expect(
        mockClient.delete
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();
    });

    test("setCouponStatus should use PATCH", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await setCouponStatus(
        "coupon123",
        true
      );

      expect(
        mockClient.patch
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });
  });
});