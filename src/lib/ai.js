/* ──────────────────────────────────────────────────────────────────
   One AI entry point, three possible providers.

   Whichever key is present wins, in this order:

     1. Groq      VITE_GROQ_KEY       free, no card, very fast
     2. Gemini    VITE_GEMINI_KEY     free tier, generous daily quota
     3. Anthropic VITE_ANTHROPIC_KEY  paid

   Callers ask for text and never learn which provider answered, so
   swapping providers is a key change and a redeploy — no code edits.

   Note on browser keys: anything in a Vite bundle is readable by
   anyone who opens devtools. Free-tier keys are the right choice
   here precisely because the blast radius of a leak is a rate limit
   rather than a bill.
   ────────────────────────────────────────────────────────────────── */

const GROQ_KEY      = (import.meta.env.VITE_GROQ_KEY      || "").trim();
const GEMINI_KEY    = (import.meta.env.VITE_GEMINI_KEY    || "").trim();
const ANTHROPIC_KEY = (import.meta.env.VITE_ANTHROPIC_KEY || "").trim();

export const PROVIDER =
  GROQ_KEY      ? "groq"      :
  GEMINI_KEY    ? "gemini"    :
  ANTHROPIC_KEY ? "anthropic" : null;

export const hasAI = PROVIDER !== null;

export const PROVIDER_LABEL = {
  groq:      "Groq · Llama 3.3 70B (free)",
  gemini:    "Google Gemini Flash (free)",
  anthropic: "Claude Haiku",
}[PROVIDER] || "not configured";

/* Free tiers are rate limited rather than metered, so a burst of
   requests returns 429 instead of failing outright. Backing off and
   retrying turns a hard error into a short wait. */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (!/rate|429|quota|overload/i.test(e.message) || i === tries - 1) throw e;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastErr;
}

async function callGroq(system, user, maxTokens, json) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: Math.min(maxTokens, 8000),
      temperature: 0.7,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Groq request failed.");
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(system, user, maxTokens, json) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          maxOutputTokens: Math.min(maxTokens, 8192),
          temperature: 0.7,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Gemini request failed.");
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
}

async function callAnthropic(system, user, maxTokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Anthropic request failed.");
  return data.content?.[0]?.text || "";
}

/**
 * Single-turn completion.
 * @param {string}  system
 * @param {string}  user
 * @param {object}  [opts]
 * @param {number}  [opts.maxTokens=4000]
 * @param {boolean} [opts.json=false]  request machine-readable output
 */
export async function askAI(system, user, { maxTokens = 4000, json = false } = {}) {
  if (!PROVIDER) {
    throw new Error(
      "No AI provider configured. Add a free Groq key as VITE_GROQ_KEY in Netlify, then redeploy."
    );
  }
  return withRetry(() => {
    if (PROVIDER === "groq")   return callGroq(system, user, maxTokens, json);
    if (PROVIDER === "gemini") return callGemini(system, user, maxTokens, json);
    return callAnthropic(system, user, maxTokens);
  });
}

/** Multi-turn chat for the assistant panel. */
export async function chatAI(system, messages, { maxTokens = 800 } = {}) {
  if (!PROVIDER) throw new Error("No AI provider configured.");

  return withRetry(async () => {
    if (PROVIDER === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: maxTokens,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.choices?.[0]?.message?.content || "";
    }

    if (PROVIDER === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            // Gemini names the assistant role "model"
            contents: messages.map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
          }),
        }
      );
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: maxTokens, system, messages }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return d.content?.[0]?.text || "";
  });
}

/** Pull a JSON value out of a model reply that may be fenced or prefixed. */
export function extractJSON(text) {
  let c = String(text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = c.search(/[[{]/);
  if (start === -1) throw new Error("The model did not return JSON.");
  c = c.slice(start);
  const end = Math.max(c.lastIndexOf("]"), c.lastIndexOf("}"));
  if (end !== -1) c = c.slice(0, end + 1);

  try { return JSON.parse(c); }
  catch {
    // JSON mode can still return {"questions": [...]}; unwrap a lone array.
    const obj = JSON.parse(c.replace(/,\s*([}\]])/g, "$1"));
    if (Array.isArray(obj)) return obj;
    const arr = Object.values(obj).find(Array.isArray);
    if (arr) return arr;
    return obj;
  }
}
