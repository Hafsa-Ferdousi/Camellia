import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";

import Coupon from "../../models/Coupon.js";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  setCouponStatus,
  validateCoupon,
} from "../../controllers/couponController.js";

import { findAndValidateCoupon } from "../../utils/couponEngine.js";

jest.mock("../../models/Coupon.js");

jest.mock("../../utils/couponEngine.js", () => ({
  findAndValidateCoupon: jest.fn(),
}));

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

      expect(Coupon.create).toHaveBeenCalled();

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
      { _id: "1", code: "SAVE10" },
      { _id: "2", code: "SAVE20" },
    ];

    const populateMock = jest.fn().mockReturnThis();

    Coupon.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: populateMock
      })
    });

    populateMock
      .mockReturnThis()
      .mockReturnThis()
      .mockReturnThis()
      .mockResolvedValue(coupons);

    await getCoupons(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(coupons);

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

    const populateMock = jest.fn().mockReturnThis();

    Coupon.findById.mockReturnValue({
      populate: populateMock,
    });

    populateMock
      .mockReturnThis()
      .mockReturnThis()
      .mockReturnThis()
      .mockResolvedValue(coupon);

    await getCouponById(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(coupon);

  });

  test("should return 404 if coupon not found", async () => {

    mockReq.params = {
      id: "coupon123",
    };

    const populateMock = jest.fn().mockReturnThis();

    Coupon.findById.mockReturnValue({
      populate: populateMock,
    });

    populateMock
      .mockReturnThis()
      .mockReturnThis()
      .mockReturnThis()
      .mockResolvedValue(null);

    await getCouponById(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);

    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Coupon not found.",
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

    expect(mockRes.status).toHaveBeenCalledWith(409);

    expect(mockRes.json).toHaveBeenCalledWith({
      message: "A coupon with this code already exists.",
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

    expect(Coupon.findByIdAndDelete)
      .toHaveBeenCalledWith("coupon123");

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

    expect(mockRes.status)
      .toHaveBeenCalledWith(404);

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

    expect(mockRes.status)
      .toHaveBeenCalledWith(500);

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

  test("should toggle status when body missing", async () => {

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

  });

  test("should return 404 if coupon not found", async () => {

    mockReq.params = {
      id: "coupon123",
    };

    Coupon.findById.mockResolvedValue(null);

    await setCouponStatus(mockReq, mockRes);

    expect(mockRes.status)
      .toHaveBeenCalledWith(404);

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

    expect(mockRes.status)
      .toHaveBeenCalledWith(500);

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
