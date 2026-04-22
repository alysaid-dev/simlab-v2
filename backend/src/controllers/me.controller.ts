import { ClearanceStatus, EquipmentLoanStatus, FinePaidStatus, LoanStatus, ReservationStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { usersService } from "../services/users.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
};
