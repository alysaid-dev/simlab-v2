import { ClearanceStatus, ConsumableTransactionType, EquipmentLoanStatus, FinePaidStatus, LoanStatus, ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { usersService } from "../services/users.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

const ACTIVE_LAPTOP_STATUSES: LoanStatus[] = [
  LoanStatus.PENDING,
  LoanStatus.APPROVED_BY_DOSEN,
  LoanStatus.APPROVED,
  LoanStatus.ACTIVE,
  LoanStatus.OVERDUE,
];

const ACTIVE_EQUIPMENT_STATUSES: EquipmentLoanStatus[] = [
  EquipmentLoanStatus.ACTIVE,
  EquipmentLoanStatus.OVERDUE,
];

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CHECKED,
  ReservationStatus.APPROVED,
];

const ACTIVE_CLEARANCE_STATUSES: ClearanceStatus[] = [
  ClearanceStatus.PENDING_LABORAN,
  ClearanceStatus.PENDING_KEPALA_LAB,
];

export const meController = {
  activeItems: asyncHandler(async (req, res) => {
    const me = await usersService.getByUid(req.user!.uid);
    const now = new Date();

    const [laptopLoans, equipmentLoans, reservations, clearances, unpaidFines] = await Promise.all([
      prisma.loan.findMany({
        where: { userId: me.id, status: { in: ACTIVE_LAPTOP_STATUSES } },
        orderBy: { createdAt: "desc" },
        include: {
          asset: { select: { code: true, name: true } },
          lecturer: { select: { displayName: true } },
        },
      }),
      prisma.equipmentLoan.findMany({
        where: { userId: me.id, status: { in: ACTIVE_EQUIPMENT_STATUSES } },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { equipment: { select: { name: true } } },
          },
        },
      }),
      prisma.roomReservation.findMany({
        where: {
          userId: me.id,
          status: { in: ACTIVE_RESERVATION_STATUSES },
          OR: [
            { status: { in: [ReservationStatus.PENDING, ReservationStatus.CHECKED] } },
            { status: ReservationStatus.APPROVED, endTime: { gte: now } },
          ],
        },
        orderBy: { startTime: "asc" },
        include: { room: { select: { name: true, code: true } } },
      }),
      prisma.clearanceLetter.findMany({
        where: { userId: me.id, status: { in: ACTIVE_CLEARANCE_STATUSES } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.loan.findMany({
        where: {
          userId: me.id,
          finePaid: FinePaidStatus.UNPAID,
          fine: { gt: 0 },
        },
        orderBy: { returnDate: "desc" },
        select: {
          id: true,
          dayLate: true,
          fine: true,
          returnDate: true,
          asset: { select: { code: true, name: true } },
        },
      }),
    ]);

    res.json({
      laptopLoans: laptopLoans.map((l) => ({
        id: l.id,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
        type: l.type,
        asset: l.asset,
        lecturerName: l.lecturer?.displayName ?? null,
      })),
      equipmentLoans: equipmentLoans.map((l) => ({
        id: l.id,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
        totalItem: l.items.reduce((s, it) => s + it.quantity, 0),
        items: l.items.map((it) => ({
          name: it.equipment?.name ?? "-",
          quantity: it.quantity,
        })),
      })),
      reservations: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        startTime: r.startTime,
        endTime: r.endTime,
        purpose: r.purpose,
        room: r.room,
      })),
      clearances: clearances.map((c) => ({
        id: c.id,
        status: c.status,
        tanggalSidang: c.tanggalSidang,
        createdAt: c.createdAt,
      })),
      unpaidFines: unpaidFines.map((l) => ({
        loanId: l.id,
        dayLate: l.dayLate,
        fine: l.fine,
        returnDate: l.returnDate,
        asset: l.asset,
      })),
      counts: {
        laptopLoans: laptopLoans.length,
        equipmentLoans: equipmentLoans.length,
        reservations: reservations.length,
        clearances: clearances.length,
        unpaidFines: unpaidFines.length,
        total:
          laptopLoans.length +
          equipmentLoans.length +
          reservations.length +
          clearances.length +
          unpaidFines.length,
      },
    });
  }),

  // ------------------------------------------------------------
  // Transaksi Saya — modul DOSEN/STAFF (aktif + selesai, semua status)
  // ------------------------------------------------------------
  // Sumber data: tabel Loan/EquipmentLoan/RoomReservation di-scope by
  // userId=me. ConsumableTransaction di-scope via notes field karena
  // kolom userId = laboran pencatat, recipient ditulis di notes dengan
  // format auto-generated "Diambil oleh NAME (uid)". Match `(uid)` untuk
  // hindari false positive.

  transaksiLaptops: asyncHandler(async (req, res) => {
    const { skip = 0, take = 50 } = listQuery.parse(req.query);
    const me = await usersService.getByUid(req.user!.uid);
    const where = { userId: me.id };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          asset: { select: { id: true, code: true, name: true } },
          lecturer: { select: { id: true, displayName: true } },
        },
      }),
      prisma.loan.count({ where }),
    ]);
    res.json({ items, total, skip, take });
  }),

  transaksiEquipment: asyncHandler(async (req, res) => {
    const { skip = 0, take = 50 } = listQuery.parse(req.query);
    const me = await usersService.getByUid(req.user!.uid);
    const where = { userId: me.id };
    const [items, total] = await Promise.all([
      prisma.equipmentLoan.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          items: {
            include: {
              equipment: { select: { id: true, name: true, category: true } },
            },
          },
        },
      }),
      prisma.equipmentLoan.count({ where }),
    ]);
    const mapped = items.map((l) => ({
      id: l.id,
      status: l.status,
      startDate: l.startDate,
      endDate: l.endDate,
      notes: l.notes,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
      totalItem: l.items.reduce((s, it) => s + it.quantity, 0),
      items: l.items.map((it) => ({
        equipmentId: it.equipmentId,
        name: it.equipment?.name ?? "-",
        category: it.equipment?.category ?? null,
        quantity: it.quantity,
      })),
    }));
    res.json({ items: mapped, total, skip, take });
  }),

  transaksiRooms: asyncHandler(async (req, res) => {
    const { skip = 0, take = 50 } = listQuery.parse(req.query);
    const me = await usersService.getByUid(req.user!.uid);
    const where = { userId: me.id };
    const [items, total] = await Promise.all([
      prisma.roomReservation.findMany({
        where,
        skip,
        take,
        orderBy: { startTime: "desc" },
        include: {
          room: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.roomReservation.count({ where }),
    ]);
    res.json({ items, total, skip, take });
  }),

  transaksiConsumables: asyncHandler(async (req, res) => {
    const { skip = 0, take = 50 } = listQuery.parse(req.query);
    const uid = req.user!.uid;
    // Match notes yang mengandung "(uid)" — format auto-generated di
    // consumables.controller.ts saat OUT transaction dibuat.
    const where = {
      type: ConsumableTransactionType.OUT,
      notes: { contains: `(${uid})` },
    };
    const [rows, total] = await Promise.all([
      prisma.consumableTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          consumable: { select: { id: true, name: true, unit: true } },
          user: { select: { id: true, displayName: true } },
        },
      }),
      prisma.consumableTransaction.count({ where }),
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      consumableId: r.consumableId,
      name: r.consumable?.name ?? "-",
      unit: r.consumable?.unit ?? "",
      quantity: r.quantity,
      notes: r.notes,
      recordedByName: r.user?.displayName ?? "-",
      createdAt: r.createdAt,
    }));
    res.json({ items, total, skip, take });
  }),
};
