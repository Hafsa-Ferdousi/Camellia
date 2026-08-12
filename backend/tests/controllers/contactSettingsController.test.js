/**
 * Contact and Settings Controller Unit Tests
 */
import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

// =========================================================
// MOCK MODELS
// =========================================================

jest.unstable_mockModule("../../models/Contact.js", () => ({
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Setting.js", () => ({
  default: {
    getSingleton: jest.fn(),
  },
}));

// =========================================================
// MOCK MAILER
// =========================================================

jest.unstable_mockModule("../../utils/mailer.js", () => ({
  sendContactReplyEmail: jest.fn(),
}));

// =========================================================
// IMPORT AFTER MOCKS
// =========================================================

const { default: Contact } = await import("../../models/Contact.js");

const { default: Setting } = await import("../../models/Setting.js");

const { sendContactReplyEmail } =
  await import("../../utils/mailer.js");

const {
  sendMessage,
  getMessages,
  updateMessageStatus,
  replyToMessage,
  deleteMessage,
} = await import("../../controllers/contactController.js");

const { getPublicPricing } =
  await import("../../controllers/settingsController.js");

// =========================================================
// CONTACT CONTROLLER TESTS
// =========================================================

describe("Contact Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      params: {
        id: "contact123",
      },
      user: {
        _id: "admin123",
        role: "admin",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =======================================================
  // sendMessage
  // =======================================================

  describe("sendMessage", () => {
    test("should successfully send a contact message", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        message:
          "I would like to know more about your products.",
      };

      const createdContact = {
        _id: "contact123",
        ...req.body,
      };

      Contact.create.mockResolvedValue(createdContact);

      await sendMessage(req, res);

      expect(Contact.create).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        message:
          "I would like to know more about your products.",
      });

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        message:
          "Your message has been sent successfully! We will get back to you soon.",
        contact: createdContact,
      });
    });

    test("should return 400 when name is missing", async () => {
      req.body = {
        email: "john@example.com",
        message: "This is a valid message.",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Name, email and message are required.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should return 400 when email is missing", async () => {
      req.body = {
        name: "John Doe",
        message: "This is a valid message.",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Name, email and message are required.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should return 400 when message is missing", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Name, email and message are required.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should reject invalid email format", async () => {
      req.body = {
        name: "John Doe",
        email: "invalid-email",
        message: "This is a valid message.",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Please enter a valid email address.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should reject message shorter than 10 characters", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        message: "Too short",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Message must be at least 10 characters.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should reject whitespace-only short message", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        message: "         ",
      };

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Message must be at least 10 characters.",
      });

      expect(Contact.create).not.toHaveBeenCalled();
    });

    test("should handle database errors", async () => {
      req.body = {
        name: "John Doe",
        email: "john@example.com",
        message:
          "This is a valid contact message.",
      };

      Contact.create.mockRejectedValue(
        new Error("Database error")
      );

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message:
          "Failed to send message. Please try again.",
      });
    });
  });

  // =======================================================
  // getMessages
  // =======================================================

  describe("getMessages", () => {
    test("should retrieve all messages", async () => {
      const messages = [
        {
          _id: "contact1",
          name: "John Doe",
          email: "john@example.com",
          message: "Hello there.",
          status: "unread",
        },
        {
          _id: "contact2",
          name: "Jane Doe",
          email: "jane@example.com",
          message: "Need some information.",
          status: "read",
        },
      ];

      const sortMock = jest.fn().mockResolvedValue(messages);

      Contact.find.mockReturnValue({
        sort: sortMock,
      });

      await getMessages(req, res);

      expect(Contact.find).toHaveBeenCalledWith();

      expect(sortMock).toHaveBeenCalledWith({
        createdAt: -1,
      });

      expect(res.json).toHaveBeenCalledWith(messages);
    });

    test("should return empty array when there are no messages", async () => {
      const sortMock = jest.fn().mockResolvedValue([]);

      Contact.find.mockReturnValue({
        sort: sortMock,
      });

      await getMessages(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should handle database errors", async () => {
      const sortMock = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      Contact.find.mockReturnValue({
        sort: sortMock,
      });

      await getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to fetch messages.",
      });
    });
  });

  // =======================================================
  // updateMessageStatus
  // =======================================================

  describe("updateMessageStatus", () => {
    test("should update status to unread", async () => {
      req.body = {
        status: "unread",
      };

      const updatedContact = {
        _id: "contact123",
        status: "unread",
      };

      Contact.findByIdAndUpdate.mockResolvedValue(
        updatedContact
      );

      await updateMessageStatus(req, res);

      expect(
        Contact.findByIdAndUpdate
      ).toHaveBeenCalledWith(
        "contact123",
        {
          status: "unread",
        },
        {
          new: true,
        }
      );

      expect(res.json).toHaveBeenCalledWith(
        updatedContact
      );
    });

    test("should update status to read", async () => {
      req.body = {
        status: "read",
      };

      const updatedContact = {
        _id: "contact123",
        status: "read",
      };

      Contact.findByIdAndUpdate.mockResolvedValue(
        updatedContact
      );

      await updateMessageStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        updatedContact
      );
    });

    test("should update status to replied", async () => {
      req.body = {
        status: "replied",
      };

      const updatedContact = {
        _id: "contact123",
        status: "replied",
      };

      Contact.findByIdAndUpdate.mockResolvedValue(
        updatedContact
      );

      await updateMessageStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(
        updatedContact
      );
    });

    test("should reject invalid status", async () => {
      req.body = {
        status: "invalid",
      };

      await updateMessageStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid status.",
      });

      expect(
        Contact.findByIdAndUpdate
      ).not.toHaveBeenCalled();
    });

    test("should return 400 when status is missing", async () => {
      req.body = {};

      await updateMessageStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid status.",
      });
    });

    test("should return 404 when contact is not found", async () => {
      req.body = {
        status: "read",
      };

      Contact.findByIdAndUpdate.mockResolvedValue(null);

      await updateMessageStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Message not found.",
      });
    });

    test("should handle database errors", async () => {
      req.body = {
        status: "read",
      };

      Contact.findByIdAndUpdate.mockRejectedValue(
        new Error("Database error")
      );

      await updateMessageStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message:
          "Failed to update message status.",
      });
    });
  });

  // =======================================================
  // replyToMessage
  // =======================================================

  describe("replyToMessage", () => {
    test("should successfully reply to a contact message", async () => {
      req.body = {
        reply:
          "Thank you for contacting us. We will help you shortly.",
      };

      const contact = {
        _id: "contact123",
        name: "John Doe",
        email: "john@example.com",
        message: "I need help with my order.",
        status: "unread",
        save: jest.fn().mockResolvedValue(true),
      };

      Contact.findById.mockResolvedValue(contact);

      sendContactReplyEmail.mockResolvedValue({
        sent: true,
      });

      await replyToMessage(req, res);

      expect(Contact.findById).toHaveBeenCalledWith(
        "contact123"
      );

      expect(
        sendContactReplyEmail
      ).toHaveBeenCalledWith(
        "john@example.com",
        {
          name: "John Doe",
          originalMessage:
            "I need help with my order.",
          reply:
            "Thank you for contacting us. We will help you shortly.",
        }
      );

      expect(contact.reply).toBe(
        "Thank you for contacting us. We will help you shortly."
      );

      expect(contact.repliedAt).toBeInstanceOf(Date);

      expect(contact.status).toBe("replied");

      expect(contact.save).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        contact,
        emailSent: true,
      });
    });

    test("should reject missing reply", async () => {
      req.body = {};

      await replyToMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Reply message is required.",
      });

      expect(Contact.findById).not.toHaveBeenCalled();

      expect(
        sendContactReplyEmail
      ).not.toHaveBeenCalled();
    });

    test("should reject empty reply", async () => {
      req.body = {
        reply: "   ",
      };

      await replyToMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        message: "Reply message is required.",
      });

      expect(Contact.findById).not.toHaveBeenCalled();
    });

    test("should return 404 when contact does not exist", async () => {
      req.body = {
        reply: "Thank you for contacting us.",
      };

      Contact.findById.mockResolvedValue(null);

      await replyToMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Message not found.",
      });

      expect(
        sendContactReplyEmail
      ).not.toHaveBeenCalled();
    });

    test("should handle email sending errors", async () => {
      req.body = {
        reply: "Thank you for contacting us.",
      };

      const contact = {
        _id: "contact123",
        name: "John Doe",
        email: "john@example.com",
        message: "I need help.",
        save: jest.fn(),
      };

      Contact.findById.mockResolvedValue(contact);

      sendContactReplyEmail.mockRejectedValue(
        new Error("Email service error")
      );

      await replyToMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to send reply.",
      });
    });

    test("should handle database errors", async () => {
      req.body = {
        reply: "Thank you for contacting us.",
      };

      Contact.findById.mockRejectedValue(
        new Error("Database error")
      );

      await replyToMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to send reply.",
      });
    });
  });

  // =======================================================
  // deleteMessage
  // =======================================================

  describe("deleteMessage", () => {
    test("should successfully delete a message", async () => {
      const deletedContact = {
        _id: "contact123",
        name: "John Doe",
      };

      Contact.findByIdAndDelete.mockResolvedValue(
        deletedContact
      );

      await deleteMessage(req, res);

      expect(
        Contact.findByIdAndDelete
      ).toHaveBeenCalledWith("contact123");

      expect(res.json).toHaveBeenCalledWith({
        message: "Message deleted successfully.",
      });
    });

    test("should return 404 when message is not found", async () => {
      Contact.findByIdAndDelete.mockResolvedValue(null);

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        message: "Message not found.",
      });
    });

    test("should handle database errors", async () => {
      Contact.findByIdAndDelete.mockRejectedValue(
        new Error("Database error")
      );

      await deleteMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Failed to delete message.",
      });
    });
  });
});

// =========================================================
// SETTINGS CONTROLLER TESTS
// =========================================================

describe("Settings Controller", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  // =======================================================
  // getPublicPricing
  // =======================================================

  describe("getPublicPricing", () => {
    test("should return public pricing settings", async () => {
      const settings = {
        vatRate: 0.15,
        defaultDeliveryCharge: 100,
        districtDeliveryCharges: {
          Dhaka: 60,
          Chittagong: 120,
          Sylhet: 130,
        },
        defaultLanguage: "en",
      };

      Setting.getSingleton.mockResolvedValue(settings);

      await getPublicPricing(req, res);

      expect(
        Setting.getSingleton
      ).toHaveBeenCalledTimes(1);

      expect(res.json).toHaveBeenCalledWith({
        vatRate: 0.15,
        defaultDeliveryCharge: 100,
        districtDeliveryCharges: {
          Dhaka: 60,
          Chittagong: 120,
          Sylhet: 130,
        },
        defaultLanguage: "en",
      });
    });

    test("should return VAT rate correctly", async () => {
      const settings = {
        vatRate: 0.075,
        defaultDeliveryCharge: 80,
        districtDeliveryCharges: {},
        defaultLanguage: "bn",
      };

      Setting.getSingleton.mockResolvedValue(settings);

      await getPublicPricing(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          vatRate: 0.075,
        })
      );
    });

    test("should return default delivery charge correctly", async () => {
      const settings = {
        vatRate: 0.15,
        defaultDeliveryCharge: 100,
        districtDeliveryCharges: {},
        defaultLanguage: "en",
      };

      Setting.getSingleton.mockResolvedValue(settings);

      await getPublicPricing(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultDeliveryCharge: 100,
        })
      );
    });

    test("should return district delivery charges", async () => {
      const districtCharges = {
        Dhaka: 60,
        Gazipur: 80,
        Narayanganj: 70,
      };

      Setting.getSingleton.mockResolvedValue({
        vatRate: 0.15,
        defaultDeliveryCharge: 100,
        districtDeliveryCharges: districtCharges,
        defaultLanguage: "en",
      });

      await getPublicPricing(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          districtDeliveryCharges:
            districtCharges,
        })
      );
    });

    test("should return default language", async () => {
      Setting.getSingleton.mockResolvedValue({
        vatRate: 0.15,
        defaultDeliveryCharge: 100,
        districtDeliveryCharges: {},
        defaultLanguage: "bn",
      });

      await getPublicPricing(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultLanguage: "bn",
        })
      );
    });

    test("should handle database errors", async () => {
      Setting.getSingleton.mockRejectedValue(
        new Error("Database error")
      );

      await getPublicPricing(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: "Database error",
      });
    });
  });
});