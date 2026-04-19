import { AssetStatus, LoanStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";

const LOAN_INCLUDE = {
  borrower: { select: { id: true, displayName: true, uid: true, email: true, waNumber: true } },
  asset: { select: { id: true, name: true, code: true, status: true } },
  lecturer: { select: { id: true, displayName: true, email: true, waNumber: true } },
} satisfies Prisma.LoanInclude;

export const loansService = {
  async list(params: {
    skip?: number;
    take?: number;
    status?: LoanStatus;
    userId?: string;
    lecturerId?: string;
  } = {}) {
    const { skip = 0, take = 50, status, userId, lecturerId } = params;
    const where: Prisma.LoanWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
      ...(lecturerId ? { lecturerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: LOAN_INCLUDE,
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
    return prisma.$transaction(async (tx) => {
      // Lock aset segera saat pengajuan masuk (PENDING) supaya mahasiswa lain
      // tidak bisa pilih laptop yang sama. Release otomatis kalau loan
      // REJECTED / CANCELLED / RETURNED via updateStatus.
      const asset = await tx.asset.findUnique({
        where: { id: input.assetId },
        select: { status: true },
      });
      if (!asset) throw new HttpError(404, "Aset tidak ditemukan");
      if (asset.status !== AssetStatus.AVAILABLE) {
        throw new HttpError(
          409,
          "Aset tidak tersedia — sudah dipinjam atau sedang diajukan oleh peminjam lain",
        );
      }
      const loan = await tx.loan.create({ data: input, include: LOAN_INCLUDE });
      await tx.asset.update({
        where: { id: loan.assetId },
        data: { status: AssetStatus.BORROWED },
      });
      return loan;
    });
  },

  /**
   * Update status + sinkronkan Asset.status supaya tidak drift dari loan
   * lifecycle. ACTIVE → aset BORROWED; RETURNED/REJECTED/CANCELLED → aset
   * kembali AVAILABLE (tapi hanya kalau aset ter-lock oleh loan ini).
   */
  async updateStatus(id: string, status: LoanStatus) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.loan.findUnique({
        where: { id },
        select: { assetId: true, status: true },
      });
      if (!current) throw new HttpError(404, "Peminjaman tidak ditemukan");

      const loan = await tx.loan.update({
        where: { id },
        data: {
          status,
          ...(status === LoanStatus.RETURNED ? { returnDate: new Date() } : {}),
        },
        include: LOAN_INCLUDE,
      });

      if (status === LoanStatus.ACTIVE) {
        await tx.asset.update({
          where: { id: current.assetId },
          data: { status: AssetStatus.BORROWED },
        });
      } else if (
        status === LoanStatus.RETURNED ||
        status === LoanStatus.REJECTED ||
        status === LoanStatus.CANCELLED
      ) {
        // Release hanya kalau memang tertahan; hindari override status
        // DAMAGED/MAINTENANCE yang di-set laboran manual.
        await tx.asset.updateMany({
          where: { id: current.assetId, status: AssetStatus.BORROWED },
          data: { status: AssetStatus.AVAILABLE },
        });
      }

      return loan;
    });
  },

  async update(id: string, input: Prisma.LoanUncheckedUpdateInput) {
    return prisma.loan.update({
      where: { id },
      data: input,
      include: LOAN_INCLUDE,
    });
  },
};
