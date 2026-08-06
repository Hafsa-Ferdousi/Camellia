import Groq from "groq-sdk";

// Free-tier Groq model — fast, no billing required.
const MODEL_NAME = "llama-3.3-70b-versatile";

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Groq returns 429 (rate limit) and transient 5xx errors as retryable —
// everything else (bad request, auth) fails fast since retrying won't help.
const isRetryable = (error) => {
  const status = error?.status ?? error?.response?.status;
  return status === 429 || (status >= 500 && status < 600);
};

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

  const MAX_ATTEMPTS = 3;
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL_NAME,
        messages,
        max_tokens: 512,
        temperature: 0.6,
      });
      return completion.choices[0].message.content.trim();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) throw error;
      await sleep(300 * 2 ** (attempt - 1)); // 300ms, 600ms
    }
  }
  throw lastError;
}
