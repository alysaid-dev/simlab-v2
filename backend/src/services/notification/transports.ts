/**
 * Concrete email + WhatsApp transports, wired from env config.
 *
 * If SMTP / WA credentials are not set, the transport logs to stdout instead
 * of throwing — handy in dev without extra infra.
 */

import nodemailer, { type Transporter } from "nodemailer";
import axios from "axios";

import { env } from "../../config/env.js";
import type { SendEmailInput, SendWhatsAppInput } from "./index.js";

let mailer: Transporter | null = null;

function getMailer(): Transporter | null {
  if (mailer) return mailer;
  if (!env.smtp.host || !env.smtp.user) return null;
  mailer = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return mailer;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const transport = getMailer();
  if (!transport) {
    console.warn(
      `[notification] SMTP not configured — skipping email to ${input.to} (subject: ${input.subject})`
    );
    return false;
  }
  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.from}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  return true;
}

export async function sendWhatsApp(input: SendWhatsAppInput): Promise<boolean> {
  if (!env.whatsapp.apiUrl || !env.whatsapp.token) {
    console.warn(
      `[notification] WhatsApp API not configured — skipping WA to ${input.to}`
    );
    return false;
  }
  await axios.post(
    env.whatsapp.apiUrl,
    { target: input.to, message: input.message },
    {
      headers: {
        Authorization: env.whatsapp.token,
        "Content-Type": "application/json",
      },
      timeout: 15_000,
    }
  );
  return true;
}
