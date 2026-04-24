/**
 * Concrete email + WhatsApp transports, wired from env config.
 *
 * If SMTP / WA credentials are not set, the transport logs to stdout instead
 * of throwing — handy in dev without extra infra.
 */

import nodemailer, { type Transporter } from "nodemailer";
import axios, { AxiosError } from "axios";

import { env } from "../../config/env.js";
import type { SendEmailInput, SendWhatsAppInput } from "./index.js";

const WA_MAX_ATTEMPTS = 3;
// Backoff sebelum attempt ke-N (index = attempt - 1). Attempt pertama
// tanpa delay. Total worst-case ~4 detik sebelum give up — Fonnte biasanya
// recover dari transient 5xx dalam beberapa detik.
const WA_BACKOFF_MS = [0, 1000, 3000] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      path: a.path,
      contentType: a.contentType,
    })),
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
  // Fonnte API kadang balas 502 Bad Gateway transient — retry 5xx / network
  // error, jangan retry 4xx (request salah / auth expired — retry percuma).
  let lastErr: unknown;
  for (let attempt = 1; attempt <= WA_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      const delay = WA_BACKOFF_MS[attempt - 1] ?? 0;
      console.warn(
        `[fonnte] retry ${attempt}/${WA_MAX_ATTEMPTS} for ${input.to} after ${delay}ms`,
      );
      await sleep(delay);
    }
    try {
      await axios.post(
        env.whatsapp.apiUrl,
        { target: input.to, message: input.message },
        {
          headers: {
            Authorization: env.whatsapp.token,
            "Content-Type": "application/json",
          },
          timeout: 15_000,
        },
      );
      return true;
    } catch (err) {
      lastErr = err;
      const ax = err as AxiosError;
      const status = ax.response?.status;
      // Retriable: no response (network/timeout) atau 5xx dari Fonnte.
      const retriable = status === undefined || status >= 500;
      if (!retriable) break;
    }
  }
  throw lastErr;
}
