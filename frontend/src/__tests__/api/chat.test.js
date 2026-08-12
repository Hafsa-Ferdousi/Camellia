import { jest } from "@jest/globals";

// ======================================================
// MOCK API CLIENT
// ======================================================

const mockClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.unstable_mockModule("../../api/client.js", () => ({
  default: mockClient,
}));

// ======================================================
// IMPORT CHAT API AFTER MOCKING CLIENT
// ======================================================

const {
  getSessionId,
  startNewSession,
  setActiveSessionId,
  resetChatSession,
  sendChatMessage,
  getChatHistory,
  getUserConversations,
} = await import("../../api/chat.js");

// ======================================================
// CONSTANT
// ======================================================

const SESSION_KEY = "camellia_chat_session";

// ======================================================
// TEST SUITE
// ======================================================

describe("Chat API", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Use Jest/jsdom's real localStorage
    localStorage.clear();
  });

  // ====================================================
  // getSessionId
  // ====================================================

  describe("getSessionId", () => {
    test("should return existing session ID from localStorage", () => {
      localStorage.setItem(
        SESSION_KEY,
        "sess_existing123"
      );

      const result = getSessionId();

      expect(result).toBe(
        "sess_existing123"
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe("sess_existing123");
    });

    test("should generate and store a new session ID when none exists", () => {
      const result = getSessionId();

      expect(result).toMatch(
        /^sess_\d+_[a-z0-9]+$/
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe(result);
    });

    test("should return the same session ID on subsequent calls", () => {
      const firstSession = getSessionId();

      const secondSession = getSessionId();

      expect(secondSession).toBe(
        firstSession
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe(firstSession);
    });

    test("generated session ID should start with sess_", () => {
      const result = getSessionId();

      expect(
        result.startsWith("sess_")
      ).toBe(true);
    });
  });

  // ====================================================
  // startNewSession
  // ====================================================

  describe("startNewSession", () => {
    test("should generate a new session ID", () => {
      const result =
        startNewSession();

      expect(result).toMatch(
        /^sess_\d+_[a-z0-9]+$/
      );
    });

    test("should store the new session ID in localStorage", () => {
      const result =
        startNewSession();

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe(result);
    });

    test("should replace an existing session ID", () => {
      localStorage.setItem(
        SESSION_KEY,
        "sess_old123"
      );

      const result =
        startNewSession();

      expect(result).not.toBe(
        "sess_old123"
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe(result);
    });
  });

  // ====================================================
  // setActiveSessionId
  // ====================================================

  describe("setActiveSessionId", () => {
    test("should store the provided session ID", () => {
      setActiveSessionId(
        "sess_existing456"
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe("sess_existing456");
    });

    test("should replace the current active session", () => {
      localStorage.setItem(
        SESSION_KEY,
        "sess_old789"
      );

      setActiveSessionId(
        "sess_new789"
      );

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBe("sess_new789");
    });
  });

  // ====================================================
  // resetChatSession
  // ====================================================

  describe("resetChatSession", () => {
    test("should remove the chat session from localStorage", () => {
      localStorage.setItem(
        SESSION_KEY,
        "sess_user123"
      );

      resetChatSession();

      expect(
        localStorage.getItem(SESSION_KEY)
      ).toBeNull();
    });

    test("should dispatch chat:session-reset event", () => {
      const eventHandler = jest.fn();

      window.addEventListener(
        "chat:session-reset",
        eventHandler
      );

      resetChatSession();

      expect(
        eventHandler
      ).toHaveBeenCalledTimes(1);

      expect(
        eventHandler.mock.calls[0][0].type
      ).toBe("chat:session-reset");

      window.removeEventListener(
        "chat:session-reset",
        eventHandler
      );
    });

    test("should remove session before dispatching reset event", () => {
      localStorage.setItem(
        SESSION_KEY,
        "sess_test123"
      );

      let sessionAtEventTime;

      const eventHandler = jest.fn(() => {
        sessionAtEventTime =
          localStorage.getItem(
            SESSION_KEY
          );
      });

      window.addEventListener(
        "chat:session-reset",
        eventHandler
      );

      resetChatSession();

      expect(
        sessionAtEventTime
      ).toBeNull();

      expect(
        eventHandler
      ).toHaveBeenCalledTimes(1);

      window.removeEventListener(
        "chat:session-reset",
        eventHandler
      );
    });
  });

  // ====================================================
  // sendChatMessage
  // ====================================================

  describe("sendChatMessage", () => {
    test("should send POST request to /chat/message", async () => {
      const response = {
        data: {
          reply:
            "Hello! How can I help you?",
        },
      };

      mockClient.post.mockResolvedValue(
        response
      );

      const result =
        await sendChatMessage(
          "sess_12345",
          "Hello"
        );

      expect(
        mockClient.post
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.post
      ).toHaveBeenCalledWith(
        "/chat/message",
        {
          sessionId: "sess_12345",
          message: "Hello",
        }
      );

      expect(result).toEqual(response);
    });

    test("should send the correct session ID", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await sendChatMessage(
        "sess_abc123",
        "What is the price?"
      );

      expect(
        mockClient.post
      ).toHaveBeenCalledWith(
        "/chat/message",
        {
          sessionId: "sess_abc123",
          message:
            "What is the price?",
        }
      );
    });

    test("should send the exact message provided", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      const message =
        "Can you recommend a flower bouquet?";

      await sendChatMessage(
        "sess_test123",
        message
      );

      expect(
        mockClient.post
      ).toHaveBeenCalledWith(
        "/chat/message",
        {
          sessionId: "sess_test123",
          message,
        }
      );
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to send message"
      );

      mockClient.post.mockRejectedValue(
        error
      );

      await expect(
        sendChatMessage(
          "sess_123",
          "Hello"
        )
      ).rejects.toThrow(
        "Failed to send message"
      );
    });
  });

  // ====================================================
  // getChatHistory
  // ====================================================

  describe("getChatHistory", () => {
    test("should send GET request with session ID", async () => {
      const response = {
        data: {
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
        },
      };

      mockClient.get.mockResolvedValue(
        response
      );

      const result =
        await getChatHistory(
          "sess_history123"
        );

      expect(
        mockClient.get
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.get
      ).toHaveBeenCalledWith(
        "/chat/history/sess_history123"
      );

      expect(result).toEqual(response);
    });

    test("should correctly insert session ID into URL", async () => {
      mockClient.get.mockResolvedValue({
        data: {},
      });

      await getChatHistory(
        "sess_abc789"
      );

      expect(
        mockClient.get
      ).toHaveBeenCalledWith(
        "/chat/history/sess_abc789"
      );
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to load chat history"
      );

      mockClient.get.mockRejectedValue(
        error
      );

      await expect(
        getChatHistory("sess_123")
      ).rejects.toThrow(
        "Failed to load chat history"
      );
    });
  });

  // ====================================================
  // getUserConversations
  // ====================================================

  describe("getUserConversations", () => {
    test("should send GET request to /chat/conversations", async () => {
      const response = {
        data: [
          {
            sessionId: "sess_123",
            title: "Product inquiry",
          },
          {
            sessionId: "sess_456",
            title: "Order help",
          },
        ],
      };

      mockClient.get.mockResolvedValue(
        response
      );

      const result =
        await getUserConversations();

      expect(
        mockClient.get
      ).toHaveBeenCalledTimes(1);

      expect(
        mockClient.get
      ).toHaveBeenCalledWith(
        "/chat/conversations"
      );

      expect(result).toEqual(response);
    });

    test("should propagate API error", async () => {
      const error = new Error(
        "Failed to load conversations"
      );

      mockClient.get.mockRejectedValue(
        error
      );

      await expect(
        getUserConversations()
      ).rejects.toThrow(
        "Failed to load conversations"
      );
    });
  });

  // ====================================================
  // HTTP METHOD VERIFICATION
  // ====================================================

  describe("HTTP method verification", () => {
    test("sendChatMessage should use POST", async () => {
      mockClient.post.mockResolvedValue({
        data: {},
      });

      await sendChatMessage(
        "sess_123",
        "Hello"
      );

      expect(
        mockClient.post
      ).toHaveBeenCalled();

      expect(
        mockClient.get
      ).not.toHaveBeenCalled();

      expect(
        mockClient.put
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });

    test("getChatHistory should use GET", async () => {
      mockClient.get.mockResolvedValue({
        data: {},
      });

      await getChatHistory(
        "sess_123"
      );

      expect(
        mockClient.get
      ).toHaveBeenCalled();

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();

      expect(
        mockClient.patch
      ).not.toHaveBeenCalled();

      expect(
        mockClient.delete
      ).not.toHaveBeenCalled();
    });

    test("getUserConversations should use GET", async () => {
      mockClient.get.mockResolvedValue({
        data: [],
      });

      await getUserConversations();

      expect(
        mockClient.get
      ).toHaveBeenCalledWith(
        "/chat/conversations"
      );

      expect(
        mockClient.post
      ).not.toHaveBeenCalled();
    });
  });

  // ====================================================
  // SESSION WORKFLOW
  // ====================================================

  describe("Session workflow", () => {
    test("should create session, retrieve it, and reset it", () => {
      const sessionId =
        getSessionId();

      expect(sessionId).toMatch(
        /^sess_\d+_[a-z0-9]+$/
      );

      expect(
        getSessionId()
      ).toBe(sessionId);

      resetChatSession();

      expect(
        localStorage.getItem(
          SESSION_KEY
        )
      ).toBeNull();
    });

    test("should switch between active sessions", () => {
      const firstSession =
        startNewSession();

      setActiveSessionId(
        "sess_existing_session"
      );

      expect(
        getSessionId()
      ).toBe(
        "sess_existing_session"
      );

      expect(
        getSessionId()
      ).not.toBe(firstSession);
    });

    test("should create a fresh session after reset", () => {
      const firstSession =
        getSessionId();

      resetChatSession();

      const secondSession =
        getSessionId();

      expect(secondSession).not.toBe(
        firstSession
      );

      expect(secondSession).toMatch(
        /^sess_\d+_[a-z0-9]+$/
      );
    });
  });
});