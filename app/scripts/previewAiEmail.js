import { firstEmail, followUpEmail } from "../services/mail/template.js";
import { env } from "../config/env.js";

function parseArgs(argv) {
  const args = {};

  for (const item of argv) {
    if (!item.startsWith("--")) continue;

    const [key, ...rest] = item.slice(2).split("=");
    args[key] = rest.length ? rest.join("=") : "true";
  }

  return args;
}

function parseLeadArg(leadArg) {
  if (!leadArg) return {};

  try {
    return JSON.parse(leadArg);
  } catch {
    return {};
  }
}

function buildLead(args) {
  const jsonLead = parseLeadArg(args.lead);

  return {
    name: args.name || jsonLead.name || "Hiring Team",
    company: args.company || jsonLead.company || "Acme Inc",
    role: args.role || jsonLead.role || "Backend Intern",
    title: args.title || jsonLead.title || "Engineering",
    website: args.website || jsonLead.website || "",
    source: args.source || jsonLead.source || "manual",
    notes: args.notes || jsonLead.notes || ""
  };
}

function normalizeType(type) {
  if (!type) return "both";

  const value = String(type).toLowerCase();
  if (value === "followup") return "follow_up";
  if (value === "follow-up") return "follow_up";
  if (value === "first" || value === "follow_up" || value === "both") {
    return value;
  }

  return "both";
}

function toPositiveInteger(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return Math.floor(num);
}

function printEmail(kind, run, mail) {
  console.log("\n==============================");
  console.log(`Type: ${kind} | Run: ${run}`);
  console.log("==============================");
  console.log(`Subject: ${mail.subject}`);
  console.log("\nBody:\n");
  console.log(mail.body);

  if (mail.attachments?.length) {
    console.log("\nAttachments:");
    for (const attachment of mail.attachments) {
      console.log(`- ${attachment.filename} (${attachment.path})`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = normalizeType(args.type);
  const runs = toPositiveInteger(args.runs, 1);
  const lead = buildLead(args);

  if (!env.GOOGLE_AI_API_KEY) {
    console.log("GOOGLE_AI_API_KEY is missing. Output will use fallback templates.");
  }

  for (let i = 1; i <= runs; i += 1) {
    if (type === "first" || type === "both") {
      const first = await firstEmail(lead);
      printEmail("first", i, first);
    }

    if (type === "follow_up" || type === "both") {
      const follow = await followUpEmail(lead);
      printEmail("follow_up", i, follow);
    }
  }
}

main().catch((error) => {
  console.error("Failed to generate preview:", error?.message || error);
  process.exitCode = 1;
});