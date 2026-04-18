import { EquipmentLoanStatus, LoanStatus, Prisma, RoleName } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { ShibbolethUser } from "../middleware/auth.js";

// Status yang dianggap masih menjadi tanggungan (belum selesai).
// RETURNED / REJECTED / CANCELLED dianggap selesai → tidak diikutkan.
const ACTIVE_LOAN_STATUSES: LoanStatus[] = [
  LoanStatus.PENDING,
  LoanStatus.APPROVED_BY_DOSEN,
  LoanStatus.APPROVED,
  LoanStatus.ACTIVE,
  LoanStatus.OVERDUE,
];

const ACTIVE_EQUIPMENT_LOAN_STATUSES: EquipmentLoanStatus[] = [
  EquipmentLoanStatus.PENDING,
  EquipmentLoanStatus.APPROVED,
  EquipmentLoanStatus.ACTIVE,
  EquipmentLoanStatus.OVERDUE,
];

export interface UserObligations {
  hasObligations: boolean;
  details: {
    loans: Array<{
      id: string;
      assetName: string;
      status: LoanStatus;
      endDate: Date;
    }>;
    equipmentLoans: Array<{
      id: string;
      status: EquipmentLoanStatus;
      createdAt: Date;
    }>;
  };
  message: string;
}

export const usersService = {
  /**
   * Lazy provisioning — upsert a user row from their Shibboleth attributes.
   * Called on login so the DB always has a record matching the SSO identity.
   */
  async upsertFromShibboleth(shib: ShibbolethUser) {
    return prisma.user.upsert({
      where: { uid: shib.uid },
      create: {
        uid: shib.uid,
        email: shib.email,
        displayName: shib.displayName,
        isActive: true,
      },
      update: {
        email: shib.email,
        displayName: shib.displayName,
      },
    });
  },

  async list(
    params: {
      skip?: number;
      take?: number;
      search?: string;
      role?: RoleName;
    } = {},
  ) {
    const { skip = 0, take = 50, search, role } = params;
    const where: Prisma.UserWhereInput = {
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { displayName: { contains: search, mode: "insensitive" } },
              { uid: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role
        ? { roles: { some: { role: { name: role } } } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: "asc" },
        include: { roles: { include: { role: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(404, "Pengguna tidak ditemukan");
    return user;
  },

  async getByUid(uid: string) {
    const user = await prisma.user.findUnique({
      where: { uid },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new HttpError(404, "Pengguna tidak ditemukan");
    return user;
  },

  /**
   * Cek tanggungan aktif (laptop loans + equipment loans yang belum selesai).
   * Dipakai oleh endpoint /me/obligations DAN sebagai server-side guard
   * saat create surat bebas lab supaya tidak bisa di-bypass dari frontend.
   */
  async getObligations(userId: string): Promise<UserObligations> {
    const [loans, equipmentLoans] = await Promise.all([
      prisma.loan.findMany({
        where: {
          userId,
          status: { in: ACTIVE_LOAN_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        include: { asset: { select: { name: true } } },
      }),
      prisma.equipmentLoan.findMany({
        where: {
          userId,
          status: { in: ACTIVE_EQUIPMENT_LOAN_STATUSES },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, createdAt: true },
      }),
    ]);

    const total = loans.length + equipmentLoans.length;
    const hasObligations = total > 0;

    return {
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
    };
  },
};
