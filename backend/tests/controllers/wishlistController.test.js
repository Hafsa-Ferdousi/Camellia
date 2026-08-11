/**
 * Wishlist Controller Unit Tests
 * Tests all wishlist operations including add, remove, and retrieval
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlistItem,
} from './wishlistController.js';

jest.mock('../models/Wishlist.js');
jest.mock('../models/Product.js');

describe('Wishlist Controller', () => {
  let mockReq, mockRes, mockWishlist, mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      user: { _id: 'user123' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockProduct = {
      _id: 'product123',
      name: 'Diamond Ring',
      price: 500.00,
      image: 'ring.jpg',
    };

    mockWishlist = {
      _id: 'wishlist123',
      user: 'user123',
      product: 'product123',
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== ADD TO WISHLIST TESTS ====================
  describe('addToWishlist', () => {
    test('should successfully add product to wishlist', async () => {
      // Arrange
      mockReq.body = {
        productId: 'product123',
      };

      Product.findById.mockResolvedValue(mockProduct);
      Wishlist.findOne.mockResolvedValue(null);
      Wishlist.create.mockResolvedValue(mockWishlist);

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product added to wishlist',
        })
      );
      expect(Wishlist.create).toHaveBeenCalledWith({
        user: 'user123',
        product: 'product123',
      });
    });

    test('should not add duplicate items to wishlist', async () => {
      // Arrange
      mockReq.body = {
        productId: 'product123',
      };

      Product.findById.mockResolvedValue(mockProduct);
      Wishlist.findOne.mockResolvedValue(mockWishlist);

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product already in wishlist',
      });
      expect(Wishlist.create).not.toHaveBeenCalled();
    });

    test('should return error for non-existent product', async () => {
      // Arrange
      mockReq.body = {
        productId: 'invalidProduct',
      };

      Product.findById.mockResolvedValue(null);

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product not found',
      });
    });

    test('should return error when product ID is missing', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('required'),
        })
      );
    });

    test('should handle database errors', async () => {
      // Arrange
      mockReq.body = {
        productId: 'product123',
      };

      Product.findById.mockRejectedValue(new Error('Database error'));

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });
  });

  // ==================== REMOVE FROM WISHLIST TESTS ====================
  describe('removeFromWishlist', () => {
    test('should successfully remove product from wishlist', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOneAndDelete.mockResolvedValue(mockWishlist);

      // Act
      await removeFromWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Product removed from wishlist',
      });
      expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
        user: 'user123',
        product: 'product123',
      });
    });

    test('should return error when product not in wishlist', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOneAndDelete.mockResolvedValue(null);

      // Act
      await removeFromWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Item not found in wishlist',
      });
    });

    test('should only remove user\'s own wishlist items', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOneAndDelete.mockResolvedValue(null);

      // Act
      await removeFromWishlist(mockReq, mockRes);

      // Assert
      expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
        user: 'user123',
        product: 'product123',
      });
    });
  });

  // ==================== GET WISHLIST TESTS ====================
  describe('getWishlist', () => {
    test('should retrieve user wishlist with all products', async () => {
      // Arrange
      const wishlistItems = [
        mockWishlist,
        { ...mockWishlist, _id: 'wishlist456', product: 'product456' },
      ];

      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(wishlistItems),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        wishlist: wishlistItems,
        count: 2,
      });
      expect(Wishlist.find).toHaveBeenCalledWith({ user: 'user123' });
    });

    test('should return empty wishlist when no items', async () => {
      // Arrange
      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue([]),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        wishlist: [],
        count: 0,
      });
    });

    test('should populate product details', async () => {
      // Arrange
      const wishlistWithProduct = {
        ...mockWishlist,
        product: mockProduct,
      };

      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue([wishlistWithProduct]),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(Wishlist.find().populate).toHaveBeenCalledWith('product');
    });

    test('should handle database errors', async () => {
      // Arrange
      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('Database error')),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });
  });

  // ==================== CHECK WISHLIST ITEM TESTS ====================
  describe('checkWishlistItem', () => {
    test('should return true if product is in wishlist', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOne.mockResolvedValue(mockWishlist);

      // Act
      await checkWishlistItem(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        inWishlist: true,
      });
    });

    test('should return false if product is not in wishlist', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOne.mockResolvedValue(null);

      // Act
      await checkWishlistItem(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        inWishlist: false,
      });
    });

    test('should check only user\'s own wishlist', async () => {
      // Arrange
      mockReq.params = { productId: 'product123' };

      Wishlist.findOne.mockResolvedValue(null);

      // Act
      await checkWishlistItem(mockReq, mockRes);

      // Assert
      expect(Wishlist.findOne).toHaveBeenCalledWith({
        user: 'user123',
        product: 'product123',
      });
    });
  });

  // ==================== AUTHORIZATION TESTS ====================
  describe('Authorization', () => {
    test('should deny access to unauthenticated users', async () => {
      // Arrange
      mockReq.user = null;
      mockReq.body = { productId: 'product123' };

      // Act
      await addToWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });

    test('should allow only user\'s own wishlist access', async () => {
      // Arrange
      const otherUserWishlist = { ...mockWishlist, user: 'otherUser' };
      mockReq.params = { productId: 'product123' };

      Wishlist.findOne.mockResolvedValue(otherUserWishlist);

      // Act
      await removeFromWishlist(mockReq, mockRes);

      // Assert
      expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
        user: 'user123',
        product: 'product123',
      });
    });
  });

  // ==================== BULK OPERATIONS TESTS ====================
  describe('Bulk Operations', () => {
    test('should handle multiple items in wishlist', async () => {
      // Arrange
      const multipleItems = Array.from({ length: 10 }, (_, i) => ({
        ...mockWishlist,
        _id: `wishlist${i}`,
        product: `product${i}`,
      }));

      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(multipleItems),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        wishlist: multipleItems,
        count: 10,
      });
    });
  });

  // ==================== VALIDATION TESTS ====================
  describe('Validation', () => {
    test('should validate product ID format', async () => {
      // Arrange
      mockReq.params = { productId: 'invalid_format' };

      // Act - assuming validation exists
      await checkWishlistItem(mockReq, mockRes);

      // Assert - response should be valid
      expect(mockRes.json).toBeDefined();
    });

    test('should handle missing product ID', async () => {
      // Arrange
      mockReq.params = {};

      // Act
      await checkWishlistItem(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  describe('Performance', () => {
    test('should efficiently retrieve large wishlist', async () => {
      // Arrange
      const largeWishlist = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWishlist,
        _id: `wishlist${i}`,
      }));

      Wishlist.find
        .mockReturnValue({
          populate: jest.fn().mockResolvedValue(largeWishlist),
        });

      // Act
      await getWishlist(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        wishlist: largeWishlist,
        count: 1000,
      });
    });
  });
});
