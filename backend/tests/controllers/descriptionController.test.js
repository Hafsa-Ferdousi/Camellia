import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock AI service before importing controller
jest.unstable_mockModule("../../services/aiService.js", () => ({
  getChatCompletion: jest.fn(),
}));

const { getChatCompletion } = await import("../../services/aiService.js");

const { generateDescription } =
  await import("../../controllers/descriptionController.js");

// Mock Express response
const mockResponse = () => {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
};

describe("descriptionController - generateDescription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // SUCCESS CASE
  // =========================================================

  test("should generate product description successfully", async () => {
    const req = {
      body: {
        productName: "Gold Necklace",
        category: "Necklace",
        price: 2500,
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "সোনার হার",
        en: "A beautiful gold necklace with an elegant design.",
        bn: "অভিজাত নকশার একটি সুন্দর সোনার হার।",
      })
    );

    await generateDescription(req, res);

    expect(getChatCompletion).toHaveBeenCalledTimes(1);

    expect(getChatCompletion).toHaveBeenCalledWith({
      systemPrompt: expect.stringContaining(
        "You are a product description writer for Camellia"
      ),
      history: [],
      message: expect.stringContaining("Product: Gold Necklace"),
    });

    expect(res.json).toHaveBeenCalledWith({
      nameBn: "সোনার হার",
      en: "A beautiful gold necklace with an elegant design.",
      bn: "অভিজাত নকশার একটি সুন্দর সোনার হার।",
    });
  });

  // =========================================================
  // PRODUCT NAME VALIDATION
  // =========================================================

  test("should return 400 when product name is missing", async () => {
    const req = {
      body: {
        category: "Necklace",
        price: 2500,
      },
    };

    const res = mockResponse();

    await generateDescription(req, res);

    expect(getChatCompletion).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product name is required.",
    });
  });

  test("should return 400 when product name is empty", async () => {
    const req = {
      body: {
        productName: "",
        category: "Ring",
        price: 1500,
      },
    };

    const res = mockResponse();

    await generateDescription(req, res);

    expect(getChatCompletion).not.toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      message: "Product name is required.",
    });
  });

  // =========================================================
  // DEFAULT CATEGORY
  // =========================================================

  test("should use Jewellery as default category", async () => {
    const req = {
      body: {
        productName: "Diamond Ring",
        price: 5000,
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "হীরার আংটি",
        en: "A stunning diamond ring.",
        bn: "একটি আকর্ষণীয় হীরার আংটি।",
      })
    );

    await generateDescription(req, res);

    expect(getChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Category: Jewellery"),
      })
    );

    expect(res.json).toHaveBeenCalled();
  });

  // =========================================================
  // PRICE HANDLING
  // =========================================================

  test("should include price when price is provided", async () => {
    const req = {
      body: {
        productName: "Pearl Earrings",
        category: "Earrings",
        price: 1800,
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "মুক্তার দুল",
        en: "Elegant pearl earrings for a timeless look.",
        bn: "চিরন্তন সৌন্দর্যের জন্য মার্জিত মুক্তার দুল।",
      })
    );

    await generateDescription(req, res);

    expect(getChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Price: ৳1800"),
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      nameBn: "মুক্তার দুল",
      en: "Elegant pearl earrings for a timeless look.",
      bn: "চিরন্তন সৌন্দর্যের জন্য মার্জিত মুক্তার দুল।",
    });
  });

  test("should not include price when price is not provided", async () => {
    const req = {
      body: {
        productName: "Silver Bracelet",
        category: "Bracelet",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "রূপার ব্রেসলেট",
        en: "A stylish silver bracelet.",
        bn: "একটি স্টাইলিশ রূপার ব্রেসলেট।",
      })
    );

    await generateDescription(req, res);

    const call = getChatCompletion.mock.calls[0][0];

    expect(call.message).not.toContain("Price:");

    expect(res.json).toHaveBeenCalled();
  });

  // =========================================================
  // MARKDOWN JSON CLEANING
  // =========================================================

  test("should remove markdown JSON code fences from AI response", async () => {
    const req = {
      body: {
        productName: "Gold Bracelet",
        category: "Bracelet",
        price: 3200,
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(`
      \`\`\`json
      {
        "nameBn": "সোনার ব্রেসলেট",
        "en": "A beautiful gold bracelet.",
        "bn": "একটি সুন্দর সোনার ব্রেসলেট।"
      }
      \`\`\`
    `);

    await generateDescription(req, res);

    expect(res.json).toHaveBeenCalledWith({
      nameBn: "সোনার ব্রেসলেট",
      en: "A beautiful gold bracelet.",
      bn: "একটি সুন্দর সোনার ব্রেসলেট।",
    });
  });

  // =========================================================
  // EXTRA AI TEXT
  // =========================================================

  test("should extract JSON when AI response contains extra text", async () => {
    const req = {
      body: {
        productName: "Ruby Necklace",
        category: "Necklace",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(`
      Here is the requested description:

      {
        "nameBn": "রুবির হার",
        "en": "A stunning ruby necklace.",
        "bn": "একটি আকর্ষণীয় রুবির হার।"
      }

      Hope this helps!
    `);

    await generateDescription(req, res);

    expect(res.json).toHaveBeenCalledWith({
      nameBn: "রুবির হার",
      en: "A stunning ruby necklace.",
      bn: "একটি আকর্ষণীয় রুবির হার।",
    });
  });

  // =========================================================
  // INVALID JSON
  // =========================================================

  test("should return 500 when AI returns invalid JSON", async () => {
    const req = {
      body: {
        productName: "Gold Ring",
        category: "Ring",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      "This is not valid JSON"
    );

    await generateDescription(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to generate description. Please try again.",
    });
  });

  // =========================================================
  // MISSING REQUIRED AI FIELD
  // =========================================================

  test("should return 500 when AI response is missing English description", async () => {
    const req = {
      body: {
        productName: "Gold Necklace",
        category: "Necklace",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "সোনার হার",
        bn: "একটি সুন্দর সোনার হার।",
      })
    );

    await generateDescription(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to generate description. Please try again.",
    });
  });

  test("should return 500 when AI response is missing Bengali description", async () => {
    const req = {
      body: {
        productName: "Gold Necklace",
        category: "Necklace",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        nameBn: "সোনার হার",
        en: "A beautiful gold necklace.",
      })
    );

    await generateDescription(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to generate description. Please try again.",
    });
  });

  test("should return 500 when AI response is missing Bengali name", async () => {
    const req = {
      body: {
        productName: "Gold Necklace",
        category: "Necklace",
      },
    };

    const res = mockResponse();

    getChatCompletion.mockResolvedValue(
      JSON.stringify({
        en: "A beautiful gold necklace.",
        bn: "একটি সুন্দর সোনার হার।",
      })
    );

    await generateDescription(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to generate description. Please try again.",
    });
  });

  // =========================================================
  // AI SERVICE ERROR
  // =========================================================

  test("should return 500 when getChatCompletion throws an error", async () => {
    const req = {
      body: {
        productName: "Diamond Bracelet",
        category: "Bracelet",
        price: 7000,
      },
    };

    const res = mockResponse();

    getChatCompletion.mockRejectedValue(
      new Error("AI service unavailable")
    );

    await generateDescription(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      message: "Failed to generate description. Please try again.",
    });
  });
});