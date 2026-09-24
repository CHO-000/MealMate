/* ==========================================================================
   MealMate – AI service wrapper around KKU IntelSphere
   (an OpenAI-compatible endpoint, see https://gen.ai.kku.ac.th)
   ========================================================================== */

const OpenAI = require("openai");

const RAW_API_KEY = process.env.KKU_API_KEY || process.env.API_KEY || "";
const BASE_URL = process.env.KKU_BASE_URL || "https://gen.ai.kku.ac.th/api/v1";
const MODEL = process.env.KKU_MODEL || "gemini-2.5-flash-lite";

// Defensive cleanup: API keys are plain ASCII (letters, digits, "_", "-").
// Copy/paste from chat apps sometimes appends an invisible or combining
// character (e.g. a stray Thai vowel sign) at the end — strip anything
// outside the expected character set rather than fail mysteriously later.
function sanitizeKey(raw) {
  const cleaned = raw.replace(/[^A-Za-z0-9_-]/g, "");
  return cleaned;
}

const API_KEY = sanitizeKey(RAW_API_KEY);

let client = null;
let configWarning = null;

if (!API_KEY) {
  configWarning =
    "KKU_API_KEY is not set. AI features are disabled until it's configured (see .env.example).";
  console.warn("[aiService] " + configWarning);
} else {
  if (RAW_API_KEY.length !== API_KEY.length) {
    console.warn(
      "[aiService] KKU_API_KEY contained unexpected characters that were stripped. " +
        "Double-check the key was copied correctly if AI calls fail."
    );
  }
  client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
}

function isConfigured() {
  return !!client;
}

/**
 * Calls the chat completion endpoint with a timeout guard so a slow/unreachable
 * upstream never hangs a request indefinitely.
 */
async function chatCompletion(messages, options) {
  options = options || {};
  if (!client) {
    const err = new Error("AI_NOT_CONFIGURED");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const timeoutMs = options.timeoutMs || 20000;
  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await client.chat.completions.create(
      {
        model: options.model || MODEL,
        messages: messages,
        temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
        max_tokens: typeof options.maxTokens === "number" ? options.maxTokens : undefined,
        stream: false
      },
      { signal: controller.signal }
    );

    const text = response && response.choices && response.choices[0] && response.choices[0].message
      ? response.choices[0].message.content
      : "";

    return text || "";
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  isConfigured: isConfigured,
  chatCompletion: chatCompletion,
  configWarning: configWarning,
  MODEL: MODEL
};
