import "server-only";

/**
 * AI settings. Read on the server only; the API key never reaches the browser.
 * AI features are enabled when ANTHROPIC_API_KEY is set (and Supabase is configured).
 */
export const aiConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.AI_MODEL || "claude-sonnet-5",
  // Override only for proxies or tests.
  baseUrl: (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, ""),
  maxQuestionsPerHour: Math.max(1, Number(process.env.AI_MAX_QUESTIONS_PER_HOUR) || 30),
  timeoutMs: 45_000,
};

export const isAiConfigured = aiConfig.apiKey.length > 0;
