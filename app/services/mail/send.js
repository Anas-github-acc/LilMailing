import nodemailer from "nodemailer";
import { smtpConfig } from "../../config/mail.config.js";
import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendMail(
  to,
  subject,
  text,
  options = {}
) {
  const normalizedOptions =
    typeof options === "string"
      ? { inReplyTo: options, references: options }
      : options || {};


  const mailOptions = {
    from: `Anas <${smtpConfig.auth.user}>`,
    to,
    subject,
    text,
    attachments: normalizedOptions.attachments,
    headers: {
      'List-Unsubscribe': `<https://${env.LIVE}/unsubscribe?email=${env.EMAIL_USER}&token=UNSUBSCRIBE_TOKEN>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };

  if (normalizedOptions.inReplyTo) {
    mailOptions.inReplyTo = normalizedOptions.inReplyTo;
    mailOptions.references =
      normalizedOptions.references || normalizedOptions.inReplyTo;
  }

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}