// backend/controllers/descriptionController.js
import { getChatCompletion } from "../services/aiService.js";

// ── POST /api/admin/generate-description ─────────────────────────────────────
export const generateDescription = async (req, res) => {
  try {
    const { productName, category, price } = req.body;

    if (!productName) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const systemPrompt = `You are a product description writer for Camellia — a Bangladeshi jewellery brand.

Respond with ONLY a valid JSON object. Keep descriptions SHORT (1-2 sentences max):
{
  "nameBn": "Bengali name (5 words max)",
  "en": "English description (1-2 short sentences)",
  "bn": "Bengali description (1-2 short sentences)"
}

No markdown, no extra text. JSON only.`;

    const message = `Product: ${productName}
Category: ${category || "Jewellery"}
${price ? `Price: ৳${price}` : ""}

Write short Bengali name and 1-2 sentence descriptions in English and Bengali.`;

    const response = await getChatCompletion({
      systemPrompt,
      history: [],
      message,
    });

    // Clean and parse response
    let cleaned = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Try to extract JSON if response has extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];

    const descriptions = JSON.parse(cleaned);

    if (!descriptions.en || !descriptions.bn || !descriptions.nameBn) {
      throw new Error("Invalid response format from AI");
    }

    res.json({
      nameBn: descriptions.nameBn,
      en: descriptions.en,
      bn: descriptions.bn,
    });
  } catch (error) {
    console.error("AI description generation error:", error);
    res.status(500).json({
      message: "Failed to generate description. Please try again.",
    });
  }
};