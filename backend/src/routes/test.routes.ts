/**
 * ⚠️  TEST-ONLY ROUTES — REMOVE BEFORE PRODUCTION.
 *
 * POST /api/test/send-notification
 * Body: { template: string, email?: string, phone?: string }
 *
 * Sends the requested template to the given email and/or WhatsApp number
 * using hard-coded dummy data. Intended for verifying templates & delivery
 * during development only.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";

import * as notif from "../services/notification/index.js";

const router = Router();

const templateSchema = z.enum([
  "loanApprovalToDosen",
  "loanApprovalToKalab",
  "roomReservationToKalab",
  "clearanceToKalab",
  "loanApprovedToLaboran",
  "roomReservationToLaboran",
  "clearanceToLaboran",
  "loanCreatedToMahasiswa",
  "loanApprovedByDosenToMahasiswa",
  "loanApprovedByKalabToMahasiswa",
  "clearanceCreatedToMahasiswa",
  "clearanceCheckedToMahasiswa",
  "clearanceIssuedToMahasiswa",
  "loanReminderH2ToMahasiswa",
  "loanOverdueToMahasiswa",
]);

const bodySchema = z
  .object({
    template: templateSchema,
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
  })
  .refine((v) => v.email || v.phone, {
    message: "email atau phone wajib diisi",
  });

type TemplateName = z.infer<typeof templateSchema>;

// Dummy data mirroring the draft examples.
const DUMMY = {
  dosenName: "Abdullah Ahmad Dzikrullah, S.Si., M.Sc.",
  kalabName: "Ghiffari Ahnaf Danarwindu, M.Sc.",
  laboranName: "Ridhani Anggit Safitri, A.Md",
  laboranName2: "Rizal Pratama Putra, S.T",
  namaMahasiswa: "Putriana Dwi Agustin",
  nim: "22611147",
  kodeLaptop: "LY0012",
  namaLaptop: "Lenovo Yoga Pro 7",
  ruangan: "Laboratorium Sains Data",
  ruanganBIS: "Laboratorium BIS",
  tanggalSidang: "15 April 2026",
  tanggalJatuhTempo: "10 April 2026",
  tanggalHarusKembali: "15 Agustus 2026",
  tanggalPinjam: "15 April 2026",
  waktuPinjam: "09.00 – 12.00 WIB",
  waktuPengajuan: "08 April 2026 pukul 09.47 WIB",
  waktuPersetujuanDosen: "15 Maret 2026 15:34:45",
  waktuPersetujuanKalab: "16 Maret 2026 15:34:45",
  waktuPemeriksaan: "20 Mei 2026 14:23:20 WIB",
  diperiksaOlehLaboran: "Ridhani Anggit Safitri, A.Md",
  diperiksaOlehLaboran2: "Rizal Pratama Putra, S.T",
  disetujuiDosen: "Kariyam, Dr., S.Si., M.Si.",
  disetujuiKalab: "Ghiffari Ahnaf Danarwindu, M.Sc",
  nomorSurat: "045/Lab.Stat/FMIPA-UII/IV/2026",
};

function buildDispatcher(
  template: TemplateName,
  recipient: notif.Recipient,
): Promise<notif.DispatchResult> {
  switch (template) {
    case "loanApprovalToDosen":
      return notif.notifyLoanApprovalRequestToDosen(recipient, {
        dosenName: DUMMY.dosenName,
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
      });
    case "loanApprovalToKalab":
      return notif.notifyLoanApprovalRequestToKalab(recipient, {
        kalabName: DUMMY.kalabName,
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        disetujuiOleh: DUMMY.disetujuiDosen,
        waktuPersetujuan: DUMMY.waktuPersetujuanDosen,
      });
    case "roomReservationToKalab":
      return notif.notifyRoomReservationToKalab(recipient, {
        kalabName: DUMMY.kalabName,
        namaPemohon: DUMMY.namaMahasiswa,
        nomorInduk: DUMMY.nim,
        ruangan: DUMMY.ruangan,
        diperiksaOleh: DUMMY.diperiksaOlehLaboran2,
      });
    case "clearanceToKalab":
      return notif.notifyClearanceLetterToKalab(recipient, {
        kalabName: DUMMY.kalabName,
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        tanggalSidang: DUMMY.tanggalSidang,
        diperiksaOleh: DUMMY.diperiksaOlehLaboran,
        waktuPemeriksaan: DUMMY.waktuPemeriksaan,
      });
    case "loanApprovedToLaboran":
      return notif.notifyLoanApprovedToLaboran(recipient, {
        laboranName: DUMMY.laboranName2,
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
      });
    case "roomReservationToLaboran":
      return notif.notifyRoomReservationToLaboran(recipient, {
        laboranName: DUMMY.laboranName,
        namaPemohon: DUMMY.namaMahasiswa,
        nomorInduk: DUMMY.nim,
        ruangan: DUMMY.ruanganBIS,
        tanggalPinjam: DUMMY.tanggalPinjam,
        waktuPinjam: DUMMY.waktuPinjam,
        waktuPengajuan: DUMMY.waktuPengajuan,
      });
    case "clearanceToLaboran":
      return notif.notifyClearanceLetterToLaboran(recipient, {
        laboranName: DUMMY.laboranName,
        namaPemohon: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        tanggalSidang: DUMMY.tanggalSidang,
        waktuPengajuan: DUMMY.waktuPengajuan,
      });
    case "loanCreatedToMahasiswa":
      return notif.notifyLoanCreatedToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
      });
    case "loanApprovedByDosenToMahasiswa":
      return notif.notifyLoanApprovedByDosenToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
        disetujuiOleh: DUMMY.disetujuiDosen,
        waktuPersetujuan: DUMMY.waktuPersetujuanDosen,
      });
    case "loanApprovedByKalabToMahasiswa":
      return notif.notifyLoanApprovedByKalabToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
        disetujuiOleh: DUMMY.disetujuiKalab,
        waktuPersetujuan: DUMMY.waktuPersetujuanKalab,
      });
    case "clearanceCreatedToMahasiswa":
      return notif.notifyClearanceCreatedToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        tanggalSidang: DUMMY.tanggalSidang,
      });
    case "clearanceCheckedToMahasiswa":
      return notif.notifyClearanceCheckedToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        tanggalSidang: DUMMY.tanggalSidang,
        diperiksaOleh: DUMMY.diperiksaOlehLaboran2,
      });
    case "clearanceIssuedToMahasiswa":
      return notif.notifyClearanceIssuedToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        nim: DUMMY.nim,
        tanggalSidang: DUMMY.tanggalSidang,
        nomorSurat: DUMMY.nomorSurat,
        penandatangan1: DUMMY.diperiksaOlehLaboran2,
        penandatangan2: DUMMY.kalabName,
      });
    case "loanReminderH2ToMahasiswa":
      return notif.notifyLoanReminderH2ToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
        tanggalJatuhTempo: DUMMY.tanggalJatuhTempo,
      });
    case "loanOverdueToMahasiswa":
      return notif.notifyLoanOverdueToMahasiswa(recipient, {
        namaMahasiswa: DUMMY.namaMahasiswa,
        kodeLaptop: DUMMY.kodeLaptop,
        namaLaptop: DUMMY.namaLaptop,
        tanggalHarusKembali: DUMMY.tanggalHarusKembali,
      });
  }
}

router.post("/send-notification", async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "ValidationError",
      issues: parsed.error.issues,
    });
  }

  const { template, email, phone } = parsed.data;
  const recipient: notif.Recipient = { email, phone };

  try {
    const result = await buildDispatcher(template, recipient);
    return res.json({
      ok: true,
      template,
      sent: result,
      recipient: { email: email ?? null, phone: phone ?? null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test/send-notification] dispatch failed:", err);
    return res.status(500).json({ ok: false, error: message });
  }
});

router.get("/templates", (_req, res) => {
  res.json({ templates: templateSchema.options });
});

export default router;
