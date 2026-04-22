import {
  ClearanceStatus,
  ConsumableTransactionType,
  LoanStatus,
  LoanType,
  Prisma,
  ReservationStatus,
} from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";
import { CONDITION_LABEL } from "../utils/format.js";

// Status final (sudah selesai) yang ditampilkan di History.
const LOAN_FINAL_STATUSES: LoanStatus[] = [
  LoanStatus.RETURNED,
  LoanStatus.REJECTED,
  LoanStatus.CANCELLED,
];
const CLEARANCE_FINAL_STATUSES: ClearanceStatus[] = [
  ClearanceStatus.APPROVED,
  ClearanceStatus.REJECTED,
];
const RESERVATION_FINAL_STATUSES: ReservationStatus[] = [
  ReservationStatus.APPROVED,
  ReservationStatus.REJECTED,
  ReservationStatus.CANCELLED,
  ReservationStatus.COMPLETED,
];

const LOAN_HISTORY_INCLUDE = {
  borrower: { select: { id: true, uid: true, displayName: true } },
  asset: { select: { id: true, name: true, code: true } },
  lecturer: { select: { id: true, displayName: true } },
  kalabApprover: { select: { id: true, displayName: true } },
  laboranHandover: { select: { id: true, displayName: true } },
  laboranReturn: { select: { id: true, displayName: true } },
} satisfies Prisma.LoanInclude;

const CLEARANCE_HISTORY_INCLUDE = {
  user: { select: { id: true, uid: true, displayName: true } },
  approver: { select: { id: true, displayName: true } },
} satisfies Prisma.ClearanceLetterInclude;

const RESERVATION_HISTORY_INCLUDE = {
  user: { select: { id: true, uid: true, displayName: true } },
  room: { select: { id: true, name: true, code: true } },
  checker: { select: { id: true, displayName: true } },
  approver: { select: { id: true, displayName: true } },
} satisfies Prisma.RoomReservationInclude;

export interface TimelineEvent {
  label: string;
  at: Date | null;
  actorName?: string | null;
  decision?: "APPROVED" | "REJECTED" | null;
  note?: string | null;
}

export const historyService = {
  // ---------------------------- Loans ----------------------------
  async listLoans(params: { type: LoanType; skip?: number; take?: number }) {
    const { type, skip = 0, take = 50 } = params;
    const where: Prisma.LoanWhereInput = {
      type,
      status: { in: LOAN_FINAL_STATUSES },
    };
    const [items, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: LOAN_HISTORY_INCLUDE,
      }),
      prisma.loan.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async loanTimeline(id: string): Promise<{
    loan: Awaited<ReturnType<typeof prisma.loan.findUniqueOrThrow>>;
    events: TimelineEvent[];
  }> {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: LOAN_HISTORY_INCLUDE,
    });
    if (!loan) throw new HttpError(404, "Peminjaman tidak ditemukan");

    const events: TimelineEvent[] = [];
    events.push({
      label: "Pengajuan diajukan",
      at: loan.createdAt,
      actorName: loan.borrower.displayName,
    });

    // TA punya chain dosen → kalab → laboran. Praktikum langsung laboran
    // (ACTIVE saat create). Kita tampilkan event berdasarkan data yang
    // terisi, jadi flow otomatis ter-reflect.
    if (loan.type === LoanType.TA) {
      if (loan.dosenDecisionAt) {
        events.push({
          label:
            loan.dosenDecision === "REJECTED"
              ? "Ditolak oleh Dosen"
              : "Disetujui oleh Dosen",
          at: loan.dosenDecisionAt,
          actorName: loan.lecturer?.displayName ?? null,
          decision: loan.dosenDecision as "APPROVED" | "REJECTED" | null,
        });
      }
      if (loan.kalabDecisionAt) {
        events.push({
          label:
            loan.kalabDecision === "REJECTED"
              ? "Ditolak oleh Kepala Lab"
              : "Disetujui oleh Kepala Lab",
          at: loan.kalabDecisionAt,
          actorName: loan.kalabApprover?.displayName ?? null,
          decision: loan.kalabDecision as "APPROVED" | "REJECTED" | null,
        });
      }
    }

    if (loan.laboranHandoverAt) {
      events.push({
        label:
          loan.type === LoanType.PRACTICUM
            ? "Serah terima (Praktikum)"
            : "Serah terima oleh Laboran",
        at: loan.laboranHandoverAt,
        actorName: loan.laboranHandover?.displayName ?? null,
      });
    }

    if (loan.returnDate) {
      const cond = loan.returnCondition;
      const condLabel = cond ? CONDITION_LABEL[cond] : null;
      events.push({
        label: "Dikembalikan & diterima Laboran",
        at: loan.returnDate,
        actorName: loan.laboranReturn?.displayName ?? null,
        note:
          [
            condLabel ? `Kondisi: ${condLabel}` : null,
            loan.returnNote ? `Catatan: ${loan.returnNote}` : null,
          ]
            .filter(Boolean)
            .join(" • ") || null,
      });
    }

    if (loan.status === LoanStatus.REJECTED && loan.rejectionReason) {
      events.push({
        label: "Alasan penolakan",
        at: null,
        note: loan.rejectionReason,
      });
    }

    if (loan.status === LoanStatus.CANCELLED) {
      events.push({
        label: "Dibatalkan",
        at: loan.updatedAt,
      });
    }

    return { loan, events };
  },

  // -------------------------- Clearances -------------------------
  async listClearances(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 50 } = params;
    const where: Prisma.ClearanceLetterWhereInput = {
      status: { in: CLEARANCE_FINAL_STATUSES },
    };
    const [items, total] = await Promise.all([
      prisma.clearanceLetter.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: CLEARANCE_HISTORY_INCLUDE,
      }),
      prisma.clearanceLetter.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async clearanceTimeline(id: string) {
    const letter = await prisma.clearanceLetter.findUnique({
      where: { id },
      include: CLEARANCE_HISTORY_INCLUDE,
    });
    if (!letter) throw new HttpError(404, "Surat tidak ditemukan");

    // Resolve signer names dari UID — letter hanya simpan UID.
    const [laboranUser, kalabUser] = await Promise.all([
      letter.signerUidLaboran
        ? prisma.user.findUnique({
            where: { uid: letter.signerUidLaboran },
            select: { displayName: true },
          })
        : null,
      letter.signerUidKepalaLab
        ? prisma.user.findUnique({
            where: { uid: letter.signerUidKepalaLab },
            select: { displayName: true },
          })
        : null,
    ]);

    const events: TimelineEvent[] = [];
    events.push({
      label: "Pengajuan diajukan",
      at: letter.createdAt,
      actorName: letter.user.displayName,
    });

    if (letter.signedAtLaboran) {
      events.push({
        label: "Diperiksa & ditandatangani Laboran",
        at: letter.signedAtLaboran,
        actorName: laboranUser?.displayName ?? letter.signerUidLaboran,
        decision: "APPROVED",
      });
    }

    if (letter.status === ClearanceStatus.REJECTED) {
      events.push({
        label: "Ditolak",
        at: letter.updatedAt,
        actorName: letter.approver?.displayName ?? null,
        decision: "REJECTED",
        note: letter.rejectionReason,
      });
    } else if (letter.signedAtKepalaLab) {
      events.push({
        label: "Disetujui & ditandatangani Kepala Lab",
        at: letter.signedAtKepalaLab,
        actorName: kalabUser?.displayName ?? letter.signerUidKepalaLab,
        decision: "APPROVED",
        note: letter.nomorSurat ? `Nomor: ${letter.nomorSurat}` : null,
      });
    }

    return { letter, events };
  },

  // -------------------------- Reservations -----------------------
  async listReservations(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 50 } = params;
    const where: Prisma.RoomReservationWhereInput = {
      status: { in: RESERVATION_FINAL_STATUSES },
    };
    const [items, total] = await Promise.all([
      prisma.roomReservation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: RESERVATION_HISTORY_INCLUDE,
      }),
      prisma.roomReservation.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async reservationTimeline(id: string) {
    const reservation = await prisma.roomReservation.findUnique({
      where: { id },
      include: RESERVATION_HISTORY_INCLUDE,
    });
    if (!reservation) throw new HttpError(404, "Reservasi tidak ditemukan");

    const events: TimelineEvent[] = [];
    events.push({
      label: "Pengajuan diajukan",
      at: reservation.createdAt,
      actorName: reservation.user.displayName,
      note: `Ruangan: ${reservation.room.name}`,
    });

    if (reservation.checkedAt) {
      events.push({
        label: "Diperiksa oleh Laboran",
        at: reservation.checkedAt,
        actorName: reservation.checker?.displayName ?? null,
        decision: "APPROVED",
      });
    }

    if (reservation.status === ReservationStatus.REJECTED) {
      events.push({
        label: "Ditolak oleh Kepala Lab",
        at: reservation.approvedAt ?? reservation.updatedAt,
        actorName: reservation.approver?.displayName ?? null,
        decision: "REJECTED",
      });
    } else if (reservation.approvedAt) {
      events.push({
        label: "Disetujui oleh Kepala Lab",
        at: reservation.approvedAt,
        actorName: reservation.approver?.displayName ?? null,
        decision: "APPROVED",
      });
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      events.push({ label: "Dibatalkan", at: reservation.updatedAt });
    } else if (reservation.status === ReservationStatus.COMPLETED) {
      events.push({ label: "Selesai", at: reservation.updatedAt });
    }

    return { reservation, events };
  },

  // ---------------------- Consumables (Barang Keluar) -------------------
  // Karena ConsumableTransaction.userId = laboran pencatat (bukan penerima),
  // kita kelompokkan tx OUT per (laboran + menit createdAt) jadi 1 bucket —
  // mirror pola di modul Riwayat Transaksi Habis Pakai. Info penerima
  // mahasiswa di-parse oleh frontend dari field `notes` ("Diambil oleh
  // NAME (NIM)"). Rincian barang disertakan langsung di response supaya
  // frontend tidak perlu request endpoint detail terpisah.
  async listConsumableOutgoing(params: { skip?: number; take?: number }) {
    const { skip = 0, take = 100 } = params;
    // Tarik banyak row dulu (cap 1000), group-kan, lalu slice sesuai
    // skip/take pada level bucket. Lab skala kecil-menengah → count ribuan
    // row per hari sangat tidak mungkin, jadi ini cukup.
    const rows = await prisma.consumableTransaction.findMany({
      where: { type: ConsumableTransactionType.OUT },
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        user: { select: { id: true, uid: true, displayName: true } },
        consumable: { select: { id: true, name: true, unit: true } },
      },
    });

    interface Bucket {
      id: string;
      createdAt: Date;
      actor: { id: string; uid: string; displayName: string };
      notes: string | null;
      totalItem: number;
      lines: Array<{
        consumableId: string;
        name: string;
        unit: string;
        quantity: number;
      }>;
    }

    const buckets = new Map<string, Bucket>();
    for (const row of rows) {
      const bucketKey = `${row.userId}__${row.createdAt.toISOString().slice(0, 16)}`;
      const existing = buckets.get(bucketKey);
      const line = {
        consumableId: row.consumableId,
        name: row.consumable?.name ?? "-",
        unit: row.consumable?.unit ?? "",
        quantity: row.quantity,
      };
      if (existing) {
        existing.lines.push(line);
        existing.totalItem += row.quantity;
        // Kalau ada banyak row dengan notes berbeda (edge case), pakai
        // notes pertama yang ada.
        if (!existing.notes && row.notes) existing.notes = row.notes;
      } else {
        buckets.set(bucketKey, {
          id: bucketKey,
          createdAt: row.createdAt,
          actor: row.user
            ? { id: row.user.id, uid: row.user.uid, displayName: row.user.displayName }
            : { id: "-", uid: "-", displayName: "-" },
          notes: row.notes ?? null,
          totalItem: row.quantity,
          lines: [line],
        });
      }
    }

    const all = Array.from(buckets.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const items = all.slice(skip, skip + take);
    return { items, total: all.length, skip, take };
  },
};
