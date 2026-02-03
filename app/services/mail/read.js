import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { imapConfig } from "../../config/mail.config.js";
import { normalizeSubject } from "../../utils/normalizeSubject.js";

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
  const indexes = buildSentMailIndexes(sentMails);

  const conn = await imaps.connect(imapConfig);
  await conn.openBox("INBOX");
  
  const sinceDate = new Date('2026-02-01');
  const beforeDate = new Date('2026-02-04');
  // const cutoff = Date.now() - (6 * 60 * 60 * 1000);
  
  const messages = await conn.search(
    [
      "UNSEEN",
      // ['SINCE', new Date(cutoff)]
      ['SINCE', sinceDate],
      ['BEFORE', beforeDate]
    ],
    {
      bodies: ['HEADER', "TEXT"],
      // markSeen: true
    }
  );

  const replies = [];

  for (const msg of messages) {
    const part = msg.parts.find(p => p.which === "TEXT");
    const parsed = await simpleParser(part.body);

    const matchedMail = findMatchingSentMail(parsed, indexes);

    if (matchedMail) {
      replies.push({
        from: parsed.from.value[0].address,
        original_message_id: matchedMail.message_id,
        reply_subject: parsed.subject,
        reply_text: parsed.text
      });
    }
  }

  await conn.end();
  return replies;
}


function buildSentMailIndexes(sentMails) {
  const inbox = new Map();
  const subjectIndex = new Map();

  for (const mail of sentMails) {
    if (mail.message_id) {
      const key = mail.message_id;
      inbox.set(key, mail);
    }

    const subjectKey = makeHashKey(
      normalizeSubject(mail.subject),
      mail.to_email
    );
    subjectIndex.set(subjectKey, key);
  }

  return {
    inbox,
    subjectIndex
  };
}

function findMatchingSentMail(
  parsedMail,
  indexes
) {
  const { inbox, subjectIndex } = indexes;

  if (parsedMail.inReplyTo && store.has(parsedMail.inReplyTo)) {
    return store.get(parsedMail.inReplyTo);
  }

  if (parsedMail.references?.length) {
    for (const ref of parsedMail.references) {
      if (store.has(ref)) {
        return store.get(ref);
      }
    }
  }

  const subjectKey = makeHashKey(
    normalizeSubject(parsedMail.subject),
    parsedMail.from?.value?.[0]?.address
  );

  const key = subjectIndex.get(subjectKey);
  return key ? inbox.get(key) : null;
}
