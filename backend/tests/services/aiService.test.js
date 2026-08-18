import { jest } from "@jest/globals";

// ======================================================
// MOCK GROQ SDK
// ======================================================

const mockCreate = jest.fn();

const MockGroq = jest.fn(() => ({
  chat: {
    completions: {
      create: mockCreate,
    },
  },
}));

jest.unstable_mockModule("groq-sdk", () => ({
  default: MockGroq,
}));

// ======================================================
// IMPORT SERVICE AFTER MOCK
// ======================================================

const {
  getChatCompletion,
} = await import(
  "../../services/aiService.js"
);

// ======================================================
// SETUP
// ======================================================

beforeEach(() => {
  jest.clearAllMocks();

  process.env.GROQ_API_KEY =
    "test-groq-api-key";

  mockCreate.mockResolvedValue({
    choices: [
      {
        message: {
          content: "  Hello from Groq!  ",
        },
      },
    ],
  });
});

// ======================================================
// TESTS
// ======================================================

describe("AI Service", () => {
  // ====================================================
  // 1. SUCCESSFUL RESPONSE
  // ====================================================

  test("should return the assistant response", async () => {
    const result =
      await getChatCompletion({
        systemPrompt:
          "You are a helpful assistant.",
        history: [],
        message: "Hello",
      });

    expect(result).toBe(
      "Hello from Groq!"
    );

    expect(
      mockCreate
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 2. MESSAGE STRUCTURE
  // ====================================================

  test("should send system prompt and user message", async () => {
    await getChatCompletion({
      systemPrompt:
        "You are a shopping assistant.",
      history: [],
      message:
        "Find me a necklace",
    });

    expect(
      mockCreate
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        model:
          "llama-3.3-70b-versatile",

        max_tokens: 512,

        temperature: 0.6,

        messages: [
          {
            role: "system",
            content:
              "You are a shopping assistant.",
          },
          {
            role: "user",
            content:
              "Find me a necklace",
          },
        ],
      })
    );
  });

  // ====================================================
  // 3. HISTORY ROLE MAPPING
  // ====================================================

  test("should map model role to assistant", async () => {
    await getChatCompletion({
      systemPrompt: "System",

      history: [
        {
          role: "user",
          content: "Hello",
        },
        {
          role: "model",
          content: "Hi there!",
        },
      ],

      message: "How are you?",
    });

    expect(
      mockCreate
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "system",
            content: "System",
          },
          {
            role: "user",
            content: "Hello",
          },
          {
            role: "assistant",
            content: "Hi there!",
          },
          {
            role: "user",
            content: "How are you?",
          },
        ],
      })
    );
  });

  // ====================================================
  // 4. MISSING API KEY
  // ====================================================

  test("should throw when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;

    await expect(
      getChatCompletion({
        systemPrompt: "System",
        history: [],
        message: "Hello",
      })
    ).rejects.toThrow(
      "AI service is not configured (missing GROQ_API_KEY)."
    );

    expect(
      mockCreate
    ).not.toHaveBeenCalled();
  });

  // ====================================================
  // 5. NON-RETRYABLE ERROR
  // ====================================================

  test("should fail immediately for non-retryable errors", async () => {
    const error = new Error(
      "Bad request"
    );

    error.status = 400;

    mockCreate.mockRejectedValue(
      error
    );

    await expect(
      getChatCompletion({
        systemPrompt: "System",
        history: [],
        message: "Hello",
      })
    ).rejects.toThrow(
      "Bad request"
    );

    // 400 should not retry
    expect(
      mockCreate
    ).toHaveBeenCalledTimes(1);
  });

  // ====================================================
  // 6. RETRY ON 429
  // ====================================================

  test("should retry when Groq returns 429", async () => {
    const rateLimitError =
      new Error("Rate limited");

    rateLimitError.status = 429;

    mockCreate
      .mockRejectedValueOnce(
        rateLimitError
      )
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "Success after retry",
            },
          },
        ],
      });

    const result =
      await getChatCompletion({
        systemPrompt: "System",
        history: [],
        message: "Hello",
      });

    expect(result).toBe(
      "Success after retry"
    );

    expect(
      mockCreate
    ).toHaveBeenCalledTimes(2);
  });

  // ====================================================
  // 7. RETRY ON 5XX
  // ====================================================

  test("should retry when Groq returns a 5xx error", async () => {
    const serverError =
      new Error("Server error");

    serverError.status = 500;

    mockCreate
      .mockRejectedValueOnce(
        serverError
      )
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                "Recovered successfully",
            },
          },
        ],
      });

    const result =
      await getChatCompletion({
        systemPrompt: "System",
        history: [],
        message: "Hello",
      });

    expect(result).toBe(
      "Recovered successfully"
    );

    expect(
      mockCreate
    ).toHaveBeenCalledTimes(2);
  });

  // ====================================================
  // 8. MAXIMUM RETRIES
  // ====================================================

  test("should throw after three failed attempts", async () => {
    const serverError =
      new Error("Server unavailable");

    serverError.status = 500;

    mockCreate.mockRejectedValue(
      serverError
    );

    await expect(
      getChatCompletion({
        systemPrompt: "System",
        history: [],
        message: "Hello",
      })
    ).rejects.toThrow(
      "Server unavailable"
    );

    expect(
      mockCreate
    ).toHaveBeenCalledTimes(3);
  });

  // ====================================================
  // 9. DEFAULT EMPTY HISTORY
  // ====================================================

  test("should work when history is omitted", async () => {
    await getChatCompletion({
      systemPrompt:
        "You are helpful.",
      message: "Hello",
    });

    expect(
      mockCreate
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "system",
            content:
              "You are helpful.",
          },
          {
            role: "user",
            content: "Hello",
          },
        ],
      })
    );
  });
});