import mongoose from "mongoose";
import { describe, test, expect } from "@jest/globals";
import Coupon from "../../models/Coupon.js";

describe("Coupon Model", () => {
  // --------------------------------------------------
  // Basic model
  // --------------------------------------------------

  test("should create a valid coupon with required fields", () => {
    const coupon = new Coupon({
      code: "save20",
      title: "20% Off",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon).toBeDefined();
  });

  // --------------------------------------------------
  // Required fields
  // --------------------------------------------------

  test("should require code", () => {
    const coupon = new Coupon({
      title: "20% Off",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.code).toBeDefined();
  });

  test("should require title", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.title).toBeDefined();
  });

  test("should require discountType", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "20% Off",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.discountType).toBeDefined();
  });

  test("should require discountValue", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "20% Off",
      discountType: "percentage",
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.discountValue).toBeDefined();
  });

  test("should require startDate", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "20% Off",
      discountType: "percentage",
      discountValue: 20,
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.startDate).toBeDefined();
  });

  test("should require endDate", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "20% Off",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.endDate).toBeDefined();
  });

  // --------------------------------------------------
  // Discount type
  // --------------------------------------------------

  test("should accept percentage discount type", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "20% Off",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.discountType).toBe("percentage");
  });

  test("should accept fixed discount type", () => {
    const coupon = new Coupon({
      code: "FLAT100",
      title: "100 Taka Off",
      discountType: "fixed",
      discountValue: 100,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.discountType).toBe("fixed");
  });

  test("should reject invalid discount type", () => {
    const coupon = new Coupon({
      code: "INVALID",
      title: "Invalid Coupon",
      discountType: "random",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.discountType).toBeDefined();
  });

  // --------------------------------------------------
  // Discount value
  // --------------------------------------------------

  test("should reject negative discountValue", () => {
    const coupon = new Coupon({
      code: "NEGATIVE",
      title: "Negative Discount",
      discountType: "percentage",
      discountValue: -10,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.discountValue).toBeDefined();
  });

  test("should accept zero discountValue", () => {
    const coupon = new Coupon({
      code: "ZERO",
      title: "Zero Discount",
      discountType: "fixed",
      discountValue: 0,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // Default values
  // --------------------------------------------------

  test("should apply correct default values", () => {
    const coupon = new Coupon({
      code: "DEFAULT",
      title: "Default Coupon",
      discountType: "percentage",
      discountValue: 10,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.description).toBe("");
    expect(coupon.minimumPurchase).toBe(0);
    expect(coupon.maximumDiscount).toBeNull();
    expect(coupon.usageLimit).toBeNull();
    expect(coupon.usedCount).toBe(0);
    expect(coupon.perUserLimit).toBeNull();
    expect(coupon.isActive).toBe(true);
    expect(coupon.usedBy).toEqual([]);
  });

  // --------------------------------------------------
  // Code transformation
  // --------------------------------------------------

  test("should convert coupon code to uppercase", () => {
    const coupon = new Coupon({
      code: "save20",
      title: "Save 20",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.code).toBe("SAVE20");
  });

  test("should trim coupon code", () => {
    const coupon = new Coupon({
      code: "  SAVE20  ",
      title: "Save 20",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.code).toBe("SAVE20");
  });

  test("should trim title", () => {
    const coupon = new Coupon({
      code: "SAVE20",
      title: "  Save 20  ",
      discountType: "percentage",
      discountValue: 20,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.title).toBe("Save 20");
  });

  // --------------------------------------------------
  // Minimum purchase
  // --------------------------------------------------

  test("should reject negative minimumPurchase", () => {
    const coupon = new Coupon({
      code: "MINUS",
      title: "Invalid Minimum",
      discountType: "percentage",
      discountValue: 10,
      minimumPurchase: -100,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.minimumPurchase).toBeDefined();
  });

  test("should accept valid minimumPurchase", () => {
    const coupon = new Coupon({
      code: "MIN1000",
      title: "Minimum 1000",
      discountType: "percentage",
      discountValue: 10,
      minimumPurchase: 1000,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.minimumPurchase).toBe(1000);
  });

  // --------------------------------------------------
  // Maximum discount
  // --------------------------------------------------

  test("should reject negative maximumDiscount", () => {
    const coupon = new Coupon({
      code: "MAXNEG",
      title: "Invalid Maximum",
      discountType: "percentage",
      discountValue: 20,
      maximumDiscount: -50,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.maximumDiscount).toBeDefined();
  });

  test("should accept null maximumDiscount", () => {
    const coupon = new Coupon({
      code: "NOMAX",
      title: "No Maximum",
      discountType: "percentage",
      discountValue: 20,
      maximumDiscount: null,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.maximumDiscount).toBeNull();
  });

  // --------------------------------------------------
  // Usage limits
  // --------------------------------------------------

  test("should reject negative usageLimit", () => {
    const coupon = new Coupon({
      code: "USELIMIT",
      title: "Usage Limit",
      discountType: "fixed",
      discountValue: 100,
      usageLimit: -1,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.usageLimit).toBeDefined();
  });

  test("should reject negative perUserLimit", () => {
    const coupon = new Coupon({
      code: "USERLIMIT",
      title: "User Limit",
      discountType: "fixed",
      discountValue: 100,
      perUserLimit: -1,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error.errors.perUserLimit).toBeDefined();
  });

  test("should accept valid usage limits", () => {
    const coupon = new Coupon({
      code: "LIMIT10",
      title: "Limited Coupon",
      discountType: "percentage",
      discountValue: 10,
      usageLimit: 100,
      perUserLimit: 2,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.usageLimit).toBe(100);
    expect(coupon.perUserLimit).toBe(2);
  });

  // --------------------------------------------------
  // Used count
  // --------------------------------------------------

  test("should default usedCount to zero", () => {
    const coupon = new Coupon({
      code: "COUNT0",
      title: "Count Test",
      discountType: "fixed",
      discountValue: 50,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.usedCount).toBe(0);
  });

  // --------------------------------------------------
  // isActive
  // --------------------------------------------------

  test("should default isActive to true", () => {
    const coupon = new Coupon({
      code: "ACTIVE",
      title: "Active Coupon",
      discountType: "percentage",
      discountValue: 15,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.isActive).toBe(true);
  });

  test("should allow isActive to be false", () => {
    const coupon = new Coupon({
      code: "INACTIVE",
      title: "Inactive Coupon",
      discountType: "percentage",
      discountValue: 15,
      isActive: false,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.isActive).toBe(false);
  });

  // --------------------------------------------------
  // Description
  // --------------------------------------------------

  test("should default description to empty string", () => {
    const coupon = new Coupon({
      code: "DESC",
      title: "Description Test",
      discountType: "fixed",
      discountValue: 50,
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.description).toBe("");
  });

  // --------------------------------------------------
  // ObjectId references
  // --------------------------------------------------

  test("should accept valid createdBy ObjectId", () => {
    const userId = new mongoose.Types.ObjectId();

    const coupon = new Coupon({
      code: "CREATOR",
      title: "Creator Test",
      discountType: "percentage",
      discountValue: 10,
      createdBy: userId,
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.createdBy.toString()).toBe(userId.toString());
  });

  test("should accept valid product/category ObjectIds", () => {
    const productId = new mongoose.Types.ObjectId();
    const categoryId = new mongoose.Types.ObjectId();

    const coupon = new Coupon({
      code: "PRODUCTCAT",
      title: "Product Category Coupon",
      discountType: "percentage",
      discountValue: 10,
      applicableProducts: [productId],
      applicableCategories: [categoryId],
      excludedProducts: [productId],
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.applicableProducts[0].toString())
      .toBe(productId.toString());
    expect(coupon.applicableCategories[0].toString())
      .toBe(categoryId.toString());
    expect(coupon.excludedProducts[0].toString())
      .toBe(productId.toString());
  });

  // --------------------------------------------------
  // usedBy nested schema
  // --------------------------------------------------

  test("should accept registered user coupon usage", () => {
    const userId = new mongoose.Types.ObjectId();

    const coupon = new Coupon({
      code: "USERUSAGE",
      title: "User Usage",
      discountType: "percentage",
      discountValue: 10,
      usedBy: [
        {
          user: userId,
          count: 2,
        },
      ],
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.usedBy).toHaveLength(1);
    expect(coupon.usedBy[0].user.toString()).toBe(userId.toString());
    expect(coupon.usedBy[0].count).toBe(2);
  });

  test("should accept guest email coupon usage", () => {
    const coupon = new Coupon({
      code: "GUESTUSAGE",
      title: "Guest Usage",
      discountType: "fixed",
      discountValue: 100,
      usedBy: [
        {
          guestEmail: "guest@example.com",
          count: 1,
        },
      ],
      startDate: new Date(),
      endDate: new Date(),
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.usedBy[0].guestEmail).toBe("guest@example.com");
    expect(coupon.usedBy[0].count).toBe(1);
  });

  test("should default coupon usage count to zero", () => {
    const coupon = new Coupon({
      code: "USAGECOUNT",
      title: "Usage Count",
      discountType: "percentage",
      discountValue: 10,
      usedBy: [
        {
          guestEmail: "guest@example.com",
        },
      ],
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.usedBy[0].count).toBe(0);
  });

  test("should not create _id for usedBy subdocuments", () => {
    const coupon = new Coupon({
      code: "NOID",
      title: "No Usage ID",
      discountType: "percentage",
      discountValue: 10,
      usedBy: [
        {
          guestEmail: "guest@example.com",
          count: 1,
        },
      ],
      startDate: new Date(),
      endDate: new Date(),
    });

    expect(coupon.usedBy[0]._id).toBeUndefined();
  });

  // --------------------------------------------------
  // Date fields
  // --------------------------------------------------

  test("should accept valid startDate and endDate", () => {
    const startDate = new Date("2026-08-01");
    const endDate = new Date("2026-08-31");

    const coupon = new Coupon({
      code: "DATES",
      title: "Date Test",
      discountType: "percentage",
      discountValue: 10,
      startDate,
      endDate,
    });

    const error = coupon.validateSync();

    expect(error).toBeUndefined();
    expect(coupon.startDate).toEqual(startDate);
    expect(coupon.endDate).toEqual(endDate);
  });

  // --------------------------------------------------
  // Schema configuration
  // --------------------------------------------------

  test("should have timestamps enabled", () => {
    expect(Coupon.schema.options.timestamps).toBe(true);
  });

  test("should have unique coupon code", () => {
    expect(Coupon.schema.path("code").options.unique).toBe(true);
  });

  test("should use Coupon as the model name", () => {
    expect(Coupon.modelName).toBe("Coupon");
  });
});