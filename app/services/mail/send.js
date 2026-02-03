import nodemailer from "nodemailer";
import { smtpConfig } from "../../config/mail.config.js";
import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport(smtpConfig);

export async function sendMail(
  to,
  subject,
  text,
  parentMessageId = null
) {
  const mailOptions = {
    from: `Anas <${smtpConfig.auth.user}>`,
    to,
    subject,
    text,
    headers: {
      'List-Unsubscribe': `<https://${env.LIVE}/unsubscribe?email=${env.EMAIL_USER}&token=UNSUBSCRIBE_TOKEN>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  };

  if (parentMessageId) {
    mailOptions.inReplyTo = parentMessageId;
    mailOptions.references = parentMessageId;
  }

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}