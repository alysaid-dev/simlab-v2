import { EquipmentLoanStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface CreateEquipmentLoanInput {
  userId: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  items: Array<{ equipmentId: string; quantity: number }>;
}

const LOAN_INCLUDE = {
  user: { select: { id: true, displayName: true, uid: true } },
  items: {
    include: {
      equipment: { select: { id: true, name: true, category: true } },
    },
  },
} satisfies Prisma.EquipmentLoanInclude;

// Status yang "menahan" stok — artinya equipment sudah dialokasikan dan
// stok sudah dikurangi. Kalau status pindah KE luar set ini, stok harus
// dikembalikan.
const HOLDING_STATUSES: EquipmentLoanStatus[] = [
  EquipmentLoanStatus.PENDING,
  EquipmentLoanStatus.APPROVED,
  EquipmentLoanStatus.ACTIVE,
  EquipmentLoanStatus.OVERDUE,
];

function holdsStock(status: EquipmentLoanStatus): boolean {
  return HOLDING_STATUSES.includes(status);
}

export const equipmentLoansService = {
  async list(
    params: {
      skip?: number;
      take?: number;
      status?: EquipmentLoanStatus;
      userId?: string;
    } = {}
  ) {
    const { skip = 0, take = 50, status, userId } = params;
    const where: Prisma.EquipmentLoanWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.equipmentLoan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: LOAN_INCLUDE,
      }),
      prisma.equipmentLoan.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const loan = await prisma.equipmentLoan.findUnique({
      where: { id },
      include: {
        user: true,
        items: { include: { equipment: true } },
      },
    });
    if (!loan) throw new HttpError(404, "Peminjaman peralatan tidak ditemukan");
    return loan;
  },

  /**
   * Create loan + decrement stok tiap equipment dalam transaksi DB. Bila
   * stok salah satu item tidak cukup, seluruh operasi di-rollback supaya
   * tidak ada double-booking.
   */
  async create(input: CreateEquipmentLoanInput) {
    if (input.items.length === 0) {
      throw new HttpError(400, "Minimal satu item peralatan harus dipilih");
    }

    return prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        if (item.quantity <= 0) {
          throw new HttpError(400, "Jumlah tiap item harus lebih dari 0");
        }
        const equipment = await tx.equipment.findUnique({
          where: { id: item.equipmentId },
          select: { id: true, name: true, stock: true },
        });
        if (!equipment) {
          throw new HttpError(
            404,
            `Peralatan dengan id ${item.equipmentId} tidak ditemukan`,
          );
        }
        if (equipment.stock < item.quantity) {
          throw new HttpError(
            400,
            `Stok ${equipment.name} tidak mencukupi (tersisa ${equipment.stock}, diminta ${item.quantity})`,
          );
        }
        await tx.equipment.update({
          where: { id: equipment.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.equipmentLoan.create({
        data: {
          userId: input.userId,
          startDate: input.startDate,
          endDate: input.endDate,
          notes: input.notes,
          items: {
            create: input.items.map((it) => ({
              equipmentId: it.equipmentId,
              quantity: it.quantity,
            })),
          },
        },
        include: LOAN_INCLUDE,
      });
    });
  },

  /**
   * Update status + kembalikan stok saat transisi dari "holding" (PENDING /
   * APPROVED / ACTIVE / OVERDUE) ke "released" (RETURNED / REJECTED /
   * CANCELLED). Idempotent — kalau pindah antar status yang sama-sama
   * holding (atau sama-sama released), stok tidak berubah dua kali.
   */
  async updateStatus(id: string, status: EquipmentLoanStatus) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.equipmentLoan.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) {
        throw new HttpError(404, "Peminjaman peralatan tidak ditemukan");
      }

      const wasHolding = holdsStock(current.status);
      const nowHolding = holdsStock(status);

      if (wasHolding && !nowHolding) {
        // Stok kembali ke inventaris.
        for (const item of current.items) {
          await tx.equipment.update({
            where: { id: item.equipmentId },
            data: { stock: { increment: item.quantity } },
          });
        }
      } else if (!wasHolding && nowHolding) {
        // Balik ke holding — kurangi stok lagi (edge case, tapi konsisten).
        for (const item of current.items) {
          const equipment = await tx.equipment.findUnique({
            where: { id: item.equipmentId },
            select: { name: true, stock: true },
          });
          if (!equipment || equipment.stock < item.quantity) {
            throw new HttpError(
              400,
              `Stok ${equipment?.name ?? "peralatan"} tidak mencukupi untuk mengaktifkan kembali peminjaman`,
            );
          }
          await tx.equipment.update({
            where: { id: item.equipmentId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return tx.equipmentLoan.update({
        where: { id },
        data: { status },
        include: LOAN_INCLUDE,
      });
    });
  },
};
