/**
 * Contact and Settings Controller Unit Tests
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Contact from '../models/Contact.js';
import Setting from '../models/Setting.js';
import { sendContactEmail } from '../utils/mailer.js';
import {
  submitContactForm,
  getContacts,
  deleteContact,
  getSettings,
  updateSettings,
} from './contactController.js';
import { getAppSettings, updateAppSettings } from './settingsController.js';

jest.mock('../models/Contact.js');
jest.mock('../models/Setting.js');
jest.mock('../utils/mailer.js');

describe('Contact Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: { id: 'contact123' },
      user: { _id: 'admin123', role: 'admin' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== SUBMIT CONTACT FORM TESTS ====================
  describe('submitContactForm', () => {
    test('should successfully submit contact form', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Inquiry about products',
        message: 'I would like to know more about your jewelry',
        phone: '1234567890',
      };

      Contact.create.mockResolvedValue({
        _id: 'contact123',
        ...mockReq.body,
      });
      sendContactEmail.mockResolvedValue(true);

      // Act
      await submitContactForm(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Contact form submitted successfully',
      });
      expect(Contact.create).toHaveBeenCalled();
      expect(sendContactEmail).toHaveBeenCalled();
    });

    test('should return error when required fields are missing', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        // Missing subject and message
      };

      // Act
      await submitContactForm(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('required'),
        })
      );
    });

    test('should validate email format', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'invalid-email',
        subject: 'Inquiry',
        message: 'Message',
      };

      // Act
      await submitContactForm(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('email'),
        })
      );
    });

    test('should validate message length', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Inquiry',
        message: 'Too short', // Assuming minimum length
      };

      // Act
      await submitContactForm(mockReq, mockRes);

      // Assert - depends on validation rules
    });

    test('should handle email sending errors', async () => {
      // Arrange
      mockReq.body = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Inquiry',
        message: 'I would like to know more about your products',
      };

      Contact.create.mockResolvedValue({
        _id: 'contact123',
        ...mockReq.body,
      });
      sendContactEmail.mockRejectedValue(new Error('Email service error'));

      // Act
      await submitContactForm(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  // ==================== GET CONTACTS TESTS ====================
  describe('getContacts', () => {
    test('should retrieve all contacts with pagination', async () => {
      // Arrange
      mockReq.query = { page: '1', limit: '10' };

      const contacts = [
        {
          _id: 'contact1',
          name: 'John Doe',
          email: 'john@example.com',
          subject: 'Inquiry',
          message: 'Message',
          status: 'new',
        },
      ];

      Contact.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue(contacts),
        });
      Contact.countDocuments.mockResolvedValue(1);

      // Act
      await getContacts(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        contacts,
        totalContacts: 1,
        totalPages: 1,
      });
    });

    test('should deny access to non-admin users', async () => {
      // Arrange
      mockReq.user = { _id: 'user123', role: 'user' };

      // Act
      await getContacts(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });

    test('should filter contacts by status', async () => {
      // Arrange
      mockReq.query = { status: 'new', page: '1', limit: '10' };

      const newContacts = [];
      Contact.find
        .mockReturnValue({
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue(newContacts),
        });
      Contact.countDocuments.mockResolvedValue(0);

      // Act
      await getContacts(mockReq, mockRes);

      // Assert
      expect(Contact.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
        })
      );
    });
  });

  // ==================== DELETE CONTACT TESTS ====================
  describe('deleteContact', () => {
    test('should delete contact message', async () => {
      // Arrange
      mockReq.params = { id: 'contact123' };

      Contact.findByIdAndDelete.mockResolvedValue({
        _id: 'contact123',
        name: 'John Doe',
      });

      // Act
      await deleteContact(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Contact deleted successfully',
      });
      expect(Contact.findByIdAndDelete).toHaveBeenCalledWith('contact123');
    });

    test('should return error when contact not found', async () => {
      // Arrange
      mockReq.params = { id: 'invalidId' };

      Contact.findByIdAndDelete.mockResolvedValue(null);

      // Act
      await deleteContact(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Contact not found',
      });
    });
  });
});

describe('Settings Controller', () => {
  let mockReq, mockRes, mockSettings;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      user: { _id: 'admin123', role: 'admin' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockSettings = {
      _id: 'settings123',
      storeName: 'Camellia Jewelry',
      storeEmail: 'info@camellia.com',
      storeLogo: 'logo.png',
      currency: 'USD',
      shippingCost: 5.00,
      taxRate: 0.1,
      maintenanceMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== GET SETTINGS TESTS ====================
  describe('getAppSettings', () => {
    test('should retrieve application settings', async () => {
      // Arrange
      Setting.findOne.mockResolvedValue(mockSettings);

      // Act
      await getAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(mockSettings);
      expect(Setting.findOne).toHaveBeenCalled();
    });

    test('should return default settings if none exist', async () => {
      // Arrange
      Setting.findOne.mockResolvedValue(null);
      const defaultSettings = {
        storeName: 'Camellia',
        currency: 'USD',
        taxRate: 0,
      };

      Setting.create.mockResolvedValue(defaultSettings);

      // Act
      await getAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== UPDATE SETTINGS TESTS ====================
  describe('updateAppSettings', () => {
    test('should update application settings', async () => {
      // Arrange
      mockReq.body = {
        storeName: 'Updated Camellia Jewelry',
        storeEmail: 'newemail@camellia.com',
        taxRate: 0.15,
      };

      const updatedSettings = { ...mockSettings, ...mockReq.body };
      Setting.findOneAndUpdate.mockResolvedValue(updatedSettings);

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Settings updated successfully',
        })
      );
      expect(Setting.findOneAndUpdate).toHaveBeenCalled();
    });

    test('should deny access to non-admin users', async () => {
      // Arrange
      mockReq.user = { _id: 'user123', role: 'user' };
      mockReq.body = { storeName: 'Updated Name' };

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Unauthorized access',
      });
    });

    test('should validate email format', async () => {
      // Arrange
      mockReq.body = {
        storeEmail: 'invalid-email',
      };

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('email'),
        })
      );
    });

    test('should validate tax rate range', async () => {
      // Arrange
      mockReq.body = {
        taxRate: 1.5, // Invalid: > 1
      };

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should validate shipping cost', async () => {
      // Arrange
      mockReq.body = {
        shippingCost: -10.00,
      };

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('should allow partial updates', async () => {
      // Arrange
      mockReq.body = {
        storeName: 'Updated Name',
      };

      const updatedSettings = { ...mockSettings, ...mockReq.body };
      Setting.findOneAndUpdate.mockResolvedValue(updatedSettings);

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(Setting.findOneAndUpdate).toHaveBeenCalledWith(
        {},
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should handle maintenance mode toggle', async () => {
      // Arrange
      mockReq.body = {
        maintenanceMode: true,
      };

      const updatedSettings = { ...mockSettings, maintenanceMode: true };
      Setting.findOneAndUpdate.mockResolvedValue(updatedSettings);

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    test('should handle database errors in get settings', async () => {
      // Arrange
      Setting.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      await getAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });

    test('should handle database errors in update settings', async () => {
      // Arrange
      mockReq.body = { storeName: 'Updated' };

      Setting.findOneAndUpdate.mockRejectedValue(new Error('Database error'));

      // Act
      await updateAppSettings(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Database error',
      });
    });
  });
});
