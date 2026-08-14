
import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";

// =========================================================
// MOCK DEPENDENCIES BEFORE IMPORTING CONTROLLER
// =========================================================

jest.unstable_mockModule("../../models/CartItem.js", () => ({
  default: {
    deleteMany: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Order.js", () => ({
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Setting.js", () => ({
  default: {
    getSingleton: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Notification.js", () => ({
  default: {
    create: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule("../../utils/notifyAdmins.js", () => ({
  notifyAdmins: jest.fn(),
}));

jest.unstable_mockModule("../../utils/couponEngine.js", () => ({
  findAndValidateCoupon: jest.fn(),
  recordCouponUsage: jest.fn(),
}));

jest.unstable_mockModule("../../utils/mailer.js", () => ({
  sendOrderStatusEmail: jest.fn(),
  sendPaymentConfirmedEmail: jest.fn(),
}));

// =========================================================
// IMPORT MOCKED MODULES
// =========================================================

const { default: CartItem } =
  await import("../../models/CartItem.js");

const { default: Order } =
  await import("../../models/Order.js");

const { default: Product } =
  await import("../../models/Product.js");

const { default: Setting } =
  await import("../../models/Setting.js");

const { default: Notification } =
  await import("../../models/Notification.js");

const { default: User } =
  await import("../../models/User.js");

const { notifyAdmins } =
  await import("../../utils/notifyAdmins.js");

const {
  findAndValidateCoupon,
  recordCouponUsage,
} = await import("../../utils/couponEngine.js");

const {
  sendOrderStatusEmail,
  sendPaymentConfirmedEmail,
} = await import("../../utils/mailer.js");

// =========================================================
// IMPORT CONTROLLER
// =========================================================

const {
  checkout,
  guestCheckout,
  guestLookupOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderSummary,
} = await import("../../controllers/orderController.js");

// =========================================================
// TEST SUITE
// =========================================================

describe("Order Controller", () => {
  let mockReq;
  let mockRes;
  let mockProduct;
  let mockOrder;
  let mockSettings;

  // =======================================================
  // COMMON SETUP
  // =======================================================

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {
        id: "order123",
      },
      user: {
        _id: "user123",
        role: "user",
        name: "John Doe",
        email: "john@example.com",
        phone: "01712345678",
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockSettings = {
      defaultDeliveryCharge: 60,
      districtDeliveryCharges: [
        {
          district: "Dhaka",
          charge: 60,
        },
        {
          district: "Chattogram",
          charge: 100,
        },
      ],
      vatRate: 0.05,
      lowStockThreshold: 5,
    };

    mockProduct = {
      _id: "product123",
      name: {
        en: "Gold Necklace",
      },
      basePrice: 1500,
      totalStock: 48,
      category: "jewelry",
      isActive: true,
      variants: [],
      save: jest.fn().mockResolvedValue(true),
    };

    mockOrder = {
      _id: "order123",
      user: "user123",
      isGuest: false,
      invoiceNumber: "INV-20260812-1234",
      guestOrderId: "ORD-JOHN-678-1234",
      status: "pending",
      totalAmount: 2135,
      subtotal: 1500,
      vat: 75,
      deliveryCharge: 60,
      discountAmount: 0,
      originalTotal: 1635,
      address: {
        addressLine: "123 Main Street",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01712345678",
      },
      items: [
        {
          product: "product123",
          nameSnapshot: "Gold Necklace",
          quantity: 1,
          price: 1500,
        },
      ],
      payment: {
        method: "cod",
        amount: 1635,
        status: "pending",
      },
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue(),
    };

    Setting.getSingleton.mockResolvedValue(mockSettings);

    Product.findById.mockResolvedValue(mockProduct);

    Product.findOneAndUpdate.mockResolvedValue({
      ...mockProduct,
      totalStock: 48,
    });

    Product.findByIdAndUpdate.mockResolvedValue(mockProduct);

    Order.create.mockResolvedValue(mockOrder);

    CartItem.deleteMany.mockResolvedValue({
      deletedCount: 1,
    });

    Notification.create.mockResolvedValue(true);

    notifyAdmins.mockResolvedValue(true);

    findAndValidateCoupon.mockResolvedValue({
      coupon: null,
      discount: 0,
    });

    recordCouponUsage.mockResolvedValue(true);

    sendOrderStatusEmail.mockResolvedValue(true);
    sendPaymentConfirmedEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =======================================================
  // CHECKOUT TESTS
  // =======================================================

  describe("checkout", () => {
    const validCheckoutBody = () => ({
      address: {
        addressLine: "123 Main Street",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01712345678",
      },
      paymentMethod: "cod",
      items: [
        {
          productId: "product123",
          quantity: 1,
        },
      ],
    });

    test("should successfully checkout with valid data", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockOrder);
      expect(Order.create).toHaveBeenCalled();
    });

    test("should reject admin users from placing orders", async () => {
      mockReq.user.role = "admin";
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Admin accounts cannot place orders. Please use a customer account.",
      });

      expect(Order.create).not.toHaveBeenCalled();
    });

    test("should reject missing address", async () => {
      mockReq.body = {
        items: [
          {
            productId: "product123",
            quantity: 1,
          },
        ],
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Delivery address is required (addressLine, district, city, phone).",
      });
    });

    test("should reject incomplete address", async () => {
      mockReq.body = {
        address: {
          addressLine: "123 Main Street",
          city: "Dhaka",
        },
        items: [
          {
            productId: "product123",
            quantity: 1,
          },
        ],
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject empty cart", async () => {
      mockReq.body = {
        address: {
          addressLine: "123 Main Street",
          district: "Dhaka",
          city: "Dhaka",
          phone: "01712345678",
        },
        items: [],
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Cart is empty.",
      });
    });

    test("should reject non-array items", async () => {
      mockReq.body = {
        address: {
          addressLine: "123 Main Street",
          district: "Dhaka",
          city: "Dhaka",
          phone: "01712345678",
        },
        items: {},
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject invalid product item", async () => {
      mockReq.body = {
        address: {
          addressLine: "123 Main Street",
          district: "Dhaka",
          city: "Dhaka",
          phone: "01712345678",
        },
        items: [
          {
            productId: "",
            quantity: 1,
          },
        ],
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid item in cart.",
      });
    });

    test("should reject quantity less than one", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        items: [
          {
            productId: "product123",
            quantity: 0,
          },
        ],
      };

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject inactive product", async () => {
      mockReq.body = validCheckoutBody();

      Product.findById.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "A product in your cart is no longer available. Please refresh your cart.",
      });
    });

    test("should reject product that does not exist", async () => {
      mockReq.body = validCheckoutBody();

      Product.findById.mockResolvedValue(null);

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject insufficient stock", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        items: [
          {
            productId: "product123",
            quantity: 100,
          },
        ],
      };

      Product.findOneAndUpdate.mockResolvedValue(null);

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Not enough stock for Gold Necklace",
      });
    });

    test("should atomically decrease product stock", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: "product123",
          totalStock: {
            $gte: 1,
          },
        },
        {
          $inc: {
            totalStock: -1,
          },
        },
        {
          new: true,
        }
      );
    });

    test("should calculate subtotal and create order", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 1500,
          vat: 75,
          deliveryCharge: 60,
          discountAmount: 0,
        })
      );
    });

    test("should use district-specific delivery charge", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        address: {
          ...validCheckoutBody().address,
          district: "Chattogram",
        },
      };

      await checkout(mockReq, mockRes);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryCharge: 100,
        })
      );
    });

    test("should use default delivery charge when district has no custom charge", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        address: {
          ...validCheckoutBody().address,
          district: "Sylhet",
        },
      };

      await checkout(mockReq, mockRes);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryCharge: 60,
        })
      );
    });

    test("should create order with pending payment", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: expect.objectContaining({
            method: "cod",
            status: "pending",
          }),
        })
      );
    });

    test("should clear customer cart after successful checkout", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(CartItem.deleteMany).toHaveBeenCalledWith({
        user: "user123",
      });
    });

    test("should populate user before returning checkout response", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(mockOrder.populate).toHaveBeenCalledWith(
        "user",
        "name email"
      );
    });

    test("should notify admins after successful checkout", async () => {
      mockReq.body = validCheckoutBody();

      await checkout(mockReq, mockRes);

      expect(notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "new_order",
          title: "New order placed",
          order: "order123",
        })
      );
    });

    test("should apply valid coupon", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        couponCode: "SAVE10",
      };

      findAndValidateCoupon.mockResolvedValue({
        coupon: {
          code: "SAVE10",
        },
        discount: 100,
      });

      await checkout(mockReq, mockRes);

      expect(findAndValidateCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "SAVE10",
          cartTotal: 1500,
          userId: "user123",
        })
      );

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discountAmount: 100,
          couponCode: "SAVE10",
        })
      );
    });

    test("should record coupon usage", async () => {
      mockReq.body = {
        ...validCheckoutBody(),
        couponCode: "SAVE10",
      };

      const coupon = {
        code: "SAVE10",
      };

      findAndValidateCoupon.mockResolvedValue({
        coupon,
        discount: 100,
      });

      await checkout(mockReq, mockRes);

      expect(recordCouponUsage).toHaveBeenCalledWith(
        coupon,
        {
          userId: "user123",
        }
      );
    });

    test("should rollback stock when checkout fails", async () => {
      mockReq.body = validCheckoutBody();

      Product.findOneAndUpdate
        .mockResolvedValueOnce({
          ...mockProduct,
          totalStock: 48,
        });

      Order.create.mockRejectedValue(
        new Error("Database error")
      );

      await checkout(mockReq, mockRes);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        {
          $inc: {
            totalStock: 1,
          },
        }
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 when database operation fails", async () => {
      mockReq.body = validCheckoutBody();

      Setting.getSingleton.mockRejectedValue(
        new Error("Database error")
      );

      await checkout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });

  // =======================================================
  // GUEST CHECKOUT TESTS
  // =======================================================

  describe("guestCheckout", () => {
    const validGuestBody = () => ({
      items: [
        {
          productId: "product123",
          quantity: 2,
        },
      ],
      address: {
        addressLine: "123 Main Street",
        district: "Dhaka",
        city: "Dhaka",
        phone: "01712345678",
      },
      paymentMethod: "cod",
      guestInfo: {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "01812345678",
      },
    });

    test("should successfully create guest order", async () => {
      mockReq.body = validGuestBody();

      const guestOrder = {
        ...mockOrder,
        user: null,
        isGuest: true,
      };

      Order.create.mockResolvedValue(guestOrder);

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(guestOrder);
    });

    test("should reject missing address", async () => {
      mockReq.body = {
        ...validGuestBody(),
        address: undefined,
      };

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject missing guest name", async () => {
      mockReq.body = {
        ...validGuestBody(),
        guestInfo: {
          email: "jane@example.com",
          phone: "01812345678",
        },
      };

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Guest name, email, and phone are required.",
      });
    });

    test("should reject missing guest email", async () => {
      mockReq.body = {
        ...validGuestBody(),
        guestInfo: {
          name: "Jane Doe",
          phone: "01812345678",
        },
      };

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject missing guest phone", async () => {
      mockReq.body = {
        ...validGuestBody(),
        guestInfo: {
          name: "Jane Doe",
          email: "jane@example.com",
        },
      };

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject empty guest cart", async () => {
      mockReq.body = {
        ...validGuestBody(),
        items: [],
      };

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should create guest order with user null", async () => {
      mockReq.body = validGuestBody();

      const guestOrder = {
        ...mockOrder,
        user: null,
        isGuest: true,
      };

      Order.create.mockResolvedValue(guestOrder);

      await guestCheckout(mockReq, mockRes);

      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: null,
          isGuest: true,
          guestInfo: {
            name: "Jane Doe",
            email: "jane@example.com",
            phone: "01812345678",
          },
        })
      );
    });

    test("should reject unavailable guest product", async () => {
      mockReq.body = validGuestBody();

      Product.findById.mockResolvedValue(null);

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject insufficient stock for guest checkout", async () => {
      mockReq.body = validGuestBody();

      Product.findOneAndUpdate.mockResolvedValue(null);

      await guestCheckout(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should notify admins about guest order", async () => {
      mockReq.body = validGuestBody();

      const guestOrder = {
        ...mockOrder,
        user: null,
        isGuest: true,
        totalAmount: 3000,
      };

      Order.create.mockResolvedValue(guestOrder);

      await guestCheckout(mockReq, mockRes);

      expect(notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "new_order",
          title: "New guest order placed",
        })
      );
    });

    test("should apply guest coupon using guest email", async () => {
      mockReq.body = {
        ...validGuestBody(),
        couponCode: "GUEST10",
      };

      findAndValidateCoupon.mockResolvedValue({
        coupon: {
          code: "GUEST10",
        },
        discount: 100,
      });

      await guestCheckout(mockReq, mockRes);

      expect(findAndValidateCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "GUEST10",
          guestEmail: "jane@example.com",
        })
      );
    });
  });

  // =======================================================
  // GUEST LOOKUP TESTS
  // =======================================================

  describe("guestLookupOrder", () => {
    const mockOrders = [
      {
        ...mockOrder,
        user: null,
        isGuest: true,
      },
    ];

    const setupOrderFindChain = (orders) => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(orders),
      };

      Order.find.mockReturnValue(chain);

      return chain;
    };

    test("should find guest order by MongoDB order ID and email", async () => {
      mockReq.body = {
        orderId: "507f1f77bcf86cd799439011",
        email: "guest@example.com",
      };

      setupOrderFindChain(mockOrders);

      await guestLookupOrder(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isGuest: true,
          _id: "507f1f77bcf86cd799439011",
        })
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        orders: mockOrders,
      });
    });

    test("should find guest order by friendly order ID", async () => {
      mockReq.body = {
        orderId: "ORD-JANE-678-1234",
        email: "guest@example.com",
      };

      setupOrderFindChain(mockOrders);

      await guestLookupOrder(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({
          guestOrderId: "ORD-JANE-678-1234",
        })
      );
    });

    test("should find guest order using email and phone", async () => {
      mockReq.body = {
        email: "guest@example.com",
        phone: "01812345678",
      };

      setupOrderFindChain(mockOrders);

      await guestLookupOrder(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isGuest: true,
          "guestInfo.phone": "01812345678",
        })
      );
    });

    test("should support optional guest name", async () => {
      mockReq.body = {
        email: "guest@example.com",
        phone: "01812345678",
        name: "Jane Doe",
      };

      setupOrderFindChain(mockOrders);

      await guestLookupOrder(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "guestInfo.phone": "01812345678",
          "guestInfo.name": expect.any(RegExp),
        })
      );
    });

    test("should reject missing email", async () => {
      mockReq.body = {
        orderId: "ORD-JANE-678-1234",
      };

      await guestLookupOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should reject when both order ID and phone are missing", async () => {
      mockReq.body = {
        email: "guest@example.com",
      };

      await guestLookupOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "Email plus either an Order ID or phone number is required.",
      });
    });

    test("should reject invalid order ID format", async () => {
      mockReq.body = {
        orderId: "INVALID-ID",
        email: "guest@example.com",
      };

      await guestLookupOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid order ID format.",
      });
    });

    test("should return 404 when no guest orders exist", async () => {
      mockReq.body = {
        email: "guest@example.com",
        phone: "01812345678",
      };

      setupOrderFindChain([]);

      await guestLookupOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          "No orders found for this email and phone.",
      });
    });

    test("should limit lookup results to five orders", async () => {
      mockReq.body = {
        email: "guest@example.com",
        phone: "01812345678",
      };

      const chain = setupOrderFindChain(mockOrders);

      await guestLookupOrder(mockReq, mockRes);

      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });

  // =======================================================
  // GET ORDERS TESTS
  // =======================================================

  describe("getOrders", () => {
    const setupGetOrdersChain = (orders) => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
      };

      chain.populate
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce(orders);

      Order.find.mockReturnValue(chain);

      return chain;
    };

    test("should return orders for normal customer", async () => {
      const orders = [mockOrder];

      setupGetOrdersChain(orders);

      await getOrders(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith({
        user: "user123",
      });

      expect(mockRes.json).toHaveBeenCalledWith(orders);
    });

    test("should return all orders for admin", async () => {
      mockReq.user.role = "admin";

      const orders = [
        mockOrder,
        {
          ...mockOrder,
          _id: "order456",
        },
      ];

      setupGetOrdersChain(orders);

      await getOrders(mockReq, mockRes);

      expect(Order.find).toHaveBeenCalledWith({});

      expect(mockRes.json).toHaveBeenCalledWith(orders);
    });

    test("should sort orders by newest first", async () => {
      const chain = setupGetOrdersChain([mockOrder]);

      await getOrders(mockReq, mockRes);

      expect(chain.sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    test("should populate user information", async () => {
      const chain = setupGetOrdersChain([mockOrder]);

      await getOrders(mockReq, mockRes);

      expect(chain.populate).toHaveBeenCalledWith(
        "user",
        "name email phone"
      );
    });

    test("should return 500 when database fails", async () => {
      Order.find.mockImplementation(() => {
        throw new Error("Database error");
      });

      await getOrders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to fetch orders.",
      });
    });
  });

  // =======================================================
  // GET ORDER BY ID TESTS
  // =======================================================

  describe("getOrderById", () => {
    const setupGetOrderChain = (order) => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
      };

      chain.populate
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce(order);

      Order.findById.mockReturnValue(chain);

      return chain;
    };

    test("should return order details for owner", async () => {
      setupGetOrderChain({
        ...mockOrder,
        user: {
          _id: "user123",
        },
      });

      await getOrderById(mockReq, mockRes);

      expect(Order.findById).toHaveBeenCalledWith(
        "order123"
      );

      expect(mockRes.json).toHaveBeenCalled();
    });

    test("should return order for admin", async () => {
      mockReq.user.role = "admin";

      setupGetOrderChain({
        ...mockOrder,
        user: {
          _id: "anotherUser",
        },
      });

      await getOrderById(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalled();
    });

    test("should return 404 when order does not exist", async () => {
      setupGetOrderChain(null);

      await getOrderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Order not found",
      });
    });

    test("should deny access to another customer order", async () => {
      setupGetOrderChain({
        ...mockOrder,
        user: {
          _id: "anotherUser",
        },
      });

      await getOrderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Not authorized to view this order",
      });
    });

    test("should return 500 when database lookup fails", async () => {
      Order.findById.mockImplementation(() => {
        throw new Error("Database error");
      });

      await getOrderById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to fetch order.",
      });
    });
  });

  // =======================================================
  // UPDATE ORDER STATUS TESTS
  // =======================================================

  describe("updateOrderStatus", () => {
    test("should update order to processing", async () => {
      mockReq.body = {
        status: "processing",
      };

      const order = {
        ...mockOrder,
        status: "pending",
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      await updateOrderStatus(mockReq, mockRes);

      expect(order.status).toBe("processing");
      expect(order.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith(order);
    });

    test("should accept confirmed status", async () => {
      mockReq.body = {
        status: "confirmed",
      };

      const order = {
        ...mockOrder,
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      await updateOrderStatus(mockReq, mockRes);

      expect(order.status).toBe("confirmed");
      expect(mockRes.json).toHaveBeenCalledWith(order);
    });

    test("should accept shipped status", async () => {
      mockReq.body = {
        status: "shipped",
      };

      const order = {
        ...mockOrder,
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      await updateOrderStatus(mockReq, mockRes);

      expect(order.status).toBe("shipped");
    });

    test("should accept delivered status", async () => {
      mockReq.body = {
        status: "delivered",
      };

      const order = {
        ...mockOrder,
        status: "processing",
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: "john@example.com",
          notificationsEnabled: true,
        }),
      });

      await updateOrderStatus(mockReq, mockRes);

      expect(order.status).toBe("delivered");
      expect(order.payment.status).toBe("paid");
    });

    test("should reject invalid status", async () => {
      mockReq.body = {
        status: "invalid_status",
      };

      Order.findById.mockResolvedValue(mockOrder);

      await updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Invalid status",
      });
    });

    test("should return 404 when order does not exist", async () => {
      mockReq.body = {
        status: "processing",
      };

      Order.findById.mockResolvedValue(null);

      await updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Order not found",
      });
    });

    test("should send status email to registered customer", async () => {
      mockReq.body = {
        status: "shipped",
      };

      const order = {
        ...mockOrder,
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: "john@example.com",
          notificationsEnabled: true,
        }),
      });

      await updateOrderStatus(mockReq, mockRes);

      expect(sendOrderStatusEmail).toHaveBeenCalledWith(
        "john@example.com",
        expect.objectContaining({
          orderId: "order123",
          invoiceNumber: mockOrder.invoiceNumber,
          status: "shipped",
        })
      );
    });

    test("should create in-app notification for registered customer", async () => {
      mockReq.body = {
        status: "processing",
      };

      const order = {
        ...mockOrder,
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: "john@example.com",
          notificationsEnabled: true,
        }),
      });

      await updateOrderStatus(mockReq, mockRes);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: "user123",
          type: "order_status",
          title: "Order status updated",
        })
      );
    });

    test("should mark COD order as paid when delivered", async () => {
      mockReq.body = {
        status: "delivered",
      };

      const order = {
        ...mockOrder,
        payment: {
          method: "cod",
          status: "pending",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      Order.findById.mockResolvedValue(order);

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: "john@example.com",
          notificationsEnabled: true,
        }),
      });

      await updateOrderStatus(mockReq, mockRes);

      expect(order.payment.status).toBe("paid");

      expect(sendPaymentConfirmedEmail).toHaveBeenCalled();
    });

    test("should return 500 on update error", async () => {
      mockReq.body = {
        status: "processing",
      };

      Order.findById.mockRejectedValue(
        new Error("Database error")
      );

      await updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to update order status.",
      });
    });
  });

  // =======================================================
  // CANCEL ORDER TESTS
  // =======================================================

  describe("cancelOrder", () => {
    const setupCancelOrder = (order) => {
      const chain = {
        populate: jest.fn().mockResolvedValue(order),
      };

      Order.findById.mockReturnValue(chain);

      return chain;
    };

    test("should successfully cancel pending order", async () => {
      const order = {
        ...mockOrder,
        user: "user123",
        status: "pending",
        items: [
          {
            product: "product123",
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(order.status).toBe("cancelled");
      expect(order.save).toHaveBeenCalled();

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Order cancelled successfully.",
        order,
      });
    });

    test("should return 404 when order does not exist", async () => {
      setupCancelOrder(null);

      await cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Order not found",
      });
    });

    test("should reject cancellation by another user", async () => {
      const order = {
        ...mockOrder,
        user: "anotherUser",
        status: "pending",
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Not authorized to cancel this order",
      });
    });

    test("should reject cancellation of shipped order", async () => {
      const order = {
        ...mockOrder,
        user: "user123",
        status: "shipped",
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      expect(mockRes.json).toHaveBeenCalledWith({
        message:
          'Cannot cancel an order with status "shipped". Only pending orders can be cancelled.',
      });
    });

    test("should reject cancellation of delivered order", async () => {
      const order = {
        ...mockOrder,
        user: "user123",
        status: "delivered",
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test("should restore product stock after cancellation", async () => {
      const order = {
        ...mockOrder,
        user: "user123",
        status: "pending",
        items: [
          {
            product: {
              _id: "product123",
            },
            quantity: 3,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        {
          $inc: {
            totalStock: 3,
          },
        }
      );
    });

    test("should save cancelled order", async () => {
      const order = {
        ...mockOrder,
        user: "user123",
        status: "pending",
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      setupCancelOrder(order);

      await cancelOrder(mockReq, mockRes);

      expect(order.status).toBe("cancelled");
      expect(order.save).toHaveBeenCalled();
    });

    test("should return 500 when cancellation fails", async () => {
      Order.findById.mockImplementation(() => {
        throw new Error("Database error");
      });

      await cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to cancel order.",
      });
    });
  });

  // =======================================================
  // ORDER SUMMARY TESTS
  // =======================================================

  describe("getOrderSummary", () => {
    test("should return order summary", async () => {
      Order.countDocuments.mockResolvedValue(10);

      Order.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 25000,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "pending",
            count: 3,
          },
          {
            _id: "processing",
            count: 4,
          },
          {
            _id: "delivered",
            count: 3,
          },
        ]);

      await getOrderSummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        totalOrders: 10,
        totalRevenue: 25000,
        statusCounts: {
          pending: 3,
          processing: 4,
          delivered: 3,
        },
      });
    });

    test("should count total orders", async () => {
      Order.countDocuments.mockResolvedValue(15);

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getOrderSummary(mockReq, mockRes);

      expect(Order.countDocuments).toHaveBeenCalled();
    });

    test("should return zero revenue when there is no revenue", async () => {
      Order.countDocuments.mockResolvedValue(0);

      Order.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getOrderSummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        totalOrders: 0,
        totalRevenue: 0,
        statusCounts: {},
      });
    });

    test("should aggregate revenue excluding cancelled orders", async () => {
      Order.countDocuments.mockResolvedValue(5);

      Order.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 10000,
          },
        ])
        .mockResolvedValueOnce([]);

      await getOrderSummary(mockReq, mockRes);

      expect(Order.aggregate).toHaveBeenNthCalledWith(
        1,
        [
          {
            $match: {
              status: {
                $ne: "cancelled",
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: "$totalAmount",
              },
            },
          },
        ]
      );
    });

    test("should return status counts", async () => {
      Order.countDocuments.mockResolvedValue(3);

      Order.aggregate
        .mockResolvedValueOnce([
          {
            _id: null,
            total: 5000,
          },
        ])
        .mockResolvedValueOnce([
          {
            _id: "pending",
            count: 2,
          },
          {
            _id: "delivered",
            count: 1,
          },
        ]);

      await getOrderSummary(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCounts: {
            pending: 2,
            delivered: 1,
          },
        })
      );
    });

    test("should return 500 when summary query fails", async () => {
      Order.countDocuments.mockRejectedValue(
        new Error("Database error")
      );

      await getOrderSummary(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);

      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Failed to fetch order summary.",
      });
    });
  });
});

