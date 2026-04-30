/**
 * Test notif "Pengembalian Laptop Tercatat" — kirim 2 versi (TA + PRACTICUM)
 * untuk membandingkan apakah ajakan Surat Bebas Lab muncul/hilang sesuai
 * loan.type.
 *
 * Usage:
 *   npx tsx scripts/test-loan-returned-notif.ts
 */

import {
  configureNotificationTransports,
  notifyLoanReturnedToMahasiswa,
} from "../src/services/notification/index.js";
import {
  sendEmail,
  sendWhatsApp,
} from "../src/services/notification/transports.js";

const RECIPIENT = {
  email: "muhammad.aly.said@gmail.com",
  phone: "081215481452",
};

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
  configureNotificationTransports({ sendEmail, sendWhatsApp });

  const baseParams = {
    namaMahasiswa: "Muhammad Aly Said (TEST)",
    kodeLaptop: "LPT-007",
    namaLaptop: "Lenovo ThinkPad E14 Gen 2",
    tanggalKembali: fmtDateTime(new Date()),
    kondisi: "Baik",
    diterimaOleh: "Sari Laboran (TEST)",
  };

  console.log(
    `[test] Target — email: ${RECIPIENT.email}, WA: ${RECIPIENT.phone}\n`,
  );

  // ---------- Variant A: loan TA — Surat Bebas Lab MUNCUL ----------
  console.log("[test] Mengirim variant A — TA (showBebasLabHint=true)...");
  const resultTA = await notifyLoanReturnedToMahasiswa(RECIPIENT, {
    ...baseParams,
    catatan: "TEST TA — ajakan Surat Bebas Lab seharusnya MUNCUL",
    showBebasLabHint: true,
  });
  console.log("[test] Hasil TA:", JSON.stringify(resultTA, null, 2));

  // ---------- Variant B: loan PRACTICUM — Surat Bebas Lab HILANG ----------
  console.log(
    "\n[test] Mengirim variant B — PRACTICUM (showBebasLabHint=false)...",
  );
  const resultPrak = await notifyLoanReturnedToMahasiswa(RECIPIENT, {
    ...baseParams,
    catatan: "TEST PRACTICUM — ajakan Surat Bebas Lab seharusnya HILANG",
    showBebasLabHint: false,
  });
  console.log("[test] Hasil PRACTICUM:", JSON.stringify(resultPrak, null, 2));

  console.log("\n[test] Selesai. Cek inbox + WhatsApp untuk membandingkan.");
}

main().catch((err) => {
  console.error("[test] error:", err);
  process.exit(1);
});
