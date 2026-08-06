/**
 * Admin Controller Unit Tests
 * Tests admin dashboard, user management, and sales reporting
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
  getDashboard,
  getUsers,
  blockUser,
  unblockUser,
  deleteUser,
  getSalesReport,
  getRevenueReport,
} from './adminController.js';

jest.mock('../models/User.js');
jest.mock('../models/Order.js');
jest.mock('../models/Product.js');

describe('Admin Controller', () => {
  let mockReq, mockRes, mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: { id: 'user123' },
      user: { _id: 'admin123', role: 'admin' },
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isBlocked: false,
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      deleteOne: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DASHBOARD TESTS ====================
  describe('getDashboard', () => {
    test('should return dashboard statistics', async () => {
      // Arrange
      User.countDocuments.mockResolvedValue(100);
      Order.countDocuments.mockResolvedValue(50);
      Order.aggregate.mockResolvedValue([
        { totalRevenue: 5000.00 },
      ]);
      Product.countDocuments.mockResolvedValue(200);

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalUsers: 100,
          totalOrders: 50,
          totalRevenue: 5000.00,
          totalProducts: 200,
        })
      );
    });

    test('should include recent orders in dashboard', async () => {
      // Arrange
      const recentOrders = [
        {
          _id: 'order1',
          totalAmount: 500,
          status: 'completed',
          createdAt: new Date(),
        },
      ];

      User.countDocuments.mockResolvedValue(100);
      Order.countDocuments.mockResolvedValue(50);
      Order.aggregate.mockResolvedValue([{ totalRevenue: 5000.00 }]);
      Product.countDocuments.mockResolvedValue(200);
      Order.find
        .mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue(recentOrders),
        });

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          recentOrders: expect.any(Array),
        })
      );
    });

    test('should handle zero statistics', async () => {
      // Arrange
      User.countDocuments.mockResolvedValue(0);
      Order.countDocuments.mockResolvedValue(0);
      Order.aggregate.mockResolvedValue([]);
      Product.countDocuments.mockResolvedValue(0);

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalUsers: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalProducts: 0,
        })
      );
    });
  });

  // ==================== GET USERS TESTS ====================
  describe('getUsers', () => {
    test('should retrieve all users with pagination', async () => {
      // Arrange
      mockReq.query = { page: '1', limit: '10' };

      const users = [mockUser, { ...mockUser, _id: 'user456' }];
      User.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue(users),
        });
      User.countDocuments.mockResolvedValue(2);

      // Act
      await getUsers(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        users,
        totalUsers: 2,
        totalPages: 1,
        currentPage: 1,
      });
    });

    test('should filter blocked users', async () => {
      // Arrange
      mockReq.query = { blocked: 'true', page: '1', limit: '10' };

      const blockedUser = { ...mockUser, isBlocked: true };
      User.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([blockedUser]),
        });
      User.countDocuments.mockResolvedValue(1);

      // Act
      await getUsers(mockReq, mockRes);

      // Assert
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isBlocked: true,
        })
      );
    });

    test('should search users by name or email', async () => {
      // Arrange
      mockReq.query = { search: 'test', page: '1', limit: '10' };

      User.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([mockUser]),
        });
      User.countDocuments.mockResolvedValue(1);

      // Act
      await getUsers(mockReq, mockRes);

      // Assert
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
    });

    test('should handle pagination correctly', async () => {
      // Arrange
      mockReq.query = { page: '2', limit: '5' };

      User.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        });
      User.countDocuments.mockResolvedValue(0);

      // Act
      await getUsers(mockReq, mockRes);

      // Assert
      expect(User.find().skip).toHaveBeenCalledWith(5); // (2-1) * 5
    });
  });

  // ==================== BLOCK USER TESTS ====================
  describe('blockUser', () => {
    test('should successfully block a user', async () => {
      // Arrange
      mockReq.params = { id: 'user123' };

      const blockedUser = { ...mockUser, isBlocked: true };
      User.findByIdAndUpdate.mockResolvedValue(blockedUser);

      // Act
      await blockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User blocked successfully',
        user: blockedUser,
      });
      expect(User.findByIdAndUpdate).toHaveBeenCalled();
    });

    test('should return error when user not found', async () => {
      // Arrange
      mockReq.params = { id: 'invalidId' };

      User.findByIdAndUpdate.mockResolvedValue(null);

      // Act
      await blockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    test('should not allow blocking admin users', async () => {
      // Arrange
      mockReq.params = { id: 'admin123' };

      const adminUser = { ...mockUser, role: 'admin' };
      User.findById.mockResolvedValue(adminUser);

      // Act
      await blockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Cannot block admin users',
      });
    });
  });

  // ==================== UNBLOCK USER TESTS ====================
  describe('unblockUser', () => {
    test('should successfully unblock a blocked user', async () => {
      // Arrange
      mockReq.params = { id: 'user123' };

      const unblockedUser = { ...mockUser, isBlocked: false };
      User.findByIdAndUpdate.mockResolvedValue(unblockedUser);

      // Act
      await unblockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User unblocked successfully',
        user: unblockedUser,
      });
    });

    test('should return error when user not found', async () => {
      // Arrange
      mockReq.params = { id: 'invalidId' };

      User.findByIdAndUpdate.mockResolvedValue(null);

      // Act
      await unblockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // ==================== DELETE USER TESTS ====================
  describe('deleteUser', () => {
    test('should successfully delete a user', async () => {
      // Arrange
      mockReq.params = { id: 'user123' };

      User.findByIdAndDelete.mockResolvedValue(mockUser);

      // Act
      await deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      });
      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user123');
    });

    test('should return error when user not found', async () => {
      // Arrange
      mockReq.params = { id: 'invalidId' };

      User.findByIdAndDelete.mockResolvedValue(null);

      // Act
      await deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    test('should not allow deleting admin users', async () => {
      // Arrange
      mockReq.params = { id: 'admin123' };

      const adminUser = { ...mockUser, role: 'admin' };
      User.findById.mockResolvedValue(adminUser);

      // Act
      await deleteUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Cannot delete admin users',
      });
    });
  });

  // ==================== SALES REPORT TESTS ====================
  describe('getSalesReport', () => {
    test('should return sales report with date range', async () => {
      // Arrange
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const salesData = [
        { _id: '2024-01-01', totalSales: 1000, orderCount: 5 },
      ];

      Order.aggregate.mockResolvedValue(salesData);

      // Act
      await getSalesReport(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        report: expect.any(Array),
        totalSales: expect.any(Number),
      });
    });

    test('should default to last 30 days if no date range provided', async () => {
      // Arrange
      mockReq.query = {};

      const salesData = [];
      Order.aggregate.mockResolvedValue(salesData);

      // Act
      await getSalesReport(mockReq, mockRes);

      // Assert
      expect(Order.aggregate).toHaveBeenCalled();
    });

    test('should handle invalid date range', async () => {
      // Arrange
      mockReq.query = {
        startDate: 'invalid',
        endDate: '2024-01-31',
      };

      // Act
      await getSalesReport(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ==================== REVENUE REPORT TESTS ====================
  describe('getRevenueReport', () => {
    test('should return revenue report by product', async () => {
      // Arrange
      const revenueData = [
        {
          productId: 'product1',
          productName: 'Gold Necklace',
          revenue: 5000,
          unitsSold: 10,
        },
      ];

      Order.aggregate.mockResolvedValue(revenueData);

      // Act
      await getRevenueReport(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        report: revenueData,
        totalRevenue: expect.any(Number),
      });
    });

    test('should return revenue report by category', async () => {
      // Arrange
      mockReq.query = { groupBy: 'category' };

      const revenueData = [
        {
          category: 'necklaces',
          revenue: 5000,
          unitsSold: 10,
        },
      ];

      Order.aggregate.mockResolvedValue(revenueData);

      // Act
      await getRevenueReport(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== AUTHORIZATION TESTS ====================
  describe('Authorization', () => {
    test('should deny access to non-admin users', async () => {
      // Arrange
      mockReq.user = { _id: 'user123', role: 'user' };

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });

    test('should only allow admin role for user management', async () => {
      // Arrange
      mockReq.user = { _id: 'user123', role: 'moderator' };

      // Act
      await blockUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    test('should handle database errors', async () => {
      // Arrange
      User.countDocuments.mockRejectedValue(new Error('Database error'));

      // Act
      await getDashboard(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });

    test('should handle aggregation pipeline errors', async () => {
      // Arrange
      Order.aggregate.mockRejectedValue(new Error('Aggregation error'));

      // Act
      await getSalesReport(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
