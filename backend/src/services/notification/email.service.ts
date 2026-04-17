import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import {
  approvalTemplate,
  loanCreatedTemplate,
  reminderTemplate,
  type ApprovalNotificationPayload,
  type LoanNotificationPayload,
  type ReminderNotificationPayload,
} from "./templates.js";

/**
 * Gmail SMTP transporter — port 465, implicit SSL.
 * Credentials come from env (GMAIL_USER, GMAIL_APP_PASSWORD).
 *
 * The transporter is created lazily on first use so the process can still
 * boot without mail credentials configured (useful in tests / local dev).
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  if (!env.mail.user || !env.mail.appPassword) {
    throw new Error(
      "Email tidak terkonfigurasi — set GMAIL_USER dan GMAIL_APP_PASSWORD di .env"
    );
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true = SSL (port 465). For STARTTLS use port 587 + secure:false.
    auth: {
      user: env.mail.user,
      pass: env.mail.appPassword,
    },
  });
  return transporter;
}

export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

/**
 * Send a single email. Returns delivery info from the SMTP server.
 * Throws on transport errors or if all recipients are rejected.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<EmailResult> {
  const info = await getTransporter().sendMail({
    from: `"${env.mail.fromName}" <${env.mail.user}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
  });
  return {
    messageId: info.messageId,
    accepted: (info.accepted as (string | { address: string })[]).map((a) =>
      typeof a === "string" ? a : a.address
    ),
    rejected: (info.rejected as (string | { address: string })[]).map((a) =>
      typeof a === "string" ? a : a.address
    ),
  };
}

/**
 * Quickly verify SMTP credentials + connectivity. Useful at startup.
 */
export async function verifyEmailTransport(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch (err) {
    console.error("[email] verify failed:", err);
    return false;
  }
}

// -----------------------------------------------------------------------------
// High-level senders — one per notification type.
// Each returns silently on success and logs + rethrows on failure.
// -----------------------------------------------------------------------------

export const emailNotifications = {
  async loanCreated(
    to: string,
    payload: LoanNotificationPayload
  ): Promise<EmailResult> {
    return sendEmail(
      to,
      loanCreatedTemplate.subject(payload),
      loanCreatedTemplate.html(payload)
    );
  },

  async approval(
    to: string,
    payload: ApprovalNotificationPayload
  ): Promise<EmailResult> {
    return sendEmail(
      to,
      approvalTemplate.subject(payload),
      approvalTemplate.html(payload)
    );
  },

  async reminder(
    to: string,
    payload: ReminderNotificationPayload
  ): Promise<EmailResult> {
    return sendEmail(
      to,
      reminderTemplate.subject(payload),
      reminderTemplate.html(payload)
    );
  },
};
