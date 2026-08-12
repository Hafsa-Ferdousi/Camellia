import mongoose from "mongoose";
import Product from "../../models/Product.js";

describe("Product Model Unit Tests", () => {
  // --------------------------------------------------
  // Helper function
  // --------------------------------------------------
  const validProductData = () => ({
    name: {
      en: "Test Product",
      bn: "টেস্ট পণ্য",
    },

    description: {
      en: "Test product description",
      bn: "টেস্ট পণ্যের বিবরণ",
    },

    category: new mongoose.Types.ObjectId(),

    basePrice: 500,

    images: [
      "image1.jpg",
      "image2.jpg",
    ],

    totalStock: 20,
  });

  // --------------------------------------------------
  // 1. Valid Product
  // --------------------------------------------------
  test("should create a valid product", () => {
    const product = new Product(validProductData());

    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.name.en).toBe("Test Product");
    expect(product.name.bn).toBe("টেস্ট পণ্য");
    expect(product.basePrice).toBe(500);
    expect(product.totalStock).toBe(20);
  });

  // --------------------------------------------------
  // 2. name.en is required
  // --------------------------------------------------
  test("should fail when name.en is missing", () => {
    const data = validProductData();

    delete data.name.en;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["name.en"]).toBeDefined();
  });

  // --------------------------------------------------
  // 3. category is required
  // --------------------------------------------------
  test("should fail when category is missing", () => {
    const data = validProductData();

    delete data.category;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.category).toBeDefined();
  });

  // --------------------------------------------------
  // 4. basePrice is required
  // --------------------------------------------------
  test("should fail when basePrice is missing", () => {
    const data = validProductData();

    delete data.basePrice;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.basePrice).toBeDefined();
  });

  // --------------------------------------------------
  // 5. basePrice cannot be negative
  // --------------------------------------------------
  test("should fail when basePrice is negative", () => {
    const data = validProductData();

    data.basePrice = -100;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.basePrice).toBeDefined();
  });

  // --------------------------------------------------
  // 6. basePrice can be zero
  // --------------------------------------------------
  test("should allow basePrice to be zero", () => {
    const data = validProductData();

    data.basePrice = 0;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 7. totalStock cannot be negative
  // --------------------------------------------------
  test("should fail when totalStock is negative", () => {
    const data = validProductData();

    data.totalStock = -5;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.totalStock).toBeDefined();
  });

  // --------------------------------------------------
  // 8. totalStock can be zero
  // --------------------------------------------------
  test("should allow totalStock to be zero", () => {
    const data = validProductData();

    data.totalStock = 0;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 9. averageRating default value
  // --------------------------------------------------
  test("should set averageRating to 0 by default", () => {
    const product = new Product(validProductData());

    expect(product.averageRating).toBe(0);
  });

  // --------------------------------------------------
  // 10. totalReviews default value
  // --------------------------------------------------
  test("should set totalReviews to 0 by default", () => {
    const product = new Product(validProductData());

    expect(product.totalReviews).toBe(0);
  });

  // --------------------------------------------------
  // 11. totalStock default value
  // --------------------------------------------------
  test("should set totalStock to 0 by default", () => {
    const data = validProductData();

    delete data.totalStock;

    const product = new Product(data);

    expect(product.totalStock).toBe(0);
  });

  // --------------------------------------------------
  // 12. isActive default value
  // --------------------------------------------------
  test("should set isActive to true by default", () => {
    const product = new Product(validProductData());

    expect(product.isActive).toBe(true);
  });

  // --------------------------------------------------
  // 13. isFeatured default value
  // --------------------------------------------------
  test("should set isFeatured to false by default", () => {
    const product = new Product(validProductData());

    expect(product.isFeatured).toBe(false);
  });

  // --------------------------------------------------
  // 14. isActive can be false
  // --------------------------------------------------
  test("should accept isActive as false", () => {
    const data = validProductData();

    data.isActive = false;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.isActive).toBe(false);
  });

  // --------------------------------------------------
  // 15. isFeatured can be true
  // --------------------------------------------------
  test("should accept isFeatured as true", () => {
    const data = validProductData();

    data.isFeatured = true;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.isFeatured).toBe(true);
  });

  // --------------------------------------------------
  // 16. name.bn is optional
  // --------------------------------------------------
  test("should allow name.bn to be omitted", () => {
    const data = validProductData();

    delete data.name.bn;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 17. description.bn is optional
  // --------------------------------------------------
  test("should allow description.bn to be omitted", () => {
    const data = validProductData();

    delete data.description.bn;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 18. description.en is optional
  // --------------------------------------------------
  test("should allow description.en to be omitted", () => {
    const data = validProductData();

    delete data.description.en;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
  });

  // --------------------------------------------------
  // 19. Images array
  // --------------------------------------------------
  test("should accept an array of image strings", () => {
    const data = validProductData();

    data.images = [
      "product1.jpg",
      "product2.png",
      "product3.webp",
    ];

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();

    expect(product.images).toEqual([
      "product1.jpg",
      "product2.png",
      "product3.webp",
    ]);
  });

  // --------------------------------------------------
  // 20. Empty images array
  // --------------------------------------------------
  test("should allow an empty images array", () => {
    const data = validProductData();

    data.images = [];

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.images).toEqual([]);
  });

  // --------------------------------------------------
  // 21. Valid category ObjectId
  // --------------------------------------------------
  test("should accept a valid ObjectId for category", () => {
    const categoryId = new mongoose.Types.ObjectId();

    const data = validProductData();

    data.category = categoryId;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();

    expect(product.category.toString()).toBe(
      categoryId.toString()
    );
  });

  // --------------------------------------------------
  // 22. Invalid category ObjectId
  // --------------------------------------------------
  test("should fail when category is an invalid ObjectId", () => {
    const data = validProductData();

    data.category = "invalid-object-id";

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.category).toBeDefined();
  });

  // --------------------------------------------------
  // 23. averageRating accepts number
  // --------------------------------------------------
  test("should accept a numeric averageRating", () => {
    const data = validProductData();

    data.averageRating = 4.5;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.averageRating).toBe(4.5);
  });

  // --------------------------------------------------
  // 24. totalReviews accepts number
  // --------------------------------------------------
  test("should accept totalReviews", () => {
    const data = validProductData();

    data.totalReviews = 25;

    const product = new Product(data);
    const error = product.validateSync();

    expect(error).toBeUndefined();
    expect(product.totalReviews).toBe(25);
  });

  // --------------------------------------------------
  // 25. Timestamps
  // --------------------------------------------------
  test("should have createdAt and updatedAt timestamps configured", () => {
    expect(Product.schema.path("createdAt")).toBeDefined();
    expect(Product.schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 26. Model name
  // --------------------------------------------------
  test("should use Product as the model name", () => {
    expect(Product.modelName).toBe("Product");
  });

  // --------------------------------------------------
  // 27. Category reference
  // --------------------------------------------------
  test("should reference Category model", () => {
    const categoryPath = Product.schema.path("category");

    expect(categoryPath.options.ref).toBe("Category");
  });

  // --------------------------------------------------
  // 28. Required fields
  // --------------------------------------------------
  test("should have the correct required fields", () => {
    const schema = Product.schema;

    expect(schema.path("name.en").isRequired).toBe(true);
    expect(schema.path("category").isRequired).toBe(true);
    expect(schema.path("basePrice").isRequired).toBe(true);
  });

  // --------------------------------------------------
  // 29. Default values
  // --------------------------------------------------
  test("should have the correct schema defaults", () => {
    const schema = Product.schema;

    expect(schema.path("averageRating").defaultValue).toBe(0);
    expect(schema.path("totalReviews").defaultValue).toBe(0);
    expect(schema.path("totalStock").defaultValue).toBe(0);
    expect(schema.path("isActive").defaultValue).toBe(true);
    expect(schema.path("isFeatured").defaultValue).toBe(false);
  });

  // --------------------------------------------------
  // 30. Minimum values
  // --------------------------------------------------
  test("should have min validation for basePrice and totalStock", () => {
    const schema = Product.schema;

    expect(schema.path("basePrice").options.min).toBe(0);
    expect(schema.path("totalStock").options.min).toBe(0);
  });
});