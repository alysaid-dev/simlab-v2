/**
 * Unified notification API — fires both email and WhatsApp in parallel, and
 * NEVER lets one channel's failure block the other. Individual failures are
 * logged but do not throw, because we don't want a stale phone number to
 * prevent an approval email from being sent (or vice versa).
 */

import { emailNotifications } from "./email.service.js";
import { whatsappNotifications } from "./whatsapp.service.js";
import type {
  ApprovalNotificationPayload,
  LoanNotificationPayload,
  ReminderNotificationPayload,
} from "./templates.js";

export interface NotifyRecipient {
  email?: string | null;
  phone?: string | null;
}

export interface NotifyResult {
  email: { ok: boolean; error?: string };
  whatsapp: { ok: boolean; error?: string };
}

async function runChannel(
  channel: "email" | "whatsapp",
  task: () => Promise<unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await task();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[notify:${channel}]`, message);
    return { ok: false, error: message };
  }
}

export const notifications = {
  async loanCreated(
    to: NotifyRecipient,
    payload: LoanNotificationPayload
  ): Promise<NotifyResult> {
    const [email, whatsapp] = await Promise.all([
      to.email
        ? runChannel("email", () =>
            emailNotifications.loanCreated(to.email as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no email" }),
      to.phone
        ? runChannel("whatsapp", () =>
            whatsappNotifications.loanCreated(to.phone as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no phone" }),
    ]);
    return { email, whatsapp };
  },

  async approval(
    to: NotifyRecipient,
    payload: ApprovalNotificationPayload
  ): Promise<NotifyResult> {
    const [email, whatsapp] = await Promise.all([
      to.email
        ? runChannel("email", () =>
            emailNotifications.approval(to.email as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no email" }),
      to.phone
        ? runChannel("whatsapp", () =>
            whatsappNotifications.approval(to.phone as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no phone" }),
    ]);
    return { email, whatsapp };
  },

  async reminder(
    to: NotifyRecipient,
    payload: ReminderNotificationPayload
  ): Promise<NotifyResult> {
    const [email, whatsapp] = await Promise.all([
      to.email
        ? runChannel("email", () =>
            emailNotifications.reminder(to.email as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no email" }),
      to.phone
        ? runChannel("whatsapp", () =>
            whatsappNotifications.reminder(to.phone as string, payload)
          )
        : Promise.resolve({ ok: false, error: "no phone" }),
    ]);
    return { email, whatsapp };
  },
};

export { emailNotifications } from "./email.service.js";
export { whatsappNotifications } from "./whatsapp.service.js";
export * from "./templates.js";
