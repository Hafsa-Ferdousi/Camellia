import { jest } from "@jest/globals";

// ======================================================
// MOCK API CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  put: jest.fn(),
};

jest.unstable_mockModule("../../api/client.js", () => ({
  default: mockClient,
}));

// ======================================================
// IMPORT CART API AFTER MOCKING CLIENT
// ======================================================

const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  checkout,
  getOrders,
  guestCheckout,
  guestLookupOrder,
} = await import("../../api/cart.js");

// ======================================================
// TEST SUITE
// ======================================================

describe("Cart API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================
  // GET CART
  // ====================================================

  describe("getCart", () => {
    test("should send GET request to /cart", async () => {
      const response = {
        data: {
          items: [
            {
              _id: "cartItem123",
              product: "product123",
              quantity: 2,
            },
          ],
        },
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getCart();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/cart"
      );

      expect(result).toEqual(response);
    });

    test("should propagate API error", async () => {
      const error = new Error("Failed to fetch cart");

      mockClient.get.mockRejectedValue(error);

      await expect(
        getCart()
      ).rejects.toThrow("Failed to fetch cart");
    });
  });

  // ====================================================
  // ADD TO CART
  // ====================================================

  describe("addToCart", () => {
    test("should send POST request with product ID and quantity", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "Product added to cart",
        },
      });

      await addToCart("product123", 3);

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/cart",
        {
          product: "product123",
          quantity: 3,
        }
      );
    });

    test("should use quantity 1 by default", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          message: "Product added",
        },
      });

      await addToCart("product456");

      expect(mockClient.post).toHaveBeenCalledWith(
        "/cart",
        {
          product: "product456",
          quantity: 1,
        }
      );
    });

    test("should support quantity of 1 explicitly", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await addToCart("product789", 1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/cart",
        {
          product: "product789",
          quantity: 1,
        }
      );
    });

    test("should propagate add to cart error", async () => {
      const error = new Error(
        "Unable to add product"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        addToCart("product123", 2)
      ).rejects.toThrow(
        "Unable to add product"
      );
    });
  });

  // ====================================================
  // UPDATE CART ITEM
  // ====================================================

  describe("updateCartItem", () => {
    test("should send PATCH request with cart item ID and quantity", async () => {
      mockClient.patch.mockResolvedValue({
        data: {
          message: "Cart updated",
        },
      });

      await updateCartItem(
        "cartItem123",
        5
      );

      expect(mockClient.patch).toHaveBeenCalledTimes(1);

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/cart/cartItem123",
        {
          quantity: 5,
        }
      );
    });

    test("should use cart item ID instead of product ID", async () => {
      mockClient.patch.mockResolvedValue({
        data: {},
      });

      await updateCartItem(
        "cart-item-456",
        10
      );

      expect(mockClient.patch).toHaveBeenCalledWith(
        "/cart/cart-item-456",
        {
          quantity: 10,
        }
      );
    });

    test("should propagate update error", async () => {
      const error = new Error(
        "Unable to update cart"
      );

      mockClient.patch.mockRejectedValue(error);

      await expect(
        updateCartItem(
          "cartItem123",
          3
        )
      ).rejects.toThrow(
        "Unable to update cart"
      );
    });
  });

  // ====================================================
  // REMOVE CART ITEM
  // ====================================================

  describe("removeCartItem", () => {
    test("should send DELETE request with cart item ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {
          message: "Item removed",
        },
      });

      await removeCartItem(
        "cartItem123"
      );

      expect(mockClient.delete).toHaveBeenCalledTimes(1);

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/cart/cartItem123"
      );
    });

    test("should use cart item ID rather than product ID", async () => {
      mockClient.delete.mockResolvedValue({
        data: {},
      });

      await removeCartItem(
        "cart-item-789"
      );

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/cart/cart-item-789"
      );
    });

    test("should propagate remove error", async () => {
      const error = new Error(
        "Unable to remove cart item"
      );

      mockClient.delete.mockRejectedValue(error);

      await expect(
        removeCartItem("cartItem123")
      ).rejects.toThrow(
        "Unable to remove cart item"
      );
    });
  });

  // ====================================================
  // CHECKOUT
  // ====================================================

  describe("checkout", () => {
    test("should send POST request to /orders/checkout", async () => {
      const items = [
        {
          productId: "product123",
          quantity: 2,
        },
        {
          productId: "product456",
          quantity: 1,
        },
      ];

      const address = {
        street: "Dhaka",
        city: "Dhaka",
        country: "Bangladesh",
      };

      const paymentMethod = "cod";
      const couponCode = "SAVE10";

      mockClient.post.mockResolvedValue({
        data: {
          orderId: "order123",
        },
      });

      await checkout(
        items,
        address,
        paymentMethod,
        couponCode
      );

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/checkout",
        {
          items,
          address,
          paymentMethod,
          couponCode: "SAVE10",
        }
      );
    });

    test("should send undefined couponCode when coupon is not provided", async () => {
      const items = [
        {
          productId: "product123",
          quantity: 1,
        },
      ];

      const address = {
        city: "Dhaka",
      };

      mockClient.post.mockResolvedValue({
        data: {
          orderId: "order456",
        },
      });

      await checkout(
        items,
        address,
        "cod"
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/checkout",
        {
          items,
          address,
          paymentMethod: "cod",
          couponCode: undefined,
        }
      );
    });

    test("should send undefined couponCode when empty string is provided", async () => {
      const items = [
        {
          productId: "product123",
          quantity: 1,
        },
      ];

      const address = {
        city: "Dhaka",
      };

      mockClient.post.mockResolvedValue({
        data: {},
      });

      await checkout(
        items,
        address,
        "bkash",
        ""
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/checkout",
        {
          items,
          address,
          paymentMethod: "bkash",
          couponCode: undefined,
        }
      );
    });

    test("should propagate checkout error", async () => {
      const error = new Error(
        "Checkout failed"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        checkout(
          [
            {
              productId: "product123",
              quantity: 1,
            },
          ],
          {
            city: "Dhaka",
          },
          "cod"
        )
      ).rejects.toThrow(
        "Checkout failed"
      );
    });
  });

  // ====================================================
  // GET ORDERS
  // ====================================================

  describe("getOrders", () => {
    test("should send GET request to /orders", async () => {
      const response = {
        data: [
          {
            _id: "order123",
            status: "pending",
          },
        ],
      };

      mockClient.get.mockResolvedValue(response);

      const result = await getOrders();

      expect(mockClient.get).toHaveBeenCalledTimes(1);

      expect(mockClient.get).toHaveBeenCalledWith(
        "/orders"
      );

      expect(result).toEqual(response);
    });

    test("should propagate orders API error", async () => {
      const error = new Error(
        "Failed to fetch orders"
      );

      mockClient.get.mockRejectedValue(error);

      await expect(
        getOrders()
      ).rejects.toThrow(
        "Failed to fetch orders"
      );
    });
  });

  // ====================================================
  // GUEST CHECKOUT
  // ====================================================

  describe("guestCheckout", () => {
    test("should send POST request with all guest checkout data", async () => {
      const items = [
        {
          productId: "product123",
          quantity: 2,
        },
      ];

      const address = {
        street: "Dhanmondi",
        city: "Dhaka",
        country: "Bangladesh",
      };

      const paymentMethod = "cod";

      const guestInfo = {
        name: "Guest User",
        email: "guest@example.com",
        phone: "01700000000",
      };

      const couponCode = "WELCOME10";

      mockClient.post.mockResolvedValue({
        data: {
          orderId: "guest-order123",
        },
      });

      await guestCheckout(
        items,
        address,
        paymentMethod,
        guestInfo,
        couponCode
      );

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/guest-checkout",
        {
          items,
          address,
          paymentMethod,
          guestInfo,
          couponCode: "WELCOME10",
        }
      );
    });

    test("should send undefined couponCode when coupon is not provided", async () => {
      const items = [
        {
          productId: "product456",
          quantity: 1,
        },
      ];

      const address = {
        city: "Dhaka",
      };

      const guestInfo = {
        name: "Guest",
        email: "guest@example.com",
      };

      mockClient.post.mockResolvedValue({
        data: {
          orderId: "guest-order456",
        },
      });

      await guestCheckout(
        items,
        address,
        "nagad",
        guestInfo
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/guest-checkout",
        {
          items,
          address,
          paymentMethod: "nagad",
          guestInfo,
          couponCode: undefined,
        }
      );
    });

    test("should send undefined couponCode when empty string is provided", async () => {
      const items = [
        {
          productId: "product123",
          quantity: 1,
        },
      ];

      const address = {
        city: "Dhaka",
      };

      const guestInfo = {
        name: "Guest User",
        email: "guest@example.com",
      };

      mockClient.post.mockResolvedValue({
        data: {},
      });

      await guestCheckout(
        items,
        address,
        "cod",
        guestInfo,
        ""
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/guest-checkout",
        {
          items,
          address,
          paymentMethod: "cod",
          guestInfo,
          couponCode: undefined,
        }
      );
    });

    test("should propagate guest checkout error", async () => {
      const error = new Error(
        "Guest checkout failed"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        guestCheckout(
          [
            {
              productId: "product123",
              quantity: 1,
            },
          ],
          {
            city: "Dhaka",
          },
          "cod",
          {
            name: "Guest",
            email: "guest@example.com",
          }
        )
      ).rejects.toThrow(
        "Guest checkout failed"
      );
    });
  });

  // ====================================================
  // GUEST ORDER LOOKUP
  // ====================================================

  describe("guestLookupOrder", () => {
    test("should send POST request with order ID and email", async () => {
      mockClient.post.mockResolvedValue({
        data: {
          orderId: "order123",
          status: "shipped",
        },
      });

      await guestLookupOrder(
        "order123",
        "guest@example.com"
      );

      expect(mockClient.post).toHaveBeenCalledTimes(1);

      expect(mockClient.post).toHaveBeenCalledWith(
        "/orders/guest-lookup",
        {
          orderId: "order123",
          email: "guest@example.com",
        }
      );
    });

    test("should propagate guest lookup error", async () => {
      const error = new Error(
        "Order not found"
      );

      mockClient.post.mockRejectedValue(error);

      await expect(
        guestLookupOrder(
          "order123",
          "wrong@example.com"
        )
      ).rejects.toThrow(
        "Order not found"
      );
    });
  });

  // ====================================================
  // VERIFY HTTP METHODS
  // ====================================================

  describe("HTTP method verification", () => {
    test("getCart should only use GET", async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getCart();

      expect(mockClient.get).toHaveBeenCalled();
      expect(mockClient.post).not.toHaveBeenCalled();
      expect(mockClient.patch).not.toHaveBeenCalled();
      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    test("addToCart should only use POST", async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await addToCart("product123", 1);

      expect(mockClient.post).toHaveBeenCalled();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.patch).not.toHaveBeenCalled();
      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    test("updateCartItem should only use PATCH", async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await updateCartItem(
        "cartItem123",
        2
      );

      expect(mockClient.patch).toHaveBeenCalled();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.post).not.toHaveBeenCalled();
      expect(mockClient.delete).not.toHaveBeenCalled();
    });

    test("removeCartItem should only use DELETE", async () => {
      mockClient.delete.mockResolvedValue({
        data: {},
      });

      await removeCartItem(
        "cartItem123"
      );

      expect(mockClient.delete).toHaveBeenCalled();
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(mockClient.post).not.toHaveBeenCalled();
      expect(mockClient.patch).not.toHaveBeenCalled();
    });
  });
});