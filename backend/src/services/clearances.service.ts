import { ClearanceStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  generateHash,
  nomorSurat as fmtNomorSurat,
  renderClearancePdf,
} from "./clearancePdf.service.js";

const LETTER_INCLUDE = {
  user: { select: { id: true, uid: true, displayName: true, email: true, waNumber: true } },
  approver: { select: { id: true, displayName: true } },
} satisfies Prisma.ClearanceLetterInclude;

export const clearancesService = {
  async list(
    params: {
      skip?: number;
      take?: number;
      status?: ClearanceStatus;
      userId?: string;
    } = {},
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
        include: LETTER_INCLUDE,
      }),
      prisma.clearanceLetter.count({ where }),
    ]);
    return { items, total, skip, take };
  },

  async getById(id: string) {
    const letter = await prisma.clearanceLetter.findUnique({
      where: { id },
      include: LETTER_INCLUDE,
    });
    if (!letter) throw new HttpError(404, "Surat bebas lab tidak ditemukan");
    return letter;
  },

  async create(input: {
    userId: string;
    notes?: string;
    tanggalSidang?: Date;
  }) {
    return prisma.clearanceLetter.create({
      data: {
        userId: input.userId,
        notes: input.notes,
        tanggalSidang: input.tanggalSidang,
        // Langsung PENDING_LABORAN — laboran memeriksa tanggungan mahasiswa.
        status: ClearanceStatus.PENDING_LABORAN,
      },
      include: LETTER_INCLUDE,
    });
  },

  /**
   * Laboran approve — generate hashLaboran + signedAtLaboran, status
   * berpindah ke PENDING_KEPALA_LAB.
   */
  async approveByLaboran(id: string, signerUid: string) {
    const signedAt = new Date();
    const hash = generateHash(id, signerUid, signedAt);
    return prisma.clearanceLetter.update({
      where: { id },
      data: {
        status: ClearanceStatus.PENDING_KEPALA_LAB,
        signerUidLaboran: signerUid,
        signedAtLaboran: signedAt,
        hashLaboran: hash,
      },
      include: LETTER_INCLUDE,
    });
  },

  /**
   * Kepala Lab approve — final. Generate hashKepalaLab + signedAtKepalaLab,
   * assign nomorSurat, render PDF, set pdfUrl. Status → APPROVED.
   */
  async approveByKepalaLab(id: string, signerUid: string, approverId: string) {
    const signedAt = new Date();
    const hash = generateHash(id, signerUid, signedAt);

    // Hitung nomor surat — urut per tahun, count approved + 1.
    const yearStart = new Date(signedAt.getFullYear(), 0, 1);
    const yearEnd = new Date(signedAt.getFullYear() + 1, 0, 1);
    const countThisYear = await prisma.clearanceLetter.count({
      where: {
        status: ClearanceStatus.APPROVED,
        signedAtKepalaLab: { gte: yearStart, lt: yearEnd },
      },
    });
    const nomor = fmtNomorSurat(countThisYear + 1, signedAt);

    // Update dulu (supaya DB punya semua field yang diperlukan render).
    const letter = await prisma.clearanceLetter.update({
      where: { id },
      data: {
        status: ClearanceStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: signedAt,
        signerUidKepalaLab: signerUid,
        signedAtKepalaLab: signedAt,
        hashKepalaLab: hash,
        nomorSurat: nomor,
      },
      include: LETTER_INCLUDE,
    });

    // Resolve nama laboran/kalab dari signerUid.
    const [laboranUser, kalabUser] = await Promise.all([
      letter.signerUidLaboran
        ? prisma.user.findUnique({
            where: { uid: letter.signerUidLaboran },
            select: { displayName: true },
          })
        : null,
      prisma.user.findUnique({
        where: { uid: signerUid },
        select: { displayName: true },
      }),
    ]);

    const pdfPath = await renderClearancePdf({
      clearanceId: letter.id,
      nomorSurat: nomor,
      namaMahasiswa: letter.user.displayName,
      nim: letter.user.uid,
      tanggalSidang: letter.tanggalSidang,
      tanggalTerbit: signedAt,
      namaLaboran: laboranUser?.displayName ?? "-",
      namaKepalaLab: kalabUser?.displayName ?? "-",
      hashLaboran: letter.hashLaboran ?? "",
      hashKepalaLab: hash,
    });

    return prisma.clearanceLetter.update({
      where: { id },
      data: { pdfUrl: pdfPath },
      include: LETTER_INCLUDE,
    });
  },

  async reject(id: string, reason: string | undefined) {
    return prisma.clearanceLetter.update({
      where: { id },
      data: {
        status: ClearanceStatus.REJECTED,
        rejectionReason: reason,
      },
      include: LETTER_INCLUDE,
    });
  },

  /**
   * Regenerate PDF kalau hilang (mis. file terhapus dari disk). Hanya untuk
   * letter yang sudah APPROVED.
   */
  async ensurePdf(id: string): Promise<string> {
    const letter = await this.getById(id);
    if (letter.status !== ClearanceStatus.APPROVED)
      throw new HttpError(400, "Surat belum terbit");
    const fs = await import("node:fs");
    if (letter.pdfUrl && fs.existsSync(letter.pdfUrl)) return letter.pdfUrl;

    // Regenerate — butuh data signers.
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
    const pdfPath = await renderClearancePdf({
      clearanceId: letter.id,
      nomorSurat: letter.nomorSurat ?? "-",
      namaMahasiswa: letter.user.displayName,
      nim: letter.user.uid,
      tanggalSidang: letter.tanggalSidang,
      tanggalTerbit: letter.signedAtKepalaLab ?? letter.approvedAt ?? new Date(),
      namaLaboran: laboranUser?.displayName ?? "-",
      namaKepalaLab: kalabUser?.displayName ?? "-",
      hashLaboran: letter.hashLaboran ?? "",
      hashKepalaLab: letter.hashKepalaLab ?? "",
    });
    await prisma.clearanceLetter.update({
      where: { id },
      data: { pdfUrl: pdfPath },
    });
    return pdfPath;
  },
};
