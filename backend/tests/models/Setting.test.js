import mongoose from "mongoose";
import Setting from "../../models/Setting.js";

describe("Setting Model Unit Tests", () => {
  // --------------------------------------------------
  // Helper function
  // --------------------------------------------------
  const validSettingData = () => ({
    vatRate: 0.15,
    defaultDeliveryCharge: 120,
    districtDeliveryCharges: [
      {
        district: "Dhaka",
        charge: 60,
      },
      {
        district: "Chattogram",
        charge: 80,
      },
    ],
    lowStockThreshold: 5,
    defaultLanguage: "bn",
  });

  // --------------------------------------------------
  // 1. Valid Setting
  // --------------------------------------------------
  test("should create a valid setting", () => {
    const setting = new Setting(validSettingData());

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.vatRate).toBe(0.15);
    expect(setting.defaultDeliveryCharge).toBe(120);
    expect(setting.lowStockThreshold).toBe(5);
    expect(setting.defaultLanguage).toBe("bn");
  });

  // --------------------------------------------------
  // 2. Default VAT rate
  // --------------------------------------------------
  test("should set vatRate to 0.10 by default", () => {
    const setting = new Setting();

    expect(setting.vatRate).toBe(0.10);
  });

  // --------------------------------------------------
  // 3. Default delivery charge
  // --------------------------------------------------
  test("should set defaultDeliveryCharge to 150 by default", () => {
    const setting = new Setting();

    expect(setting.defaultDeliveryCharge).toBe(150);
  });

  // --------------------------------------------------
  // 4. Default low stock threshold
  // --------------------------------------------------
  test("should set lowStockThreshold to 10 by default", () => {
    const setting = new Setting();

    expect(setting.lowStockThreshold).toBe(10);
  });

  // --------------------------------------------------
  // 5. Default language
  // --------------------------------------------------
  test("should set defaultLanguage to en by default", () => {
    const setting = new Setting();

    expect(setting.defaultLanguage).toBe("en");
  });

  // --------------------------------------------------
  // 6. Default district delivery charges
  // --------------------------------------------------
  test("should set Cox's Bazar delivery charge by default", () => {
    const setting = new Setting();

    expect(setting.districtDeliveryCharges).toHaveLength(1);

    expect(setting.districtDeliveryCharges[0].district).toBe(
      "Cox's Bazar"
    );

    expect(setting.districtDeliveryCharges[0].charge).toBe(70);
  });

  // --------------------------------------------------
  // 7. Custom VAT rate
  // --------------------------------------------------
  test("should accept a custom vatRate", () => {
    const setting = new Setting({
      vatRate: 0.20,
    });

    expect(setting.vatRate).toBe(0.20);
  });

  // --------------------------------------------------
  // 8. Custom delivery charge
  // --------------------------------------------------
  test("should accept a custom defaultDeliveryCharge", () => {
    const setting = new Setting({
      defaultDeliveryCharge: 200,
    });

    expect(setting.defaultDeliveryCharge).toBe(200);
  });

  // --------------------------------------------------
  // 9. Custom low stock threshold
  // --------------------------------------------------
  test("should accept a custom lowStockThreshold", () => {
    const setting = new Setting({
      lowStockThreshold: 20,
    });

    expect(setting.lowStockThreshold).toBe(20);
  });

  // --------------------------------------------------
  // 10. English language
  // --------------------------------------------------
  test("should accept defaultLanguage as en", () => {
    const setting = new Setting({
      defaultLanguage: "en",
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.defaultLanguage).toBe("en");
  });

  // --------------------------------------------------
  // 11. Bangla language
  // --------------------------------------------------
  test("should accept defaultLanguage as bn", () => {
    const setting = new Setting({
      defaultLanguage: "bn",
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.defaultLanguage).toBe("bn");
  });

  // --------------------------------------------------
  // 12. Invalid language
  // --------------------------------------------------
  test("should fail for an invalid defaultLanguage", () => {
    const setting = new Setting({
      defaultLanguage: "fr",
    });

    const error = setting.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.defaultLanguage).toBeDefined();
  });

  // --------------------------------------------------
  // 13. District delivery charges
  // --------------------------------------------------
  test("should accept multiple district delivery charges", () => {
    const setting = new Setting({
      districtDeliveryCharges: [
        {
          district: "Dhaka",
          charge: 50,
        },
        {
          district: "Rajshahi",
          charge: 90,
        },
        {
          district: "Sylhet",
          charge: 100,
        },
      ],
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();

    expect(setting.districtDeliveryCharges).toHaveLength(3);

    expect(setting.districtDeliveryCharges[0].district).toBe(
      "Dhaka"
    );

    expect(setting.districtDeliveryCharges[1].charge).toBe(90);
  });

  // --------------------------------------------------
  // 14. District name
  // --------------------------------------------------
  test("should accept a district name", () => {
    const setting = new Setting({
      districtDeliveryCharges: [
        {
          district: "Khulna",
          charge: 80,
        },
      ],
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(
      setting.districtDeliveryCharges[0].district
    ).toBe("Khulna");
  });

  // --------------------------------------------------
  // 15. District charge
  // --------------------------------------------------
  test("should accept a district charge", () => {
    const setting = new Setting({
      districtDeliveryCharges: [
        {
          district: "Barisal",
          charge: 75,
        },
      ],
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(
      setting.districtDeliveryCharges[0].charge
    ).toBe(75);
  });

  // --------------------------------------------------
  // 16. Empty district array
  // --------------------------------------------------
  test("should allow an empty districtDeliveryCharges array", () => {
    const setting = new Setting({
      districtDeliveryCharges: [],
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.districtDeliveryCharges).toEqual([]);
  });

  // --------------------------------------------------
  // 17. VAT rate can be zero
  // --------------------------------------------------
  test("should allow vatRate to be zero", () => {
    const setting = new Setting({
      vatRate: 0,
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.vatRate).toBe(0);
  });

  // --------------------------------------------------
  // 18. Delivery charge can be zero
  // --------------------------------------------------
  test("should allow defaultDeliveryCharge to be zero", () => {
    const setting = new Setting({
      defaultDeliveryCharge: 0,
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.defaultDeliveryCharge).toBe(0);
  });

  // --------------------------------------------------
  // 19. Low stock threshold can be zero
  // --------------------------------------------------
  test("should allow lowStockThreshold to be zero", () => {
    const setting = new Setting({
      lowStockThreshold: 0,
    });

    const error = setting.validateSync();

    expect(error).toBeUndefined();
    expect(setting.lowStockThreshold).toBe(0);
  });

  // --------------------------------------------------
  // 20. Timestamps
  // --------------------------------------------------
  test("should have createdAt and updatedAt timestamps", () => {
    expect(Setting.schema.path("createdAt")).toBeDefined();
    expect(Setting.schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 21. Model name
  // --------------------------------------------------
  test("should use Setting as the model name", () => {
    expect(Setting.modelName).toBe("Setting");
  });

  // --------------------------------------------------
  // 22. Schema fields
  // --------------------------------------------------
  test("should contain all expected schema fields", () => {
    const schema = Setting.schema;

    expect(schema.path("vatRate")).toBeDefined();
    expect(schema.path("defaultDeliveryCharge")).toBeDefined();
    expect(schema.path("districtDeliveryCharges")).toBeDefined();
    expect(schema.path("lowStockThreshold")).toBeDefined();
    expect(schema.path("defaultLanguage")).toBeDefined();
    expect(schema.path("createdAt")).toBeDefined();
    expect(schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 23. Correct default values
  // --------------------------------------------------
  test("should have the correct schema default values", () => {
    const schema = Setting.schema;

    expect(schema.path("vatRate").defaultValue).toBe(0.10);
    expect(
      schema.path("defaultDeliveryCharge").defaultValue
    ).toBe(150);

    expect(
      schema.path("lowStockThreshold").defaultValue
    ).toBe(10);

    expect(
      schema.path("defaultLanguage").defaultValue
    ).toBe("en");
  });

  // --------------------------------------------------
  // 24. defaultLanguage enum
  // --------------------------------------------------
  test("should have en and bn as allowed languages", () => {
    const languagePath = Setting.schema.path("defaultLanguage");

    expect(languagePath.enumValues).toEqual([
      "en",
      "bn",
    ]);
  });

  // --------------------------------------------------
  // 25. getSingleton static method
  // --------------------------------------------------
  test("should have getSingleton static method", () => {
    expect(typeof Setting.getSingleton).toBe("function");
  });

  // --------------------------------------------------
  // 26. District delivery charge schema
  // --------------------------------------------------
  test("should contain district and charge fields", () => {
    const schema = Setting.schema;

    const districtPath =
      schema.path("districtDeliveryCharges");

    expect(districtPath).toBeDefined();

    const childSchema =
      districtPath.schema;

    if (childSchema) {
      expect(childSchema.path("district")).toBeDefined();
      expect(childSchema.path("charge")).toBeDefined();
    }
  });

  // --------------------------------------------------
  // 27. District charge should accept number
  // --------------------------------------------------
  test("should store district charge as a number", () => {
    const setting = new Setting({
      districtDeliveryCharges: [
        {
          district: "Dhaka",
          charge: 100,
        },
      ],
    });

    expect(
      typeof setting.districtDeliveryCharges[0].charge
    ).toBe("number");
  });

  // --------------------------------------------------
  // 28. VAT rate should be a number
  // --------------------------------------------------
  test("should store vatRate as a number", () => {
    const setting = new Setting({
      vatRate: 0.15,
    });

    expect(typeof setting.vatRate).toBe("number");
  });

  // --------------------------------------------------
  // 29. Delivery charge should be a number
  // --------------------------------------------------
  test("should store defaultDeliveryCharge as a number", () => {
    const setting = new Setting({
      defaultDeliveryCharge: 180,
    });

    expect(
      typeof setting.defaultDeliveryCharge
    ).toBe("number");
  });

  // --------------------------------------------------
  // 30. Low stock threshold should be a number
  // --------------------------------------------------
  test("should store lowStockThreshold as a number", () => {
    const setting = new Setting({
      lowStockThreshold: 15,
    });

    expect(
      typeof setting.lowStockThreshold
    ).toBe("number");
  });
});