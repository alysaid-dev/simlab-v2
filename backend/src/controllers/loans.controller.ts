import { AssetCondition, FinePaidStatus, LoanStatus, LoanType, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { loansService } from "../services/loans.service.js";
import { usersService } from "../services/users.service.js";
import { appSettingsService } from "../services/appSettings.service.js";
import { hasAnyRole } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CONDITION_LABEL, fmtDateTime, fmtRupiah } from "../utils/format.js";
import {
  notifyCancelledBySystemToMahasiswa,
  notifyLoanActivatedToMahasiswa,
  notifyLoanApprovalToDosen,
  notifyLoanApprovedByDosenToMahasiswa,
  notifyLoanApprovedByKalabToMahasiswa,
  notifyLoanApprovedToLaboran,
  notifyLoanCreatedToMahasiswa,
  notifyLoanExtendedToMahasiswa,
  notifyLoanReturnedToMahasiswa,
} from "../services/notification/index.js";
import { deriveRoles } from "../middleware/auth.js";

const listQuery = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
  status: z.nativeEnum(LoanStatus).optional(),
  userId: z.string().uuid().optional(),
  lecturerId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
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
  returnCondition: z.nativeEnum(AssetCondition).optional(),
  returnNote: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const updateBody = z.object({
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

const fineBody = z.object({
  finePaid: z.nativeEnum(FinePaidStatus),
  fineNote: z.string().trim().max(500).optional(),
});

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
    if (!isOwner && !hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")) {
      throw new HttpError(403, "Anda tidak berhak melihat peminjaman ini");
    }
    res.json(loan);
  }),

  create: asyncHandler(async (req, res) => {
    const body = createBody.parse(req.body);
    const requester = await usersService.getByUid(req.user!.uid);

    // Only laboran/kalab/super admin may book on someone else's behalf.
    const targetUserId =
      body.userId && hasAnyRole(req.user!, "LABORAN", "KEPALA_LAB", "SUPER_ADMIN")
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
    // Walk-in praktikum: loan langsung ACTIVE — itu sudah serah-terima.
    // Tandai laboranHandover supaya timeline History punya siapa + kapan.
    const handoverFields =
      rest.status === LoanStatus.ACTIVE
        ? {
            laboranHandoverBy: requester.id,
            laboranHandoverAt: new Date(),
          }
        : {};
    const loan = await loansService.create({
      ...rest,
      ...handoverFields,
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
      const settings = await appSettingsService.get();
      void notifyLoanActivatedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
        tanggalHarusKembali: fmtDateTime(loan.endDate),
        diserahkanOleh: actor.displayName,
        dendaPerHari: fmtRupiah(settings.lateFeePerDayIdr),
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
    const { status, returnCondition, returnNote, rejectionReason } =
      statusBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    // Ambil status SEBELUM update — dipakai buat tentukan siapa yang
    // bertindak saat REJECTED (dosen vs kalab). Tidak pakai role caller
    // karena user bisa punya multi-role (mis. laboran+super_admin).
    const previous = await loansService.getById(req.params.id!);
    const loan = await loansService.updateStatus(req.params.id!, {
      status,
      actorId: actor.id,
      returnCondition,
      returnNote,
      rejectionReason,
    });

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
      const settings = await appSettingsService.get();
      void notifyLoanActivatedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
        tanggalHarusKembali: fmtDateTime(loan.endDate),
        diserahkanOleh: actor.displayName,
        dendaPerHari: fmtRupiah(settings.lateFeePerDayIdr),
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
    } else if (status === LoanStatus.RETURNED) {
      // Pengembalian tercatat — kirim konfirmasi ke mahasiswa. Blok denda
      // hanya muncul kalau telat efektif > 0 (selisih kalender dikurangi
      // toleransi hari dari AppSettings). Nilai fine + dayLate sudah di-
      // populate oleh loansService.updateStatus di layer service — di sini
      // kita tinggal baca dari loan hasil update.
      const hariTelat = loan.dayLate ?? 0;
      const fineAmount = Number(loan.fine ?? 0);
      const totalDenda = fineAmount > 0 ? fmtRupiah(fineAmount) : undefined;
      void notifyLoanReturnedToMahasiswa(mahasiswaRecipient, {
        namaMahasiswa: loan.borrower.displayName,
        kodeLaptop: loan.asset.code,
        namaLaptop: loan.asset.name,
        tanggalKembali: fmtDateTime(loan.returnDate ?? new Date()),
        kondisi: CONDITION_LABEL[returnCondition ?? loan.asset.condition],
        diterimaOleh: actor.displayName,
        catatan: returnNote || undefined,
        hariTelat,
        totalDenda,
      });
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
    const previous = await loansService.getById(req.params.id!);
    const loan = await loansService.update(req.params.id!, data);

    // Notif perpanjangan — kirim hanya kalau endDate benar-benar maju
    // (tanggal baru > tanggal lama). Kalau admin koreksi jadi sama/lebih
    // awal, skip supaya tidak spam mahasiswa.
    if (
      body.endDate !== undefined &&
      body.endDate.getTime() > previous.endDate.getTime()
    ) {
      const actor = await usersService.getByUid(req.user!.uid);
      const settings = await appSettingsService.get();
      void notifyLoanExtendedToMahasiswa(
        {
          email: loan.borrower.email ?? undefined,
          phone: loan.borrower.waNumber ?? undefined,
        },
        {
          namaMahasiswa: loan.borrower.displayName,
          kodeLaptop: loan.asset.code,
          namaLaptop: loan.asset.name,
          tanggalLama: fmtDateTime(previous.endDate),
          tanggalBaru: fmtDateTime(loan.endDate),
          diprosesOleh: actor.displayName,
          dendaPerHari: fmtRupiah(settings.lateFeePerDayIdr),
        },
      );
    }

    res.json(loan);
  }),

  // List loan dengan fine > 0 untuk modul Riwayat Denda. Support filter
  // status pembayaran (UNPAID/PAID/WAIVED) + search NIM/nama. Guarded ke
  // LABORAN+ via route.
  listFines: asyncHandler(async (req, res) => {
    const q = z
      .object({
        skip: z.coerce.number().int().min(0).optional(),
        take: z.coerce.number().int().min(1).max(200).optional(),
        finePaid: z.nativeEnum(FinePaidStatus).optional(),
        search: z.string().trim().optional(),
      })
      .parse(req.query);
    const result = await loansService.listFines(q);
    res.json(result);
  }),

  // Set status pembayaran denda (Lunas / Dibebaskan / Belum Lunas) + catatan.
  // Hanya loan yang sudah RETURNED dengan fine > 0 yang relevan, validasi di
  // service.
  markFine: asyncHandler(async (req, res) => {
    const body = fineBody.parse(req.body);
    const actor = await usersService.getByUid(req.user!.uid);
    const loan = await loansService.markFine(req.params.id!, {
      finePaid: body.finePaid,
      fineNote: body.fineNote,
      actorId: actor.id,
    });
    res.json(loan);
  }),
};
