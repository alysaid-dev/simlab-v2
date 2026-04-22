import { AssetCondition, AssetStatus, FinePaidStatus, LoanStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";
import { appSettingsService } from "./appSettings.service.js";
import { calcLateDays } from "../utils/format.js";

const LOAN_INCLUDE = {
  borrower: { select: { id: true, displayName: true, uid: true, email: true, waNumber: true } },
  asset: { select: { id: true, name: true, code: true, status: true, condition: true } },
  lecturer: { select: { id: true, displayName: true, email: true, waNumber: true } },
} satisfies Prisma.LoanInclude;

export interface UpdateStatusParams {
  status: LoanStatus;
  actorId?: string;
  returnCondition?: AssetCondition;
  returnNote?: string;
  rejectionReason?: string;
}

export const loansService = {
  async list(params: {
    skip?: number;
    take?: number;
    status?: LoanStatus;
    userId?: string;
    lecturerId?: string;
    assetId?: string;
  } = {}) {
    const { skip = 0, take = 50, status, userId, lecturerId, assetId } = params;
    const where: Prisma.LoanWhereInput = {
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
      ...(lecturerId ? { lecturerId } : {}),
      ...(assetId ? { assetId } : {}),
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
   * Update status + sinkronkan Asset.status + populate per-stage approval
   * fields untuk History timeline. ACTIVE → aset BORROWED; RETURNED /
   * REJECTED / CANCELLED → aset kembali AVAILABLE (kecuali kalau di-set
   * DAMAGED/MAINTENANCE manual — tidak di-override).
   *
   * Kalau RETURNED + returnCondition dikirim, Asset.condition ikut diupdate
   * supaya peminjaman berikutnya lihat kondisi terkini.
   */
  async updateStatus(id: string, params: UpdateStatusParams) {
    const { status, actorId, returnCondition, returnNote, rejectionReason } =
      params;
    return prisma.$transaction(async (tx) => {
      const current = await tx.loan.findUnique({
        where: { id },
        select: { assetId: true, status: true, endDate: true },
      });
      if (!current) throw new HttpError(404, "Peminjaman tidak ditemukan");

      const data: Prisma.LoanUncheckedUpdateInput = { status };
      const now = new Date();

      if (status === LoanStatus.APPROVED_BY_DOSEN) {
        data.dosenDecision = "APPROVED";
        data.dosenDecisionAt = now;
      } else if (status === LoanStatus.APPROVED) {
        data.kalabDecision = "APPROVED";
        data.kalabDecisionAt = now;
        if (actorId) data.kalabDecisionBy = actorId;
      } else if (status === LoanStatus.ACTIVE) {
        data.laboranHandoverAt = now;
        if (actorId) data.laboranHandoverBy = actorId;
      } else if (status === LoanStatus.RETURNED) {
        data.returnDate = now;
        if (actorId) data.laboranReturnBy = actorId;
        if (returnCondition) data.returnCondition = returnCondition;
        if (returnNote !== undefined) data.returnNote = returnNote;
        const settings = await appSettingsService.get();
        const dayLate = calcLateDays(
          current.endDate,
          now,
          settings.lateFeeToleranceDays,
        );
        const fineAmount = dayLate * settings.lateFeePerDayIdr;
        data.dayLate = dayLate;
        data.fine = new Prisma.Decimal(fineAmount);
        if (fineAmount > 0) data.finePaid = FinePaidStatus.UNPAID;
      } else if (status === LoanStatus.REJECTED) {
        // Siapa yang nolak ditentukan dari status sebelumnya:
        // PENDING → dosen; APPROVED_BY_DOSEN → kalab.
        if (current.status === LoanStatus.APPROVED_BY_DOSEN) {
          data.kalabDecision = "REJECTED";
          data.kalabDecisionAt = now;
          if (actorId) data.kalabDecisionBy = actorId;
        } else {
          data.dosenDecision = "REJECTED";
          data.dosenDecisionAt = now;
        }
        if (rejectionReason) data.rejectionReason = rejectionReason;
      }

      const loan = await tx.loan.update({
        where: { id },
        data,
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
        const assetData: Prisma.AssetUpdateManyMutationInput = {
          status: AssetStatus.AVAILABLE,
        };
        if (status === LoanStatus.RETURNED && returnCondition) {
          assetData.condition = returnCondition;
        }
        await tx.asset.updateMany({
          where: { id: current.assetId, status: AssetStatus.BORROWED },
          data: assetData,
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

  async listFines(params: {
    skip?: number;
    take?: number;
    finePaid?: FinePaidStatus;
    search?: string;
  } = {}) {
    const { skip = 0, take = 50, finePaid, search } = params;
    const where: Prisma.LoanWhereInput = {
      fine: { gt: 0 },
      status: LoanStatus.RETURNED,
      ...(finePaid ? { finePaid } : {}),
      ...(search
        ? {
            OR: [
              { borrower: { uid: { contains: search, mode: "insensitive" } } },
              { borrower: { displayName: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { returnDate: "desc" },
        include: LOAN_INCLUDE,
      }),
      prisma.loan.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async markFine(
    id: string,
    params: { finePaid: FinePaidStatus; fineNote?: string; actorId: string },
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      select: { fine: true, status: true },
    });
    if (!loan) throw new HttpError(404, "Peminjaman tidak ditemukan");
    if (loan.status !== LoanStatus.RETURNED) {
      throw new HttpError(
        409,
        "Status denda hanya bisa diubah untuk peminjaman yang sudah RETURNED",
      );
    }
    if (Number(loan.fine) <= 0) {
      throw new HttpError(409, "Peminjaman ini tidak memiliki denda");
    }
    const data: Prisma.LoanUncheckedUpdateInput = {
      finePaid: params.finePaid,
      fineNote: params.fineNote ?? null,
    };
    if (
      params.finePaid === FinePaidStatus.PAID ||
      params.finePaid === FinePaidStatus.WAIVED
    ) {
      data.finePaidAt = new Date();
      data.finePaidBy = params.actorId;
    } else {
      data.finePaidAt = null;
      data.finePaidBy = null;
    }
    return prisma.loan.update({
      where: { id },
      data,
      include: LOAN_INCLUDE,
    });
  },
};
