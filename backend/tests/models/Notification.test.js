import mongoose from "mongoose";
import Notification from "../../models/Notification.js";

describe("Notification Model", () => {
  // =====================================================
  // 1. MODEL EXISTENCE
  // =====================================================

  test("should create Notification model", () => {
    expect(Notification).toBeDefined();
    expect(Notification.modelName).toBe("Notification");
  });

  // =====================================================
  // 2. REQUIRED FIELDS
  // =====================================================

  test("should require user, type, title and message", () => {
    const notification = new Notification({});

    const error = notification.validateSync();

    expect(error).toBeDefined();

    expect(error.errors.user).toBeDefined();
    expect(error.errors.type).toBeDefined();
    expect(error.errors.title).toBeDefined();
    expect(error.errors.message).toBeDefined();
  });

  test("should require user", () => {
    const notification = new Notification({
      type: "payment",
      title: "Payment",
      message: "Payment received",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  test("should require type", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      title: "Payment",
      message: "Payment received",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.type).toBeDefined();
  });

  test("should require title", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "payment",
      message: "Payment received",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.title).toBeDefined();
  });

  test("should require message", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "payment",
      title: "Payment",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.message).toBeDefined();
  });

  // =====================================================
  // 3. VALID NOTIFICATION
  // =====================================================

  test("should validate a valid notification", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "order_status",
      title: "Order Updated",
      message: "Your order status has been updated.",
    });

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  // =====================================================
  // 4. NOTIFICATION TYPE ENUM
  // =====================================================

  test("should reject invalid notification type", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "invalid_type",
      title: "Test",
      message: "Test notification",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.type).toBeDefined();
  });

  test.each([
    "order_status",
    "payment",
    "new_order",
    "new_customer",
    "low_stock",
  ])("should accept valid notification type: %s", (type) => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type,
      title: "Test Notification",
      message: "This is a test notification.",
    });

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  // =====================================================
  // 5. USER OBJECT ID
  // =====================================================

  test("should accept a valid user ObjectId", () => {
    const userId = new mongoose.Types.ObjectId();

    const notification = new Notification({
      user: userId,
      type: "new_customer",
      title: "New Customer",
      message: "A new customer has registered.",
    });

    expect(notification.user).toEqual(userId);

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  test("should reject invalid user ObjectId", () => {
    const notification = new Notification({
      user: "invalid-object-id",
      type: "payment",
      title: "Payment",
      message: "Payment notification",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.user).toBeDefined();
  });

  // =====================================================
  // 6. ORDER OBJECT ID
  // =====================================================

  test("should accept a valid order ObjectId", () => {
    const orderId = new mongoose.Types.ObjectId();

    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "order_status",
      title: "Order Status",
      message: "Your order status changed.",
      order: orderId,
    });

    expect(notification.order).toEqual(orderId);

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  test("should reject invalid order ObjectId", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "order_status",
      title: "Order Status",
      message: "Your order status changed.",
      order: "invalid-order-id",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.order).toBeDefined();
  });

  // =====================================================
  // 7. DEFAULT VALUES
  // =====================================================

  test("should default read to false", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "payment",
      title: "Payment Received",
      message: "Payment was received successfully.",
    });

    expect(notification.read).toBe(false);
  });

  test("should default order to null", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "order_status",
      title: "Order Updated",
      message: "Your order has been updated.",
    });

    expect(notification.order).toBeNull();
  });

  // =====================================================
  // 8. READ FIELD
  // =====================================================

  test("should allow read to be true", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "order_status",
      title: "Order Updated",
      message: "Your order has been shipped.",
      read: true,
    });

    expect(notification.read).toBe(true);

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  test("should allow read to be false", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "low_stock",
      title: "Low Stock",
      message: "Product stock is low.",
      read: false,
    });

    expect(notification.read).toBe(false);

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });

  // =====================================================
  // 9. TITLE AND MESSAGE
  // =====================================================

  test("should reject empty title", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "payment",
      title: "",
      message: "Payment completed.",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.title).toBeDefined();
  });

  test("should reject empty message", () => {
    const notification = new Notification({
      user: new mongoose.Types.ObjectId(),
      type: "payment",
      title: "Payment",
      message: "",
    });

    const error = notification.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.message).toBeDefined();
  });

  // =====================================================
  // 10. REFERENCES
  // =====================================================

  test("should reference User model", () => {
    const userPath = Notification.schema.path("user");

    expect(userPath).toBeDefined();
    expect(userPath.options.ref).toBe("User");
  });

  test("should reference Order model", () => {
    const orderPath = Notification.schema.path("order");

    expect(orderPath).toBeDefined();
    expect(orderPath.options.ref).toBe("Order");
  });

  // =====================================================
  // 11. SCHEMA TYPES
  // =====================================================

  test("should have correct schema type for user", () => {
    const userPath = Notification.schema.path("user");

    expect(userPath.instance).toBe("ObjectId");
  });

  test("should have correct schema type for type", () => {
    const typePath = Notification.schema.path("type");

    expect(typePath.instance).toBe("String");
  });

  test("should have correct schema type for title", () => {
    const titlePath = Notification.schema.path("title");

    expect(titlePath.instance).toBe("String");
  });

  test("should have correct schema type for message", () => {
    const messagePath = Notification.schema.path("message");

    expect(messagePath.instance).toBe("String");
  });

  test("should have correct schema type for read", () => {
    const readPath = Notification.schema.path("read");

    expect(readPath.instance).toBe("Boolean");
  });

  // =====================================================
  // 12. TIMESTAMPS
  // =====================================================

  test("should have createdAt timestamp path", () => {
    expect(Notification.schema.path("createdAt")).toBeDefined();
  });

  test("should have updatedAt timestamp path", () => {
    expect(Notification.schema.path("updatedAt")).toBeDefined();
  });

  // =====================================================
  // 13. INDEX
  // =====================================================

  test("should have user and createdAt index", () => {
    const indexes = Notification.schema.indexes();

    const hasExpectedIndex = indexes.some(([fields]) => {
      return (
        fields.user === 1 &&
        fields.createdAt === -1
      );
    });

    expect(hasExpectedIndex).toBe(true);
  });

  // =====================================================
  // 14. ALL FIELDS TOGETHER
  // =====================================================

  test("should create a complete notification successfully", () => {
    const userId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();

    const notification = new Notification({
      user: userId,
      type: "order_status",
      title: "Order Shipped",
      message: "Your order has been shipped successfully.",
      order: orderId,
      read: false,
    });

    expect(notification.user).toEqual(userId);
    expect(notification.type).toBe("order_status");
    expect(notification.title).toBe("Order Shipped");
    expect(notification.message).toBe(
      "Your order has been shipped successfully."
    );
    expect(notification.order).toEqual(orderId);
    expect(notification.read).toBe(false);

    const error = notification.validateSync();

    expect(error).toBeUndefined();
  });
});