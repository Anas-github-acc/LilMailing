import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { imapConfig } from "../../config/mail.config.js";
import { env } from "../../config/env.js";

/**
 * sentMails = [
 *   {
 *     to_email: "hr@company.com",
 *     message_id: "<abc123@gmail.com>",
 *     subject: "Frontend Internship Opportunity"
 *   }
 * ]
 */
export async function fetchReplies(sentMails = []) {
  if (!sentMails.length) {
    return [];
  }

  const indexes = buildSentMailIndexes(sentMails);
  if (!indexes.messageIdIndex.size) {
    return [];
  }

  const conn = await imaps.connect(imapConfig);
  try {
    await conn.openBox("INBOX");

    const lookbackDays = env.REPLY_LOOKBACK_DAYS;
    const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const messages = await findCandidateReplies(conn, indexes.searchMessageIds, sinceDate);
    const replies = [];

    for (const msg of messages) {
      const part = msg.parts.find((p) => p.which === "");
      if (!part?.body) {
        continue;
      }

      const parsed = await simpleParser(part.body);
      const matchedMail = findMatchingSentMail(parsed, indexes);

      if (matchedMail) {
        replies.push({
          from: parsed.from?.value?.[0]?.address,
          original_message_id: matchedMail.message_id,
          reply_subject: parsed.subject,
          reply_text: parsed.text
        });
      }
    }

    return replies;
  } finally {
    await conn.end();
  }
}


function buildSentMailIndexes(sentMails) {
  const messageIdIndex = new Map();
  const searchMessageIds = [];
  const seenSearchIds = new Set();

  for (const mail of sentMails) {
    const rawMessageId = pickFirstMessageId(mail.message_id);
    const key = normalizeMessageId(rawMessageId);

    if (key) {
      messageIdIndex.set(key, mail);

      if (!seenSearchIds.has(key)) {
        seenSearchIds.add(key);
        searchMessageIds.push(rawMessageId);
      }
    }
  }

  return {
    messageIdIndex,
    searchMessageIds
  };
}

async function findCandidateReplies(conn, messageIds, sinceDate) {
  const uniqueByUid = new Map();

  for (const messageId of messageIds) {
    const inReplyToMessages = await conn.search(
      [["SINCE", sinceDate], ["HEADER", "IN-REPLY-TO", messageId]],
      { bodies: [""], struct: true }
    );

    for (const msg of inReplyToMessages) {
      uniqueByUid.set(msg.attributes.uid, msg);
    }

    const referenceMessages = await conn.search(
      [["SINCE", sinceDate], ["HEADER", "REFERENCES", messageId]],
      { bodies: [""], struct: true }
    );

    for (const msg of referenceMessages) {
      uniqueByUid.set(msg.attributes.uid, msg);
    }
  }

  return Array.from(uniqueByUid.values());
}

function findMatchingSentMail(
  parsedMail,
  indexes
) {
  const { messageIdIndex } = indexes;
  const ids = collectReplyMessageIds(parsedMail);

  for (const id of ids) {
    const key = normalizeMessageId(id);
    if (key && messageIdIndex.has(key)) {
      return messageIdIndex.get(key);
    }
  }

  return null;
}

function collectReplyMessageIds(parsedMail) {
  const ids = [];

  if (parsedMail.inReplyTo) {
    ids.push(...extractMessageIds(parsedMail.inReplyTo));
  }

  const references = Array.isArray(parsedMail.references)
    ? parsedMail.references
    : parsedMail.references
      ? [parsedMail.references]
      : [];

  if (references.length) {
    for (const ref of references) {
      ids.push(...extractMessageIds(ref));
    }
  }

  return ids;
}

function extractMessageIds(value) {
  if (!value) {
    return [];
  }

  const text = Array.isArray(value) ? value.join(" ") : String(value);
  const bracketedIds = text.match(/<[^<>\s]+>/g);

  if (bracketedIds?.length) {
    return bracketedIds;
  }

  const fallback = text.trim();
  return fallback ? [fallback] : [];
}

function normalizeMessageId(value) {
  const first = pickFirstMessageId(value);
  return first ? first.trim().toLowerCase() : null;
}

function pickFirstMessageId(value) {
  const [first] = extractMessageIds(value);
  return first || null;
}
