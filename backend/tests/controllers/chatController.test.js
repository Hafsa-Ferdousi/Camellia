import { describe, test, expect, jest, beforeEach } from "@jest/globals";

/* =========================================================
   MOCK MODELS
   ========================================================= */

jest.unstable_mockModule("../../models/Conversation.js", () => ({
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Category.js", () => ({
  default: {
    find: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Product.js", () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Order.js", () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/User.js", () => ({
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.unstable_mockModule("../../models/Setting.js", () => ({
  default: {
    getSingleton: jest.fn(),
  },
}));

/* =========================================================
   MOCK AI SERVICE
   ========================================================= */

jest.unstable_mockModule("../../services/aiService.js", () => ({
  getChatCompletion: jest.fn(),
}));

/* =========================================================
   IMPORT AFTER MOCKS
   ========================================================= */

const Conversation = (await import("../../models/Conversation.js")).default;
const Category = (await import("../../models/Category.js")).default;
const Product = (await import("../../models/Product.js")).default;
const Order = (await import("../../models/Order.js")).default;
const User = (await import("../../models/User.js")).default;
const Setting = (await import("../../models/Setting.js")).default;

const { getChatCompletion } =
  await import("../../services/aiService.js");

const {
  sendChatMessage,
  getChatHistory,
  getUserConversations,
  getAllConversations,
  getConversationById,
  deleteConversation,
} = await import("../../controllers/chatController.js");

/* =========================================================
   RESPONSE MOCK
   ========================================================= */

const createResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

/* =========================================================
   CHAIN HELPERS
   ========================================================= */

const createQuery = (result) => {
  const query = {
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
  };

  query.then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);

  query.catch = (reject) =>
    Promise.resolve(result).catch(reject);

  return query;
};

/* =========================================================
   DEFAULT MOCK DATA
   ========================================================= */

const categories = [
  {
    name: {
      en: "Rings",
    },
  },
  {
    name: {
      en: "Necklaces",
    },
  },
];

const products = [
  {
    name: {
      en: "Gold Ring",
    },
    basePrice: 5000,
    totalStock: 10,
    isActive: true,
  },
  {
    name: {
      en: "Silver Necklace",
    },
    basePrice: 3000,
    totalStock: 0,
    isActive: true,
  },
];

const user = {
  _id: "user123",
  role: "customer",
};

const admin = {
  _id: "admin123",
  role: "admin",
};

/* =========================================================
   BEFORE EACH
   ========================================================= */

beforeEach(() => {
  jest.clearAllMocks();

  /* Category */
  Category.find.mockReturnValue(createQuery(categories));

  /* Product */
  Product.find.mockReturnValue(createQuery(products));

  /* Customer orders */
  Order.find.mockReturnValue(
    createQuery([
      {
        invoiceNumber: "INV001",
        status: "Processing",
        totalAmount: 5000,
        createdAt: new Date(),
      },
    ])
  );

  /* Admin */
  Order.countDocuments.mockResolvedValue(10);

  User.countDocuments.mockResolvedValue(5);

  Product.countDocuments.mockResolvedValue(20);

  Order.aggregate
    .mockResolvedValueOnce([{ _id: null, total: 50000 }])
    .mockResolvedValueOnce([
      { _id: "Processing", count: 4 },
      { _id: "Delivered", count: 6 },
    ]);

  Setting.getSingleton.mockResolvedValue({
    lowStockThreshold: 5,
  });

  getChatCompletion.mockResolvedValue("Hello from Camellia!");

  /* Conversation */
  Conversation.findOne.mockReturnValue(createQuery(null));

  Conversation.create.mockResolvedValue({
    sessionId: "session123",
    user: null,
    messages: [],
    save: jest.fn().mockResolvedValue(),
  });

  Conversation.find.mockReturnValue(createQuery([]));

  Conversation.findById.mockReturnValue(createQuery(null));

  Conversation.findByIdAndDelete.mockResolvedValue(null);
});

/* =========================================================
   SEND CHAT MESSAGE
   ========================================================= */

describe("sendChatMessage", () => {
  test("should return 400 when sessionId is missing", async () => {
    const req = {
      body: {
        message: "Hello",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "sessionId is required.",
    });

    expect(Conversation.findOne).not.toHaveBeenCalled();
  });

  test("should return 400 when sessionId is not a string", async () => {
    const req = {
      body: {
        sessionId: 123,
        message: "Hello",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "sessionId is required.",
    });
  });

  test("should return 400 when message is missing", async () => {
    const req = {
      body: {
        sessionId: "session123",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "message is required.",
    });
  });

  test("should return 400 when message is empty", async () => {
    const req = {
      body: {
        sessionId: "session123",
        message: "   ",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "message is required.",
    });
  });

  test("should return 400 when message is not a string", async () => {
    const req = {
      body: {
        sessionId: "session123",
        message: 12345,
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "message is required.",
    });
  });

  test("should return 400 when message exceeds 2000 characters", async () => {
    const req = {
      body: {
        sessionId: "session123",
        message: "a".repeat(2001),
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Message is too long (max 2000 characters).",
    });
  });

  test("should create a new conversation when one does not exist", async () => {
    const conversation = {
      sessionId: "session123",
      user: null,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(createQuery(null));

    Conversation.create.mockResolvedValue(conversation);

    const req = {
      body: {
        sessionId: "session123",
        message: "Hello",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(Conversation.create).toHaveBeenCalledWith({
      sessionId: "session123",
      user: null,
      messages: [],
    });

    expect(res.json).toHaveBeenCalledWith({
      reply: "Hello from Camellia!",
    });
  });

  test("should associate a new conversation with logged-in user", async () => {
    const conversation = {
      sessionId: "session123",
      user: user._id,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.create.mockResolvedValue(conversation);

    const req = {
      user,
      body: {
        sessionId: "session123",
        message: "Where is my order?",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(Conversation.create).toHaveBeenCalledWith({
      sessionId: "session123",
      user: user._id,
      messages: [],
    });
  });

  test("should use existing conversation", async () => {
    const conversation = {
      sessionId: "session123",
      user: user._id,
      messages: [
        {
          role: "user",
          content: "Hi",
        },
        {
          role: "model",
          content: "Hello",
        },
      ],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      user,
      body: {
        sessionId: "session123",
        message: "Where is my order?",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(getChatCompletion).toHaveBeenCalled();

    expect(conversation.messages).toContainEqual({
      role: "user",
      content: "Where is my order?",
    });

    expect(conversation.messages).toContainEqual({
      role: "model",
      content: "Hello from Camellia!",
    });

    expect(conversation.save).toHaveBeenCalled();
  });

  test("should trim message before sending it to AI", async () => {
    const conversation = {
      sessionId: "session123",
      user: null,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      body: {
        sessionId: "session123",
        message: "   Hello Camellia   ",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(getChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Hello Camellia",
      })
    );
  });

  test("should return AI response", async () => {
    getChatCompletion.mockResolvedValue(
      "Your order is currently processing."
    );

    const conversation = {
      sessionId: "session123",
      user: null,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      body: {
        sessionId: "session123",
        message: "Where is my order?",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.json).toHaveBeenCalledWith({
      reply: "Your order is currently processing.",
    });
  });

  test("should use customer system prompt for normal user", async () => {
    const conversation = {
      sessionId: "session123",
      user: user._id,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      user,
      body: {
        sessionId: "session123",
        message: "Show me products",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(Category.find).toHaveBeenCalled();

    expect(Product.find).toHaveBeenCalled();

    expect(Order.find).toHaveBeenCalled();

    expect(getChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          "customer support assistant"
        ),
      })
    );
  });

  test("should use admin system prompt for admin", async () => {
    const conversation = {
      sessionId: "admin-session",
      user: admin._id,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      user: admin,
      body: {
        sessionId: "admin-session",
        message: "Show store statistics",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(Order.countDocuments).toHaveBeenCalled();

    expect(User.countDocuments).toHaveBeenCalled();

    expect(Product.countDocuments).toHaveBeenCalled();

    expect(Setting.getSingleton).toHaveBeenCalled();

    expect(getChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining(
          "logged-in ADMIN"
        ),
      })
    );
  });

  test("should return fallback reply when AI fails", async () => {
    getChatCompletion.mockRejectedValue(
      new Error("AI service unavailable")
    );

    const conversation = {
      sessionId: "session123",
      user: null,
      messages: [],
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      body: {
        sessionId: "session123",
        message: "Hello",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.json).toHaveBeenCalledWith({
      reply:
        "Sorry, I'm having trouble answering right now. Please try again in a moment, or use the Contact page for help.",
    });

    expect(conversation.save).toHaveBeenCalled();
  });

  test("should cap conversation history at 60 messages", async () => {
    const messages = Array.from(
      { length: 60 },
      (_, i) => ({
        role: i % 2 === 0 ? "user" : "model",
        content: `message ${i}`,
      })
    );

    const conversation = {
      sessionId: "session123",
      user: null,
      messages,
      save: jest.fn().mockResolvedValue(),
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      body: {
        sessionId: "session123",
        message: "New message",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(conversation.messages.length).toBe(60);

    expect(conversation.messages.at(-1)).toEqual({
      role: "model",
      content: "Hello from Camellia!",
    });
  });

  test("should return 500 when database operation fails", async () => {
    Conversation.findOne.mockReturnValue({
      select: jest.fn(),
      then: jest.fn((resolve, reject) =>
        Promise.reject(new Error("Database error")).catch(reject)
      ),
    });

    const req = {
      body: {
        sessionId: "session123",
        message: "Hello",
      },
    };

    const res = createResponse();

    await sendChatMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to process chat message.",
    });
  });
});

/* =========================================================
   GET CHAT HISTORY
   ========================================================= */

describe("getChatHistory", () => {
  test("should return conversation messages", async () => {
    const conversation = {
      user: null,
      messages: [
        {
          role: "user",
          content: "Hello",
        },
        {
          role: "model",
          content: "Hi!",
        },
      ],
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      params: {
        sessionId: "session123",
      },
    };

    const res = createResponse();

    await getChatHistory(req, res);

    expect(res.json).toHaveBeenCalledWith({
      messages: conversation.messages,
    });
  });

  test("should return empty messages when conversation does not exist", async () => {
    Conversation.findOne.mockReturnValue(
      createQuery(null)
    );

    const req = {
      params: {
        sessionId: "unknown",
      },
    };

    const res = createResponse();

    await getChatHistory(req, res);

    expect(res.json).toHaveBeenCalledWith({
      messages: [],
    });
  });

  test("should return empty messages when another user owns conversation", async () => {
    const conversation = {
      user: "userA",
      messages: [
        {
          role: "user",
          content: "Private message",
        },
      ],
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      user: {
        _id: "userB",
      },
      params: {
        sessionId: "session123",
      },
    };

    const res = createResponse();

    await getChatHistory(req, res);

    expect(res.json).toHaveBeenCalledWith({
      messages: [],
    });
  });

  test("should allow owner to read conversation", async () => {
    const conversation = {
      user: "userA",
      messages: [
        {
          role: "user",
          content: "My order",
        },
      ],
    };

    Conversation.findOne.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      user: {
        _id: "userA",
      },
      params: {
        sessionId: "session123",
      },
    };

    const res = createResponse();

    await getChatHistory(req, res);

    expect(res.json).toHaveBeenCalledWith({
      messages: conversation.messages,
    });
  });

  test("should return 500 when history lookup fails", async () => {
    Conversation.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        then: (resolve, reject) =>
          Promise.reject(new Error("DB failure")).catch(reject),
      }),
    });

    const req = {
      user: {
        _id: "user123",
      },
      params: {
        sessionId: "session123",
      },
    };

    const res = createResponse();

    await getChatHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to load chat history.",
    });
  });
});

/* =========================================================
   GET USER CONVERSATIONS
   ========================================================= */

describe("getUserConversations", () => {
  test("should return user's conversations", async () => {
    const conversations = [
      {
        sessionId: "session1",
        messages: [
          {
            role: "user",
            content: "Where is my order?",
          },
        ],
        updatedAt: "2026-08-12",
        createdAt: "2026-08-11",
      },
    ];

    Conversation.find.mockReturnValue(
      createQuery(conversations)
    );

    const req = {
      user: {
        _id: "user123",
      },
    };

    const res = createResponse();

    await getUserConversations(req, res);

    expect(Conversation.find).toHaveBeenCalledWith({
      user: "user123",
    });

    expect(res.json).toHaveBeenCalledWith([
      {
        sessionId: "session1",
        title: "Where is my order?",
        updatedAt: "2026-08-12",
        createdAt: "2026-08-11",
      },
    ]);
  });

  test("should filter conversations with no messages", async () => {
    const conversations = [
      {
        sessionId: "empty",
        messages: [],
        updatedAt: "2026-08-12",
        createdAt: "2026-08-12",
      },
      {
        sessionId: "full",
        messages: [
          {
            role: "user",
            content: "Hello",
          },
        ],
        updatedAt: "2026-08-12",
        createdAt: "2026-08-12",
      },
    ];

    Conversation.find.mockReturnValue(
      createQuery(conversations)
    );

    const req = {
      user: {
        _id: "user123",
      },
    };

    const res = createResponse();

    await getUserConversations(req, res);

    const result = res.json.mock.calls[0][0];

    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("full");
  });

  test("should truncate conversation title longer than 40 characters", async () => {
    const longMessage =
      "This is a very long customer message that should be truncated";

    Conversation.find.mockReturnValue(
      createQuery([
        {
          sessionId: "session1",
          messages: [
            {
              role: "user",
              content: longMessage,
            },
          ],
          updatedAt: "2026-08-12",
          createdAt: "2026-08-12",
        },
      ])
    );

    const req = {
      user: {
        _id: "user123",
      },
    };

    const res = createResponse();

    await getUserConversations(req, res);

    const result = res.json.mock.calls[0][0];

    expect(result[0].title).toBe(
      `${longMessage.slice(0, 40)}…`
    );
  });

  test("should use New chat when no user message exists", async () => {
    Conversation.find.mockReturnValue(
      createQuery([
        {
          sessionId: "session1",
          messages: [
            {
              role: "model",
              content: "Hello!",
            },
          ],
          updatedAt: "2026-08-12",
          createdAt: "2026-08-12",
        },
      ])
    );

    const req = {
      user: {
        _id: "user123",
      },
    };

    const res = createResponse();

    await getUserConversations(req, res);

    const result = res.json.mock.calls[0][0];

    expect(result[0].title).toBe("New chat");
  });

  test("should return 500 when fetching conversations fails", async () => {
    Conversation.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: (resolve, reject) =>
            Promise.reject(new Error("DB error")).catch(reject),
        }),
      }),
    });

    const req = {
      user: {
        _id: "user123",
      },
    };

    const res = createResponse();

    await getUserConversations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to fetch conversations.",
    });
  });
});

/* =========================================================
   GET ALL ADMIN CONVERSATIONS
   ========================================================= */

describe("getAllConversations", () => {
  test("should return conversation summaries", async () => {
    const conversations = [
      {
        _id: "conversation1",
        sessionId: "session1",
        user: {
          name: "Hafsa",
          email: "hafsa@example.com",
        },
        messages: [
          {
            role: "user",
            content: "Hello",
          },
          {
            role: "model",
            content: "Hi",
          },
        ],
        createdAt: "2026-08-12",
        updatedAt: "2026-08-12",
      },
    ];

    Conversation.find.mockReturnValue(
      createQuery(conversations)
    );

    const req = {};
    const res = createResponse();

    await getAllConversations(req, res);

    expect(res.json).toHaveBeenCalledWith([
      {
        _id: "conversation1",
        sessionId: "session1",
        user: conversations[0].user,
        messageCount: 2,
        lastMessage: "Hi",
        updatedAt: "2026-08-12",
        createdAt: "2026-08-12",
      },
    ]);
  });

  test("should return empty array when no conversations exist", async () => {
    Conversation.find.mockReturnValue(
      createQuery([])
    );

    const req = {};
    const res = createResponse();

    await getAllConversations(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("should use empty string when conversation has no messages", async () => {
    Conversation.find.mockReturnValue(
      createQuery([
        {
          _id: "conversation1",
          sessionId: "session1",
          user: null,
          messages: [],
          createdAt: "2026-08-12",
          updatedAt: "2026-08-12",
        },
      ])
    );

    const req = {};
    const res = createResponse();

    await getAllConversations(req, res);

    const result = res.json.mock.calls[0][0];

    expect(result[0].messageCount).toBe(0);
    expect(result[0].lastMessage).toBe("");
  });

  test("should return 500 when admin conversations lookup fails", async () => {
    Conversation.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            then: (resolve, reject) =>
              Promise.reject(new Error("DB error")).catch(reject),
          }),
        }),
      }),
    });

    const req = {};
    const res = createResponse();

    await getAllConversations(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to fetch conversations.",
    });
  });
});

/* =========================================================
   GET CONVERSATION BY ID
   ========================================================= */

describe("getConversationById", () => {
  test("should return conversation when found", async () => {
    const conversation = {
      _id: "conversation1",
      sessionId: "session1",
      user: {
        name: "Hafsa",
        email: "hafsa@example.com",
      },
      messages: [],
    };

    Conversation.findById.mockReturnValue(
      createQuery(conversation)
    );

    const req = {
      params: {
        id: "conversation1",
      },
    };

    const res = createResponse();

    await getConversationById(req, res);

    expect(Conversation.findById).toHaveBeenCalledWith(
      "conversation1"
    );

    expect(res.json).toHaveBeenCalledWith(conversation);
  });

  test("should return 404 when conversation is not found", async () => {
    Conversation.findById.mockReturnValue(
      createQuery(null)
    );

    const req = {
      params: {
        id: "missing",
      },
    };

    const res = createResponse();

    await getConversationById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation not found.",
    });
  });

  test("should return 500 when conversation lookup fails", async () => {
    Conversation.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        then: (resolve, reject) =>
          Promise.reject(new Error("DB error")).catch(reject),
      }),
    });

    const req = {
      params: {
        id: "conversation1",
      },
    };

    const res = createResponse();

    await getConversationById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to fetch conversation.",
    });
  });
});

/* =========================================================
   DELETE CONVERSATION
   ========================================================= */

describe("deleteConversation", () => {
  test("should delete conversation successfully", async () => {
    const conversation = {
      _id: "conversation1",
      sessionId: "session1",
    };

    Conversation.findByIdAndDelete.mockResolvedValue(
      conversation
    );

    const req = {
      params: {
        id: "conversation1",
      },
    };

    const res = createResponse();

    await deleteConversation(req, res);

    expect(
      Conversation.findByIdAndDelete
    ).toHaveBeenCalledWith("conversation1");

    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation deleted.",
    });
  });

  test("should return 404 when conversation does not exist", async () => {
    Conversation.findByIdAndDelete.mockResolvedValue(null);

    const req = {
      params: {
        id: "missing",
      },
    };

    const res = createResponse();

    await deleteConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation not found.",
    });
  });

  test("should return 500 when deletion fails", async () => {
    Conversation.findByIdAndDelete.mockRejectedValue(
      new Error("Delete failed")
    );

    const req = {
      params: {
        id: "conversation1",
      },
    };

    const res = createResponse();

    await deleteConversation(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to delete conversation.",
    });
  });
});