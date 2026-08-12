import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

/* ============================================================
   MOCK DEPENDENCIES
   ============================================================ */

jest.unstable_mockModule("mongoose", () => ({
  default: {
    Types: {
      ObjectId: {
        isValid: jest.fn(),
      },
    },
  },
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Category.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

const mongoose = (await import("mongoose")).default;
const Product = (await import("../../models/Product.js")).default;
const Category = (await import("../../models/Category.js")).default;

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


/* ============================================================
   HELPERS
   ============================================================ */

const mockResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};


/*
 * Creates a Mongoose-like chain:
 *
 * Product.find()
 *   .populate()
 *   .sort()
 *   .skip()
 *   .limit()
 *
 * and allows:
 *
 * await chain
 */
const createQueryChain = (result) => {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),

    then: (resolve, reject) =>
      Promise.resolve(result).then(resolve, reject),

    catch: (reject) =>
      Promise.resolve(result).catch(reject),
  };

  return chain;
};


const validId = "507f1f77bcf86cd799439011";
const anotherValidId = "507f1f77bcf86cd799439012";


/* ============================================================
   BEFORE EACH
   ============================================================ */

beforeEach(() => {
  jest.clearAllMocks();

  mongoose.Types.ObjectId.isValid.mockReturnValue(true);
});


/* ============================================================
   GET PRODUCTS
   ============================================================ */

describe("getProducts", () => {
  test("returns paginated products successfully", async () => {
    const products = [
      { _id: "1", name: { en: "Apple" }, basePrice: 100 },
      { _id: "2", name: { en: "Banana" }, basePrice: 200 },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryChain(products)
    );

    const req = {
      query: {
        page: "1",
        pageSize: "2",
      },
    };

    const res = mockResponse();

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
      createQueryChain(products)
    );

    const req = {
      query: {
        page: "0",
        pageSize: "12",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
      },
    });
  });


  test("uses minimum page size of 1", async () => {
    Product.countDocuments.mockResolvedValue(0);
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        page: "1",
        pageSize: "0",
      },
    };

    const res = mockResponse();

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
        name: { en: "Red Shirt" },
        description: { en: "Cotton shirt" },
        isFeatured: false,
      },
    ];

    Product.countDocuments.mockResolvedValue(1);

    Product.find
      .mockReturnValueOnce(
        createQueryChain(products)
      );

    const req = {
      query: {
        search: "shirt",
        page: "1",
        pageSize: "12",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    const query = Product.find.mock.calls[0][0];

    expect(query.isActive).toBe(true);
    expect(query.$or).toHaveLength(4);

    expect(query.$or[0]).toHaveProperty("name.en");
    expect(query.$or[1]).toHaveProperty("name.bn");
    expect(query.$or[2]).toHaveProperty("description.en");
    expect(query.$or[3]).toHaveProperty("description.bn");
  });


  test("escapes regex special characters in search", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        search: "(",
        page: "1",
        pageSize: "12",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    const query = Product.find.mock.calls[0][0];

    const regexValue = query.$or[0]["name.en"].$regex;

    expect(regexValue).toBe("\\(");
  });


  test("returns 400 for invalid category id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = {
      query: {
        category: "invalid-id",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid category id",
    });

    expect(Product.countDocuments).not.toHaveBeenCalled();
  });


  test("filters by category", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        category: validId,
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      category: validId,
    });
  });


  test("filters by minimum price", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        minPrice: "100",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      basePrice: {
        $gte: 100,
      },
    });
  });


  test("filters by maximum price", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        maxPrice: "500",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      basePrice: {
        $lte: 500,
      },
    });
  });


  test("filters by minimum and maximum price", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        minPrice: "100",
        maxPrice: "500",
      },
    };

    const res = mockResponse();

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
    const req = {
      query: {
        minPrice: "abc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid minPrice",
    });
  });


  test("returns 400 for invalid maxPrice", async () => {
    const req = {
      query: {
        maxPrice: "abc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid maxPrice",
    });
  });


  test("filters featured products", async () => {
    Product.countDocuments.mockResolvedValue(0);

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        featured: "true",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(Product.countDocuments).toHaveBeenCalledWith({
      isActive: true,
      isFeatured: true,
    });
  });


  test("supports limit parameter", async () => {
    const products = [
      { _id: "1" },
      { _id: "2" },
    ];

    Product.countDocuments.mockResolvedValue(2);

    const chain = createQueryChain(products);

    Product.find.mockReturnValue(chain);

    const req = {
      query: {
        limit: "5",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(chain.limit).toHaveBeenCalledWith(5);

    expect(res.json).toHaveBeenCalledWith(products);
  });


  test("supports price-asc sorting with limit", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      query: {
        limit: "5",
        sort: "price-asc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(chain.sort).toHaveBeenCalledWith({
      basePrice: 1,
    });
  });


  test("supports price-desc sorting with limit", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      query: {
        limit: "5",
        sort: "price-desc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(chain.sort).toHaveBeenCalledWith({
      basePrice: -1,
    });
  });


  test("returns 400 for invalid limit", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = {
      query: {
        limit: "abc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid limit",
    });
  });


  test("returns 400 for invalid page", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = {
      query: {
        page: "abc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid page or pageSize",
    });
  });


  test("returns 400 for invalid pageSize", async () => {
    Product.countDocuments.mockResolvedValue(0);

    const req = {
      query: {
        pageSize: "abc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid page or pageSize",
    });
  });


  test("supports price-asc pagination sorting", async () => {
    Product.countDocuments.mockResolvedValue(10);

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      query: {
        page: "2",
        pageSize: "5",
        sort: "price-asc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(chain.sort).toHaveBeenCalledWith({
      basePrice: 1,
    });

    expect(chain.skip).toHaveBeenCalledWith(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });


  test("supports price-desc pagination sorting", async () => {
    Product.countDocuments.mockResolvedValue(10);

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      query: {
        page: "2",
        pageSize: "5",
        sort: "price-desc",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(chain.sort).toHaveBeenCalledWith({
      basePrice: -1,
    });
  });


  test("ranks search results by name relevance", async () => {
    const products = [
      {
        name: { en: "Nice Product" },
        description: { en: "shirt" },
        isFeatured: false,
      },
      {
        name: { en: "Shirt Product" },
        description: { en: "something" },
        isFeatured: false,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryChain(products)
    );

    const req = {
      query: {
        search: "shirt",
        page: "1",
        pageSize: "12",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    const response = res.json.mock.calls[0][0];

    expect(response.products[0].name.en).toBe(
      "Shirt Product"
    );
  });


  test("uses featured product as tie breaker", async () => {
    const products = [
      {
        name: { en: "Product A" },
        description: { en: "test" },
        isFeatured: false,
      },
      {
        name: { en: "Product B" },
        description: { en: "test" },
        isFeatured: true,
      },
    ];

    Product.countDocuments.mockResolvedValue(2);

    Product.find.mockReturnValue(
      createQueryChain(products)
    );

    const req = {
      query: {
        search: "test",
      },
    };

    const res = mockResponse();

    await getProducts(req, res);

    const response = res.json.mock.calls[0][0];

    expect(response.products[0].isFeatured).toBe(true);
  });


  test("handles database errors with 500", async () => {
    Product.countDocuments.mockRejectedValue(
      new Error("Database failure")
    );

    const req = {
      query: {},
    };

    const res = mockResponse();

    await getProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database failure",
    });
  });
});


/* ============================================================
   GET ALL PRODUCTS ADMIN
   ============================================================ */

describe("getAllProductsAdmin", () => {
  test("returns all products", async () => {
    const products = [
      { _id: "1", name: "Product 1" },
      { _id: "2", name: "Product 2" },
    ];

    Product.find.mockReturnValue(
      createQueryChain(products)
    );

    const req = {};
    const res = mockResponse();

    await getAllProductsAdmin(req, res);

    expect(Product.find).toHaveBeenCalledWith();

    expect(res.json).toHaveBeenCalledWith(products);
  });


  test("returns 500 when database fails", async () => {
    Product.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      then: (resolve, reject) =>
        Promise.reject(
          new Error("Database failure")
        ).then(resolve, reject),
      catch: (reject) =>
        Promise.reject(
          new Error("Database failure")
        ).catch(reject),
    });

    const res = mockResponse();

    await getAllProductsAdmin({}, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database failure",
    });
  });
});


/* ============================================================
   GET PRODUCT BY ID
   ============================================================ */

describe("getProductById", () => {
  test("returns product successfully", async () => {
    const product = {
      _id: validId,
      name: "Test Product",
      isActive: true,
    };

    Product.findById.mockReturnValue(
      createQueryChain(product)
    );

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await getProductById(req, res);

    expect(Product.findById).toHaveBeenCalledWith(validId);

    expect(res.json).toHaveBeenCalledWith(product);
  });


  test("returns 404 for invalid ObjectId", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = {
      params: {
        id: "invalid",
      },
    };

    const res = mockResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });


  test("returns 404 when product does not exist", async () => {
    Product.findById.mockReturnValue(
      createQueryChain(null)
    );

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });


  test("returns 404 when product is inactive", async () => {
    Product.findById.mockReturnValue(
      createQueryChain({
        _id: validId,
        isActive: false,
      })
    );

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });


  test("returns 500 when database fails", async () => {
    Product.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: (resolve, reject) =>
        Promise.reject(
          new Error("Database failure")
        ).then(resolve, reject),
      catch: (reject) =>
        Promise.reject(
          new Error("Database failure")
        ).catch(reject),
    });

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database failure",
    });
  });
});


/* ============================================================
   CREATE PRODUCT
   ============================================================ */

describe("createProduct", () => {
  test("creates product successfully", async () => {
    const product = {
      _id: validId,
      name: "New Product",
      basePrice: 500,
      totalStock: 10,
    };

    Product.create.mockResolvedValue(product);

    const req = {
      body: {
        name: "New Product",
        description: "Test description",
        category: validId,
        basePrice: 500,
        images: ["image.jpg"],
        totalStock: 10,
        isFeatured: true,
        isActive: true,

        // Should NOT be passed
        averageRating: 5,
        randomField: "blocked",
      },
    };

    const res = mockResponse();

    await createProduct(req, res);

    expect(Product.create).toHaveBeenCalledWith({
      name: "New Product",
      description: "Test description",
      category: validId,
      basePrice: 500,
      images: ["image.jpg"],
      totalStock: 10,
      isFeatured: true,
      isActive: true,
    });

    expect(res.status).toHaveBeenCalledWith(201);

    expect(res.json).toHaveBeenCalledWith(product);
  });


  test("does not include undefined fields", async () => {
    Product.create.mockResolvedValue({
      name: "Product",
    });

    const req = {
      body: {
        name: "Product",
        basePrice: 100,
      },
    };

    const res = mockResponse();

    await createProduct(req, res);

    expect(Product.create).toHaveBeenCalledWith({
      name: "Product",
      basePrice: 100,
    });
  });


  test("returns 400 when creation fails", async () => {
    Product.create.mockRejectedValue(
      new Error("Validation failed")
    );

    const req = {
      body: {
        name: "Invalid Product",
      },
    };

    const res = mockResponse();

    await createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
    });
  });
});


/* ============================================================
   UPDATE PRODUCT
   ============================================================ */

describe("updateProduct", () => {
  test("updates product successfully", async () => {
    const product = {
      _id: validId,
      name: "Updated Product",
      basePrice: 600,
    };

    Product.findByIdAndUpdate.mockResolvedValue(product);

    const req = {
      params: {
        id: validId,
      },
      body: {
        name: "Updated Product",
        basePrice: 600,

        // Should not be written
        averageRating: 5,
        arbitraryField: "blocked",
      },
    };

    const res = mockResponse();

    await updateProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      validId,
      {
        name: "Updated Product",
        basePrice: 600,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    expect(res.json).toHaveBeenCalledWith(product);
  });


  test("returns 404 for invalid ObjectId", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = {
      params: {
        id: "invalid",
      },
      body: {
        name: "Updated",
      },
    };

    const res = mockResponse();

    await updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });


  test("returns 404 when product does not exist", async () => {
    Product.findByIdAndUpdate.mockResolvedValue(null);

    const req = {
      params: {
        id: validId,
      },
      body: {
        name: "Updated",
      },
    };

    const res = mockResponse();

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

    const req = {
      params: {
        id: validId,
      },
      body: {
        basePrice: -10,
      },
    };

    const res = mockResponse();

    await updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Validation failed",
    });
  });
});


/* ============================================================
   DELETE PRODUCT
   ============================================================ */

describe("deleteProduct", () => {
  test("soft deletes product successfully", async () => {
    const product = {
      _id: validId,
      name: "Product",
      isActive: false,
    };

    Product.findByIdAndUpdate.mockResolvedValue(product);

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await deleteProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
      validId,
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


  test("returns 404 for invalid ObjectId", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = {
      params: {
        id: "invalid",
      },
    };

    const res = mockResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findByIdAndUpdate).not.toHaveBeenCalled();
  });


  test("returns 404 when product does not exist", async () => {
    Product.findByIdAndUpdate.mockResolvedValue(null);

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });


  test("returns 500 when deletion fails", async () => {
    Product.findByIdAndUpdate.mockRejectedValue(
      new Error("Database failure")
    );

    const req = {
      params: {
        id: validId,
      },
    };

    const res = mockResponse();

    await deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database failure",
    });
  });
});


/* ============================================================
   GET RECOMMENDATIONS
   ============================================================ */

describe("getRecommendations", () => {
  test("returns recommendations from same category", async () => {
    const recommendations = [
      {
        _id: "product2",
        category: "category1",
        isActive: true,
        totalStock: 5,
      },
      {
        _id: "product3",
        category: "category1",
        isActive: true,
        totalStock: 10,
      },
    ];

    Product.findById.mockReturnValue(
      createQueryChain({
        category: "category1",
      })
    );

    Product.find.mockReturnValue(
      createQueryChain(recommendations)
    );

    const req = {
      params: {
        productId: validId,
      },
      query: {
        limit: "5",
      },
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(Product.findById).toHaveBeenCalledWith(validId);

    expect(Product.find).toHaveBeenCalledWith({
      _id: {
        $ne: validId,
      },
      category: "category1",
      isActive: true,
      totalStock: {
        $gt: 0,
      },
    });

    expect(res.json).toHaveBeenCalledWith(
      recommendations
    );
  });


  test("returns 404 for invalid product id", async () => {
    mongoose.Types.ObjectId.isValid.mockReturnValue(false);

    const req = {
      params: {
        productId: "invalid",
      },
      query: {},
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });


  test("returns 404 when source product does not exist", async () => {
    Product.findById.mockReturnValue(
      createQueryChain(null)
    );

    const req = {
      params: {
        productId: validId,
      },
      query: {},
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product not found",
    });
  });


  test("uses default recommendation limit of 8", async () => {
    Product.findById.mockReturnValue(
      createQueryChain({
        category: "category1",
      })
    );

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      params: {
        productId: validId,
      },
      query: {},
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(chain.limit).toHaveBeenCalledWith(8);
  });


  test("caps recommendation limit at 12", async () => {
    Product.findById.mockReturnValue(
      createQueryChain({
        category: "category1",
      })
    );

    const chain = createQueryChain([]);

    Product.find.mockReturnValue(chain);

    const req = {
      params: {
        productId: validId,
      },
      query: {
        limit: "100",
      },
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(chain.limit).toHaveBeenCalledWith(12);
  });


  test("returns empty array when no recommendations exist", async () => {
    Product.findById.mockReturnValue(
      createQueryChain({
        category: "category1",
      })
    );

    Product.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      params: {
        productId: validId,
      },
      query: {},
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });


  test("returns 500 when recommendation query fails", async () => {
    Product.findById.mockReturnValue(
      createQueryChain({
        category: "category1",
      })
    );

    Product.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),

      then: (resolve, reject) =>
        Promise.reject(
          new Error("Database failure")
        ).then(resolve, reject),

      catch: (reject) =>
        Promise.reject(
          new Error("Database failure")
        ).catch(reject),
    });

    const req = {
      params: {
        productId: validId,
      },
      query: {},
    };

    const res = mockResponse();

    await getRecommendations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Database failure",
    });
  });
});


/* ============================================================
   SEARCH PRODUCTS
   ============================================================ */

describe("searchProducts", () => {
  test("returns empty arrays when query is missing", async () => {
    const req = {
      query: {},
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      categories: [],
    });

    expect(Product.find).not.toHaveBeenCalled();
    expect(Category.find).not.toHaveBeenCalled();
  });


  test("returns empty arrays when query is empty", async () => {
    const req = {
      query: {
        q: "",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products: [],
      categories: [],
    });
  });


  test("trims search query", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "   apple   ",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(Product.find).toHaveBeenCalled();

    const productQuery =
      Product.find.mock.calls[0][0];

    expect(productQuery.$or[0]["name.en"]).toEqual(
      expect.objectContaining({
        $regex: expect.any(RegExp),
      })
    );
  });


  test("searches products by English and Bangla names", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    const productQuery =
      Product.find.mock.calls[0][0];

    expect(productQuery.isActive).toBe(true);

    expect(productQuery.$or).toHaveLength(2);

    expect(productQuery.$or[0]).toHaveProperty(
      "name.en"
    );

    expect(productQuery.$or[1]).toHaveProperty(
      "name.bn"
    );
  });


  test("searches categories by English and Bangla names", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "food",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    const categoryQuery =
      Category.find.mock.calls[0][0];

    expect(categoryQuery.$or).toHaveLength(2);

    expect(categoryQuery.$or[0]).toHaveProperty(
      "name.en"
    );

    expect(categoryQuery.$or[1]).toHaveProperty(
      "name.bn"
    );
  });


  test("returns product and category search results", async () => {
    const products = [
      {
        _id: "1",
        name: {
          en: "Apple",
        },
        images: ["apple.jpg"],
        basePrice: 100,
      },
    ];

    const categories = [
      {
        _id: "cat1",
        name: {
          en: "Fruits",
        },
        slug: "fruits",
      },
    ];

    Product.find.mockReturnValue(
      createQueryChain(products)
    );

    Category.find.mockReturnValue(
      createQueryChain(categories)
    );

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(res.json).toHaveBeenCalledWith({
      products,
      categories,
    });
  });


  test("limits product search results to 8", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    const productChain =
      Product.find.mock.results[0].value;

    expect(productChain.limit).toHaveBeenCalledWith(8);
  });


  test("limits category search results to 4", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    const categoryChain =
      Category.find.mock.results[0].value;

    expect(categoryChain.limit).toHaveBeenCalledWith(4);
  });


  test("escapes regex special characters", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue(
      createQueryChain([])
    );

    const req = {
      query: {
        q: "(",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    const productQuery =
      Product.find.mock.calls[0][0];

    const regex =
      productQuery.$or[0]["name.en"].$regex;

    expect(regex).toEqual(/\(/i);
  });


  test("returns 500 when product search fails", async () => {
    Product.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),

      then: (resolve, reject) =>
        Promise.reject(
          new Error("Product search failed")
        ).then(resolve, reject),

      catch: (reject) =>
        Promise.reject(
          new Error("Product search failed")
        ).catch(reject),
    });

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product search failed",
    });
  });


  test("returns 500 when category search fails", async () => {
    Product.find.mockReturnValue(
      createQueryChain([])
    );

    Category.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),

      then: (resolve, reject) =>
        Promise.reject(
          new Error("Category search failed")
        ).then(resolve, reject),

      catch: (reject) =>
        Promise.reject(
          new Error("Category search failed")
        ).catch(reject),
    });

    const req = {
      query: {
        q: "apple",
      },
    };

    const res = mockResponse();

    await searchProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Category search failed",
    });
  });
});