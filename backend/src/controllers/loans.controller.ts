import { LoanStatus, LoanType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { loansService } from "../services/loans.service.js";
import { usersService } from "../services/users.service.js";
import { hasRoleAtLeast } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  notifyCancelledBySystemToMahasiswa,
  notifyLoanActivatedToMahasiswa,
  notifyLoanApprovalToDosen,
  notifyLoanApprovedByDosenToMahasiswa,
  notifyLoanApprovedByKalabToMahasiswa,
  notifyLoanApprovedToLaboran,
  notifyLoanCreatedToMahasiswa,
} from "../services/notification/index.js";
import { deriveRoles } from "../middleware/auth.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
  lecturerId: z.string().uuid().optional(),
});

// `userId` in the body is only honored when the caller has LABORAN+ role —
// typically laboran creating a loan on behalf of a student who came in
// person. For ordinary users the session identity wins.
const createBody = z.object({
  userId: z.string().uuid().optional(),
  assetId: z.string().uuid(),
  lecturerId: z.string().uuid().optional(),
  type: z.nativeEnum(LoanType),
  status: z.nativeEnum(LoanStatus).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  thesisTitle: z.string().optional(),
  thesisAbstract: z.string().optional(),
  notes: z.string().optional(),
  // Opsional — kalau dikirim, update User.waNumber supaya prefill
  // konsisten di form-form berikutnya (mengikuti pola reservations).
  waNumber: z.string().trim().min(6).optional(),
});

const statusBody = z.object({
  status: z.nativeEnum(LoanStatus),
});

const updateBody = z.object({
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const loansController = {
  list: asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);
    const result = await loansService.list(q);
    res.json(result);
  }),

  getById: asyncHandler(async (req, res) => {
    const loan = await loansService.getById(req.params.id!);
    const requester = await usersService.getByUid(req.user!.uid);
    const isOwner = loan.userId === requester.id;
    if (!isOwner && !hasRoleAtLeast(req.user!, "LABORAN")) {
      throw new HttpError(403, "Anda tidak berhak melihat peminjaman ini");
    }
    res.json(loan);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);

    // Only laboran+ may book on someone else's behalf.
    const targetUserId =
      body.userId && hasRoleAtLeast(req.user!, "LABORAN")
        ? body.userId
        : requester.id;

    // Side-effect: persist nomor WA ke profil user supaya form berikutnya
    // bisa prefill (hanya kalau yang submit = owner).
    if (
      body.waNumber &&
      targetUserId === requester.id &&
      body.waNumber !== requester.waNumber
    ) {
      await prisma.user.update({
        where: { id: requester.id },
        data: { waNumber: body.waNumber },
      });
    }

    const { userId: _ignored, waNumber: _wa, ...rest } = body;
    const loan = await loansService.create({
      ...rest,
      userId: targetUserId,
    });

    const mahasiswaRecipient = {
      email: loan.borrower.email ?? undefined,
      phone: loan.borrower.waNumber ?? undefined,
    };

    if (loan.status === LoanStatus.ACTIVE) {
      // Walk-in (praktikum) — laboran membuat loan langsung ACTIVE. Ini sudah
      // setara serah terima, jadi kirim notif "Peminjaman Berhasil" bukan
      // "Permohonan Dibuat" yang mengisyaratkan masih menunggu approval.
      const actor = await usersService.getByUid(req.user!.uid);
      void notifyLoanActivatedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
        tanggalHarusKembali: fmtDateTime(loan.endDate),
        diserahkanOleh: actor.displayName,
      });
    } else {
      // Alur normal TA — pengajuan masuk PENDING, menunggu approval dosen.
      void notifyLoanCreatedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
      });

      if (loan.lecturer?.email || loan.lecturer?.waNumber) {
        void notifyLoanApprovalToDosen(
          {
            email: loan.lecturer.email ?? undefined,
            phone: loan.lecturer.waNumber ?? undefined,
          },
          {
            dosenName: loan.lecturer.displayName,
            namaMahasiswa: loan.borrower.displayName,
            nim: loan.borrower.uid,
          },
        );
      }
    }

    res.status(201).json(loan);
  }),

  // Route guard restricts this to LABORAN / KEPALA_LAB / ADMIN / SUPER_ADMIN.
  updateStatus: asyncHandler(async (req, res) => {
    const { status } = statusBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    // Ambil status SEBELUM update — dipakai buat tentukan siapa yang
    // bertindak saat REJECTED (dosen vs kalab). Tidak pakai role caller
    // karena user bisa punya multi-role (mis. laboran+super_admin).
    const previous = await loansService.getById(req.params.id!);
    const loan = await loansService.updateStatus(req.params.id!, status);

    const mahasiswaRecipient = {
      email: loan.borrower.email ?? undefined,
      phone: loan.borrower.waNumber ?? undefined,
    };
    const commonLoanParams = {
      namaMahasiswa: loan.borrower.displayName,
      kodeLaptop: loan.asset.code,
      namaLaptop: loan.asset.name,
      disetujuiOleh: actor.displayName,
      waktuPersetujuan: fmtDateTime(new Date()),
    };

    if (status === LoanStatus.APPROVED_BY_DOSEN) {
      void notifyLoanApprovedByDosenToMahasiswa(
        mahasiswaRecipient,
        commonLoanParams,
      );
    } else if (status === LoanStatus.ACTIVE) {
      // Step 12 — serah terima selesai oleh laboran. Kirim konfirmasi
      // peminjaman aktif + tanggal harus kembali ke mahasiswa.
      void notifyLoanActivatedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
        tanggalHarusKembali: fmtDateTime(loan.endDate),
        diserahkanOleh: actor.displayName,
      });
    } else if (status === LoanStatus.APPROVED) {
      void notifyLoanApprovedByKalabToMahasiswa(
        mahasiswaRecipient,
        commonLoanParams,
      );

      // Semua laboran aktif dapat notif "siap serah terima".
      const laborans = await prisma.user.findMany({
        where: {
          isActive: true,
          roles: { some: { role: { name: "LABORAN" } } },
        },
        select: { displayName: true, email: true, waNumber: true },
      });
      for (const laboran of laborans) {
        if (!laboran.email && !laboran.waNumber) continue;
        void notifyLoanApprovedToLaboran(
          {
            email: laboran.email ?? undefined,
            phone: laboran.waNumber ?? undefined,
          },
          {
            laboranName: laboran.displayName,
            namaMahasiswa: loan.borrower.displayName,
            nim: loan.borrower.uid,
            kodeLaptop: loan.asset.code,
            namaLaptop: loan.asset.name,
          },
        );
      }
    } else if (status === LoanStatus.CANCELLED) {
      // Super Admin membatalkan via Monitor Transaksi — kirim notifikasi
      // khusus "Permohonan Dibatalkan Oleh Sistem". Kalau yang batalkan
      // bukan super admin (mis. owner sendiri), skip — tidak perlu notif.
      const callerRoles = deriveRoles(req.user!);
      if (callerRoles.has("SUPER_ADMIN")) {
        void notifyCancelledBySystemToMahasiswa(mahasiswaRecipient, {
          namaMahasiswa: loan.borrower.displayName,
          namaModul: "Peminjaman Laptop",
          waktuPembatalan: fmtDateTime(new Date()),
        });
      }
    } else if (status === LoanStatus.REJECTED) {
      // Penolakan — tentukan siapa yang nolak berdasarkan status SEBELUM
      // update:
      //   PENDING            → dosen yang nolak (baru masuk ke alur dosen)
      //   APPROVED_BY_DOSEN  → kalab yang nolak (dosen sudah approve)
      //   lainnya            → fallback ke dosen (rare edge)
      const rejectedByKalab =
        previous.status === LoanStatus.APPROVED_BY_DOSEN;
      const notifyFn = rejectedByKalab
        ? notifyLoanApprovedByKalabToMahasiswa
        : notifyLoanApprovedByDosenToMahasiswa;
      void notifyFn(mahasiswaRecipient, {
        ...commonLoanParams,
        approved: false,
      });
    }

    res.json(loan);
  }),

  // Body update — endDate (perpanjangan) & notes. Guarded to LABORAN+.
  update: asyncHandler(async (req, res) => {
    const body = updateBody.parse(req.body);
    const data: Prisma.LoanUncheckedUpdateInput = {};
    if (body.endDate !== undefined) data.endDate = body.endDate;
    if (body.notes !== undefined) data.notes = body.notes;
    const loan = await loansService.update(req.params.id!, data);
    res.json(loan);
  }),
};
