/**
 * Order Controller Unit Tests
 * Tests order creation, cancellation, status updates, and payment handling
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js';
import Product from '../models/Product.js';
import {
  placeOrder,
  cancelOrder,
  updateOrderStatus,
  getOrder,
  getOrderHistory,
  handlePaymentSuccess,
  handlePaymentFailure,
} from './orderController.js';

jest.mock('../models/Order.js');
jest.mock('../models/CartItem.js');
jest.mock('../models/Product.js');

describe('Order Controller', () => {
  let mockReq, mockRes, mockOrder, mockCartItem, mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: { id: 'order123' },
      user: { _id: 'user123', role: 'user' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockProduct = {
      _id: 'product123',
      name: 'Gold Necklace',
      price: 150.00,
      stock: 50,
      save: jest.fn().mockResolvedValue(true),
    };

    mockCartItem = {
      _id: 'cartItem123',
      user: 'user123',
      product: mockProduct,
      quantity: 2,
      price: 150.00,
    };

    mockOrder = {
      _id: 'order123',
      user: 'user123',
      items: [mockCartItem],
      totalAmount: 300.00,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: {
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
        postalCode: '10001',
      },
      billingAddress: {
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
        postalCode: '10001',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== PLACE ORDER TESTS ====================
  describe('placeOrder', () => {
    test('should successfully place order with valid data', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: {
          address: '123 Main St',
          city: 'New York',
          country: 'USA',
          postalCode: '10001',
        },
        billingAddress: {
          address: '123 Main St',
          city: 'New York',
          country: 'USA',
          postalCode: '10001',
        },
        paymentMethod: 'card',
      };

      CartItem.find.mockResolvedValue([mockCartItem]);
      Order.create.mockResolvedValue(mockOrder);
      CartItem.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Order placed successfully',
        })
      );
      expect(Order.create).toHaveBeenCalled();
    });

    test('should return error when cart is empty', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockResolvedValue([]);

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Cart is empty',
      });
    });

    test('should return error when shipping address is missing', async () => {
      // Arrange
      mockReq.body = {
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('required'),
        })
      );
    });

    test('should validate shipping address format', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: {
          address: '',
          city: '',
        },
        billingAddress: {
          address: '123 Main St',
          city: 'New York',
        },
      };

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should check product stock availability', async () => {
      // Arrange
      const outOfStockItem = { ...mockCartItem, quantity: 100 };
      outOfStockItem.product = { ...mockProduct, stock: 10 };

      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockResolvedValue([outOfStockItem]);

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('stock'),
        })
      );
    });

    test('should create order with correct total amount', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockResolvedValue([mockCartItem]);
      Order.create.mockResolvedValue(mockOrder);
      CartItem.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalAmount: expect.any(Number),
        })
      );
    });

    test('should update product stock after order placement', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockResolvedValue([mockCartItem]);
      Order.create.mockResolvedValue(mockOrder);
      Product.findByIdAndUpdate.mockResolvedValue(mockProduct);
      CartItem.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(Product.findByIdAndUpdate).toHaveBeenCalled();
    });

    test('should clear user cart after order placement', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockResolvedValue([mockCartItem]);
      Order.create.mockResolvedValue(mockOrder);
      CartItem.deleteMany.mockResolvedValue({ deletedCount: 1 });

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(CartItem.deleteMany).toHaveBeenCalledWith({ user: 'user123' });
    });
  });

  // ==================== GET ORDER HISTORY TESTS ====================
  describe('getOrderHistory', () => {
    test('should retrieve user order history', async () => {
      // Arrange
      const orders = [mockOrder, { ...mockOrder, _id: 'order456' }];

      Order.find
        .mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue(orders),
        });

      // Act
      await getOrderHistory(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        orders,
        count: 2,
      });
      expect(Order.find).toHaveBeenCalledWith({ user: 'user123' });
    });

    test('should return empty array when no orders exist', async () => {
      // Arrange
      Order.find
        .mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          populate: jest.fn().mockResolvedValue([]),
        });

      // Act
      await getOrderHistory(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        orders: [],
        count: 0,
      });
    });

    test('should sort orders by most recent first', async () => {
      // Arrange
      const mockSort = jest.fn().mockReturnThis();
      Order.find.mockReturnValue({
        sort: mockSort,
        populate: jest.fn().mockResolvedValue([mockOrder]),
      });

      // Act
      await getOrderHistory(mockReq, mockRes);

      // Assert
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  // ==================== GET ORDER DETAILS TESTS ====================
  describe('getOrder', () => {
    test('should retrieve order details by ID', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };

      Order.findById
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrder),
        });

      // Act
      await getOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(mockOrder);
      expect(Order.findById).toHaveBeenCalledWith('order123');
    });

    test('should return error when order not found', async () => {
      // Arrange
      mockReq.params = { id: 'invalidId' };

      Order.findById
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        });

      // Act
      await getOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Order not found',
      });
    });

    test('should restrict order access to order owner', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };
      const otherUserOrder = { ...mockOrder, user: 'otherUser' };

      Order.findById
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(otherUserOrder),
        });

      // Act
      await getOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });
  });

  // ==================== CANCEL ORDER TESTS ====================
  describe('cancelOrder', () => {
    test('should successfully cancel pending order', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };

      const pendingOrder = { ...mockOrder, status: 'pending' };
      Order.findById.mockResolvedValue(pendingOrder);
      pendingOrder.save.mockResolvedValue(true);

      // Act
      await cancelOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Order cancelled successfully',
      });
      expect(pendingOrder.save).toHaveBeenCalled();
    });

    test('should return error when cancelling shipped order', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };

      const shippedOrder = { ...mockOrder, status: 'shipped' };
      Order.findById.mockResolvedValue(shippedOrder);

      // Act
      await cancelOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: expect.stringContaining('cannot be cancelled'),
      });
    });

    test('should restore stock when order is cancelled', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };

      const pendingOrder = { ...mockOrder, status: 'pending' };
      Order.findById.mockResolvedValue(pendingOrder);
      pendingOrder.save.mockResolvedValue(true);
      Product.findByIdAndUpdate.mockResolvedValue(mockProduct);

      // Act
      await cancelOrder(mockReq, mockRes);

      // Assert
      expect(Product.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  // ==================== UPDATE ORDER STATUS TESTS ====================
  describe('updateOrderStatus', () => {
    test('should update order status to processing', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };
      mockReq.body = { status: 'processing' };
      mockReq.user.role = 'admin';

      Order.findByIdAndUpdate.mockResolvedValue({
        ...mockOrder,
        status: 'processing',
      });

      // Act
      await updateOrderStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Order status updated',
        })
      );
    });

    test('should deny status update for non-admin users', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };
      mockReq.body = { status: 'processing' };
      mockReq.user.role = 'user';

      // Act
      await updateOrderStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });

    test('should validate order status', async () => {
      // Arrange
      mockReq.params = { id: 'order123' };
      mockReq.body = { status: 'invalid_status' };
      mockReq.user.role = 'admin';

      // Act
      await updateOrderStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== PAYMENT TESTS ====================
  describe('handlePaymentSuccess', () => {
    test('should update payment status on successful payment', async () => {
      // Arrange
      mockReq.body = {
        orderId: 'order123',
        transactionId: 'txn123',
      };

      const paidOrder = { ...mockOrder, paymentStatus: 'completed' };
      Order.findByIdAndUpdate.mockResolvedValue(paidOrder);

      // Act
      await handlePaymentSuccess(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Payment recorded successfully',
        })
      );
    });

    test('should handle payment failure', async () => {
      // Arrange
      mockReq.body = {
        orderId: 'order123',
        reason: 'Card declined',
      };

      const failedOrder = { ...mockOrder, paymentStatus: 'failed' };
      Order.findByIdAndUpdate.mockResolvedValue(failedOrder);

      // Act
      await handlePaymentFailure(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    test('should handle database errors', async () => {
      // Arrange
      mockReq.body = {
        shippingAddress: { address: '123 Main St', city: 'New York' },
        billingAddress: { address: '123 Main St', city: 'New York' },
      };

      CartItem.find.mockRejectedValue(new Error('Database error'));

      // Act
      await placeOrder(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });

    test('should handle missing user context', async () => {
      // Arrange
      mockReq.user = null;

      // Act
      await getOrderHistory(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
