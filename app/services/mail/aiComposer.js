import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { buildVariantFallbackEmail } from "./fallbackVariant.js";

let client;

function getClient() {
  if (!env.GOOGLE_AI_API_KEY) return null;

  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });
  }

  return client;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function debugLog(reason, extra = "") {
  if (!env.AI_EMAIL_DEBUG) return;
  console.log(`[aiComposer] fallback: ${reason}${extra ? ` | ${extra}` : ""}`);
}

function extractText(result) {
  if (!result) return "";

  if (typeof result.text === "string") return result.text;
  if (typeof result.text === "function") {
    try {
      return result.text();
    } catch {
      return "";
    }
  }

  if (typeof result.response?.text === "string") return result.response.text;
  if (typeof result.response?.text === "function") {
    try {
      return result.response.text();
    } catch {
      return "";
    }
  }

  const candidates = result.candidates;
  if (Array.isArray(candidates)) {
    const chunks = [];

    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (!Array.isArray(parts)) continue;

      for (const part of parts) {
        if (typeof part?.text === "string" && part.text.length) {
          chunks.push(part.text);
        }
      }
    }

    if (chunks.length) {
      return chunks.join("\n");
    }
  }

  return "";
}

function parseModelJSON(raw) {
  if (!raw) return null;

  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : raw;

  // Try direct parsing first.
  try {
    return JSON.parse(candidate);
  } catch {
    // If model wraps extra text, parse the first JSON object block.
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;

    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      return null;
    }
  }
}

function parseLabeledText(raw) {
  if (!raw) return null;

  const subjectMatch = raw.match(/subject\s*:\s*(.+)/i);
  const bodyMatch = raw.match(/body\s*:\s*([\s\S]*)/i);

  if (!subjectMatch || !bodyMatch) return null;

  return {
    subject: clean(subjectMatch[1]),
    body: clean(bodyMatch[1])
  };
}

function unescapeJSONLikeString(value) {
  if (!value) return "";

  const trimmed = value.trim();

  try {
    return JSON.parse(`"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`);
  } catch {
    return trimmed
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"');
  }
}

function parseLooseJsonFields(raw) {
  if (!raw) return null;

  const subjectMatch = raw.match(/"subject"\s*:\s*"([\s\S]*?)"\s*,/i);
  const bodyMatch = raw.match(/"body"\s*:\s*"([\s\S]*?)"\s*\}?\s*$/i);

  if (!subjectMatch && !bodyMatch) return null;

  return {
    subject: clean(unescapeJSONLikeString(subjectMatch?.[1] || "")),
    body: clean(unescapeJSONLikeString(bodyMatch?.[1] || ""))
  };
}

function buildLeadContext(lead) {
  return {
    name: clean(lead?.name),
    company: clean(lead?.company),
    role: clean(lead?.role),
    title: clean(lead?.title),
    website: clean(lead?.website),
    source: clean(lead?.source),
    notes: clean(lead?.notes)
  };
}

function buildPrompt({ lead, kind, fallback }) {
  const leadContext = JSON.stringify(buildLeadContext(lead), null, 2);

  return [
    "This is the email i have to send to the companies for any opening to intern or entry-level role.",
    "Email should be concise, human-like, and professional cold mail to a recruiter or hiring manager asking for a brief chat",
    "I know that sending identical emails to multiple companies cause spam flag",
    "I have attached the template i want you to change these thing that will help reduce risk of getting flagged as spam:",
    "- Subject line",
    "- Opening sentence",
    "- Company mention",
    "- One custom line",
    "- Call-to-action wording",
    "Generate ONLY valid JSON with this exact shape:",
    '{"subject":"...","body":"..."}',
    "Rules:",
    "- Use plain text only (no markdown, no HTML).",
    `- Email type: ${kind}`,
    "Lead context:",
    leadContext,
    "If context is sparse, stay generic and polite.",
    "Template subject:",
    fallback.subject,
    "Template body:",
    fallback.body.trim()
  ].join("\n");
}

function buildFallbackFormatPrompt({ lead, kind, fallback }) {
  const leadContext = JSON.stringify(buildLeadContext(lead), null, 2);

  return [
    "Write one concise outreach email.",
    "Return output in this exact plain-text format:",
    "SUBJECT: <single line>",
    "BODY:",
    "<email body>",
    "Rules:",
    "- Keep body <= 120 words.",
    "- Human and professional tone.",
    "- No markdown, no HTML.",
    "- Do not invent facts.",
    `- Email type: ${kind}`,
    "Lead context:",
    leadContext,
    "Fallback subject:",
    fallback.subject,
    "Fallback body:",
    fallback.body.trim()
  ].join("\n");
}

async function requestModel(ai, prompt, preferJson) {
  return ai.models.generateContent({
    model: env.GOOGLE_AI_MODEL,
    contents: prompt,
    config: {
      ...(preferJson ? { responseMimeType: "application/json" } : {}),
      temperature: 0.7,
      // maxOutputTokens: 500
    }
  });
}

export async function generateEmailFromAI({ lead, kind, fallback }) {
  const variantFallback = buildVariantFallbackEmail({ lead, kind, fallback });
  const ai = getClient();
  if (!ai || !env.GOOGLE_AI_MODEL) {
    debugLog("missing-ai-config");
    return variantFallback;
  }

  try {
    const prompt = buildPrompt({ lead, kind, fallback });

    const result = await requestModel(ai, prompt, true);

    const text = extractText(result);
    const parsed = parseModelJSON(text);

    let subject = clean(parsed?.subject);
    let body = clean(parsed?.body);

    if (!subject || !body) {
      const loose = parseLooseJsonFields(text);
      subject = subject || clean(loose?.subject);
      body = body || clean(loose?.body);
    }

    if (!subject || !body) {
      debugLog("invalid-json", text ? text.slice(0, 120) : "empty-response");

      // Retry using a rigid plain-text format if JSON output is malformed.
      const fallbackFormatPrompt = buildFallbackFormatPrompt({
        lead,
        kind,
        fallback
      });
      const retryResult = await requestModel(ai, fallbackFormatPrompt, false);
      const retryText = extractText(retryResult);
      const retryParsed = parseLabeledText(retryText);
      const retryLoose = parseLooseJsonFields(retryText);

      subject = clean(retryParsed?.subject || retryLoose?.subject);
      body = clean(retryParsed?.body || retryLoose?.body);
    }

    if (!subject || !body) {
      debugLog("missing-subject-or-body");
      return variantFallback;
    }

    return {
      ...fallback,
      subject,
      body
    };
  } catch (error) {
    debugLog("request-error", error?.message || "unknown");
    return variantFallback;
  }
}
