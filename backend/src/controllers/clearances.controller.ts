import { ClearanceStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { clearancesService } from "../services/clearances.service.js";
import { usersService } from "../services/users.service.js";
import { hasAnyRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  notifyClearanceCheckedToKepalaLab,
  notifyClearanceCheckedToMahasiswa,
  notifyClearanceCreatedToLaboran,
  notifyClearanceCreatedToMahasiswa,
  notifyClearanceIssuedToMahasiswa,
  notifyClearanceRejectedToMahasiswa,
} from "../services/notification/index.js";
import { fmtTanggalID } from "../services/clearancePdf.service.js";
import * as fs from "node:fs";
import * as path from "node:path";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(ClearanceStatus).optional(),
  userId: z.string().uuid().optional(),
});

const createBody = z.object({
  notes: z.string().optional(),
  tanggalSidang: z.string().optional(),
});

// Transisi yang valid dari laboran/kalab:
//   PENDING_LABORAN  → PENDING_KEPALA_LAB  (laboran approve)
//   PENDING_LABORAN  → REJECTED            (laboran tolak)
//   PENDING_KEPALA_LAB → APPROVED          (kalab approve → generate PDF)
//   PENDING_KEPALA_LAB → REJECTED          (kalab tolak)
const statusBody = z.object({
  status: z.nativeEnum(ClearanceStatus),
  rejectionReason: z.string().optional(),
});

function tanggalSidangStr(d: Date | null | undefined): string {
  if (!d) return "-";
  return fmtTanggalID(d);
}

async function findAllLaboran() {
  return prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: "LABORAN" } } } },
    select: { displayName: true, email: true, waNumber: true },
  });
}

async function findAllKepalaLab() {
  return prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { name: "KEPALA_LAB" } } } },
    select: { displayName: true, email: true, waNumber: true },
  });
}

export const clearancesController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await clearancesService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const letter = await clearancesService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = letter.userId === requester.id;
    if (!isOwner && !hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")) {
      throw new HttpError(403, "Anda tidak berhak melihat surat ini");
    }
    res.json(letter);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);

    // Server-side guard: tolak bila masih ada peminjaman aktif.
    const obligations = await usersService.getObligations(requester.id);
    if (obligations.hasObligations) {
      throw new HttpError(
        409,
        "Tidak dapat mengajukan surat bebas lab — masih terdapat peminjaman aktif",
        obligations.details,
      );
    }

    const tanggalSidang = body.tanggalSidang
      ? new Date(body.tanggalSidang)
      : undefined;

    const letter = await clearancesService.create({
      userId: requester.id,
      notes: body.notes,
      tanggalSidang,
    });

    const tglStr = tanggalSidangStr(tanggalSidang ?? null);

    // Notif ke mahasiswa (konfirmasi pengajuan).
    void notifyClearanceCreatedToMahasiswa(
      { email: requester.email, phone: requester.waNumber ?? undefined },
      {
        namaMahasiswa: requester.displayName,
        nim: requester.uid,
        tanggalSidang: tglStr,
      },
    );

    // Notif ke SEMUA laboran aktif — pemeriksaan tanggungan.
    const laborans = await findAllLaboran();
    for (const l of laborans) {
      if (!l.email && !l.waNumber) continue;
      void notifyClearanceCreatedToLaboran(
        { email: l.email ?? undefined, phone: l.waNumber ?? undefined },
        {
          laboranName: l.displayName,
          namaMahasiswa: requester.displayName,
          nim: requester.uid,
          tanggalSidang: tglStr,
        },
      );
    }

    res.status(201).json(letter);
  }),

  // Route guard restricts this to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const body = statusBody.parse(req.body);
    const approver = await usersService.getByUid(req.user!.uid);
    const current = await clearancesService.getById(req.params.id!);
    const owner = current.user;
    const recipient = {
      email: owner.email,
      phone: owner.waNumber ?? undefined,
    };
    const tglStr = tanggalSidangStr(current.tanggalSidang);

    if (body.status === ClearanceStatus.PENDING_KEPALA_LAB) {
      // Tahap 1: Laboran approve → PENDING_KEPALA_LAB.
      if (current.status !== ClearanceStatus.PENDING_LABORAN) {
        throw new HttpError(409, "Transisi tidak valid — surat tidak menunggu laboran");
      }
      const letter = await clearancesService.approveByLaboran(
        current.id,
        approver.uid,
      );

      // Notif mahasiswa — sudah diperiksa laboran.
      void notifyClearanceCheckedToMahasiswa(recipient, {
        namaMahasiswa: owner.displayName,
        nim: owner.uid,
        tanggalSidang: tglStr,
        diperiksaOleh: approver.displayName,
      });

      // Notif semua kepala lab.
      const kalabs = await findAllKepalaLab();
      for (const k of kalabs) {
        if (!k.email && !k.waNumber) continue;
        void notifyClearanceCheckedToKepalaLab(
          { email: k.email ?? undefined, phone: k.waNumber ?? undefined },
          {
            kalabName: k.displayName,
            namaMahasiswa: owner.displayName,
            nim: owner.uid,
            tanggalSidang: tglStr,
            diperiksaOleh: approver.displayName,
          },
        );
      }

      res.json(letter);
      return;
    }

    if (body.status === ClearanceStatus.APPROVED) {
      // Tahap 2: Kepala Lab approve → APPROVED + generate PDF.
      if (current.status !== ClearanceStatus.PENDING_KEPALA_LAB) {
        throw new HttpError(409, "Transisi tidak valid — surat belum diperiksa laboran");
      }
      const letter = await clearancesService.approveByKepalaLab(
        current.id,
        approver.uid,
        approver.id,
      );

      // Resolve laboran displayName — letter hanya menyimpan UID-nya.
      const laboranName = letter.signerUidLaboran
        ? await usersService
            .getByUid(letter.signerUidLaboran)
            .then((u) => u.displayName)
            .catch(() => letter.signerUidLaboran!)
        : "-";

      // Email + PDF attachment.
      if (letter.pdfUrl && fs.existsSync(letter.pdfUrl)) {
        void notifyClearanceIssuedToMahasiswa(
          recipient,
          {
            namaMahasiswa: owner.displayName,
            nim: owner.uid,
            tanggalSidang: tglStr,
            nomorSurat: letter.nomorSurat ?? "-",
            penandatangan1: approver.displayName,
            penandatangan2: laboranName,
          },
          [
            {
              filename: `SuratBebasLab-${owner.uid}.pdf`,
              path: letter.pdfUrl,
              contentType: "application/pdf",
            },
          ],
        );
      } else {
        void notifyClearanceIssuedToMahasiswa(recipient, {
          namaMahasiswa: owner.displayName,
          nim: owner.uid,
          tanggalSidang: tglStr,
          nomorSurat: letter.nomorSurat ?? "-",
          penandatangan1: approver.displayName,
          penandatangan2: laboranName,
        });
      }

      res.json(letter);
      return;
    }

    if (body.status === ClearanceStatus.REJECTED) {
      const tahap: "Laboran" | "Kepala Laboratorium" =
        current.status === ClearanceStatus.PENDING_LABORAN
          ? "Laboran"
          : "Kepala Laboratorium";
      const letter = await clearancesService.reject(
        current.id,
        body.rejectionReason,
      );
      void notifyClearanceRejectedToMahasiswa(recipient, {
        namaMahasiswa: owner.displayName,
        alasan: body.rejectionReason ?? "-",
        ditolakOleh: approver.displayName,
        tahap,
      });
      res.json(letter);
      return;
    }

    throw new HttpError(400, "Status tujuan tidak didukung pada endpoint ini");
  }),

  download: asyncHandler(async (req, res) => {
    const letter = await clearancesService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = letter.userId === requester.id;
    if (!isOwner && !hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")) {
      throw new HttpError(403, "Anda tidak berhak mengunduh surat ini");
    }
    const pdfPath = await clearancesService.ensurePdf(letter.id);
    const filename = `SuratBebasLab-${letter.user.uid}-${letter.nomorSurat?.replace(/\//g, "-") ?? letter.id}.pdf`;
    res.download(path.resolve(pdfPath), filename);
  }),
};
