import { env } from "./env.js";

export const smtpConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS
  }
};

export const imapConfig = {
  imap: {
    user: env.EMAIL_USER,
    password: env.EMAIL_PASS,
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    tls: true,
    authTimeout: 3000,
    tlsOptions: {
      rejectUnauthorized: false // TODO: Review security implications
    }
  }
};
