/**
 * Notification service entry point.
 *
 * Exposes one `notify*` helper per template that builds the message and
 * dispatches it to the configured email and WhatsApp transports. Transports
 * are wired in via `configureNotificationTransports` so this module stays
 * free of SMTP/WA SDK concerns.
 *
 * Each helper returns { email, whatsapp } where each value is a NotifyResult
 * describing whether the channel was sent, skipped (recipient missing or
 * transport unconfigured), or failed (with the error message).
 */

import * as t from './templates.js';

export * from './templates.js';

export type NotificationChannel = 'email' | 'whatsapp';

export type NotifyStatus = 'sent' | 'skipped' | 'failed';

export interface NotifyResult {
  status: NotifyStatus;
  /** Reason for skipped; message for failed; undefined when sent. */
  reason?: string;
}

export interface ChannelResults {
  email: NotifyResult;
  whatsapp: NotifyResult;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendWhatsAppInput {
  to: string;
  message: string;
}

/**
 * Transport functions return `true` when the message was actually sent, or
 * `false` when intentionally skipped (e.g. credentials not configured). They
 * should throw on actual delivery failure.
 */
export interface NotificationTransports {
  sendEmail?: (input: SendEmailInput) => Promise<boolean>;
  sendWhatsApp?: (input: SendWhatsAppInput) => Promise<boolean>;
}

let transports: NotificationTransports = {};

export function configureNotificationTransports(next: NotificationTransports): void {
  transports = next;
}

export interface Recipient {
  email?: string;
  phone?: string;
  channels?: NotificationChannel[];
}

async function sendOne(
  enabled: boolean,
  address: string | undefined,
  addressKind: 'email' | 'phone',
  send: (() => Promise<boolean>) | undefined,
): Promise<NotifyResult> {
  if (!enabled) return { status: 'skipped', reason: 'channel disabled' };
  if (!address) return { status: 'skipped', reason: `no ${addressKind}` };
  if (!send) return { status: 'skipped', reason: 'transport not configured' };
  try {
    const sent = await send();
    return sent ? { status: 'sent' } : { status: 'skipped', reason: 'transport skipped' };
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : String(err) };
  }
}

async function dispatch(
  recipient: Recipient,
  tpl: t.NotificationTemplate,
): Promise<ChannelResults> {
  const channels = recipient.channels ?? ['email', 'whatsapp'];
  const wantEmail = channels.includes('email');
  const wantWa = channels.includes('whatsapp');

  const [email, whatsapp] = await Promise.all([
    sendOne(
      wantEmail,
      recipient.email,
      'email',
      transports.sendEmail
        ? () => transports.sendEmail!({ to: recipient.email!, subject: tpl.subject, html: tpl.html })
        : undefined,
    ),
    sendOne(
      wantWa,
      recipient.phone,
      'phone',
      transports.sendWhatsApp
        ? () => transports.sendWhatsApp!({ to: recipient.phone!, message: tpl.whatsapp })
        : undefined,
    ),
  ]);

  return { email, whatsapp };
}

// ---------------------------------------------------------------------------
// Helpers — one per template.
// ---------------------------------------------------------------------------

export async function notifyLoanApprovalToDosen(
  recipient: Recipient,
  params: t.LoanApprovalToDosenParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanApprovalRequestToDosen(params));
}

export async function notifyLoanApprovalToKalab(
  recipient: Recipient,
  params: t.LoanApprovalToKalabParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanApprovalRequestToKalab(params));
}

export async function notifyRoomReservationToKalab(
  recipient: Recipient,
  params: t.RoomReservationToKalabParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.roomReservationToKalab(params));
}

export async function notifyClearanceLetterToKalab(
  recipient: Recipient,
  params: t.ClearanceLetterToKalabParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.clearanceLetterToKalab(params));
}

export async function notifyLoanApprovedToLaboran(
  recipient: Recipient,
  params: t.LoanApprovedToLaboranParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanApprovedToLaboran(params));
}

export async function notifyRoomReservationToLaboran(
  recipient: Recipient,
  params: t.RoomReservationToLaboranParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.roomReservationToLaboran(params));
}

export async function notifyClearanceLetterToLaboran(
  recipient: Recipient,
  params: t.ClearanceLetterToLaboranParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.clearanceLetterToLaboran(params));
}

export async function notifyLoanCreatedToMahasiswa(
  recipient: Recipient,
  params: t.LoanCreatedToMahasiswaParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanCreatedToMahasiswa(params));
}

export async function notifyLoanApprovedByDosenToMahasiswa(
  recipient: Recipient,
  params: t.LoanApprovedByDosenParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanApprovedByDosenToMahasiswa(params));
}

export async function notifyLoanApprovedByKalabToMahasiswa(
  recipient: Recipient,
  params: t.LoanApprovedByKalabParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanApprovedByKalabToMahasiswa(params));
}

export async function notifyClearanceCreatedToMahasiswa(
  recipient: Recipient,
  params: t.ClearanceCreatedToMahasiswaParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.clearanceCreatedToMahasiswa(params));
}

export async function notifyClearanceCheckedToMahasiswa(
  recipient: Recipient,
  params: t.ClearanceCheckedToMahasiswaParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.clearanceCheckedToMahasiswa(params));
}

export async function notifyClearanceIssuedToMahasiswa(
  recipient: Recipient,
  params: t.ClearanceIssuedToMahasiswaParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.clearanceIssuedToMahasiswa(params));
}

export async function notifyLoanReminderH2ToMahasiswa(
  recipient: Recipient,
  params: t.LoanReminderH2Params,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanReminderH2ToMahasiswa(params));
}

export async function notifyLoanOverdueToMahasiswa(
  recipient: Recipient,
  params: t.LoanOverdueParams,
): Promise<ChannelResults> {
  return dispatch(recipient, t.loanOverdueToMahasiswa(params));
}
