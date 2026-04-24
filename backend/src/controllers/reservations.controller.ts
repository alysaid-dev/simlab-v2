import path from "node:path";
import fs from "node:fs";
import { ReservationStatus } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { reservationsService } from "../services/reservations.service.js";
import { usersService } from "../services/users.service.js";
import { hasAnyRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fmtDateTime } from "../utils/format.js";

// ---------------------------------------------------------------------------
// Multer: upload surat permohonan (PDF, max 200KB)
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.resolve("uploads/reservations");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    const stamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    cb(null, `surat-${stamp}-${rand}${ext}`);
  },
});

export const reservationUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new HttpError(400, "File harus berformat PDF"));
      return;
    }
    cb(null, true);
  },
});
import {
  notifyRoomReservationApprovedToLaboran,
  notifyRoomReservationCheckedToMahasiswa,
  notifyRoomReservationCreatedToMahasiswa,
  notifyRoomReservationDecisionToMahasiswa,
  notifyRoomReservationToKalab,
  notifyRoomReservationToLaboran,
} from "../services/notification/index.js";

// Format jadwal pinjam dari startTime/endTime untuk template notif.
function formatTanggalPinjam(startTime: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(startTime);
}

function formatWaktuPinjam(startTime: Date, endTime: Date): string {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
  return `${fmt.format(startTime)} – ${fmt.format(endTime)} WIB`;
}

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
  userId: z.string().uuid().optional(),
});

// userId always resolved from session — never trusted from client.
const createBody = z.object({
  roomId: z.string().uuid(),
  purpose: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  notes: z.string().optional(),
  suratPermohonanPath: z.string().optional(),
  // Opsional — kalau dikirim, ikut diupdate ke User.waNumber supaya form
  // lain bisa prefill tanpa input ulang.
  waNumber: z.string().trim().min(6).optional(),
});

const statusBody = z.object({
  status: z.nativeEnum(ReservationStatus),
  rejectionReason: z.string().trim().min(1).max(500).optional(),
});

export const reservationsController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await reservationsService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const reservation = await reservationsService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = reservation.userId === requester.id;
    if (!isOwner && !hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")) {
      throw new HttpError(403, "Anda tidak berhak melihat reservasi ini");
    }
    res.json(reservation);
  }),

  // Stream surat permohonan PDF inline. Authz sama dengan getById:
  // owner + LABORAN/KEPALA_LAB/SUPER_ADMIN.
  serveSurat: asyncHandler(async (req, res) => {
    const reservation = await reservationsService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = reservation.userId === requester.id;
    if (!isOwner && !hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")) {
      throw new HttpError(403, "Anda tidak berhak melihat surat ini");
    }
    if (!reservation.suratPermohonanPath) {
      throw new HttpError(404, "Surat tidak ditemukan");
    }
    // Defense-in-depth: pastikan path resolve tetap di dalam UPLOAD_DIR,
    // jangan pernah trust field DB sebagai raw filesystem path.
    const abs = path.resolve(reservation.suratPermohonanPath);
    if (!abs.startsWith(UPLOAD_DIR + path.sep)) {
      throw new HttpError(400, "Path surat tidak valid");
    }
    if (!fs.existsSync(abs)) {
      throw new HttpError(404, "File surat tidak ditemukan di server");
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    fs.createReadStream(abs).pipe(res);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);

    // Persist waNumber ke User kalau user kirim — mempercepat pengisian form
    // di form-form berikutnya.
    if (body.waNumber && body.waNumber !== requester.waNumber) {
      await prisma.user.update({
        where: { id: requester.id },
        data: { waNumber: body.waNumber },
      });
    }

    // Surat permohonan — wajib ada (divalidasi di upload middleware juga).
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) {
      throw new HttpError(400, "Surat permohonan wajib diunggah (PDF, maks 200KB)");
    }

    const { waNumber: _waNumber, ...rest } = body;
    const reservation = await reservationsService.create({
      ...rest,
      userId: requester.id,
      suratPermohonanPath: path.relative(path.resolve("."), file.path),
    });

    const tanggalPinjam = formatTanggalPinjam(reservation.startTime);
    const waktuPinjam = formatWaktuPinjam(
      reservation.startTime,
      reservation.endTime,
    );

    // Notif ke pemohon — konfirmasi pengajuan masuk.
    void notifyRoomReservationCreatedToMahasiswa(
      {
        email: reservation.user.email ?? undefined,
        phone: reservation.user.waNumber ?? undefined,
      },
      {
        namaPemohon: reservation.user.displayName,
        nomorInduk: reservation.user.uid,
        ruangan: reservation.room.name,
        tanggalPinjam,
        waktuPinjam,
      },
    );

    // Notif ke laboran lab pemilik room — minta diperiksa.
    const laboranRecipients = (reservation.laboratory?.laborans ?? [])
      .map((l) => l.user)
      .filter((u) => u.isActive && (u.email || u.waNumber));
    const waktuPengajuan = fmtDateTime(reservation.createdAt);
    for (const laboran of laboranRecipients) {
      void notifyRoomReservationToLaboran(
        {
          email: laboran.email ?? undefined,
          phone: laboran.waNumber ?? undefined,
        },
        {
          laboranName: laboran.displayName,
          namaPemohon: reservation.user.displayName,
          nomorInduk: reservation.user.uid,
          ruangan: reservation.room.name,
          tanggalPinjam,
          waktuPinjam,
          waktuPengajuan,
        },
      );
    }

    res.status(201).json(reservation);
  }),

  // Route guard restricts to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const { status, rejectionReason } = statusBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const reservation = await reservationsService.updateStatus(
      req.params.id!,
      status,
      actor.id,
      rejectionReason,
    );

    const tanggalPinjam = formatTanggalPinjam(reservation.startTime);
    const waktuPinjam = formatWaktuPinjam(
      reservation.startTime,
      reservation.endTime,
    );
    const pemohonRecipient = {
      email: reservation.user.email ?? undefined,
      phone: reservation.user.waNumber ?? undefined,
    };
    const activeLaborans = (reservation.laboratory?.laborans ?? [])
      .map((l) => l.user)
      .filter((u) => u.isActive && (u.email || u.waNumber));

    if (status === ReservationStatus.CHECKED) {
      // Notif pemohon — pengajuan sudah diperiksa laboran.
      void notifyRoomReservationCheckedToMahasiswa(pemohonRecipient, {
        namaPemohon: reservation.user.displayName,
        nomorInduk: reservation.user.uid,
        ruangan: reservation.room.name,
        tanggalPinjam,
        waktuPinjam,
        diperiksaOleh: actor.displayName,
      });

      // Notif kepala lab — minta persetujuan.
      const kalab = reservation.laboratory?.kepalaLab;
      if (kalab && (kalab.email || kalab.waNumber)) {
        void notifyRoomReservationToKalab(
          {
            email: kalab.email ?? undefined,
            phone: kalab.waNumber ?? undefined,
          },
          {
            kalabName: kalab.displayName,
            namaPemohon: reservation.user.displayName,
            nomorInduk: reservation.user.uid,
            ruangan: reservation.room.name,
            diperiksaOleh: actor.displayName,
          },
        );
      }
    } else if (status === ReservationStatus.APPROVED) {
      const waktuKeputusan = fmtDateTime(new Date());
      // Notif pemohon — pengajuan disetujui.
      void notifyRoomReservationDecisionToMahasiswa(pemohonRecipient, {
        namaPemohon: reservation.user.displayName,
        nomorInduk: reservation.user.uid,
        ruangan: reservation.room.name,
        tanggalPinjam,
        waktuPinjam,
        diprosesOleh: actor.displayName,
        waktuKeputusan,
        approved: true,
      });
      // Notif laboran lab tsb — siapkan ruangan & jadwal.
      for (const laboran of activeLaborans) {
        void notifyRoomReservationApprovedToLaboran(
          {
            email: laboran.email ?? undefined,
            phone: laboran.waNumber ?? undefined,
          },
          {
            laboranName: laboran.displayName,
            namaPemohon: reservation.user.displayName,
            nomorInduk: reservation.user.uid,
            ruangan: reservation.room.name,
            tanggalPinjam,
            waktuPinjam,
            disetujuiOleh: actor.displayName,
          },
        );
      }
    } else if (status === ReservationStatus.REJECTED) {
      // Notif pemohon — penolakan + alasan. Laboran tidak di-CC sesuai
      // permintaan operasional.
      void notifyRoomReservationDecisionToMahasiswa(pemohonRecipient, {
        namaPemohon: reservation.user.displayName,
        nomorInduk: reservation.user.uid,
        ruangan: reservation.room.name,
        tanggalPinjam,
        waktuPinjam,
        diprosesOleh: actor.displayName,
        waktuKeputusan: fmtDateTime(new Date()),
        approved: false,
        alasan: rejectionReason,
      });
    }

    res.json(reservation);
  }),
};
