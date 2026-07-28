import Groq from "groq-sdk";

// Free-tier Groq model — fast, no billing required.
const MODEL_NAME = "llama-3.3-70b-versatile";

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

// history: [{ role: "user" | "model", content: string }] (oldest first, excludes the new message)
// Returns the assistant's reply text, or throws on failure — callers handle the fallback message.
export async function getChatCompletion({ systemPrompt, history = [], message }) {
  const groq = getClient();
  if (!groq) {
    throw new Error("AI service is not configured (missing GROQ_API_KEY).");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    // Groq/OpenAI-style chat uses "assistant", not "model" — map our stored role.
    ...history.map((turn) => ({
      role: turn.role === "model" ? "assistant" : "user",
      content: turn.content,
    })),
    { role: "user", content: message },
  ];

  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    messages,
    max_tokens: 512,
    temperature: 0.6,
  });

  return completion.choices[0].message.content.trim();
}
