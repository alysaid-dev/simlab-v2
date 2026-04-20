/**
 * Kirim ulang notifikasi "Peminjaman Laptop Berhasil" (Activated) untuk loan
 * tertentu. Dipakai untuk recovery kalau notif asli gagal/salah template.
 *
 * Usage:
 *   npx tsx scripts/resend-loan-activated.ts <loan-id-prefix>
 *
 * <loan-id-prefix> bisa UUID penuh atau 8-char prefix (sama seperti TRX-XXXX
 * yang tampil di UI — case-insensitive).
 */

import { prisma } from "../src/config/database.js";
import {
  configureNotificationTransports,
  notifyLoanActivatedToMahasiswa,
} from "../src/services/notification/index.js";
import {
  sendEmail,
  sendWhatsApp,
} from "../src/services/notification/transports.js";

function fmtDateTime(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: tsx resend-loan-activated.ts <loan-id-prefix>");
    process.exit(1);
  }

  const prefix = arg.toLowerCase().replace(/^trx-/i, "");

  // UUID column tidak support startsWith di Prisma — pakai raw SQL untuk cari
  // loan yang id-nya mulai dengan prefix, lalu fetch detail pakai findUnique.
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM loans WHERE id::text LIKE $1 LIMIT 2`,
    `${prefix}%`,
  );
  if (rows.length === 0) {
    console.error(`Loan tidak ditemukan untuk prefix "${prefix}"`);
    process.exit(2);
  }
  if (rows.length > 1) {
    console.error(`Prefix "${prefix}" ambigu — cocok dengan lebih dari 1 loan`);
    process.exit(2);
  }
  const loan = await prisma.loan.findUnique({
    where: { id: rows[0]!.id },
    include: {
      borrower: { select: { displayName: true, email: true, waNumber: true } },
      asset: { select: { name: true, code: true } },
    },
  });

  if (!loan) {
    console.error(`Loan tidak ditemukan untuk prefix "${prefix}"`);
    process.exit(2);
  }

  console.log(
    `[resend] loan ${loan.id} — ${loan.borrower.displayName} (${loan.asset.code})`,
  );
  console.log(
    `[resend] target: email=${loan.borrower.email ?? "-"} waNumber=${loan.borrower.waNumber ?? "-"}`,
  );

  configureNotificationTransports({ sendEmail, sendWhatsApp });

  const result = await notifyLoanActivatedToMahasiswa(
    {
      email: loan.borrower.email ?? undefined,
      phone: loan.borrower.waNumber ?? undefined,
    },
    {
      namaMahasiswa: loan.borrower.displayName,
      kodeLaptop: loan.asset.code,
      namaLaptop: loan.asset.name,
      tanggalHarusKembali: fmtDateTime(loan.endDate),
    },
  );

  console.log("[resend] hasil:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[resend] error:", err);
  await prisma.$disconnect();
  process.exit(3);
});
