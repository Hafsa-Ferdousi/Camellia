import { describe, test, expect, jest, beforeEach } from "@jest/globals";

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const Product = (await import("../../models/Product.js")).default;

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = await import("../../controllers/productController.js");

describe("Product Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test("should create product", async () => {
    req.body = {
      name: "Gold Ring",
      basePrice: 200,
    };

    Product.create.mockResolvedValue(req.body);

    await createProduct(req, res);

    expect(Product.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should get all products", async () => {
    Product.find.mockReturnValue({
      populate: () => ({
        sort: () => [],
      }),
    });

    await getProducts(req, res);

    expect(Product.find).toHaveBeenCalled();
  });

  test("should get product by id", async () => {
    req.params.id = "123";

    Product.findById.mockReturnValue({
      populate: () => ({
        isActive: true,
      }),
    });

    await getProductById(req, res);

    expect(Product.findById).toHaveBeenCalledWith("123");
  });

  test("should update product", async () => {
    req.params.id = "123";

    Product.findByIdAndUpdate.mockResolvedValue({});

    await updateProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalled();
  });

  test("should delete product", async () => {
    req.params.id = "123";

    Product.findByIdAndUpdate.mockResolvedValue({});

    await deleteProduct(req, res);

    expect(Product.findByIdAndUpdate).toHaveBeenCalled();
  });
});