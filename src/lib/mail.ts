import nodemailer from "nodemailer";

const PLACEHOLDER_DOMAIN = "@mafiateam.local";

export type SendMailResult =
  | { delivered: true }
  | { delivered: false; skipped: "placeholder" | "unconfigured" | "error" };

export function isDeliverableEmail(email: string) {
  return Boolean(email) && !email.toLowerCase().endsWith(PLACEHOLDER_DOMAIN);
}

function mailFrom() {
  return process.env.MAIL_FROM || process.env.SMTP_USER || "MafiaTeam <noreply@mafiabazi.fly.dev>";
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function mailConfigured() {
  return smtpConfigured();
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendMailResult> {
  if (!isDeliverableEmail(input.to)) {
    return { delivered: false, skipped: "placeholder" };
  }
  if (!smtpConfigured()) {
    console.info("[mail] SMTP is not configured; skipping send", {
      to: input.to,
      subject: input.subject,
    });
    return { delivered: false, skipped: "unconfigured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 12_000,
    });
    await transporter.sendMail({
      from: mailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    console.info("[mail] sent", { to: input.to, subject: input.subject });
    return { delivered: true };
  } catch (error) {
    console.error("[mail] send failed", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : error,
    });
    return { delivered: false, skipped: "error" };
  }
}
