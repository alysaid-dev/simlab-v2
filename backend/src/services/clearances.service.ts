import { ClearanceStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

export const clearancesService = {
  async list(
    params: {
      skip?: number;
      take?: number;
      status?: ClearanceStatus;
      userId?: string;
    } = {}
  ) {
    const { skip = 0, take = 50, status, userId } = params;
    const where: Prisma.ClearanceLetterWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.clearanceLetter.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, displayName: true, uid: true } },
          approver: { select: { id: true, displayName: true } },
        },
      }),
      prisma.clearanceLetter.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const letter = await prisma.clearanceLetter.findUnique({
      where: { id },
      include: { user: true, approver: true },
    });
    if (!letter) throw new HttpError(404, "Surat bebas lab tidak ditemukan");
    return letter;
  },

  async create(input: Prisma.ClearanceLetterUncheckedCreateInput) {
    return prisma.clearanceLetter.create({
      data: input,
      include: { user: true },
    });
  },

  async updateStatus(id: string, status: ClearanceStatus, approverId?: string) {
    const isApproved = status === ClearanceStatus.APPROVED;
    return prisma.clearanceLetter.update({
      where: { id },
      data: {
        status,
        ...(isApproved
          ? {
              approvedAt: new Date(),
              ...(approverId ? { approvedBy: approverId } : {}),
            }
          : {}),
      },
      include: { user: true, approver: true },
    });
  },
};
