

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import CartItem from '../../models/CartItem.js';
import Wishlist from '../../models/Wishlist.js';
import Review from '../../models/Review.js';
import {
  registerUser,
  loginUser,
  verifyTwoFactorLogin,
  refreshAccessToken,
  logout,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  getMe,
  deleteAccount,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  verifyEmailOtp,
  resendEmailOtp,
} from './authController.js';
import { sendVerificationOtpEmail } from '../utils/mailer.js';
import * as tokenUtils from '../utils/tokens.js';
import * as otpUtils from '../utils/otp.js';

// Mock dependencies
jest.mock('../../models/User.js');
jest.mock('../../models/CartItem.js');
jest.mock('../../models/Wishlist.js');
jest.mock('../../models/Review.js');

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('speakeasy');
jest.mock('qrcode');

describe('Auth Controller', () => {
  let mockReq, mockRes, mockUser;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      body: {},
      headers: { 'user-agent': 'test-agent' },
      cookies: {},
      user: { _id: 'user123' },
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    // Setup mock user
    mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedPassword',
      phone: '1234567890',
      role: 'user',
      twoFactorEnabled: false,
      isEmailVerified: true,
      preferredLanguage: 'en',
      refreshTokens: [],
      isLocked: jest.fn().mockReturnValue(false),
      matchPassword: jest.fn(),
      registerFailedLogin: jest.fn(),
      resetLoginAttempts: jest.fn(),
      save: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== REGISTER USER TESTS ====================
  describe('registerUser', () => {
    test('should successfully register a new user', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPass123!',
        phone: '9876543210',
        securityQuestion: 'What is your pet name?',
        securityAnswer: 'Fluffy',
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedAnswer');
      jest.spyOn(otpUtils, 'generateOtp').mockReturnValue('123456');
      jest.spyOn(otpUtils, 'hashOtp').mockResolvedValue('hashedOtp');
      sendVerificationOtpEmail.mockResolvedValue(true);

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account created. Check your email for a verification code.',
          email: 'new@example.com',
        })
      );
      expect(User.create).toHaveBeenCalled();
      expect(sendVerificationOtpEmail).toHaveBeenCalledWith('new@example.com', '123456');
    });

    test('should return error when user already exists with same email', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        name: 'New User',
        email: 'existing@example.com',
        password: 'StrongPass123!',
        phone: '9876543210',
        securityQuestion: 'What is your pet name?',
        securityAnswer: 'Fluffy',
      };

      User.findOne.mockResolvedValue(mockUser);

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User with this email or username already exists',
      });
    });

    test('should return error when password is weak', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        name: 'New User',
        email: 'new@example.com',
        password: 'weak',
        phone: '9876543210',
        securityQuestion: 'What is your pet name?',
        securityAnswer: 'Fluffy',
      };

      User.findOne.mockResolvedValue(null);

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('should return error when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        email: 'new@example.com',
        // Missing name, password, and other fields
      };

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Username, name, email, password, security question and answer are required.',
      });
    });

    test('should return error for invalid security question', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPass123!',
        phone: '9876543210',
        securityQuestion: 'Invalid Question?',
        securityAnswer: 'Answer',
      };

      User.findOne.mockResolvedValue(null);

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Please choose a valid security question.',
      });
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      mockReq.body = {
        username: 'newuser',
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPass123!',
        phone: '9876543210',
        securityQuestion: 'What is your pet name?',
        securityAnswer: 'Fluffy',
      };

      User.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      await registerUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });
  });

  // ==================== LOGIN USER TESTS ====================
  describe('loginUser', () => {
    test('should successfully login user with valid credentials', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      mockUser.matchPassword.mockResolvedValue(true);
      mockUser.isEmailVerified = true;
      User.findOne.mockResolvedValue(mockUser);
      jest.spyOn(tokenUtils, 'generateAccessToken').mockReturnValue('accessToken123');
      jest.spyOn(tokenUtils, 'generateRawToken').mockReturnValue('rawRefreshToken');
      jest.spyOn(tokenUtils, 'hashToken').mockReturnValue('hashedRefresh');

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'user123',
          email: 'test@example.com',
          token: 'accessToken123',
        })
      );
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should return error for invalid credentials', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      mockUser.matchPassword.mockResolvedValue(false);
      mockUser.registerFailedLogin.mockResolvedValue(true);
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    test('should return error when user does not exist', async () => {
      // Arrange
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      User.findOne.mockResolvedValue(null);

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid credentials',
      });
    });

    test('should return error when user account is locked', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'password',
      };

      mockUser.isLocked.mockReturnValue(true);
      mockUser.lockUntil = new Date(Date.now() + 300000); // 5 minutes from now
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(423);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Account temporarily locked'),
        })
      );
    });

    test('should return error when email is not verified', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      mockUser.matchPassword.mockResolvedValue(true);
      mockUser.isEmailVerified = false;
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
        email: 'test@example.com',
      });
    });

    test('should require 2FA when enabled', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        password: 'correctPassword',
      };

      mockUser.matchPassword.mockResolvedValue(true);
      mockUser.isEmailVerified = true;
      mockUser.twoFactorEnabled = true;
      User.findOne.mockResolvedValue(mockUser);
      jest.spyOn(tokenUtils, 'generateTwoFactorTempToken').mockReturnValue('2faTempToken');

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        twoFactorRequired: true,
        tempToken: '2faTempToken',
      });
    });

    test('should return error when email/username is missing', async () => {
      // Arrange
      mockReq.body = {
        password: 'password',
      };

      // Act
      await loginUser(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email/username and password are required.',
      });
    });
  });

  // ==================== VERIFY 2FA TESTS ====================
  describe('verifyTwoFactorLogin', () => {
    test('should successfully verify 2FA code and login', async () => {
      // Arrange
      mockReq.body = {
        tempToken: 'validTempToken',
        code: '123456',
      };

      const decoded = { id: 'user123', type: '2fa_pending' };
      jwt.verify.mockReturnValue(decoded);
      mockUser.twoFactorEnabled = true;
      User.findById.mockResolvedValue(mockUser);
      jest.spyOn(tokenUtils, 'generateAccessToken').mockReturnValue('accessToken123');
      jest.spyOn(tokenUtils, 'generateRawToken').mockReturnValue('rawRefreshToken');
      jest.spyOn(tokenUtils, 'hashToken').mockReturnValue('hashedRefresh');

      // Mock speakeasy
      jest.doMock('speakeasy', () => ({
        totp: { verify: jest.fn().mockReturnValue(true) },
      }));

      // Act
      await verifyTwoFactorLogin(mockReq, mockRes);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('validTempToken', process.env.JWT_SECRET);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'accessToken123',
        })
      );
    });

    test('should return error for invalid temp token', async () => {
      // Arrange
      mockReq.body = {
        tempToken: 'invalidTempToken',
        code: '123456',
      };

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      await verifyTwoFactorLogin(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: '2FA session expired. Please log in again.',
      });
    });

    test('should return error when temp token does not have 2fa_pending type', async () => {
      // Arrange
      mockReq.body = {
        tempToken: 'wrongTypeTempToken',
        code: '123456',
      };

      jwt.verify.mockReturnValue({ id: 'user123', type: 'access' });

      // Act
      await verifyTwoFactorLogin(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid 2FA session.',
      });
    });

    test('should return error when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        tempToken: 'token',
        // Missing code
      };

      // Act
      await verifyTwoFactorLogin(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Temp token and code are required.',
      });
    });
  });

  // ==================== GET ME TESTS ====================
  describe('getMe', () => {
    test('should return current user profile', async () => {
      // Arrange
      mockReq.user = mockUser;

      // Act
      await getMe(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
        })
      );
    });

    test('should not include sensitive fields in response', async () => {
      // Arrange
      mockReq.user = mockUser;

      // Act
      await getMe(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
      const responseData = mockRes.json.mock.calls[0][0];
      expect(responseData).not.toHaveProperty('password');
      expect(responseData).not.toHaveProperty('refreshTokens');
    });
  });

  // ==================== DELETE ACCOUNT TESTS ====================
  describe('deleteAccount', () => {
    test('should successfully delete account with correct password', async () => {
      // Arrange
      mockReq.body = {
        password: 'correctPassword',
      };

      mockUser.matchPassword.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUser);
      CartItem.deleteMany.mockResolvedValue({ deletedCount: 1 });
      Wishlist.deleteMany.mockResolvedValue({ deletedCount: 1 });
      Review.deleteMany.mockResolvedValue({ deletedCount: 1 });
      mockUser.deleteOne.mockResolvedValue(true);

      // Act
      await deleteAccount(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Your account has been deleted.',
      });
      expect(mockUser.deleteOne).toHaveBeenCalled();
      expect(CartItem.deleteMany).toHaveBeenCalledWith({ user: 'user123' });
      expect(Wishlist.deleteMany).toHaveBeenCalledWith({ user: 'user123' });
      expect(Review.deleteMany).toHaveBeenCalledWith({ user: 'user123' });
      expect(mockRes.clearCookie).toHaveBeenCalled();
    });

    test('should return error when password is incorrect', async () => {
      // Arrange
      mockReq.body = {
        password: 'wrongPassword',
      };

      mockUser.matchPassword.mockResolvedValue(false);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await deleteAccount(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Incorrect password.',
      });
      expect(mockUser.deleteOne).not.toHaveBeenCalled();
    });
  });

  // ==================== EMAIL OTP VERIFICATION TESTS ====================
  describe('verifyEmailOtp', () => {
    test('should successfully verify email OTP', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        otp: '123456',
      };

      const otpUser = {
        ...mockUser,
        isEmailVerified: false,
        emailOtpExpiry: new Date(Date.now() + 600000),
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne.mockResolvedValue(otpUser);
      jest.spyOn(otpUtils, 'compareOtp').mockResolvedValue(true);

      // Act
      await verifyEmailOtp(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email verified. You can now log in.',
      });
      expect(otpUser.save).toHaveBeenCalled();
    });

    test('should return error when OTP is expired', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        otp: '123456',
      };

      const otpUser = {
        ...mockUser,
        isEmailVerified: false,
        emailOtpExpiry: new Date(Date.now() - 1000), // Expired
      };

      User.findOne.mockResolvedValue(otpUser);

      // Act
      await verifyEmailOtp(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'This code has expired. Please request a new one.',
      });
    });

    test('should return error for invalid OTP', async () => {
      // Arrange
      mockReq.body = {
        email: 'test@example.com',
        otp: 'wrongOtp',
      };

      const otpUser = {
        ...mockUser,
        isEmailVerified: false,
        emailOtpExpiry: new Date(Date.now() + 600000),
      };

      User.findOne.mockResolvedValue(otpUser);
      jest.spyOn(otpUtils, 'compareOtp').mockResolvedValue(false);

      // Act
      await verifyEmailOtp(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid or incorrect code.',
      });
    });
  });

  // ==================== SECURITY QUESTION TESTS ====================
  describe('getSecurityQuestion', () => {
    test('should return security question for existing user', async () => {
      // Arrange
      mockReq.body = {
        identifier: 'test@example.com',
      };

      mockUser.securityQuestion = 'What is your pet name?';
      User.findOne.mockResolvedValue(mockUser);

      // Act
      await getSecurityQuestion(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        question: 'What is your pet name?',
      });
    });

    test('should return error when identifier is missing', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await getSecurityQuestion(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email or username is required.',
      });
    });
  });

  // ==================== SETUP 2FA TESTS ====================
  describe('setupTwoFactor', () => {
    test('should generate 2FA setup QR code', async () => {
      // Arrange
      mockUser.twoFactorEnabled = false;
      User.findById.mockResolvedValue(mockUser);

      // Mock speakeasy and qrcode
      jest.doMock('speakeasy', () => ({
        generateSecret: jest.fn().mockReturnValue({
          base32: 'secretBase32',
          otpauth_url: 'otpauth://...',
        }),
      }));

      jest.doMock('qrcode', () => ({
        toDataURL: jest.fn().mockResolvedValue('data:image/png;...'),
      }));

      // Act
      await setupTwoFactor(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          qrCodeDataUrl: expect.any(String),
          secret: expect.any(String),
        })
      );
    });

    test('should return error when 2FA is already enabled', async () => {
      // Arrange
      mockUser.twoFactorEnabled = true;
      User.findById.mockResolvedValue(mockUser);

      // Act
      await setupTwoFactor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Two-factor authentication is already enabled.',
      });
    });
  });

  // ==================== DISABLE 2FA TESTS ====================
  describe('disableTwoFactor', () => {
    test('should successfully disable 2FA with correct password', async () => {
      // Arrange
      mockReq.body = {
        password: 'correctPassword',
      };

      mockUser.matchPassword.mockResolvedValue(true);
      mockUser.twoFactorEnabled = true;
      User.findById.mockResolvedValue(mockUser);

      // Act
      await disableTwoFactor(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Two-factor authentication disabled.',
      });
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should return error for incorrect password', async () => {
      // Arrange
      mockReq.body = {
        password: 'wrongPassword',
      };

      mockUser.matchPassword.mockResolvedValue(false);
      User.findById.mockResolvedValue(mockUser);

      // Act
      await disableTwoFactor(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Incorrect password.',
      });
    });
  });

  // ==================== REFRESH TOKEN TESTS ====================
  describe('refreshAccessToken', () => {
    test('should successfully refresh access token', async () => {
      // Arrange
      mockReq.cookies = {
        refreshToken: 'validRefreshToken',
      };

      jest.spyOn(tokenUtils, 'hashToken').mockReturnValue('hashedRefresh');
      jest.spyOn(tokenUtils, 'generateRawToken').mockReturnValue('newRawRefresh');
      jest.spyOn(tokenUtils, 'generateAccessToken').mockReturnValue('newAccessToken');

      mockUser.refreshTokens = [
        {
          tokenHash: 'hashedRefresh',
          expiresAt: new Date(Date.now() + 600000),
        },
      ];

      User.findOne.mockResolvedValue(mockUser);

      // Act
      await refreshAccessToken(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'newAccessToken',
        })
      );
      expect(mockRes.cookie).toHaveBeenCalled();
    });

    test('should return error when refresh token is missing', async () => {
      // Arrange
      mockReq.cookies = {};

      // Act
      await refreshAccessToken(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No refresh token.',
      });
    });
  });
});
