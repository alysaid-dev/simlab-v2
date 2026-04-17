/**
 * Shared template helpers and payload types for email + WhatsApp notifications.
 *
 * Templates are kept side-by-side so email (HTML) and WhatsApp (plain text)
 * stay in sync when messaging changes.
 */

export interface LoanNotificationPayload {
  recipientName: string;
  assetName: string;
  loanType: "TA" | "PRACTICUM";
  startDate: Date;
  endDate: Date;
  thesisTitle?: string | null;
}

export interface ApprovalNotificationPayload {
  recipientName: string;
  assetName: string;
  approved: boolean;
  approverName: string;
  approverRole: string; // e.g. "Dosen Pembimbing" / "Kepala Laboratorium"
  notes?: string | null;
}

export interface ReminderNotificationPayload {
  recipientName: string;
  assetName: string;
  dueDate: Date;
}

// -----------------------------------------------------------------------------
// Formatting helpers
// -----------------------------------------------------------------------------

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DATETIME_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const fmtDate = (d: Date): string => DATE_FMT.format(d);
export const fmtDateTime = (d: Date): string => DATETIME_FMT.format(d);

const loanTypeLabel = (t: "TA" | "PRACTICUM"): string =>
  t === "TA" ? "Tugas Akhir" : "Praktikum";

// -----------------------------------------------------------------------------
// Email HTML shell — keeps all messages visually consistent
// -----------------------------------------------------------------------------

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#2563eb,#06b6d4);padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">SIMLAB UII</h1>
              <p style="margin:4px 0 0;color:#e0e7ff;font-size:13px;">Laboratorium Statistika — Universitas Islam Indonesia</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #e5e7eb;">
              Email ini dikirim otomatis oleh sistem SIMLAB. Mohon tidak membalas email ini.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// -----------------------------------------------------------------------------
// a) Peminjaman baru (sudah diajukan)
// -----------------------------------------------------------------------------

export const loanCreatedTemplate = {
  subject: (p: LoanNotificationPayload): string =>
    `[SIMLAB] Pengajuan peminjaman ${p.assetName} diterima`,

  html: (p: LoanNotificationPayload): string =>
    emailShell(
      "Pengajuan peminjaman diterima",
      `
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Halo ${p.recipientName},</h2>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
        Pengajuan peminjaman Anda telah kami terima dan sedang dalam proses verifikasi.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="background:#f9fafb;border-radius:8px;font-size:14px;color:#374151;margin:16px 0;">
        <tr><td style="width:140px;color:#6b7280;">Item</td><td style="font-weight:600;">${p.assetName}</td></tr>
        <tr><td style="color:#6b7280;">Jenis</td><td>${loanTypeLabel(p.loanType)}</td></tr>
        <tr><td style="color:#6b7280;">Mulai</td><td>${fmtDate(p.startDate)}</td></tr>
        <tr><td style="color:#6b7280;">Kembali</td><td>${fmtDate(p.endDate)}</td></tr>
        ${p.thesisTitle ? `<tr><td style="color:#6b7280;vertical-align:top;">Judul TA</td><td>${p.thesisTitle}</td></tr>` : ""}
      </table>
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#374151;">
        Anda akan menerima notifikasi berikutnya setelah pengajuan disetujui atau ditolak oleh dosen pembimbing / Kepala Laboratorium.
      </p>`
    ),

  whatsapp: (p: LoanNotificationPayload): string =>
    [
      `*SIMLAB UII — Pengajuan Diterima*`,
      ``,
      `Halo *${p.recipientName}*,`,
      `Pengajuan peminjaman Anda telah kami terima:`,
      ``,
      `📦 Item: *${p.assetName}*`,
      `📝 Jenis: ${loanTypeLabel(p.loanType)}`,
      `📅 Mulai: ${fmtDate(p.startDate)}`,
      `⏰ Kembali: ${fmtDate(p.endDate)}`,
      ...(p.thesisTitle ? [`🎓 Judul: ${p.thesisTitle}`] : []),
      ``,
      `Anda akan mendapat notifikasi setelah pengajuan disetujui.`,
      ``,
      `_Laboratorium Statistika UII_`,
    ].join("\n"),
};

// -----------------------------------------------------------------------------
// b) Persetujuan (disetujui / ditolak)
// -----------------------------------------------------------------------------

export const approvalTemplate = {
  subject: (p: ApprovalNotificationPayload): string =>
    p.approved
      ? `[SIMLAB] Peminjaman ${p.assetName} DISETUJUI`
      : `[SIMLAB] Peminjaman ${p.assetName} DITOLAK`,

  html: (p: ApprovalNotificationPayload): string => {
    const color = p.approved ? "#059669" : "#dc2626";
    const bg = p.approved ? "#d1fae5" : "#fee2e2";
    const badge = p.approved ? "DISETUJUI" : "DITOLAK";
    return emailShell(
      badge,
      `
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Halo ${p.recipientName},</h2>
      <div style="display:inline-block;padding:6px 14px;border-radius:9999px;background:${bg};color:${color};font-weight:700;font-size:13px;margin-bottom:16px;">${badge}</div>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">
        Pengajuan peminjaman <strong>${p.assetName}</strong> telah
        <strong style="color:${color};">${p.approved ? "disetujui" : "ditolak"}</strong>
        oleh <strong>${p.approverName}</strong> (${p.approverRole}).
      </p>
      ${
        p.notes
          ? `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:14px;color:#78350f;">
              <strong>Catatan:</strong><br/>${p.notes.replace(/\n/g, "<br/>")}
            </div>`
          : ""
      }
      <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#374151;">
        ${
          p.approved
            ? "Silakan menghubungi Laboran untuk proses serah terima."
            : "Anda dapat mengajukan kembali dengan memperhatikan catatan di atas."
        }
      </p>`
    );
  },

  whatsapp: (p: ApprovalNotificationPayload): string =>
    [
      `*SIMLAB UII — ${p.approved ? "DISETUJUI ✅" : "DITOLAK ❌"}*`,
      ``,
      `Halo *${p.recipientName}*,`,
      `Pengajuan peminjaman *${p.assetName}* telah ${p.approved ? "disetujui" : "ditolak"} oleh ${p.approverName} (${p.approverRole}).`,
      ...(p.notes ? [``, `📝 Catatan:`, p.notes] : []),
      ``,
      p.approved
        ? `Silakan hubungi Laboran untuk proses serah terima.`
        : `Anda dapat mengajukan kembali dengan memperhatikan catatan di atas.`,
      ``,
      `_Laboratorium Statistika UII_`,
    ].join("\n"),
};

// -----------------------------------------------------------------------------
// c) Reminder H-1 (batas kembali besok)
// -----------------------------------------------------------------------------

export const reminderTemplate = {
  subject: (p: ReminderNotificationPayload): string =>
    `[SIMLAB] Pengingat: ${p.assetName} harus dikembalikan besok`,

  html: (p: ReminderNotificationPayload): string =>
    emailShell(
      "Pengingat pengembalian",
      `
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Halo ${p.recipientName},</h2>
      <div style="display:inline-block;padding:6px 14px;border-radius:9999px;background:#fef3c7;color:#92400e;font-weight:700;font-size:13px;margin-bottom:16px;">PENGINGAT H-1</div>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
        Ini adalah pengingat bahwa <strong>${p.assetName}</strong> yang sedang Anda pinjam
        harus dikembalikan <strong>besok, ${fmtDate(p.dueDate)}</strong>.
      </p>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">
        Mohon kembalikan tepat waktu untuk menghindari denda keterlambatan.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:14px;color:#7c2d12;margin:16px 0;">
        <tr><td style="width:140px;">Item</td><td style="font-weight:600;">${p.assetName}</td></tr>
        <tr><td>Batas kembali</td><td style="font-weight:600;">${fmtDateTime(p.dueDate)}</td></tr>
      </table>`
    ),

  whatsapp: (p: ReminderNotificationPayload): string =>
    [
      `*SIMLAB UII — Pengingat H-1 ⏰*`,
      ``,
      `Halo *${p.recipientName}*,`,
      `Ini pengingat bahwa *${p.assetName}* yang sedang Anda pinjam harus dikembalikan *BESOK*:`,
      ``,
      `📅 ${fmtDate(p.dueDate)}`,
      `🕐 ${fmtDateTime(p.dueDate)}`,
      ``,
      `Mohon kembalikan tepat waktu untuk menghindari denda keterlambatan.`,
      ``,
      `_Laboratorium Statistika UII_`,
    ].join("\n"),
};
