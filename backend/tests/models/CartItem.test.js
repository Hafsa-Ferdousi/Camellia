
import { describe, test, expect } from "@jest/globals";
import CartItem from "../../models/CartItem.js";

describe("CartItem Model", () => {
  // ─────────────────────────────────────────────
  // Model
  // ─────────────────────────────────────────────

  test("should have model name CartItem", () => {
    expect(CartItem.modelName).toBe("CartItem");
  });

  // ─────────────────────────────────────────────
  // User field
  // ─────────────────────────────────────────────

  test("should define user field", () => {
    const user = CartItem.schema.path("user");

    expect(user).toBeDefined();
    expect(user.options.ref).toBe("User");
    expect(user.isRequired).toBe(true);
  });

  test("user field should use ObjectId", () => {
    const user = CartItem.schema.path("user");

    expect(user.instance).toBe("ObjectId");
  });

  // ─────────────────────────────────────────────
  // Product field
  // ─────────────────────────────────────────────

  test("should define product field", () => {
    const product = CartItem.schema.path("product");

    expect(product).toBeDefined();
    expect(product.options.ref).toBe("Product");
    expect(product.isRequired).toBe(true);
  });

  test("product field should use ObjectId", () => {
    const product = CartItem.schema.path("product");

    expect(product.instance).toBe("ObjectId");
  });

  // ─────────────────────────────────────────────
  // Quantity
  // ─────────────────────────────────────────────

  test("should define quantity field", () => {
    const quantity = CartItem.schema.path("quantity");

    expect(quantity).toBeDefined();
    expect(quantity.instance).toBe("Number");
  });

  test("quantity should have default value of 1", () => {
    const quantity = CartItem.schema.path("quantity");

    expect(quantity.options.default).toBe(1);
  });

  test("quantity should have minimum value of 1", () => {
    const quantity = CartItem.schema.path("quantity");

    expect(quantity.options.min).toBe(1);
  });

  // ─────────────────────────────────────────────
  // Timestamps
  // ─────────────────────────────────────────────

  test("should enable timestamps", () => {
    expect(CartItem.schema.options.timestamps).toBe(true);
  });

  test("should contain createdAt field", () => {
    expect(CartItem.schema.path("createdAt")).toBeDefined();
  });

  test("should contain updatedAt field", () => {
    expect(CartItem.schema.path("updatedAt")).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Compound index
  // ─────────────────────────────────────────────

  test("should have unique user-product compound index", () => {
    const indexes = CartItem.schema.indexes();

    const compoundIndex = indexes.find(([fields, options]) => {
      return (
        fields.user === 1 &&
        fields.product === 1 &&
        options?.unique === true
      );
    });

    expect(compoundIndex).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Schema paths
  // ─────────────────────────────────────────────

  test("should contain all required fields", () => {
    const paths = Object.keys(CartItem.schema.paths);

    expect(paths).toEqual(
      expect.arrayContaining([
        "user",
        "product",
        "quantity",
        "createdAt",
        "updatedAt",
      ])
    );
  });
});

