import { LoanStatus, EquipmentLoanStatus } from "@prisma/client";
import { z } from "zod";
import { usersService } from "../services/users.service.js";
import { prisma } from "../config/database.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Status yang dianggap masih menjadi tanggungan (belum selesai).
// RETURNED / REJECTED / CANCELLED dianggap selesai → tidak diikutkan.
const ACTIVE_LOAN_STATUSES: LoanStatus[] = [
  LoanStatus.PENDING,
  LoanStatus.APPROVED,
  LoanStatus.ACTIVE,
  LoanStatus.OVERDUE,
];

const ACTIVE_EQUIPMENT_LOAN_STATUSES: EquipmentLoanStatus[] = [
  EquipmentLoanStatus.PENDING,
  EquipmentLoanStatus.APPROVED,
  EquipmentLoanStatus.ACTIVE,
];

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().min(1).optional(),
});

export const usersController = {
  // Route guard restricts this to LABORAN and above.
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await usersService.list(q);
    res.json(result);
  }),

  // GET /users/me/obligations — cek tanggungan aktif user sendiri.
  // Digunakan sebagai prasyarat sebelum mengajukan surat bebas lab.
  obligations: asyncHandler(async (req, res) => {
    const requester = await usersService.getByUid(req.user!.uid);

    const [loans, equipmentLoans] = await Promise.all([
      prisma.loan.findMany({
        where: {
          userId: requester.id,
          status: { in: ACTIVE_LOAN_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        include: { asset: { select: { name: true } } },
      }),
      prisma.equipmentLoan.findMany({
        where: {
          userId: requester.id,
          status: { in: ACTIVE_EQUIPMENT_LOAN_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true },
      }),
    ]);

    const total = loans.length + equipmentLoans.length;
    const hasObligations = total > 0;

    res.json({
      hasObligations,
      details: {
        loans: loans.map((l) => ({
          id: l.id,
          assetName: l.asset.name,
          status: l.status,
          endDate: l.endDate,
        })),
        equipmentLoans,
      },
      message: hasObligations
        ? `Anda masih memiliki ${total} peminjaman aktif yang belum diselesaikan`
        : "Tidak ada tanggungan aktif. Anda dapat mengajukan surat bebas lab.",
    });
  }),

  getById: asyncHandler(async (req, res) => {
    const requestedId = req.params.id!;
    const requester = await usersService.getByUid(req.user!.uid);
    const isSelf = requester.id === requestedId;
    if (!isSelf && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda hanya dapat melihat profil Anda sendiri");
    }
    const user = await usersService.getById(requestedId);
    res.json(user);
  }),
};
