import { LoanStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const loansService = {
  async list(params: {
    skip?: number;
    take?: number;
    status?: LoanStatus;
    userId?: string;
  } = {}) {
    const { skip = 0, take = 50, status, userId } = params;
    const where: Prisma.LoanWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          borrower: { select: { id: true, displayName: true, uid: true } },
          asset: { select: { id: true, name: true, code: true } },
          lecturer: { select: { id: true, displayName: true } },
        },
      }),
      prisma.loan.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        borrower: true,
        asset: true,
        lecturer: true,
      },
    });
    if (!loan) throw new HttpError(404, "Peminjaman tidak ditemukan");
    return loan;
  },

  async create(input: Prisma.LoanUncheckedCreateInput) {
    return prisma.loan.create({ data: input });
  },

  async updateStatus(id: string, status: LoanStatus) {
    return prisma.loan.update({
      where: { id },
      data: {
        status,
        ...(status === LoanStatus.RETURNED ? { returnDate: new Date() } : {}),
      },
    });
  },
};
