import { EquipmentLoanStatus } from "@prisma/client";
import { z } from "zod";
import { equipmentLoansService } from "../services/equipmentLoans.service.js";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fmtDateTime } from "../utils/format.js";
import {
  notifyEquipmentLoanActivatedToMahasiswa,
  notifyEquipmentLoanExtendedToMahasiswa,
  notifyEquipmentLoanReturnedToMahasiswa,
} from "../services/notification/index.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(EquipmentLoanStatus).optional(),
  userId: z.string().uuid().optional(),
});

// `userUid` hanya dihormati kalau caller LABORAN+ (walk-in). Untuk user
// biasa, owner loan = dirinya sendiri (dari session).
const createBody = z.object({
  userUid: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().optional(),
  status: z.nativeEnum(EquipmentLoanStatus).optional(),
  items: z
    .array(
      z.object({
        equipmentId: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Minimal satu item peralatan"),
});

const statusBody = z.object({
  status: z.nativeEnum(EquipmentLoanStatus),
});

const updateBody = z.object({
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

function equipmentItemParams(
  items: Array<{ quantity: number; equipment?: { name: string } | null }>,
) {
  return items.map((it) => ({
    nama: it.equipment?.name ?? "-",
    jumlah: it.quantity,
  }));
}

function totalItem(items: Array<{ quantity: number }>): number {
  return items.reduce((sum, it) => sum + it.quantity, 0);
}

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
    const isLaboran = hasRoleAtLeast(req.user!, "LABORAN");

    let ownerId = requester.id;
    if (body.userUid && isLaboran) {
      const owner = await usersService.getByUid(body.userUid);
      ownerId = owner.id;
    } else if (body.userUid && !isLaboran) {
      throw new HttpError(403, "Hanya laboran yang bisa membuat peminjaman atas nama peminjam lain");
    }

    const loan = await equipmentLoansService.create({
      userId: ownerId,
      startDate: body.startDate,
      endDate: body.endDate,
      notes: body.notes,
      status: body.status,
      items: body.items,
    });

    if (loan.status === EquipmentLoanStatus.ACTIVE) {
      await notifyEquipmentLoanActivatedToMahasiswa(
        { email: loan.user.email ?? undefined, phone: loan.user.waNumber ?? undefined },
        {
          namaMahasiswa: loan.user.displayName,
          nim: loan.user.uid,
          items: equipmentItemParams(loan.items),
          totalItem: totalItem(loan.items),
          tanggalHarusKembali: fmtDateTime(loan.endDate),
          diserahkanOleh: requester.displayName,
          waktuTransaksi: fmtDateTime(loan.createdAt),
        },
      ).catch((err) => {
        console.error("[equipment-loan notif activated]", err);
      });
    }

    res.status(201).json(loan);
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { status } = statusBody.parse(req.body);
    const loan = await equipmentLoansService.updateStatus(
      req.params.id!,
      status,
    );

    if (status === EquipmentLoanStatus.RETURNED) {
      const requester = await usersService.getByUid(req.user!.uid);
      await notifyEquipmentLoanReturnedToMahasiswa(
        { email: loan.user.email ?? undefined, phone: loan.user.waNumber ?? undefined },
        {
          namaMahasiswa: loan.user.displayName,
          nim: loan.user.uid,
          items: equipmentItemParams(loan.items),
          totalItem: totalItem(loan.items),
          tanggalKembali: fmtDateTime(new Date()),
          diterimaOleh: requester.displayName,
          catatan: loan.notes ?? undefined,
        },
      ).catch((err) => {
        console.error("[equipment-loan notif returned]", err);
      });
    }

    res.json(loan);
  }),

  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const previous = await equipmentLoansService.getById(req.params.id!);
    const loan = await equipmentLoansService.update(req.params.id!, body);

    const didExtend =
      body.endDate && body.endDate.getTime() !== previous.endDate.getTime();
    if (didExtend) {
      const requester = await usersService.getByUid(req.user!.uid);
      await notifyEquipmentLoanExtendedToMahasiswa(
        { email: loan.user.email ?? undefined, phone: loan.user.waNumber ?? undefined },
        {
          namaMahasiswa: loan.user.displayName,
          nim: loan.user.uid,
          items: equipmentItemParams(loan.items),
          totalItem: totalItem(loan.items),
          tanggalLama: fmtDateTime(previous.endDate),
          tanggalBaru: fmtDateTime(loan.endDate),
          diprosesOleh: requester.displayName,
        },
      ).catch((err) => {
        console.error("[equipment-loan notif extended]", err);
      });
    }

    res.json(loan);
  }),
};
