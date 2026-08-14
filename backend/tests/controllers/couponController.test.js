import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// ==========================================================
// ESM MOCKS
// ==========================================================

jest.unstable_mockModule("../../models/Coupon.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/couponEngine.js", () => ({
  findAndValidateCoupon: jest.fn(),
}));

// ==========================================================
// IMPORT MOCKED MODULES AFTER MOCK DEFINITIONS
// ==========================================================

const Coupon = (await import("../../models/Coupon.js")).default;

const { findAndValidateCoupon } =
  await import("../../utils/couponEngine.js");

const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  setCouponStatus,
  validateCoupon,
} = await import("../../controllers/couponController.js");

// ==========================================================
// TEST SUITE
// ==========================================================

describe("Coupon Controller", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: "user123",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================
  // CREATE COUPON
  // ==========================================================

  describe("createCoupon", () => {
    test("should create coupon successfully", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Summer Sale",
        description: "Discount",
        discountType: "percentage",
        discountValue: 20,
        minimumPurchase: 100,
        maximumDiscount: 500,
        usageLimit: 100,
        perUserLimit: 2,
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      };

      Coupon.findOne.mockResolvedValue(null);

      const createdCoupon = {
        _id: "coupon123",
        ...mockReq.body,
      };

      Coupon.create.mockResolvedValue(createdCoupon);

      await createCoupon(mockReq, mockRes);

      expect(Coupon.findOne).toHaveBeenCalledWith({
        code: "SAVE20",
      });

      expect(Coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "SAVE20",
          title: "Summer Sale",
          discountType: "percentage",
          discountValue: 20,
          minimumPurchase: 100,
          maximumDiscount: 500,
          usageLimit: 100,
          perUserLimit: 2,
          createdBy: "user123",
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createdCoupon);
    });

    test("should reject duplicate coupon", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Summer",
        discountType: "percentage",
        discountValue: 20,
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      };

      Coupon.findOne.mockResolvedValue({
        _id: "abc",
      });

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "A coupon with this code already exists.",
      });

      expect(Coupon.create).not.toHaveBeenCalled();
    });

    test("should validate missing title", async () => {
      mockReq.body = {
        code: "SAVE20",
        discountType: "percentage",
        discountValue: 20,
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      };

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Title is required.",
      });

      expect(Coupon.findOne).not.toHaveBeenCalled();
    });

    test("should validate invalid percentage", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Sale",
        discountType: "percentage",
        discountValue: 120,
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      };

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Percentage discount cannot exceed 100.",
      });
    });

    test("should validate invalid start date", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Sale",
        discountType: "percentage",
        discountValue: 20,
        startDate: "",
        endDate: "2030-12-31",
      };

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "A valid start date is required.",
      });
    });

    test("should validate invalid end date", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Sale",
        discountType: "percentage",
        discountValue: 20,
        startDate: "2030-01-01",
        endDate: "",
      };

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "A valid end date is required.",
      });
    });

    test("should return 500 if database throws error", async () => {
      mockReq.body = {
        code: "SAVE20",
        title: "Sale",
        discountType: "percentage",
        discountValue: 20,
        startDate: "2030-01-01",
        endDate: "2030-12-31",
      };

      Coupon.findOne.mockResolvedValue(null);

      Coupon.create.mockRejectedValue(
        new Error("Database error")
      );

      await createCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // GET COUPONS
  // ==========================================================

  describe("getCoupons", () => {
    test("should return all coupons", async () => {
      const coupons = [
        {
          _id: "1",
          code: "SAVE10",
        },
        {
          _id: "2",
          code: "SAVE20",
        },
      ];

      const sortMock = jest.fn();
      const populateMock = jest.fn();

      Coupon.find.mockReturnValue({
        sort: sortMock,
      });

      sortMock.mockReturnValue({
        populate: populateMock,
      });

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        });

      populateMock.mockResolvedValue(coupons);

      await getCoupons(mockReq, mockRes);

      expect(Coupon.find).toHaveBeenCalledWith({});

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(mockRes.json).toHaveBeenCalledWith(coupons);
    });

    test("should filter active coupons", async () => {
      mockReq.query = {
        status: "active",
      };

      const coupons = [
        {
          _id: "1",
          code: "SAVE10",
          isActive: true,
        },
      ];

      const sortMock = jest.fn();
      const populateMock = jest.fn();

      Coupon.find.mockReturnValue({
        sort: sortMock,
      });

      sortMock.mockReturnValue({
        populate: populateMock,
      });

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        });

      populateMock.mockResolvedValue(coupons);

      await getCoupons(mockReq, mockRes);

      expect(Coupon.find).toHaveBeenCalledWith({
        isActive: true,
      });

      expect(mockRes.json).toHaveBeenCalledWith(coupons);
    });

    test("should filter inactive coupons", async () => {
      mockReq.query = {
        status: "inactive",
      };

      const coupons = [
        {
          _id: "2",
          code: "SAVE20",
          isActive: false,
        },
      ];

      const sortMock = jest.fn();
      const populateMock = jest.fn();

      Coupon.find.mockReturnValue({
        sort: sortMock,
      });

      sortMock.mockReturnValue({
        populate: populateMock,
      });

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        });

      populateMock.mockResolvedValue(coupons);

      await getCoupons(mockReq, mockRes);

      expect(Coupon.find).toHaveBeenCalledWith({
        isActive: false,
      });

      expect(mockRes.json).toHaveBeenCalledWith(coupons);
    });

    test("should return 500 when database fails", async () => {
      Coupon.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await getCoupons(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // GET COUPON BY ID
  // ==========================================================

  describe("getCouponById", () => {
    test("should return coupon by id", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      const coupon = {
        _id: "coupon123",
        code: "SAVE20",
      };

      const populateMock = jest.fn();

      Coupon.findById.mockReturnValue({
        populate: populateMock,
      });

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        });

      populateMock.mockResolvedValue(coupon);

      await getCouponById(mockReq, mockRes);

      expect(Coupon.findById).toHaveBeenCalledWith(
        "coupon123"
      );

      expect(mockRes.json).toHaveBeenCalledWith(coupon);
    });

    test("should return 404 if coupon not found", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      const populateMock = jest.fn();

      Coupon.findById.mockReturnValue({
        populate: populateMock,
      });

      populateMock
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        })
        .mockReturnValueOnce({
          populate: populateMock,
        });

      populateMock.mockResolvedValue(null);

      await getCouponById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Coupon not found.",
      });
    });

    test("should return 500 on database error", async () => {
      Coupon.findById.mockImplementation(() => {
        throw new Error("Database error");
      });

      await getCouponById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // UPDATE COUPON
  // ==========================================================

  describe("updateCoupon", () => {
    test("should update coupon successfully", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      mockReq.body = {
        title: "Updated Coupon",
      };

      const coupon = {
        _id: "coupon123",
        code: "SAVE20",
        title: "Old",
        description: "",
        discountType: "percentage",
        discountValue: 20,
        minimumPurchase: 0,
        maximumDiscount: null,
        usageLimit: null,
        perUserLimit: null,
        startDate: new Date("2030-01-01"),
        endDate: new Date("2030-12-31"),
        applicableProducts: [],
        applicableCategories: [],
        excludedProducts: [],
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Coupon.findById.mockResolvedValue(coupon);

      await updateCoupon(mockReq, mockRes);

      expect(coupon.title).toBe("Updated Coupon");

      expect(coupon.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(coupon);
    });

    test("should return 404 when coupon not found", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findById.mockResolvedValue(null);

      await updateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Coupon not found.",
      });
    });

    test("should reject duplicate coupon code", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      mockReq.body = {
        code: "NEWCODE",
      };

      const coupon = {
        _id: "coupon123",
        code: "OLDCODE",
        title: "Coupon",
        description: "",
        discountType: "percentage",
        discountValue: 20,
        minimumPurchase: 0,
        maximumDiscount: null,
        usageLimit: null,
        perUserLimit: null,
        startDate: new Date("2030-01-01"),
        endDate: new Date("2030-12-31"),
        applicableProducts: [],
        applicableCategories: [],
        excludedProducts: [],
        isActive: true,
        save: jest.fn(),
      };

      Coupon.findById.mockResolvedValue(coupon);

      Coupon.findOne.mockResolvedValue({
        _id: "anotherCoupon",
      });

      await updateCoupon(mockReq, mockRes);

      expect(Coupon.findOne).toHaveBeenCalledWith({
        code: "NEWCODE",
        _id: {
          $ne: "coupon123",
        },
      });

      expect(mockRes.status).toHaveBeenCalledWith(409);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "A coupon with this code already exists.",
      });

      expect(coupon.save).not.toHaveBeenCalled();
    });

    test("should return 500 on database error", async () => {
      Coupon.findById.mockRejectedValue(
        new Error("Database error")
      );

      await updateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // DELETE COUPON
  // ==========================================================

  describe("deleteCoupon", () => {
    test("should delete coupon successfully", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findByIdAndDelete.mockResolvedValue({
        _id: "coupon123",
      });

      await deleteCoupon(mockReq, mockRes);

      expect(Coupon.findByIdAndDelete).toHaveBeenCalledWith(
        "coupon123"
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Coupon deleted.",
      });
    });

    test("should return 404 if coupon not found", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findByIdAndDelete.mockResolvedValue(null);

      await deleteCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Coupon not found.",
      });
    });

    test("should return 500 on database error", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findByIdAndDelete.mockRejectedValue(
        new Error("Database error")
      );

      await deleteCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // SET COUPON STATUS
  // ==========================================================

  describe("setCouponStatus", () => {
    test("should activate/deactivate coupon", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      mockReq.body = {
        isActive: false,
      };

      const coupon = {
        _id: "coupon123",
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Coupon.findById.mockResolvedValue(coupon);

      await setCouponStatus(mockReq, mockRes);

      expect(coupon.isActive).toBe(false);

      expect(coupon.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(coupon);
    });

    test("should toggle status when body is missing isActive", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      mockReq.body = {};

      const coupon = {
        _id: "coupon123",
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      Coupon.findById.mockResolvedValue(coupon);

      await setCouponStatus(mockReq, mockRes);

      expect(coupon.isActive).toBe(false);

      expect(coupon.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(coupon);
    });

    test("should return 404 if coupon not found", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findById.mockResolvedValue(null);

      await setCouponStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Coupon not found.",
      });
    });

    test("should return 500 on database error", async () => {
      mockReq.params = {
        id: "coupon123",
      };

      Coupon.findById.mockRejectedValue(
        new Error("Database error")
      );

      await setCouponStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // ==========================================================
  // VALIDATE COUPON
  // ==========================================================

  describe("validateCoupon", () => {
    test("should validate coupon successfully", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 500,
        items: [],
      };

      findAndValidateCoupon.mockResolvedValue({
        coupon: {
          code: "SAVE20",
        },
        discount: 100,
        newTotal: 400,
      });

      await validateCoupon(mockReq, mockRes);

      expect(findAndValidateCoupon).toHaveBeenCalledWith({
        code: "SAVE20",
        cartTotal: 500,
        items: [],
        userId: "user123",
        guestEmail: null,
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        coupon: "SAVE20",
        discount: 100,
        newTotal: 400,
        message: "Coupon Applied Successfully",
      });
    });

    test("should validate guest coupon", async () => {
      mockReq.user = undefined;

      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 500,
        guestEmail: "guest@test.com",
      };

      findAndValidateCoupon.mockResolvedValue({
        coupon: {
          code: "SAVE20",
        },
        discount: 50,
        newTotal: 450,
      });

      await validateCoupon(mockReq, mockRes);

      expect(findAndValidateCoupon).toHaveBeenCalledWith({
        code: "SAVE20",
        cartTotal: 500,
        items: undefined,
        userId: null,
        guestEmail: "guest@test.com",
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        coupon: "SAVE20",
        discount: 50,
        newTotal: 450,
        message: "Coupon Applied Successfully",
      });
    });

    test("should return error for invalid coupon", async () => {
      mockReq.body = {
        couponCode: "INVALID",
        cartTotal: 300,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("Coupon not found.")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Coupon not found.",
      });
    });

    test("should return expired coupon error", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 300,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("Coupon has expired.")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Coupon has expired.",
      });
    });

    test("should return inactive coupon error", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 300,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("This coupon is inactive.")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "This coupon is inactive.",
      });
    });

    test("should return minimum purchase error", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 50,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("Minimum purchase amount not met.")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Minimum purchase amount not met.",
      });
    });

    test("should return usage limit error", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 500,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("Coupon usage limit reached.")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Coupon usage limit reached.",
      });
    });

    test("should return 400 for unexpected validation error", async () => {
      mockReq.body = {
        couponCode: "SAVE20",
        cartTotal: 500,
      };

      findAndValidateCoupon.mockRejectedValue(
        new Error("Unexpected validation error")
      );

      await validateCoupon(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Unexpected validation error",
      });
    });
  });
});