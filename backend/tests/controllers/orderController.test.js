import { jest } from "@jest/globals";

// ======================================================
// MOCK FUNCTIONS
// ======================================================

const mockOrderFindById = jest.fn();
const mockUserFindById = jest.fn();
const mockNotificationCreate = jest.fn();

const mockSendOrderStatusEmail = jest.fn();
const mockSendPaymentConfirmedEmail = jest.fn();


// ======================================================
// MOCK ORDER MODEL
// ======================================================

jest.unstable_mockModule("../../models/Order.js", () => ({
  default: {
    findById: mockOrderFindById,
  },
}));


// ======================================================
// MOCK USER MODEL
// ======================================================

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: mockUserFindById,
  },
}));


// ======================================================
// MOCK NOTIFICATION MODEL
// ======================================================

jest.unstable_mockModule("../../models/Notification.js", () => ({
  default: {
    create: mockNotificationCreate,
  },
}));


// ======================================================
// MOCK MAILER
// ======================================================

jest.unstable_mockModule("../../utils/mailer.js", () => ({
  sendOrderStatusEmail: mockSendOrderStatusEmail,
  sendPaymentConfirmedEmail: mockSendPaymentConfirmedEmail,
}));


// ======================================================
// MOCK OTHER DEPENDENCIES
// These are imported by orderController.js
// ======================================================

jest.unstable_mockModule("../../models/CartItem.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../../models/Setting.js", () => ({
  default: {},
}));

jest.unstable_mockModule("../../utils/notifyAdmins.js", () => ({
  notifyAdmins: jest.fn(),
}));

jest.unstable_mockModule("../../utils/couponEngine.js", () => ({
  findAndValidateCoupon: jest.fn(),
  recordCouponUsage: jest.fn(),
}));


// ======================================================
// IMPORT CONTROLLER
// IMPORTANT:
// Test file:
// backend/tests/controllers/orderController.test.js
//
// Controller:
// backend/controllers/orderController.js
//
// Therefore:
// ../../controllers/orderController.js
// ======================================================

const { updateOrderStatus } = await import(
  "../../controllers/orderController.js"
);


// ======================================================
// MOCK RESPONSE
// ======================================================

const createMockResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};


// ======================================================
// MOCK ORDER
// ======================================================

const createMockOrder = (overrides = {}) => ({
  _id: "order123",

  user: "user123",

  isGuest: false,

  invoiceNumber: "INV-20260814-1234",

  status: "pending",

  totalAmount: 1500,

  payment: {
    method: "cod",
    amount: 1500,
    status: "pending",
  },

  save: jest.fn().mockResolvedValue(undefined),

  ...overrides,
});


// ======================================================
// TEST SUITE
// ======================================================

describe("Order Controller › updateOrderStatus", () => {

  beforeEach(() => {
    jest.clearAllMocks();

    mockSendOrderStatusEmail.mockResolvedValue(undefined);

    mockSendPaymentConfirmedEmail.mockResolvedValue(undefined);

    mockNotificationCreate.mockResolvedValue({});
  });


  // ====================================================
  // TEST 1
  // Update order to processing
  // ====================================================

  test("should update order status to processing", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "processing",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder();

    mockOrderFindById.mockResolvedValue(order);

    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: true,
      }),
    });


    await updateOrderStatus(req, res);


    // Order found
    expect(mockOrderFindById).toHaveBeenCalledWith("order123");


    // Status changed
    expect(order.status).toBe("processing");


    // Save called
    expect(order.save).toHaveBeenCalledTimes(1);


    // Status email
    expect(mockSendOrderStatusEmail).toHaveBeenCalledWith(
      "customer@example.com",
      {
        orderId: "order123",
        invoiceNumber: "INV-20260814-1234",
        status: "processing",
      }
    );


    // Notification
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      user: "user123",
      type: "order_status",
      title: "Order status updated",
      message: "Your order INV-20260814-1234 is now processing.",
      order: "order123",
    });


    // Response
    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 2
  // Update order to confirmed
  // ====================================================

  test("should update order status to confirmed", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "confirmed",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder();

    mockOrderFindById.mockResolvedValue(order);

    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: true,
      }),
    });


    await updateOrderStatus(req, res);


    expect(order.status).toBe("confirmed");

    expect(order.save).toHaveBeenCalledTimes(1);

    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 3
  // Update order to shipped
  // ====================================================

  test("should update order status to shipped", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "shipped",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder();

    mockOrderFindById.mockResolvedValue(order);

    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: true,
      }),
    });


    await updateOrderStatus(req, res);


    expect(order.status).toBe("shipped");

    expect(order.save).toHaveBeenCalledTimes(1);

    expect(mockSendOrderStatusEmail).toHaveBeenCalled();

    expect(mockNotificationCreate).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 4
  // Delivered + COD payment
  // ====================================================

  test("should update order to delivered and mark COD payment as paid", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "delivered",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder({

      status: "processing",

      payment: {
        method: "cod",
        amount: 1500,
        status: "pending",
      },

    });

    mockOrderFindById.mockResolvedValue(order);

    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: true,
      }),
    });


    await updateOrderStatus(req, res);


    // Status
    expect(order.status).toBe("delivered");


    // COD becomes paid
    expect(order.payment.status).toBe("paid");


    // Save
    expect(order.save).toHaveBeenCalledTimes(1);


    // Status email
    expect(mockSendOrderStatusEmail).toHaveBeenCalledWith(
      "customer@example.com",
      {
        orderId: "order123",
        invoiceNumber: "INV-20260814-1234",
        status: "delivered",
      }
    );


    // Payment email
    expect(mockSendPaymentConfirmedEmail).toHaveBeenCalledWith(
      "customer@example.com",
      {
        orderId: "order123",
        invoiceNumber: "INV-20260814-1234",
        amount: 1500,
      }
    );


    // Two notifications
    expect(mockNotificationCreate).toHaveBeenCalledTimes(2);


    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 5
  // Order not found
  // ====================================================

  test("should return 404 when order does not exist", async () => {

    const req = {
      params: {
        id: "invalid-order",
      },

      body: {
        status: "processing",
      },
    };

    const res = createMockResponse();


    mockOrderFindById.mockResolvedValue(null);


    await updateOrderStatus(req, res);


    expect(mockOrderFindById).toHaveBeenCalledWith(
      "invalid-order"
    );


    expect(res.status).toHaveBeenCalledWith(404);


    expect(res.json).toHaveBeenCalledWith({
      message: "Order not found",
    });
  });


  // ====================================================
  // TEST 6
  // Invalid status
  // ====================================================

  test("should return 400 for invalid status", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "invalid-status",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder();

    mockOrderFindById.mockResolvedValue(order);


    await updateOrderStatus(req, res);


    expect(res.status).toHaveBeenCalledWith(400);


    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid status",
    });


    // Status must not change
    expect(order.status).toBe("pending");


    // Save must not happen
    expect(order.save).not.toHaveBeenCalled();
  });


  // ====================================================
  // TEST 7
  // Guest order
  // ====================================================

  test("should send status email to guest customer", async () => {

    const req = {
      params: {
        id: "guest-order123",
      },

      body: {
        status: "processing",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder({

      _id: "guest-order123",

      user: null,

      isGuest: true,

      guestInfo: {
        name: "John Doe",
        email: "john@example.com",
        phone: "01712345678",
      },

    });


    mockOrderFindById.mockResolvedValue(order);


    await updateOrderStatus(req, res);


    expect(order.status).toBe("processing");

    expect(order.save).toHaveBeenCalledTimes(1);


    expect(mockSendOrderStatusEmail).toHaveBeenCalledWith(
      "john@example.com",
      {
        orderId: "guest-order123",
        invoiceNumber: "INV-20260814-1234",
        status: "processing",
      }
    );


    // Guest has no in-app notification
    expect(mockNotificationCreate).not.toHaveBeenCalled();


    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 8
  // Notifications disabled
  // ====================================================

  test("should not send email when customer notifications are disabled", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "processing",
      },
    };

    const res = createMockResponse();

    const order = createMockOrder();


    mockOrderFindById.mockResolvedValue(order);


    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: false,
      }),
    });


    await updateOrderStatus(req, res);


    expect(order.status).toBe("processing");

    expect(order.save).toHaveBeenCalledTimes(1);


    // Email should NOT be sent
    expect(mockSendOrderStatusEmail).not.toHaveBeenCalled();


    // In-app notification still happens
    expect(mockNotificationCreate).toHaveBeenCalled();


    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 9
  // Already paid COD
  // ====================================================

  test("should not send payment confirmation twice", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "delivered",
      },
    };

    const res = createMockResponse();


    const order = createMockOrder({

      status: "processing",

      payment: {
        method: "cod",
        amount: 1500,
        status: "paid",
      },

    });


    mockOrderFindById.mockResolvedValue(order);


    mockUserFindById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        email: "customer@example.com",
        notificationsEnabled: true,
      }),
    });


    await updateOrderStatus(req, res);


    expect(order.status).toBe("delivered");


    // Still paid
    expect(order.payment.status).toBe("paid");


    // Status email
    expect(mockSendOrderStatusEmail).toHaveBeenCalled();


    // Payment email must NOT be sent again
    expect(
      mockSendPaymentConfirmedEmail
    ).not.toHaveBeenCalled();


    // Only status notification
    expect(mockNotificationCreate).toHaveBeenCalledTimes(1);


    expect(res.json).toHaveBeenCalledWith(order);
  });


  // ====================================================
  // TEST 10
  // Database error
  // ====================================================

  test("should return 500 when database operation fails", async () => {

    const req = {
      params: {
        id: "order123",
      },

      body: {
        status: "processing",
      },
    };

    const res = createMockResponse();


    mockOrderFindById.mockRejectedValue(
      new Error("Database connection failed")
    );


    await updateOrderStatus(req, res);


    expect(res.status).toHaveBeenCalledWith(500);


    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to update order status.",
    });
  });

});