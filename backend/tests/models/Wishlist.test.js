import mongoose from "mongoose";
import Wishlist from "../../models/Wishlist.js";

describe("Wishlist Model Unit Tests", () => {
  // --------------------------------------------------
  // Helper function
  // --------------------------------------------------
  const validWishlistData = () => ({
    user: new mongoose.Types.ObjectId(),
    product: new mongoose.Types.ObjectId(),
  });

  // --------------------------------------------------
  // 1. Valid Wishlist
  // --------------------------------------------------
  test("should create a valid wishlist item", () => {
    const wishlist = new Wishlist(validWishlistData());

    const error = wishlist.validateSync();

    expect(error).toBeUndefined();
    expect(wishlist.user).toBeDefined();
    expect(wishlist.product).toBeDefined();
  });

  // --------------------------------------------------
  // 2. user is required
  // --------------------------------------------------
  test("should fail when user is missing", () => {
    const data = validWishlistData();

    delete data.user;

    const wishlist = new Wishlist(data);
    const error = wishlist.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  // --------------------------------------------------
  // 3. product is required
  // --------------------------------------------------
  test("should fail when product is missing", () => {
    const data = validWishlistData();

    delete data.product;

    const wishlist = new Wishlist(data);
    const error = wishlist.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.product).toBeDefined();
  });

  // --------------------------------------------------
  // 4. Valid user ObjectId
  // --------------------------------------------------
  test("should accept a valid user ObjectId", () => {
    const userId = new mongoose.Types.ObjectId();

    const wishlist = new Wishlist({
      user: userId,
      product: new mongoose.Types.ObjectId(),
    });

    const error = wishlist.validateSync();

    expect(error).toBeUndefined();
    expect(wishlist.user.toString()).toBe(
      userId.toString()
    );
  });

  // --------------------------------------------------
  // 5. Invalid user ObjectId
  // --------------------------------------------------
  test("should fail when user is an invalid ObjectId", () => {
    const data = validWishlistData();

    data.user = "invalid-user-id";

    const wishlist = new Wishlist(data);
    const error = wishlist.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  // --------------------------------------------------
  // 6. Valid product ObjectId
  // --------------------------------------------------
  test("should accept a valid product ObjectId", () => {
    const productId = new mongoose.Types.ObjectId();

    const wishlist = new Wishlist({
      user: new mongoose.Types.ObjectId(),
      product: productId,
    });

    const error = wishlist.validateSync();

    expect(error).toBeUndefined();
    expect(wishlist.product.toString()).toBe(
      productId.toString()
    );
  });

  // --------------------------------------------------
  // 7. Invalid product ObjectId
  // --------------------------------------------------
  test("should fail when product is an invalid ObjectId", () => {
    const data = validWishlistData();

    data.product = "invalid-product-id";

    const wishlist = new Wishlist(data);
    const error = wishlist.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.product).toBeDefined();
  });

  // --------------------------------------------------
  // 8. User reference
  // --------------------------------------------------
  test("should reference User model", () => {
    const userPath = Wishlist.schema.path("user");

    expect(userPath.options.ref).toBe("User");
  });

  // --------------------------------------------------
  // 9. Product reference
  // --------------------------------------------------
  test("should reference Product model", () => {
    const productPath = Wishlist.schema.path("product");

    expect(productPath.options.ref).toBe("Product");
  });

  // --------------------------------------------------
  // 10. Required fields
  // --------------------------------------------------
  test("should have user and product as required fields", () => {
    const schema = Wishlist.schema;

    expect(schema.path("user").isRequired).toBe(true);
    expect(schema.path("product").isRequired).toBe(true);
  });

  // --------------------------------------------------
  // 11. Timestamps
  // --------------------------------------------------
  test("should have createdAt and updatedAt timestamps", () => {
    expect(Wishlist.schema.path("createdAt")).toBeDefined();
    expect(Wishlist.schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 12. Model name
  // --------------------------------------------------
  test("should use Wishlist as the model name", () => {
    expect(Wishlist.modelName).toBe("Wishlist");
  });

  // --------------------------------------------------
  // 13. Schema fields
  // --------------------------------------------------
  test("should contain the expected schema fields", () => {
    const schema = Wishlist.schema;

    expect(schema.path("user")).toBeDefined();
    expect(schema.path("product")).toBeDefined();
    expect(schema.path("createdAt")).toBeDefined();
    expect(schema.path("updatedAt")).toBeDefined();
  });

  // --------------------------------------------------
  // 14. Unique index
  // --------------------------------------------------
  test("should have a unique index on user and product", () => {
    const indexes = Wishlist.schema.indexes();

    const index = indexes.find(([fields, options]) => {
      return (
        fields.user === 1 &&
        fields.product === 1 &&
        options.unique === true
      );
    });

    expect(index).toBeDefined();
  });

  // --------------------------------------------------
  // 15. Unique index fields
  // --------------------------------------------------
  test("should use user and product for the unique index", () => {
    const indexes = Wishlist.schema.indexes();

    const index = indexes.find(([fields]) => {
      return (
        fields.user === 1 &&
        fields.product === 1
      );
    });

    expect(index).toBeDefined();

    const [fields] = index;

    expect(fields).toEqual({
      user: 1,
      product: 1,
    });
  });

  // --------------------------------------------------
  // 16. User and product should be ObjectIds
  // --------------------------------------------------
  test("should define user and product as ObjectId types", () => {
    expect(
      Wishlist.schema.path("user").instance
    ).toBe("ObjectId");

    expect(
      Wishlist.schema.path("product").instance
    ).toBe("ObjectId");
  });

  // --------------------------------------------------
  // 17. Different users can have the same product
  // --------------------------------------------------
  test("should allow different users to reference the same product", () => {
    const productId = new mongoose.Types.ObjectId();

    const wishlist1 = new Wishlist({
      user: new mongoose.Types.ObjectId(),
      product: productId,
    });

    const wishlist2 = new Wishlist({
      user: new mongoose.Types.ObjectId(),
      product: productId,
    });

    expect(wishlist1.validateSync()).toBeUndefined();
    expect(wishlist2.validateSync()).toBeUndefined();
  });

  // --------------------------------------------------
  // 18. Same user can reference different products
  // --------------------------------------------------
  test("should allow the same user to reference different products", () => {
    const userId = new mongoose.Types.ObjectId();

    const wishlist1 = new Wishlist({
      user: userId,
      product: new mongoose.Types.ObjectId(),
    });

    const wishlist2 = new Wishlist({
      user: userId,
      product: new mongoose.Types.ObjectId(),
    });

    expect(wishlist1.validateSync()).toBeUndefined();
    expect(wishlist2.validateSync()).toBeUndefined();
  });

  // --------------------------------------------------
  // 19. Verify unique index is not sparse
  // --------------------------------------------------
  test("should have a non-sparse unique index", () => {
    const indexes = Wishlist.schema.indexes();

    const index = indexes.find(([fields, options]) => {
      return (
        fields.user === 1 &&
        fields.product === 1 &&
        options.unique === true
      );
    });

    expect(index).toBeDefined();

    const [, options] = index;

    expect(options.sparse).not.toBe(true);
  });

  // --------------------------------------------------
  // 20. Verify timestamps option
  // --------------------------------------------------
  test("should have timestamps enabled in the schema", () => {
    expect(Wishlist.schema.options.timestamps).toBe(true);
  });
});