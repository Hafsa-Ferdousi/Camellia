import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import CartItem from "../../models/CartItem.js";
import Product from "../../models/Product.js";

import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
} from "../../controllers/cartController.js";

jest.mock("../../models/CartItem.js");
jest.mock("../../models/Product.js");

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

  // ===========================
  // addToCart
  // ===========================

  describe("addToCart", () => {

    test("should add new item", async () => {

      req.body = {
        product: "prod1",
        quantity: 2,
      };

      Product.findById.mockResolvedValue({
        _id: "prod1",
        isActive: true,
        totalStock: 10,
      });

      CartItem.findOne.mockResolvedValue(null);

      const item = {
        _id: "cart1",
        populate: jest.fn().mockResolvedValue(true),
      };

      CartItem.create.mockResolvedValue(item);

      await addToCart(req,res);

      expect(Product.findById)
        .toHaveBeenCalledWith("prod1");

      expect(CartItem.create)
        .toHaveBeenCalled();

      expect(res.status)
        .toHaveBeenCalledWith(201);

      expect(res.json)
        .toHaveBeenCalledWith(item);

    });

    test("should update quantity", async()=>{

      req.body={
        product:"prod1",
        quantity:2
      };

      Product.findById.mockResolvedValue({
        _id:"prod1",
        isActive:true,
        totalStock:10
      });

      const existing={
        quantity:1,
        save:jest.fn(),
        populate:jest.fn()
      };

      CartItem.findOne.mockResolvedValue(existing);

      await addToCart(req,res);

      expect(existing.quantity).toBe(3);

      expect(existing.save)
        .toHaveBeenCalled();

    });

    test("should return product not found",async()=>{

      req.body={
        product:"abc",
        quantity:1
      };

      Product.findById.mockResolvedValue(null);

      await addToCart(req,res);

      expect(res.status)
        .toHaveBeenCalledWith(404);

      expect(res.json)
        .toHaveBeenCalledWith({
          message:"Product not found"
        });

    });

    test("should return stock error",async()=>{

      req.body={
        product:"prod1",
        quantity:20
      };

      Product.findById.mockResolvedValue({
        _id:"prod1",
        isActive:true,
        totalStock:5
      });

      await addToCart(req,res);

      expect(res.status)
        .toHaveBeenCalledWith(400);

      expect(res.json)
        .toHaveBeenCalledWith({
          message:"Not enough stock"
        });

    });

  });

});
// ===========================
// getCart
// ===========================

describe("getCart", () => {

  test("should return populated cart", async () => {

    const items = [
      {
        _id: "1",
        quantity: 2,
        product: {
          _id: "p1",
          name: "Ring"
        }
      }
    ];

    CartItem.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(items)
    });

    await getCart(req, res);

    expect(CartItem.find)
      .toHaveBeenCalledWith({
        user: "user1"
      });

    expect(res.json)
      .toHaveBeenCalledWith(items);

  });

  test("should return empty cart", async () => {

    CartItem.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    });

    await getCart(req, res);

    expect(res.json)
      .toHaveBeenCalledWith([]);

  });

});


// ===========================
// updateCartItem
// ===========================

describe("updateCartItem", () => {

  test("should update quantity", async () => {

    req.params = {
      id: "cart1"
    };

    req.body = {
      quantity: 5
    };

    const item = {
      quantity: 1,
      save: jest.fn(),
      populate: jest.fn()
    };

    CartItem.findOne.mockResolvedValue(item);

    await updateCartItem(req, res);

    expect(item.quantity)
      .toBe(5);

    expect(item.save)
      .toHaveBeenCalled();

    expect(item.populate)
      .toHaveBeenCalledWith("product");

    expect(res.json)
      .toHaveBeenCalledWith(item);

  });

  test("should return 404", async () => {

    req.params = {
      id: "abc"
    };

    req.body = {
      quantity: 2
    };

    CartItem.findOne.mockResolvedValue(null);

    await updateCartItem(req, res);

    expect(res.status)
      .toHaveBeenCalledWith(404);

    expect(res.json)
      .toHaveBeenCalledWith({
        message: "Cart item not found"
      });

  });

  test("should reject quantity less than one", async () => {

    req.params = {
      id: "cart1"
    };

    req.body = {
      quantity: 0
    };

    CartItem.findOne.mockResolvedValue({
      quantity: 2
    });

    await updateCartItem(req, res);

    expect(res.status)
      .toHaveBeenCalledWith(400);

    expect(res.json)
      .toHaveBeenCalledWith({
        message: "Quantity must be at least 1"
      });

  });

});


// ===========================
// removeCartItem
// ===========================

describe("removeCartItem", () => {

  test("should remove cart item", async () => {

    req.params = {
      id: "cart1"
    };

    CartItem.findOneAndDelete.mockResolvedValue({
      _id: "cart1"
    });

    await removeCartItem(req, res);

    expect(CartItem.findOneAndDelete)
      .toHaveBeenCalledWith({
        _id: "cart1",
        user: "user1"
      });

    expect(res.json)
      .toHaveBeenCalledWith({
        message: "Removed from cart"
      });

  });

  test("should return 404", async () => {

    req.params = {
      id: "cart1"
    };

    CartItem.findOneAndDelete.mockResolvedValue(null);

    await removeCartItem(req, res);

    expect(res.status)
      .toHaveBeenCalledWith(404);

    expect(res.json)
      .toHaveBeenCalledWith({
        message: "Cart item not found"
      });

  });

});

// ===========================
// Error Handling
// ===========================

describe("Error Handling", () => {

  test("should handle Product.findById error", async () => {

    req.body = {
      product: "prod1",
      quantity: 1
    };

    Product.findById.mockRejectedValue(new Error("Database Error"));

    await expect(addToCart(req, res))
      .rejects
      .toThrow("Database Error");

  });

  test("should handle CartItem.find error", async () => {

    CartItem.find.mockImplementation(() => ({
      populate: jest.fn().mockRejectedValue(new Error("DB Error"))
    }));

    await expect(getCart(req, res))
      .rejects
      .toThrow("DB Error");

  });

});

// ===========================
// Edge Cases
// ===========================

describe("Edge Cases", () => {

  test("quantity exactly equal to stock", async () => {

    req.body = {
      product: "prod1",
      quantity: 5
    };

    Product.findById.mockResolvedValue({
      _id: "prod1",
      isActive: true,
      totalStock: 5
    });

    CartItem.findOne.mockResolvedValue(null);

    const item = {
      populate: jest.fn()
    };

    CartItem.create.mockResolvedValue(item);

    await addToCart(req, res);

    expect(res.status)
      .toHaveBeenCalledWith(201);

  });

  test("update quantity to 1", async () => {

    req.params = {
      id: "cart1"
    };

    req.body = {
      quantity: 1
    };

    const item = {
      quantity: 4,
      save: jest.fn(),
      populate: jest.fn()
    };

    CartItem.findOne.mockResolvedValue(item);

    await updateCartItem(req, res);

    expect(item.quantity)
      .toBe(1);

  });

});