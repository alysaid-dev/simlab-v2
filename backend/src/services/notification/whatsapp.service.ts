import axios, { AxiosError } from "axios";
import { env } from "../../config/env.js";
import {
  approvalTemplate,
  loanCreatedTemplate,
  reminderTemplate,
  type ApprovalNotificationPayload,
  type LoanNotificationPayload,
  type ReminderNotificationPayload,
} from "./templates.js";

const FONNTE_ENDPOINT = "https://api.fonnte.com/send";

/**
 * Fonnte API response shape.
 * Docs: https://docs.fonnte.com/send-message/
 */
interface FonnteResponse {
  detail: string;
  id?: string[] | string;
  process?: string;
  status?: boolean;
  reason?: string;
}

export interface WhatsAppResult {
  id: string[];
  detail: string;
  ok: boolean;
}

/**
 * Normalise an Indonesian phone number to the 62... format that Fonnte expects.
 *   08xxx       -> 628xxx
 *   +628xxx     -> 628xxx
 *   8xxx        -> 628xxx   (already missing leading 0/+62)
 * Returns the digits-only string. Invalid input -> returns as-is (Fonnte will
 * reject, but we let the API produce the error for clearer logs).
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

/**
 * Send a WhatsApp message via Fonnte.
 * Throws on network / auth errors; returns delivery info on success.
 */
export async function sendWhatsApp(
  phone: string,
  message: string
): Promise<WhatsAppResult> {
  if (!env.fonnte.token) {
    throw new Error(
      "WhatsApp tidak terkonfigurasi — set FONNTE_TOKEN di .env"
    );
  }

  const target = normalisePhone(phone);

  try {
    const { data } = await axios.post<FonnteResponse>(
      FONNTE_ENDPOINT,
      // Fonnte accepts form-urlencoded or JSON; form-urlencoded is most
      // widely documented so we use URLSearchParams.
      new URLSearchParams({
        target,
        message,
        countryCode: "62",
      }),
      {
        headers: {
          Authorization: env.fonnte.token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15_000,
      }
    );

    // Fonnte returns 200 with status:false for some business-logic rejections
    // (e.g. number not registered on WhatsApp). Surface that as an error.
    if (data.status === false) {
      throw new Error(
        `Fonnte menolak pesan ke ${target}: ${data.reason ?? data.detail}`
      );
    }

    const ids = Array.isArray(data.id) ? data.id : data.id ? [data.id] : [];
    return {
      id: ids,
      detail: data.detail ?? "",
      ok: true,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data;
      throw new Error(
        `Fonnte request gagal (HTTP ${status ?? "?"}): ${JSON.stringify(body ?? err.message)}`
      );
    }
    throw err;
  }
}

// -----------------------------------------------------------------------------
// High-level senders — match the email service API surface.
// -----------------------------------------------------------------------------

export const whatsappNotifications = {
  loanCreated(
    phone: string,
    payload: LoanNotificationPayload
  ): Promise<WhatsAppResult> {
    return sendWhatsApp(phone, loanCreatedTemplate.whatsapp(payload));
  },

  approval(
    phone: string,
    payload: ApprovalNotificationPayload
  ): Promise<WhatsAppResult> {
    return sendWhatsApp(phone, approvalTemplate.whatsapp(payload));
  },

  reminder(
    phone: string,
    payload: ReminderNotificationPayload
  ): Promise<WhatsAppResult> {
    return sendWhatsApp(phone, reminderTemplate.whatsapp(payload));
  },
};
