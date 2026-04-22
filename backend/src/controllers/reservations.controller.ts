import path from "node:path";
import fs from "node:fs";
import { ReservationStatus } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { reservationsService } from "../services/reservations.service.js";
import { roomsService } from "../services/rooms.service.js";
import { usersService } from "../services/users.service.js";
import { hasAnyRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
  notifyRoomReservationToKalab,
  notifyRoomReservationToLaboran,
} from "../services/notification/index.js";

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
    res.status(201).json(reservation);
  }),

  // Route guard restricts to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const { status } = statusBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const reservation = await reservationsService.updateStatus(
      req.params.id!,
      status,
      actor.id,
    );

    // Fire-and-forget notifications at key stages.
    // CHECKED → notify Kepala Lab (reservation now awaits their approval).
    // PENDING (fresh submission path not hit here, hanya lewat create) —
    // jadi kita notify laboran di create handler juga kalau mau.
    if (status === ReservationStatus.CHECKED) {
      // Notify kepala lab. Hardcoded "—" for fields we don't persist yet;
      // kalau di masa depan ada Laboratory link, ambil kalabName dari sana.
      const kalabEmail = "-";
      const kalabPhone = undefined;
      void notifyRoomReservationToKalab(
        { email: kalabEmail, phone: kalabPhone },
        {
          kalabName: "Kepala Lab",
          namaPemohon: reservation.user.displayName,
          nomorInduk: reservation.user.uid,
          ruangan: reservation.room.name,
          diperiksaOleh: actor.displayName,
        },
      );
    }

    res.json(reservation);
  }),
};

// Helper: emit notifikasi ke laboran saat reservasi baru dibuat.
// Dipanggil dari create handler dengan room detail.
export async function notifyNewReservationToLaboran(
  roomId: string,
  userDisplayName: string,
  userUid: string,
) {
  try {
    const room = await roomsService.getById(roomId);
    // Alamat laboran tidak spesifik per-lab di schema lama — kirim ke alamat
    // default (kalau ada). Di sini kita skip karena belum ada recipient.
    // Placeholder untuk kelak: iterasi users dengan role LABORAN.
    void notifyRoomReservationToLaboran(
      { email: "-", phone: undefined },
      {
        laboranName: "Laboran",
        namaPemohon: userDisplayName,
        nomorInduk: userUid,
        ruangan: room.name,
        tanggalPinjam: "-",
        waktuPinjam: "-",
        waktuPengajuan: new Date().toLocaleString("id-ID"),
      },
    );
  } catch {
    // intentionally silent — notifikasi bersifat best-effort.
  }
}
