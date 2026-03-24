import dns from "dns/promises";
import { env } from "../config/env.js";

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com"
];

const extraDisposableDomains = (env.DISPOSABLE_EMAIL_DOMAINS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const disposableDomainSet = new Set([
  ...DEFAULT_DISPOSABLE_DOMAINS,
  ...extraDisposableDomains
]);

const mxLookupCache = new Map();

export function isValidEmailFormat(email) {
  return EMAIL_FORMAT_REGEX.test(String(email || "").trim());
}

export function isValidEmail(email) {
  return isValidEmailFormat(email);
}

export function isDisposableEmail(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  return disposableDomainSet.has(domain);
}

async function resolveMxWithTimeout(domain) {
  const timeoutMs = env.EMAIL_MX_LOOKUP_TIMEOUT_MS;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return dns.resolveMx(domain);
  }

  return Promise.race([
    dns.resolveMx(domain),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("mx-lookup-timeout")), timeoutMs);
    })
  ]);
}

export async function hasMXRecord(email) {
  const domain = String(email || "").split("@")[1]?.toLowerCase();
  if (!domain) {
    return false;
  }

  if (mxLookupCache.has(domain)) {
    return mxLookupCache.get(domain);
  }

  try {
    const mxRecords = await resolveMxWithTimeout(domain);
    const hasMx = Array.isArray(mxRecords) && mxRecords.length > 0;
    mxLookupCache.set(domain, hasMx);
    return hasMx;
  } catch {
    mxLookupCache.set(domain, false);
    return false;
  }
}

export async function validateRecipientDeliverability(email) {
  if (!isValidEmailFormat(email)) {
    return {
      ok: false,
      reason: "invalid_format"
    };
  }

  if (isDisposableEmail(email)) {
    return {
      ok: false,
      reason: "disposable_domain"
    };
  }

  const hasMx = await hasMXRecord(email);
  if (!hasMx) {
    return {
      ok: false,
      reason: "missing_mx"
    };
  }

  return {
    ok: true,
    reason: "deliverable"
  };
}

export function __clearEmailValidationCache() {
  mxLookupCache.clear();
}
