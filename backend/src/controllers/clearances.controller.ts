import { ClearanceStatus } from "@prisma/client";
import { z } from "zod";
import { clearancesService } from "../services/clearances.service.js";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  notifyClearanceCreatedToMahasiswa,
  notifyClearanceCheckedToMahasiswa,
  notifyClearanceIssuedToMahasiswa,
} from "../services/notification/index.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(ClearanceStatus).optional(),
  userId: z.string().uuid().optional(),
});

// `userId` resolved from session — never trust client-provided owner.
const createBody = z.object({
  notes: z.string().optional(),
  // Free-form sidang date for templates; not persisted on the model itself.
  tanggalSidang: z.string().optional(),
});

const statusBody = z.object({
  status: z.nativeEnum(ClearanceStatus),
  notes: z.string().optional(),
  // Optional context for templates that include it.
  tanggalSidang: z.string().optional(),
  nomorSurat: z.string().optional(),
  penandatangan1: z.string().optional(),
  penandatangan2: z.string().optional(),
});

function fmtDate(d: Date | string | undefined): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
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
    if (!isOwner && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda tidak berhak melihat surat ini");
    }
    res.json(letter);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);
    const letter = await clearancesService.create({
      userId: requester.id,
      notes: body.notes,
    });

    // Fire-and-forget — don't block the response on transport latency.
    void notifyClearanceCreatedToMahasiswa(
      { email: requester.email, phone: requester.waNumber ?? undefined },
      {
        namaMahasiswa: requester.displayName,
        nim: requester.uid,
        tanggalSidang: body.tanggalSidang ?? "-",
      }
    );

    res.status(201).json(letter);
  }),

  // Route guard restricts this to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const body = statusBody.parse(req.body);
    const approver = await usersService.getByUid(req.user!.uid);
    const letter = await clearancesService.updateStatus(
      req.params.id!,
      body.status,
      approver.id
    );

    const owner = letter.user;
    const recipient = {
      email: owner.email,
      phone: owner.waNumber ?? undefined,
    };

    // Pick the right template based on the new status.
    if (body.status === ClearanceStatus.APPROVED) {
      void notifyClearanceIssuedToMahasiswa(recipient, {
        namaMahasiswa: owner.displayName,
        nim: owner.uid,
        tanggalSidang: body.tanggalSidang ?? fmtDate(letter.approvedAt ?? undefined),
        nomorSurat: body.nomorSurat ?? "-",
        penandatangan1: body.penandatangan1 ?? approver.displayName,
        penandatangan2: body.penandatangan2 ?? "-",
      });
    } else if (
      body.status === ClearanceStatus.PENDING_LECTURER ||
      body.status === ClearanceStatus.PENDING_KEPALA_LAB ||
      body.status === ClearanceStatus.PENDING_LABORAN ||
      body.status === ClearanceStatus.SUBMITTED
    ) {
      void notifyClearanceCheckedToMahasiswa(recipient, {
        namaMahasiswa: owner.displayName,
        nim: owner.uid,
        tanggalSidang: body.tanggalSidang ?? "-",
        diperiksaOleh: approver.displayName,
      });
    }
    // REJECTED / DRAFT have no dedicated template — no notification fired.

    res.json(letter);
  }),
};
