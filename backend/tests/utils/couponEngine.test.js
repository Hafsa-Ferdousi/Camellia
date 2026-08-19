import { jest } from "@jest/globals";

// ============================================================
// MOCK COUPON MODEL
// ============================================================

jest.unstable_mockModule("../../models/Coupon.js", () => ({
  default: {
    findOne: jest.fn(),
  },
}));

// Import mocked Coupon model
const { default: Coupon } = await import("../../models/Coupon.js");

// Import module AFTER mock is registered
const {
  findAndValidateCoupon,
  recordCouponUsage,
} = await import("../../utils/couponEngine.js");


// ============================================================
// findAndValidateCoupon
// ============================================================

describe("couponEngine - findAndValidateCoupon", () => {
  const baseCoupon = {
    code: "SAVE10",

    isActive: true,

    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),

    usageLimit: 100,
    usedCount: 10,

    perUserLimit: 3,

    usedBy: [],

    minimumPurchase: 500,

    applicableProducts: [],
    applicableCategories: [],
    excludedProducts: [],

    discountType: "percentage",
    discountValue: 10,

    maximumDiscount: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });


  // ============================================================
  // BASIC VALIDATION
  // ============================================================

  test("should reject empty coupon code", async () => {
    await expect(
      findAndValidateCoupon({
        code: "",
        cartTotal: 1000,
      })
    ).rejects.toThrow("Please enter a coupon code.");
  });


  test("should reject missing coupon code", async () => {
    await expect(
      findAndValidateCoupon({
        cartTotal: 1000,
      })
    ).rejects.toThrow("Please enter a coupon code.");
  });


  test("should reject whitespace-only coupon code", async () => {
    await expect(
      findAndValidateCoupon({
        code: "   ",
        cartTotal: 1000,
      })
    ).rejects.toThrow("Please enter a coupon code.");
  });


  test("should reject invalid cart total", async () => {
    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: "abc",
      })
    ).rejects.toThrow("Invalid cart total.");
  });


  test("should reject NaN cart total", async () => {
    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: NaN,
      })
    ).rejects.toThrow("Invalid cart total.");
  });


  test("should reject negative cart total", async () => {
    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: -100,
      })
    ).rejects.toThrow("Invalid cart total.");
  });


  test("should accept zero cart total when minimum purchase is zero", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      minimumPurchase: 0,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 0,
    });

    expect(result.discount).toBe(0);
    expect(result.newTotal).toBe(0);
  });


  // ============================================================
  // COUPON LOOKUP
  // ============================================================

  test("should reject coupon that does not exist", async () => {
    Coupon.findOne.mockResolvedValue(null);

    await expect(
      findAndValidateCoupon({
        code: "INVALID",
        cartTotal: 1000,
      })
    ).rejects.toThrow("Coupon not found.");

    expect(Coupon.findOne).toHaveBeenCalledWith({
      code: "INVALID",
    });
  });


  test("should normalize coupon code to uppercase", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
    });

    await findAndValidateCoupon({
      code: " save10 ",
      cartTotal: 1000,
    });

    expect(Coupon.findOne).toHaveBeenCalledWith({
      code: "SAVE10",
    });
  });


  test("should handle lowercase coupon code", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
    });

    const result = await findAndValidateCoupon({
      code: "save10",
      cartTotal: 1000,
    });

    expect(Coupon.findOne).toHaveBeenCalledWith({
      code: "SAVE10",
    });

    expect(result.discount).toBe(100);
  });


  // ============================================================
  // ACTIVE / DATE VALIDATION
  // ============================================================

  test("should reject inactive coupon", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      isActive: false,
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
      })
    ).rejects.toThrow("This coupon is inactive.");
  });


  test("should reject coupon that has not started", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      startDate: new Date("2099-01-01"),
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
      })
    ).rejects.toThrow("This coupon has not started yet.");
  });


  test("should reject expired coupon", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      endDate: new Date("2020-01-01"),
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
      })
    ).rejects.toThrow("This coupon has expired.");
  });


  test("should accept valid active coupon", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.coupon.code).toBe("SAVE10");
  });


  // ============================================================
  // GLOBAL USAGE LIMIT
  // ============================================================

  test("should reject coupon when usage limit is reached", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usageLimit: 10,
      usedCount: 10,
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
      })
    ).rejects.toThrow("This coupon has reached its usage limit.");
  });


  test("should reject coupon when usedCount exceeds usageLimit", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usageLimit: 10,
      usedCount: 11,
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
      })
    ).rejects.toThrow("This coupon has reached its usage limit.");
  });


  test("should allow unlimited coupon when usageLimit is null", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usageLimit: null,
      usedCount: 999999,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  // ============================================================
  // PER USER LIMIT
  // ============================================================

  test("should reject authenticated user when per-user limit is reached", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: "user123",
          guestEmail: null,
          count: 3,
        },
      ],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        userId: "user123",
      })
    ).rejects.toThrow(
      "You have already used this coupon the maximum number of times."
    );
  });


  test("should allow authenticated user below per-user limit", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: "user123",
          guestEmail: null,
          count: 2,
        },
      ],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      userId: "user123",
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should allow different authenticated user", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: "user123",
          guestEmail: null,
          count: 3,
        },
      ],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      userId: "user456",
    });

    expect(result.discount).toBe(100);
  });


  // ============================================================
  // GUEST USER LIMIT
  // ============================================================

  test("should reject guest when per-user limit is reached", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: null,
          guestEmail: "customer@example.com",
          count: 3,
        },
      ],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        guestEmail: "customer@example.com",
      })
    ).rejects.toThrow(
      "You have already used this coupon the maximum number of times."
    );
  });


  test("should compare guest email case-insensitively", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: null,
          guestEmail: "customer@example.com",
          count: 3,
        },
      ],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        guestEmail: "CUSTOMER@EXAMPLE.COM",
      })
    ).rejects.toThrow(
      "You have already used this coupon the maximum number of times."
    );
  });


  test("should allow guest below per-user limit", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      usedBy: [
        {
          user: null,
          guestEmail: "customer@example.com",
          count: 1,
        },
      ],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      guestEmail: "customer@example.com",
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  // ============================================================
  // MINIMUM PURCHASE
  // ============================================================

  test("should reject cart below minimum purchase", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      minimumPurchase: 1000,
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 999,
      })
    ).rejects.toThrow("Minimum purchase is ৳1000.");
  });


  test("should accept cart equal to minimum purchase", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      minimumPurchase: 1000,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should accept cart above minimum purchase", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      minimumPurchase: 1000,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1500,
    });

    expect(result.discount).toBe(150);
    expect(result.newTotal).toBe(1350);
  });


  test("should allow coupon when minimumPurchase is zero", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      minimumPurchase: 0,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 100,
    });

    expect(result.discount).toBe(10);
  });


  // ============================================================
  // PERCENTAGE DISCOUNT
  // ============================================================

  test("should calculate percentage discount correctly", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 20,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(200);
    expect(result.newTotal).toBe(800);
  });


  test("should calculate 50 percent discount correctly", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 50,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(500);
    expect(result.newTotal).toBe(500);
  });


  test("should calculate 10 percent discount on decimal total", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 10,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 999.99,
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(899.99);
  });


  // ============================================================
  // MAXIMUM DISCOUNT
  // ============================================================

  test("should apply maximum discount cap", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 50,
      maximumDiscount: 100,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should not apply maximum discount when percentage is below cap", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 10,
      maximumDiscount: 500,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should allow no maximum discount when maximumDiscount is null", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "percentage",
      discountValue: 50,
      maximumDiscount: null,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(500);
    expect(result.newTotal).toBe(500);
  });


  // ============================================================
  // FIXED DISCOUNT
  // ============================================================

  test("should calculate fixed discount correctly", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "fixed",
      discountValue: 250,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(250);
    expect(result.newTotal).toBe(750);
  });


  test("should never allow discount greater than cart total", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "fixed",
      discountValue: 2000,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(1000);
    expect(result.newTotal).toBe(0);
  });


  test("should return zero total when discount equals cart total", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      discountType: "fixed",
      discountValue: 1000,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(1000);
    expect(result.newTotal).toBe(0);
  });


  // ============================================================
  // ROUNDING
  // ============================================================

  test("should round discount and total to two decimal places", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,

      // IMPORTANT:
      // The rounding test uses cartTotal = 100,
      // so minimum purchase must be <= 100.
      minimumPurchase: 0,

      discountType: "percentage",
      discountValue: 33.333,
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 100,
    });

    expect(result.discount).toBe(33.33);
    expect(result.newTotal).toBe(66.67);
  });


  // ============================================================
  // PRODUCT RESTRICTIONS
  // ============================================================

  test("should skip product restrictions when items are omitted", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: [],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
    });

    expect(result.discount).toBe(100);
  });


  test("should allow cart item matching applicable product", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: [],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      items: [
        {
          product: "product123",
          category: "category1",
        },
      ],
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should reject cart when product does not match", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: [],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        items: [
          {
            product: "product999",
            category: "category1",
          },
        ],
      })
    ).rejects.toThrow(
      "This coupon doesn't apply to the items in your cart."
    );
  });


  // ============================================================
  // CATEGORY RESTRICTIONS
  // ============================================================

  test("should allow cart item matching applicable category", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: [],
      applicableCategories: ["category123"],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      items: [
        {
          product: "product1",
          category: "category123",
        },
      ],
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  test("should reject cart when category does not match", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: [],
      applicableCategories: ["category123"],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        items: [
          {
            product: "product1",
            category: "category999",
          },
        ],
      })
    ).rejects.toThrow(
      "This coupon doesn't apply to the items in your cart."
    );
  });


  // ============================================================
  // PRODUCT + CATEGORY
  // ============================================================

  test("should allow product OR category match", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: ["category123"],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      items: [
        {
          product: "product999",
          category: "category123",
        },
      ],
    });

    expect(result.discount).toBe(100);
  });


  test("should allow product match even when category does not match", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: ["category123"],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      items: [
        {
          product: "product123",
          category: "category999",
        },
      ],
    });

    expect(result.discount).toBe(100);
  });


  test("should reject when neither product nor category matches", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: ["category123"],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        items: [
          {
            product: "product999",
            category: "category999",
          },
        ],
      })
    ).rejects.toThrow(
      "This coupon doesn't apply to the items in your cart."
    );
  });


  // ============================================================
  // EXCLUDED PRODUCTS
  // ============================================================

  test("should reject explicitly excluded product", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: ["product999"],
    });

    await expect(
      findAndValidateCoupon({
        code: "SAVE10",
        cartTotal: 1000,
        items: [
          {
            product: "product999",
            category: "category1",
          },
        ],
      })
    ).rejects.toThrow(
      "This coupon doesn't apply to the items in your cart."
    );
  });


  test("should allow eligible item when another item is excluded", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: ["product999"],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 1000,
      items: [
        {
          product: "product999",
          category: "category1",
        },
        {
          product: "product123",
          category: "category2",
        },
      ],
    });

    expect(result.discount).toBe(100);
    expect(result.newTotal).toBe(900);
  });


  // ============================================================
  // MULTIPLE CART ITEMS
  // ============================================================

  test("should allow coupon when at least one cart item is eligible", async () => {
    Coupon.findOne.mockResolvedValue({
      ...baseCoupon,
      applicableProducts: ["product123"],
      applicableCategories: [],
    });

    const result = await findAndValidateCoupon({
      code: "SAVE10",
      cartTotal: 2000,
      items: [
        {
          product: "product999",
          category: "category1",
        },
        {
          product: "product123",
          category: "category2",
        },
      ],
    });

    expect(result.discount).toBe(200);
    expect(result.newTotal).toBe(1800);
  });
});


// ============================================================================
// recordCouponUsage
// ============================================================================

describe("couponEngine - recordCouponUsage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  test("should increment usedCount", async () => {
    const coupon = {
      usedCount: 5,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user123",
    });

    expect(coupon.usedCount).toBe(6);
    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should increment existing authenticated user's usage", async () => {
    const usage = {
      user: "user123",
      guestEmail: null,
      count: 2,
    };

    const coupon = {
      usedCount: 5,
      usedBy: [usage],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user123",
    });

    expect(coupon.usedCount).toBe(6);
    expect(usage.count).toBe(3);

    expect(coupon.usedBy).toHaveLength(1);
    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should create usage record for new authenticated user", async () => {
    const coupon = {
      usedCount: 5,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user456",
    });

    expect(coupon.usedCount).toBe(6);
    expect(coupon.usedBy).toHaveLength(1);

    expect(coupon.usedBy[0]).toEqual({
      user: "user456",
      guestEmail: null,
      count: 1,
    });

    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should increment existing guest user's usage", async () => {
    const usage = {
      user: null,
      guestEmail: "customer@example.com",
      count: 1,
    };

    const coupon = {
      usedCount: 5,
      usedBy: [usage],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      guestEmail: "CUSTOMER@EXAMPLE.COM",
    });

    expect(coupon.usedCount).toBe(6);
    expect(usage.count).toBe(2);

    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should create usage record for new guest", async () => {
    const coupon = {
      usedCount: 5,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      guestEmail: "guest@example.com",
    });

    expect(coupon.usedCount).toBe(6);
    expect(coupon.usedBy).toHaveLength(1);

    expect(coupon.usedBy[0]).toEqual({
      user: null,
      guestEmail: "guest@example.com",
      count: 1,
    });

    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should save coupon after recording usage", async () => {
    const coupon = {
      usedCount: 0,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user123",
    });

    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should record guest usage when no userId is provided", async () => {
    const coupon = {
      usedCount: 0,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      guestEmail: "guest@example.com",
    });

    expect(coupon.usedBy).toHaveLength(1);

    expect(coupon.usedBy[0].user).toBeNull();
    expect(coupon.usedBy[0].guestEmail).toBe("guest@example.com");
    expect(coupon.usedBy[0].count).toBe(1);
  });


  test("should prefer authenticated user over guest email", async () => {
    const coupon = {
      usedCount: 0,
      usedBy: [],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user123",
      guestEmail: "guest@example.com",
    });

    expect(coupon.usedBy[0]).toEqual({
      user: "user123",
      guestEmail: null,
      count: 1,
    });
  });


  test("should increment correct user when multiple users exist", async () => {
    const firstUser = {
      user: "user123",
      guestEmail: null,
      count: 2,
    };

    const secondUser = {
      user: "user456",
      guestEmail: null,
      count: 1,
    };

    const coupon = {
      usedCount: 3,
      usedBy: [firstUser, secondUser],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      userId: "user456",
    });

    expect(coupon.usedCount).toBe(4);
    expect(firstUser.count).toBe(2);
    expect(secondUser.count).toBe(2);
    expect(coupon.save).toHaveBeenCalledTimes(1);
  });


  test("should increment correct guest when multiple guests exist", async () => {
    const firstGuest = {
      user: null,
      guestEmail: "first@example.com",
      count: 2,
    };

    const secondGuest = {
      user: null,
      guestEmail: "second@example.com",
      count: 1,
    };

    const coupon = {
      usedCount: 3,
      usedBy: [firstGuest, secondGuest],
      save: jest.fn().mockResolvedValue(true),
    };

    await recordCouponUsage(coupon, {
      guestEmail: "SECOND@EXAMPLE.COM",
    });

    expect(coupon.usedCount).toBe(4);
    expect(firstGuest.count).toBe(2);
    expect(secondGuest.count).toBe(2);
    expect(coupon.save).toHaveBeenCalledTimes(1);
  });
});