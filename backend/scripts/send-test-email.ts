/**
 * Kirim satu email percobaan untuk verifikasi template + logo URL.
 *
 * Usage:
 *   npx tsx scripts/send-test-email.ts <email-tujuan>
 */

import {
  configureNotificationTransports,
  notifyLoanActivatedToMahasiswa,
} from "../src/services/notification/index.js";
import {
  sendEmail,
  sendWhatsApp,
} from "../src/services/notification/transports.js";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: tsx send-test-email.ts <email>");
    process.exit(1);
  }

  configureNotificationTransports({ sendEmail, sendWhatsApp });

  const result = await notifyLoanActivatedToMahasiswa(
    { email: target, channels: ["email"] },
    {
      namaMahasiswa: "Mahasiswa Uji Coba",
      kodeLaptop: "LAP-TEST",
      namaLaptop: "Laptop Contoh (Email Test)",
      tanggalHarusKembali: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  );

  console.log("[send-test] hasil:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("[send-test] error:", err);
  process.exit(3);
});
