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
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
          items: {
            include: {
              equipment: { select: { id: true, name: true, category: true } },
            },
          },
        },
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

  async create(input: CreateEquipmentLoanInput) {
    if (input.items.length === 0) {
      throw new HttpError(400, "Minimal satu item peralatan harus dipilih");
    }
    return prisma.equipmentLoan.create({
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
      include: {
        user: true,
        items: { include: { equipment: true } },
      },
    });
  },

  async updateStatus(id: string, status: EquipmentLoanStatus) {
    return prisma.equipmentLoan.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        items: { include: { equipment: true } },
      },
    });
  },
};
