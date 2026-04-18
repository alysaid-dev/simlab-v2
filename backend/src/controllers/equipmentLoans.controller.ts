import { EquipmentLoanStatus } from "@prisma/client";
import { z } from "zod";
import { equipmentLoansService } from "../services/equipmentLoans.service.js";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(EquipmentLoanStatus).optional(),
  userId: z.string().uuid().optional(),
});

// `userId` resolved from session — never trust client-provided owner.
const createBody = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        equipmentId: z.string().uuid(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "Minimal satu item peralatan"),
});

const statusBody = z.object({
  status: z.nativeEnum(EquipmentLoanStatus),
});

// NOTE: Templates `notify*` saat ini fokus pada laptop loan & clearance —
// belum ada template khusus equipment loan. Notifikasi status change untuk
// equipment loan ditangguhkan sampai template `notifyEquipmentLoan*` ditambahkan
// ke services/notification/templates.ts. Sengaja tidak memakai template loan
// laptop karena field-nya (kodeLaptop, namaLaptop) tidak cocok semantis.

export const equipmentLoansController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await equipmentLoansService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const loan = await equipmentLoansService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = loan.userId === requester.id;
    if (!isOwner && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda tidak berhak melihat peminjaman ini");
    }
    res.json(loan);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);
    const loan = await equipmentLoansService.create({
      userId: requester.id,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
      items: body.items,
    });
    res.status(201).json(loan);
  }),

  // Route guard restricts this to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const { status } = statusBody.parse(req.body);
    const loan = await equipmentLoansService.updateStatus(
      req.params.id!,
      status
    );
    // TODO(notif): kirim notifikasi setelah template equipment loan tersedia.
    res.json(loan);
  }),
};
