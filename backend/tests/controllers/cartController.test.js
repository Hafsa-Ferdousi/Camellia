import {
  describe,
  test,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";

/* =========================================================
   MOCK MODELS
========================================================= */

jest.unstable_mockModule("../../models/CartItem.js", () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

/* =========================================================
   IMPORT AFTER MOCKING
========================================================= */

const CartItem = (await import("../../models/CartItem.js")).default;
const Product = (await import("../../models/Product.js")).default;

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
} = await import("../../controllers/cartController.js");

/* =========================================================
   TEST SETUP
========================================================= */

describe("Cart Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      params: {},
      user: {
        _id: "user1",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  /* =======================================================
     getCart
  ======================================================= */

  describe("getCart", () => {
    test("should return cart items for logged-in user", async () => {
      const items = [
        {
          _id: "cart1",
          user: "user1",
          product: {
            _id: "product1",
            name: "Diamond Ring",
          },
          quantity: 2,
        },
      ];

      CartItem.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(items),
      });

      await getCart(req, res);

      expect(CartItem.find).toHaveBeenCalledWith({
        user: "user1",
      });

      expect(res.json).toHaveBeenCalledWith(items);
    });

    test("should populate product information", async () => {
      const populate = jest.fn().mockResolvedValue([]);

      CartItem.find.mockReturnValue({
        populate,
      });

      await getCart(req, res);

      expect(populate).toHaveBeenCalledWith("product");
    });

    test("should return empty array when cart is empty", async () => {
      CartItem.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await getCart(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should use the authenticated user's id", async () => {
      req.user._id = "customer123";

      CartItem.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await getCart(req, res);

      expect(CartItem.find).toHaveBeenCalledWith({
        user: "customer123",
      });
    });

    test("should propagate database errors", async () => {
      CartItem.find.mockImplementation(() => {
        throw new Error("Database Error");
      });

      await expect(getCart(req, res)).rejects.toThrow(
        "Database Error"
      );

      expect(res.json).not.toHaveBeenCalled();
    });
  });

  /* =======================================================
     addToCart
  ======================================================= */

  describe("addToCart", () => {
    test("should add a new product to cart", async () => {
      req.body = {
        product: "product1",
        quantity: 2,
      };

      const product = {
        _id: "product1",
        name: "Diamond Ring",
        isActive: true,
        totalStock: 10,
      };

      const item = {
        _id: "cart1",
        user: "user1",
        product: "product1",
        quantity: 2,
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue(product);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(item);

      await addToCart(req, res);

      expect(Product.findById).toHaveBeenCalledWith("product1");

      expect(CartItem.findOne).toHaveBeenCalledWith({
        user: "user1",
        product: "product1",
      });

      expect(CartItem.create).toHaveBeenCalledWith({
        user: "user1",
        product: "product1",
        quantity: 2,
      });

      expect(item.populate).toHaveBeenCalledWith("product");

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(item);
    });

    test("should use default quantity of 1", async () => {
      req.body = {
        product: "product1",
      };

      const product = {
        _id: "product1",
        isActive: true,
        totalStock: 10,
      };

      const item = {
        _id: "cart1",
        quantity: 1,
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue(product);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(item);

      await addToCart(req, res);

      expect(CartItem.create).toHaveBeenCalledWith({
        user: "user1",
        product: "product1",
        quantity: 1,
      });
    });

    test("should return 404 when product does not exist", async () => {
      req.body = {
        product: "unknown-product",
        quantity: 1,
      };

      Product.findById.mockResolvedValue(null);

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Product not found",
      });

      expect(CartItem.findOne).not.toHaveBeenCalled();
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    test("should return 404 when product is inactive", async () => {
      req.body = {
        product: "product1",
        quantity: 1,
      };

      Product.findById.mockResolvedValue({
        _id: "product1",
        isActive: false,
        totalStock: 10,
      });

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Product not found",
      });

      expect(CartItem.findOne).not.toHaveBeenCalled();
    });

    test("should return 400 when requested quantity exceeds stock", async () => {
      req.body = {
        product: "product1",
        quantity: 11,
      };

      Product.findById.mockResolvedValue({
        _id: "product1",
        isActive: true,
        totalStock: 10,
      });

      await addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Not enough stock",
      });

      expect(CartItem.findOne).not.toHaveBeenCalled();
      expect(CartItem.create).not.toHaveBeenCalled();
    });

    test("should allow quantity equal to available stock", async () => {
      req.body = {
        product: "product1",
        quantity: 10,
      };

      const product = {
        _id: "product1",
        isActive: true,
        totalStock: 10,
      };

      const item = {
        _id: "cart1",
        quantity: 10,
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue(product);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(item);

      await addToCart(req, res);

      expect(CartItem.create).toHaveBeenCalledWith({
        user: "user1",
        product: "product1",
        quantity: 10,
      });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should increase quantity when product already exists in cart", async () => {
      req.body = {
        product: "product1",
        quantity: 2,
      };

      const product = {
        _id: "product1",
        isActive: true,
        totalStock: 10,
      };

      const item = {
        _id: "cart1",
        user: "user1",
        product: "product1",
        quantity: 3,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue(product);
      CartItem.findOne.mockResolvedValue(item);

      await addToCart(req, res);

      expect(item.quantity).toBe(5);
      expect(item.save).toHaveBeenCalled();
      expect(item.populate).toHaveBeenCalledWith("product");

      expect(CartItem.create).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(item);
    });

    test("should convert quantity to Number when existing cart item is updated", async () => {
      req.body = {
        product: "product1",
        quantity: "3",
      };

      const product = {
        _id: "product1",
        isActive: true,
        totalStock: 10,
      };

      const item = {
        quantity: 2,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue(product);
      CartItem.findOne.mockResolvedValue(item);

      await addToCart(req, res);

      expect(item.quantity).toBe(5);
      expect(item.save).toHaveBeenCalled();
    });

    test("should populate newly added cart item", async () => {
      req.body = {
        product: "product1",
        quantity: 1,
      };

      const item = {
        _id: "cart1",
        populate: jest.fn().mockResolvedValue(true),
      };

      Product.findById.mockResolvedValue({
        _id: "product1",
        isActive: true,
        totalStock: 5,
      });

      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(item);

      await addToCart(req, res);

      expect(item.populate).toHaveBeenCalledWith("product");
    });
  });

  /* =======================================================
     updateCartItem
  ======================================================= */

  describe("updateCartItem", () => {
    test("should update cart item quantity", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: 5,
      };

      const item = {
        _id: "cart1",
        user: "user1",
        quantity: 2,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(CartItem.findOne).toHaveBeenCalledWith({
        _id: "cart1",
        user: "user1",
      });

      expect(item.quantity).toBe(5);
      expect(item.save).toHaveBeenCalled();
      expect(item.populate).toHaveBeenCalledWith("product");

      expect(res.json).toHaveBeenCalledWith(item);
    });

    test("should convert quantity from string to Number", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: "4",
      };

      const item = {
        _id: "cart1",
        quantity: 1,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(item.quantity).toBe(4);
      expect(typeof item.quantity).toBe("number");
    });

    test("should return 404 when cart item does not exist", async () => {
      req.params = {
        id: "unknown",
      };

      req.body = {
        quantity: 2,
      };

      CartItem.findOne.mockResolvedValue(null);

      await updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Cart item not found",
      });
    });

    test("should return 404 when cart item belongs to another user", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: 2,
      };

      CartItem.findOne.mockResolvedValue(null);

      await updateCartItem(req, res);

      expect(CartItem.findOne).toHaveBeenCalledWith({
        _id: "cart1",
        user: "user1",
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should reject quantity below 1", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: 0,
      };

      const item = {
        _id: "cart1",
        quantity: 2,
        save: jest.fn(),
        populate: jest.fn(),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Quantity must be at least 1",
      });

      expect(item.save).not.toHaveBeenCalled();
      expect(item.populate).not.toHaveBeenCalled();
    });

    test("should reject negative quantity", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: -5,
      };

      const item = {
        quantity: 2,
        save: jest.fn(),
        populate: jest.fn(),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Quantity must be at least 1",
      });

      expect(item.save).not.toHaveBeenCalled();
    });

    test("should allow quantity of exactly 1", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: 1,
      };

      const item = {
        quantity: 5,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(item.quantity).toBe(1);
      expect(item.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(item);
    });

    test("should populate updated cart item", async () => {
      req.params = {
        id: "cart1",
      };

      req.body = {
        quantity: 3,
      };

      const item = {
        quantity: 1,
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
      };

      CartItem.findOne.mockResolvedValue(item);

      await updateCartItem(req, res);

      expect(item.populate).toHaveBeenCalledWith("product");
    });
  });

  /* =======================================================
     removeCartItem
  ======================================================= */

  describe("removeCartItem", () => {
    test("should remove cart item", async () => {
      req.params = {
        id: "cart1",
      };

      const item = {
        _id: "cart1",
        user: "user1",
        product: "product1",
        quantity: 2,
      };

      CartItem.findOneAndDelete.mockResolvedValue(item);

      await removeCartItem(req, res);

      expect(CartItem.findOneAndDelete).toHaveBeenCalledWith({
        _id: "cart1",
        user: "user1",
      });

      expect(res.json).toHaveBeenCalledWith({
        message: "Removed from cart",
      });
    });

    test("should return 404 when cart item does not exist", async () => {
      req.params = {
        id: "unknown",
      };

      CartItem.findOneAndDelete.mockResolvedValue(null);

      await removeCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Cart item not found",
      });
    });

    test("should prevent deleting another user's cart item", async () => {
      req.params = {
        id: "cart1",
      };

      CartItem.findOneAndDelete.mockResolvedValue(null);

      await removeCartItem(req, res);

      expect(
        CartItem.findOneAndDelete
      ).toHaveBeenCalledWith({
        _id: "cart1",
        user: "user1",
      });

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test("should use authenticated user's id when deleting", async () => {
      req.params = {
        id: "cart1",
      };

      req.user._id = "customer123";

      CartItem.findOneAndDelete.mockResolvedValue({
        _id: "cart1",
      });

      await removeCartItem(req, res);

      expect(
        CartItem.findOneAndDelete
      ).toHaveBeenCalledWith({
        _id: "cart1",
        user: "customer123",
      });
    });

    test("should propagate database errors", async () => {
      req.params = {
        id: "cart1",
      };

      CartItem.findOneAndDelete.mockRejectedValue(
        new Error("Database Error")
      );

      await expect(
        removeCartItem(req, res)
      ).rejects.toThrow("Database Error");
    });
  });
});