import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// ============================================================
// MOCK MONGOOSE
// ============================================================

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn(),
      },
    },
  },
}));

// ============================================================
// MOCK PRODUCT MODEL
// ============================================================

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

// ============================================================
// MOCK CATEGORY MODEL
// ============================================================

jest.unstable_mockModule("../../models/Category.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

// ============================================================
// IMPORT MOCKED MODULES
// ============================================================

const { default: mongoose } = await import("mongoose");

const { default: Product } =
  await import("../../models/Product.js");

const { default: Category } =
  await import("../../models/Category.js");

const {
  getProducts,
  getAllProductsAdmin,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRecommendations,
  searchProducts,
} = await import("../../controllers/productController.js");

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const createResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

const createRequest = ({
  query = {},
  params = {},
  body = {},
} = {}) => ({
  query,
  params,
  body,
});

// Creates a chainable Mongoose-like query.
//
// Supports:
// find()
//   .populate()
//   .sort()
//   .skip()
//   .limit()
//   .select()
//   .lean()
//
// And allows:
// await query
//
// through the custom then() implementation.
const createQueryMock = (result) => {
  const query = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),

    then: (resolve, reject) =>
      Promise.resolve(result).then(resolve, reject),

    catch: (reject) =>
      Promise.resolve(result).catch(reject),
  };

  return query;
};

// ============================================================
// RESET BEFORE EACH TEST
// ============================================================

beforeEach(() => {
  jest.clearAllMocks();

  mongoose.Types.ObjectId.isValid.mockReturnValue(true);
});

// ============================================================
// getProducts
// ============================================================

describe("getProducts", () => {
  test("returns paginated products successfully", async () => {
    const products = [
      {
        _id: "product1",
        name: { en: "Apple" },
        basePrice: 100,
        isActive: true,
      },
      {
        _id: "product2",
        name: { en: "Orange" },
        basePrice: 200,
        isActive: true,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        page: "1",
        pageSize: "2",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
    });

    expect(Product.find).toHaveBeenCalledWith({
      isActive: true,
    });

    expect(res.json).toHaveBeenCalledWith({
      products,
      pagination: {
        total: 2,
        page: 1,
        pageSize: 2,
        totalPages: 1,
      },
    });
  });

  test("uses minimum page number of 1", async () => {
    const products = [];

    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        page: "0",
        pageSize: "10",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
    });
  });

  test("uses minimum page size of 1", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryMock([])
    );

    const req = createRequest({
      query: {
        page: "1",
        pageSize: "0",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 1,
        totalPages: 0,
      },
    });
  });

  test("filters products by search term", async () => {
    const products = [
      {
        _id: "1",
        name: { en: "Apple Juice" },
        description: { en: "Fresh juice" },
        isFeatured: false,
      },
      {
        _id: "2",
        name: { en: "Orange" },
        description: { en: "Apple flavored drink" },
        isFeatured: true,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        search: "apple",
        page: "1",
        pageSize: "12",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      $or: [
        {
          "name.en": {
            $regex: "apple",
            $options: "i",
          },
        },
        {
          "name.bn": {
            $regex: "apple",
            $options: "i",
          },
        },
        {
          "description.en": {
            $regex: "apple",
            $options: "i",
          },
        },
        {
          "description.bn": {
            $regex: "apple",
            $options: "i",
          },
        },
      ],
    });

    expect(res.json).toHaveBeenCalled();
  });

  test("ranks name matches higher than description matches", async () => {
    const products = [
      {
        _id: "description-match",
        name: { en: "Orange" },
        description: { en: "This contains apple" },
        isFeatured: false,
      },
      {
        _id: "name-match",
        name: { en: "Apple Juice" },
        description: { en: "Fresh juice" },
        isFeatured: false,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        search: "apple",
        page: "1",
        pageSize: "12",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    const response = res.json.mock.calls[0][0];

    expect(response.products[0]._id).toBe("name-match");
    expect(response.products[1]._id).toBe("description-match");
  });

  test("uses featured product as tie breaker for search ranking", async () => {
    const products = [
      {
        _id: "not-featured",
        name: { en: "Apple" },
        description: { en: "" },
        isFeatured: false,
      },
      {
        _id: "featured",
        name: { en: "Apple" },
        description: { en: "" },
        isFeatured: true,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        search: "apple",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    const response = res.json.mock.calls[0][0];

    expect(response.products[0]._id).toBe("featured");
  });

  test("escapes regex special characters in search", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryMock([])
    );

    const req = createRequest({
      query: {
        search: "apple(",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      $or: [
        {
          "name.en": {
            $regex: "apple\\(",
            $options: "i",
          },
        },
        {
          "name.bn": {
            $regex: "apple\\(",
            $options: "i",
          },
        },
        {
          "description.en": {
            $regex: "apple\\(",
            $options: "i",
          },
        },
        {
          "description.bn": {
            $regex: "apple\\(",
            $options: "i",
          },
        },
      ],
    });
  });

  test("filters by valid category", async () => {
    const products = [{ _id: "product1" }];

    mongoose.Types.ObjectId.isValid.mockReturnValue(true);

    Product.countDocuments.mockResolvedValue(1);

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    const req = createRequest({
      query: {
        category: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      category: "507f1f77bcf86cd799439011",
    });
  });

  test("returns 400 for invalid category id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = createRequest({
      query: {
        category: "invalid-category",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid category id",
    });

    expect(Product.countDocuments).not.toHaveBeenCalled();
  });

  test("filters by minimum price", async () => {
    Product.countDocuments.mockResolvedValue(1);

    Product.find.mockReturnValue(
      createQueryMock([{ _id: "1" }])
    );

    const req = createRequest({
      query: {
        minPrice: "100",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      basePrice: {
        $gte: 100,
      },
    });
  });

  test("filters by maximum price", async () => {
    Product.countDocuments.mockResolvedValue(1);

    Product.find.mockReturnValue(
      createQueryMock([{ _id: "1" }])
    );

    const req = createRequest({
      query: {
        maxPrice: "500",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      basePrice: {
        $lte: 500,
      },
    });
  });

  test("filters by minimum and maximum price", async () => {
    Product.countDocuments.mockResolvedValue(1);

    Product.find.mockReturnValue(
      createQueryMock([{ _id: "1" }])
    );

    const req = createRequest({
      query: {
        minPrice: "100",
        maxPrice: "500",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      basePrice: {
        $gte: 100,
        $lte: 500,
      },
    });
  });

  test("returns 400 for invalid minPrice", async () => {
    const req = createRequest({
      query: {
        minPrice: "abc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid minPrice",
    });
  });

  test("returns 400 for invalid maxPrice", async () => {
    const req = createRequest({
      query: {
        maxPrice: "abc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid maxPrice",
    });
  });

  test("filters featured products", async () => {
    Product.countDocuments.mockResolvedValue(1);

    Product.find.mockReturnValue(
      createQueryMock([{ _id: "featured1" }])
    );

    const req = createRequest({
      query: {
        featured: "true",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      isFeatured: true,
    });
  });

  test("sorts by price ascending", async () => {
    Product.countDocuments.mockResolvedValue(2);

    const query = createQueryMock([
      { _id: "1", basePrice: 100 },
      { _id: "2", basePrice: 200 },
    ]);

    Product.find.mockReturnValue(query);

    const req = createRequest({
      query: {
        sort: "price-asc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(query.sort).toHaveBeenCalledWith({
      basePrice: 1,
    });
  });

  test("sorts by price descending", async () => {
    Product.countDocuments.mockResolvedValue(2);

    const query = createQueryMock([
      { _id: "1", basePrice: 200 },
      { _id: "2", basePrice: 100 },
    ]);

    Product.find.mockReturnValue(query);

    const req = createRequest({
      query: {
        sort: "price-desc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(query.sort).toHaveBeenCalledWith({
      basePrice: -1,
    });
  });

  test("uses createdAt descending as default sort", async () => {
    Product.countDocuments.mockResolvedValue(2);

    const query = createQueryMock([]);

    Product.find.mockReturnValue(query);

    const req = createRequest({
      query: {},
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(query.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });
  });

  test("supports legacy limit parameter", async () => {
    const products = [
      { _id: "1" },
      { _id: "2" },
    ];

    Product.countDocuments.mockResolvedValue(10);

    const query = createQueryMock(products);

    Product.find.mockReturnValue(query);

    const req = createRequest({
      query: {
        limit: "2",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(query.limit).toHaveBeenCalledWith(2);

    expect(res.json).toHaveBeenCalledWith(products);
  });

  test("returns 400 for invalid limit", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = createRequest({
      query: {
        limit: "abc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid limit",
    });
  });

  test("returns 400 for invalid page", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = createRequest({
      query: {
        page: "abc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid page or pageSize",
    });
  });

  test("returns 400 for invalid pageSize", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = createRequest({
      query: {
        pageSize: "abc",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid page or pageSize",
    });
  });

  test("correctly applies pagination skip and limit", async () => {
    Product.countDocuments.mockResolvedValue(50);

    const query = createQueryMock([]);

    Product.find.mockReturnValue(query);

    const req = createRequest({
      query: {
        page: "3",
        pageSize: "10",
      },
    });

    const res = createResponse();

    await getProducts(req, res);

    expect(query.skip).toHaveBeenCalledWith(20);

    expect(query.limit).toHaveBeenCalledWith(10);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      pagination: {
        total: 50,
        page: 3,
        pageSize: 10,
        totalPages: 5,
      },
    });
  });

  test("returns 500 when getProducts throws", async () => {
    Product.countDocuments.mockRejectedValue(
      new Error("Database error")
    );

    const req = createRequest();

    const res = createResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database error",
    });
  });
});

// ============================================================
// getAllProductsAdmin
// ============================================================

describe("getAllProductsAdmin", () => {
  test("returns all products for admin", async () => {
    const products = [
      { _id: "1", name: "Product 1" },
      { _id: "2", name: "Product 2" },
    ];

    const query = createQueryMock(products);

    Product.find.mockReturnValue(query);

    const req = createRequest();

    const res = createResponse();

    await getAllProductsAdmin(req, res);

    expect(Product.find).toHaveBeenCalledWith();

    expect(query.populate).toHaveBeenCalledWith(
      "category",
      "name slug"
    );

    expect(query.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });

    expect(res.json).toHaveBeenCalledWith(products);
  });

  test("returns 500 when admin product retrieval fails", async () => {
    Product.find.mockReturnValue(
      createQueryMock(Promise.reject(new Error("Database error")))
    );

    const req = createRequest();

    const res = createResponse();

    await getAllProductsAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database error",
    });
  });
});

// ============================================================
// getProductById
// ============================================================

describe("getProductById", () => {
  test("returns product by valid id", async () => {
    const product = {
      _id: "507f1f77bcf86cd799439011",
      name: "Apple",
      isActive: true,
    };

    mongoose.Types.ObjectId.isValid.mockReturnValue(true);

    Product.findById.mockReturnValue(
      createQueryMock(product)
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getProductById(req, res);

    expect(Product.findById).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011"
    );

    expect(res.json).toHaveBeenCalledWith(product);
  });

  test("returns 404 for invalid product id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = createRequest({
      params: {
        id: "invalid",
      },
    });

    const res = createResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });

  test("returns 404 when product does not exist", async () => {
    Product.findById.mockReturnValue(
      createQueryMock(null)
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });

  test("returns 404 when product is inactive", async () => {
    const product = {
      _id: "507f1f77bcf86cd799439011",
      isActive: false,
    };

    Product.findById.mockReturnValue(
      createQueryMock(product)
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });

  test("returns 500 when database throws", async () => {
    Product.findById.mockReturnValue(
      createQueryMock(Promise.reject(new Error("Database error")))
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database error",
    });
  });
});

// ============================================================
// createProduct
// ============================================================

describe("createProduct", () => {
  test("creates a product successfully", async () => {
    const product = {
      _id: "product123",
      name: {
        en: "Apple",
        bn: "আপেল",
      },
      description: {
        en: "Fresh apple",
        bn: "তাজা আপেল",
      },
      basePrice: 100,
      totalStock: 50,
      isFeatured: true,
      isActive: true,
    };

    Product.create.mockResolvedValue(product);

    const req = createRequest({
      body: {
        name: {
          en: "Apple",
          bn: "আপেল",
        },
        description: {
          en: "Fresh apple",
          bn: "তাজা আপেল",
        },
        basePrice: 100,
        totalStock: 50,
        isFeatured: true,
        isActive: true,
        maliciousField: "should-not-be-saved",
      },
    });

    const res = createResponse();

    await createProduct(req, res);

    expect(Product.create).toHaveBeenCalledWith({
      name: {
        en: "Apple",
        bn: "আপেল",
      },
      description: {
        en: "Fresh apple",
        bn: "তাজা আপেল",
      },
      basePrice: 100,
      totalStock: 50,
      isFeatured: true,
      isActive: true,
    });

    expect(Product.create.mock.calls[0][0]).not.toHaveProperty(
      "maliciousField"
    );

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(product);
  });

  test("ignores undefined fields", async () => {
    const product = {
      _id: "product123",
      name: {
        en: "Apple",
      },
    };

    Product.create.mockResolvedValue(product);

    const req = createRequest({
      body: {
        name: {
          en: "Apple",
        },
        basePrice: undefined,
        totalStock: 20,
      },
    });

    const res = createResponse();

    await createProduct(req, res);

    expect(Product.create).toHaveBeenCalledWith({
      name: {
        en: "Apple",
      },
      totalStock: 20,
    });
  });

  test("returns 400 when product creation fails", async () => {
    Product.create.mockRejectedValue(
      new Error("Validation failed")
    );

    const req = createRequest({
      body: {
        name: {
          en: "Apple",
        },
      },
    });

    const res = createResponse();

    await createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
    });
  });
});

// ============================================================
// updateProduct
// ============================================================

describe("updateProduct", () => {
  test("updates product successfully", async () => {
    const updatedProduct = {
      _id: "507f1f77bcf86cd799439011",
      name: {
        en: "Updated Apple",
      },
      basePrice: 150,
    };

    Product.findByIdAndUpdate.mockResolvedValue(
      updatedProduct
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
      body: {
        name: {
          en: "Updated Apple",
        },
        basePrice: 150,
        maliciousField: "blocked",
      },
    });

    const res = createResponse();

    await updateProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      {
        name: {
          en: "Updated Apple",
        },
        basePrice: 150,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    expect(res.json).toHaveBeenCalledWith(updatedProduct);
  });

  test("returns 404 for invalid product id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = createRequest({
      params: {
        id: "invalid",
      },
      body: {
        name: {
          en: "Updated",
        },
      },
    });

    const res = createResponse();

    await updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("returns 404 when product does not exist", async () => {
    Product.findByIdAndUpdate.mockResolvedValue(null);

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
      body: {
        name: {
          en: "Updated",
        },
      },
    });

    const res = createResponse();

    await updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });

  test("returns 400 when update fails validation", async () => {
    Product.findByIdAndUpdate.mockRejectedValue(
      new Error("Validation failed")
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
      body: {
        basePrice: -100,
      },
    });

    const res = createResponse();

    await updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
    });
  });
});

// ============================================================
// deleteProduct
// ============================================================

describe("deleteProduct", () => {
  test("soft deletes product successfully", async () => {
    const deletedProduct = {
      _id: "507f1f77bcf86cd799439011",
      isActive: false,
    };

    Product.findByIdAndUpdate.mockResolvedValue(
      deletedProduct
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await deleteProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      {
        isActive: false,
      },
      {
        new: true,
      }
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Product removed",
    });
  });

  test("returns 404 for invalid product id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = createRequest({
      params: {
        id: "invalid",
      },
    });

    const res = createResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("returns 404 when product does not exist", async () => {
    Product.findByIdAndUpdate.mockResolvedValue(null);

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });

  test("returns 500 when delete operation fails", async () => {
    Product.findByIdAndUpdate.mockRejectedValue(
      new Error("Database error")
    );

    const req = createRequest({
      params: {
        id: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database error",
    });
  });
});

// ============================================================
// getRecommendations
// ============================================================

describe("getRecommendations", () => {
  test("returns products from the same category", async () => {
    const sourceProduct = {
      _id: "source123",
      category: "category123",
    };

    const recommendations = [
      {
        _id: "product2",
        category: "category123",
        isActive: true,
        totalStock: 10,
      },
      {
        _id: "product3",
        category: "category123",
        isActive: true,
        totalStock: 5,
      },
    ];

    mongoose.Types.ObjectId.isValid.mockReturnValue(true);

    Product.findById.mockReturnValue(
      createQueryMock(sourceProduct)
    );

    const recommendationQuery =
      createQueryMock(recommendations);

    Product.find.mockReturnValue(
      recommendationQuery
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
      query: {},
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(Product.findById).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011"
    );

    expect(Product.find).toHaveBeenCalledWith({
      _id: {
        $ne: "507f1f77bcf86cd799439011",
      },
      category: "category123",
      isActive: true,
      totalStock: {
        $gt: 0,
      },
    });

    expect(recommendationQuery.populate).toHaveBeenCalledWith(
      "category",
      "name slug"
    );

    expect(recommendationQuery.sort).toHaveBeenCalledWith({
      createdAt: -1,
    });

    expect(recommendationQuery.limit).toHaveBeenCalledWith(8);

    expect(recommendationQuery.lean).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith(
      recommendations
    );
  });

  test("returns 404 for invalid product id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = createRequest({
      params: {
        productId: "invalid",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });

  test("returns 404 when source product does not exist", async () => {
    Product.findById.mockReturnValue(
      createQueryMock(null)
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });

  test("uses requested recommendation limit", async () => {
    const sourceProduct = {
      category: "category123",
    };

    Product.findById.mockReturnValue(
      createQueryMock(sourceProduct)
    );

    const recommendationQuery =
      createQueryMock([]);

    Product.find.mockReturnValue(
      recommendationQuery
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
      query: {
        limit: "5",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(recommendationQuery.limit).toHaveBeenCalledWith(5);
  });

  test("caps recommendation limit at 12", async () => {
    const sourceProduct = {
      category: "category123",
    };

    Product.findById.mockReturnValue(
      createQueryMock(sourceProduct)
    );

    const recommendationQuery =
      createQueryMock([]);

    Product.find.mockReturnValue(
      recommendationQuery
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
      query: {
        limit: "100",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(recommendationQuery.limit).toHaveBeenCalledWith(
      12
    );
  });

  test("returns empty array when no same-category products exist", async () => {
    const sourceProduct = {
      category: "category123",
    };

    Product.findById.mockReturnValue(
      createQueryMock(sourceProduct)
    );

    Product.find.mockReturnValue(
      createQueryMock([])
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 when recommendation lookup fails", async () => {
    Product.findById.mockReturnValue(
      createQueryMock(
        Promise.reject(new Error("Database error"))
      )
    );

    const req = createRequest({
      params: {
        productId: "507f1f77bcf86cd799439011",
      },
    });

    const res = createResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database error",
    });
  });
});

// ============================================================
// searchProducts
// ============================================================

describe("searchProducts", () => {
  test("returns empty products and categories for empty query", async () => {
    const req = createRequest({
      query: {
        q: "",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      categories: [],
    });

    expect(Product.find).not.toHaveBeenCalled();

    expect(Category.find).not.toHaveBeenCalled();
  });

  test("returns empty products and categories when q is missing", async () => {
    const req = createRequest({
      query: {},
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      categories: [],
    });
  });

  test("returns empty result when query contains only spaces", async () => {
    const req = createRequest({
      query: {
        q: "   ",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      categories: [],
    });
  });

  test("searches products and categories successfully", async () => {
    const products = [
      {
        _id: "product1",
        name: {
          en: "Apple",
        },
        images: [],
        basePrice: 100,
      },
    ];

    const categories = [
      {
        _id: "category1",
        name: {
          en: "Apple Products",
        },
        slug: "apple-products",
      },
    ];

    Product.find.mockReturnValue(
      createQueryMock(products)
    );

    Category.find.mockReturnValue(
      createQueryMock(categories)
    );

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(Product.find).toHaveBeenCalledWith({
      isActive: true,
      $or: [
        {
          "name.en": expect.any(RegExp),
        },
        {
          "name.bn": expect.any(RegExp),
        },
      ],
    });

    expect(Category.find).toHaveBeenCalledWith({
      $or: [
        {
          "name.en": expect.any(RegExp),
        },
        {
          "name.bn": expect.any(RegExp),
        },
      ],
    });

    expect(res.json).toHaveBeenCalledWith({
      products,
      categories,
    });
  });

  test("limits product search results to 8", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(productQuery.limit).toHaveBeenCalledWith(8);
  });

  test("limits category search results to 4", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(categoryQuery.limit).toHaveBeenCalledWith(4);
  });

  test("selects only required product fields", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(productQuery.select).toHaveBeenCalledWith(
      "_id name images basePrice"
    );
  });

  test("selects only required category fields", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(categoryQuery.select).toHaveBeenCalledWith(
      "_id name slug"
    );
  });

  test("trims search query before searching", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "   apple   ",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    const productCall = Product.find.mock.calls[0][0];

    const productRegex = productCall.$or[0]["name.en"];

    expect(productRegex).toEqual(
      expect.any(RegExp)
    );

    expect(productRegex.source).toBe("apple");
  });

  test("escapes regex special characters in autocomplete", async () => {
    const productQuery = createQueryMock([]);

    const categoryQuery = createQueryMock([]);

    Product.find.mockReturnValue(productQuery);

    Category.find.mockReturnValue(categoryQuery);

    const req = createRequest({
      query: {
        q: "apple(",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    const productCall = Product.find.mock.calls[0][0];

    const regex = productCall.$or[0]["name.en"];

    expect(regex).toEqual(
      expect.any(RegExp)
    );

    expect(regex.source).toBe("apple\\(");
  });

  test("returns 500 when product search fails", async () => {
    Product.find.mockReturnValue(
      createQueryMock(
        Promise.reject(new Error("Product search failed"))
      )
    );

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product search failed",
    });
  });

  test("returns 500 when category search fails", async () => {
    Product.find.mockReturnValue(
      createQueryMock([])
    );

    Category.find.mockReturnValue(
      createQueryMock(
        Promise.reject(new Error("Category search failed"))
      )
    );

    const req = createRequest({
      query: {
        q: "apple",
      },
    });

    const res = createResponse();

    await searchProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Category search failed",
    });
  });
});