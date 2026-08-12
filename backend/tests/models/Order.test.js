import mongoose from "mongoose";
import Order from "../../models/Order.js";

describe("Order Model Unit Tests", () => {
  // =========================================================
  // Helper: Valid Order Data
  // =========================================================
  const validOrderData = () => ({
    user: new mongoose.Types.ObjectId(),

    isGuest: false,

    guestInfo: {
      name: "John Doe",
      email: "john@example.com",
      phone: "01700000000",
    },

    address: {
      label: "Home",
      addressLine: "123 Main Street",
      district: "Dhaka",
      city: "Dhaka",
      phone: "01700000000",
    },

    items: [
      {
        product: new mongoose.Types.ObjectId(),
        nameSnapshot: "Rose Bouquet",
        quantity: 2,
        price: 500,
      },
    ],

    status: "pending",

    subtotal: 1000,
    vat: 50,
    deliveryCharge: 60,

    couponCode: "SAVE10",
    discountAmount: 100,
    originalTotal: 1110,

    totalAmount: 1010,

    payment: {
      method: "cod",
      status: "pending",
      transactionId: null,
      amount: 1010,
    },

    invoiceNumber: "INV-20260812-1234",
    guestOrderId: "ORD-JOHN-789-42",
  });

  // =========================================================
  // 1. Valid Order
  // =========================================================
  test("should create a valid order", () => {
    const order = new Order(validOrderData());

    const error = order.validateSync();

    expect(error).toBeUndefined();
  });

  // =========================================================
  // 2. Required subtotal
  // =========================================================
  test("should require subtotal", () => {
    const data = validOrderData();

    delete data.subtotal;

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.subtotal).toBeDefined();
  });

  // =========================================================
  // 3. Required totalAmount
  // =========================================================
  test("should require totalAmount", () => {
    const data = validOrderData();

    delete data.totalAmount;

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.totalAmount).toBeDefined();
  });

  // =========================================================
  // 4. Required payment method
  // =========================================================
  test("should require payment method", () => {
    const data = validOrderData();

    delete data.payment.method;

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.method"]).toBeDefined();
  });

  // =========================================================
  // 5. Required payment amount
  // =========================================================
  test("should require payment amount", () => {
    const data = validOrderData();

    delete data.payment.amount;

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.amount"]).toBeDefined();
  });

  // =========================================================
  // 6. User is optional
  // =========================================================
  test("should allow an order without a user", () => {
    const data = validOrderData();

    delete data.user;

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeUndefined();
    expect(order.user).toBeNull();
  });

  // =========================================================
  // 7. Default values
  // =========================================================
  test("should apply default values", () => {
    const data = validOrderData();

    delete data.isGuest;
    delete data.status;
    delete data.vat;
    delete data.deliveryCharge;
    delete data.couponCode;
    delete data.discountAmount;
    delete data.originalTotal;

    const order = new Order(data);

    expect(order.isGuest).toBe(false);
    expect(order.status).toBe("pending");
    expect(order.vat).toBe(0);
    expect(order.deliveryCharge).toBe(60);
    expect(order.couponCode).toBeNull();
    expect(order.discountAmount).toBe(0);
    expect(order.originalTotal).toBeNull();
  });

  // =========================================================
  // 8. Valid order statuses
  // =========================================================
  test("should accept all valid order statuses", () => {
    const statuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    statuses.forEach((status) => {
      const data = validOrderData();

      data.status = status;

      const order = new Order(data);
      const error = order.validateSync();

      expect(error).toBeUndefined();
    });
  });

  // =========================================================
  // 9. Invalid order status
  // =========================================================
  test("should reject an invalid order status", () => {
    const data = validOrderData();

    data.status = "completed";

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  // =========================================================
  // 10. Valid payment methods
  // =========================================================
  test("should accept all valid payment methods", () => {
    const methods = ["cod", "bkash", "nagad", "bank"];

    methods.forEach((method) => {
      const data = validOrderData();

      data.payment.method = method;

      const order = new Order(data);
      const error = order.validateSync();

      expect(error).toBeUndefined();
    });
  });

  // =========================================================
  // 11. Invalid payment method
  // =========================================================
  test("should reject an invalid payment method", () => {
    const data = validOrderData();

    data.payment.method = "rocket";

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.method"]).toBeDefined();
  });

  // =========================================================
  // 12. Valid payment statuses
  // =========================================================
  test("should accept all valid payment statuses", () => {
    const statuses = ["pending", "paid", "failed"];

    statuses.forEach((status) => {
      const data = validOrderData();

      data.payment.status = status;

      const order = new Order(data);
      const error = order.validateSync();

      expect(error).toBeUndefined();
    });
  });

  // =========================================================
  // 13. Invalid payment status
  // =========================================================
  test("should reject an invalid payment status", () => {
    const data = validOrderData();

    data.payment.status = "completed";

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.status"]).toBeDefined();
  });

  // =========================================================
  // 14. Payment status default
  // =========================================================
  test("should default payment status to pending", () => {
    const data = validOrderData();

    delete data.payment.status;

    const order = new Order(data);

    expect(order.payment.status).toBe("pending");
  });

  // =========================================================
  // 15. Transaction ID default
  // =========================================================
  test("should default transactionId to null", () => {
    const data = validOrderData();

    delete data.payment.transactionId;

    const order = new Order(data);

    expect(order.payment.transactionId).toBeNull();
  });

  // =========================================================
  // 16. Order items
  // =========================================================
  test("should store order items correctly", () => {
    const order = new Order(validOrderData());

    expect(order.items).toHaveLength(1);

    expect(order.items[0].nameSnapshot).toBe("Rose Bouquet");
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].price).toBe(500);
  });

  // =========================================================
  // 17. Order item should have ObjectId
  // =========================================================
  test("should generate an ObjectId for order item", () => {
    const order = new Order(validOrderData());

    expect(order.items[0]._id).toBeDefined();

    expect(
      mongoose.isValidObjectId(order.items[0]._id)
    ).toBe(true);
  });

  // =========================================================
  // 18. Guest order
  // =========================================================
  test("should support guest orders", () => {
    const data = validOrderData();

    data.user = null;
    data.isGuest = true;

    data.guestInfo = {
      name: "Guest User",
      email: "guest@example.com",
      phone: "01800000000",
    };

    const order = new Order(data);

    const error = order.validateSync();

    expect(error).toBeUndefined();

    expect(order.user).toBeNull();
    expect(order.isGuest).toBe(true);

    expect(order.guestInfo.name).toBe("Guest User");
    expect(order.guestInfo.email).toBe("guest@example.com");
    expect(order.guestInfo.phone).toBe("01800000000");
  });

  // =========================================================
  // 19. Guest order ID
  // =========================================================
  test("should store guestOrderId", () => {
    const order = new Order(validOrderData());

    expect(order.guestOrderId).toBe("ORD-JOHN-789-42");
  });

  // =========================================================
  // 20. Invoice number
  // =========================================================
  test("should store invoiceNumber", () => {
    const order = new Order(validOrderData());

    expect(order.invoiceNumber).toBe("INV-20260812-1234");
  });

  // =========================================================
  // 21. Coupon information
  // =========================================================
  test("should store coupon information", () => {
    const order = new Order(validOrderData());

    expect(order.couponCode).toBe("SAVE10");
    expect(order.discountAmount).toBe(100);
    expect(order.originalTotal).toBe(1110);
  });

  // =========================================================
  // 22. Address information
  // =========================================================
  test("should store address information", () => {
    const order = new Order(validOrderData());

    expect(order.address.label).toBe("Home");
    expect(order.address.addressLine).toBe("123 Main Street");
    expect(order.address.district).toBe("Dhaka");
    expect(order.address.city).toBe("Dhaka");
    expect(order.address.phone).toBe("01700000000");
  });

  // =========================================================
  // 23. Schema timestamps
  // =========================================================
  test("should have createdAt and updatedAt timestamps", () => {
    const order = new Order(validOrderData());

    expect(order.schema.path("createdAt")).toBeDefined();
    expect(order.schema.path("updatedAt")).toBeDefined();
  });

  // =========================================================
  // 24. Expected schema fields
  // =========================================================
  test("should contain all expected schema fields", () => {
    const paths = Order.schema.paths;

    expect(paths.user).toBeDefined();
    expect(paths.isGuest).toBeDefined();
    expect(paths.guestInfo).toBeDefined();
    expect(paths.address).toBeDefined();
    expect(paths.items).toBeDefined();
    expect(paths.status).toBeDefined();
    expect(paths.subtotal).toBeDefined();
    expect(paths.vat).toBeDefined();
    expect(paths.deliveryCharge).toBeDefined();
    expect(paths.couponCode).toBeDefined();
    expect(paths.discountAmount).toBeDefined();
    expect(paths.originalTotal).toBeDefined();
    expect(paths.totalAmount).toBeDefined();
    expect(paths.payment).toBeDefined();
    expect(paths.invoiceNumber).toBeDefined();
    expect(paths.guestOrderId).toBeDefined();
  });

  // =========================================================
  // 25. invoiceNumber unique
  // =========================================================
  test("should configure invoiceNumber as unique", () => {
    expect(
      Order.schema.path("invoiceNumber").options.unique
    ).toBe(true);
  });

  // =========================================================
  // 26. guestOrderId unique
  // =========================================================
  test("should configure guestOrderId as unique", () => {
    expect(
      Order.schema.path("guestOrderId").options.unique
    ).toBe(true);
  });

  // =========================================================
  // 27. guestOrderId index
  // =========================================================
  test("should configure guestOrderId as indexed", () => {
    expect(
      Order.schema.path("guestOrderId").options.index
    ).toBe(true);
  });

  // =========================================================
  // 28. Payment method is required
  // =========================================================
  test("should not allow payment without method", () => {
    const data = validOrderData();

    data.payment = {
      status: "pending",
      amount: 1010,
    };

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.method"]).toBeDefined();
  });

  // =========================================================
  // 29. Payment amount is required
  // =========================================================
  test("should not allow payment without amount", () => {
    const data = validOrderData();

    data.payment = {
      method: "cod",
      status: "pending",
    };

    const order = new Order(data);
    const error = order.validateSync();

    expect(error).toBeDefined();
    expect(error.errors["payment.amount"]).toBeDefined();
  });

  // =========================================================
  // 30. Order status defaults to pending
  // =========================================================
  test("should default order status to pending", () => {
    const data = validOrderData();

    delete data.status;

    const order = new Order(data);

    expect(order.status).toBe("pending");
  });
});