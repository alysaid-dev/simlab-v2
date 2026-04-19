import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "../config/env.js";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const BULAN_ROMAWI = [
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII",
];

export function fmtTanggalID(d: Date): string {
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function generateHash(
  clearanceId: string,
  signerUid: string,
  timestamp: Date,
): string {
  return crypto
    .createHash("sha256")
    .update(`${clearanceId}${signerUid}${timestamp.toISOString()}${env.qrSecretKey}`)
    .digest("hex");
}

export function nomorSurat(
  urut: number,
  signedAt: Date,
): string {
  const bulanRom = BULAN_ROMAWI[signedAt.getMonth()];
  const tahun = signedAt.getFullYear();
  const urutStr = String(urut).padStart(3, "0");
  return `${urutStr}/Lab.Stat/FMIPA-UII/${bulanRom}/${tahun}`;
}

const LOGO_PATH = path.resolve(
  "/var/www/simlab-v2/src/assets/logo-atas-surat.png",
);

export interface RenderClearancePdfInput {
  clearanceId: string;
  nomorSurat: string;
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: Date | null;
  tanggalTerbit: Date;
  namaLaboran: string;
  namaKepalaLab: string;
  hashLaboran: string;
  hashKepalaLab: string;
}

/**
 * Render surat bebas lab ke PDF dan tulis ke storage. Return absolute path
 * file yang ditulis.
 */
export async function renderClearancePdf(
  input: RenderClearancePdfInput,
): Promise<string> {
  const storageDir = path.join(env.storageRoot, "clearances");
  fs.mkdirSync(storageDir, { recursive: true });
  const outPath = path.join(storageDir, `${input.clearanceId}.pdf`);

  // Generate 2 QR codes as data URL.
  const qrOpts = { width: 140, margin: 1 } as const;
  const qrLaboranDataUrl = await QRCode.toDataURL(
    `${env.publicBaseUrl}/verify/${input.hashLaboran}`,
    qrOpts,
  );
  const qrKepalaLabDataUrl = await QRCode.toDataURL(
    `${env.publicBaseUrl}/verify/${input.hashKepalaLab}`,
    qrOpts,
  );
  const qrLaboranBuf = Buffer.from(
    qrLaboranDataUrl.replace(/^data:image\/png;base64,/, ""),
    "base64",
  );
  const qrKepalaLabBuf = Buffer.from(
    qrKepalaLabDataUrl.replace(/^data:image\/png;base64,/, ""),
    "base64",
  );

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const stream = fs.createWriteStream(outPath);
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    doc.pipe(stream);

    // Header: logo — cap tinggi 90pt, centered horizontal. Lebar auto
    // menyesuaikan rasio gambar sumber.
    const logoTop = 40;
    const logoMaxH = 90;
    if (fs.existsSync(LOGO_PATH)) {
      // fit: [w, h] — gambar di-scale agar muat kotak, center sumbu di x.
      doc.image(LOGO_PATH, (doc.page.width - 200) / 2, logoTop, {
        fit: [200, logoMaxH],
        align: "center",
      });
    }

    // Mulai konten di bawah logo.
    doc.y = logoTop + logoMaxH + 20;

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("SURAT KETERANGAN BEBAS LABORATORIUM", { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(11)
      .text(`No. : ${input.nomorSurat}`, { align: "center" });

    doc.moveDown(1.5);
    doc
      .fontSize(11)
      .text(
        "Yang bertanda tangan di bawah ini, Kepala Laboratorium Statistika " +
          "Fakultas Matematika dan Ilmu Pengetahuan Alam Universitas Islam " +
          "Indonesia, menerangkan bahwa:",
        { align: "justify" },
      );

    doc.moveDown(1);
    const labelX = 100;
    const valueX = 220;
    const labelFn = (label: string, value: string) => {
      doc.text(label, labelX, doc.y, { continued: true });
      doc.text(": ", { continued: true });
      doc.text(value);
    };
    doc.font("Helvetica");
    labelFn("Nama", input.namaMahasiswa);
    labelFn("NIM", input.nim);
    labelFn(
      "Tanggal Sidang",
      input.tanggalSidang ? fmtTanggalID(input.tanggalSidang) : "-",
    );

    doc.moveDown(1);
    doc
      .text(
        "Mahasiswa tersebut di atas dinyatakan BEBAS dari segala kewajiban " +
          "dan tanggungan kepada Laboratorium Statistika FMIPA UII.",
        60,
        doc.y,
        { align: "justify" },
      );

    doc.moveDown(0.7);
    doc.text(
      "Surat keterangan ini diterbitkan untuk dipergunakan sebagaimana mestinya.",
      { align: "justify" },
    );

    doc.moveDown(1.2);
    doc.text(`Yogyakarta, ${fmtTanggalID(input.tanggalTerbit)}`, {
      align: "right",
    });

    // Dua kolom tanda tangan: Kepala Lab (kiri) + Laboran (kanan)
    const sigTop = doc.y + 15;
    const colLeftX = 80;
    const colRightX = 330;
    const colWidth = 200;

    doc.font("Helvetica").fontSize(11);
    doc.text("Mengetahui,", colLeftX, sigTop, { width: colWidth });
    doc.text("Kepala Laboratorium", colLeftX, sigTop + 14, { width: colWidth });

    doc.text("Laboran,", colRightX, sigTop, { width: colWidth });

    // QR codes
    const qrY = sigTop + 36;
    doc.image(qrKepalaLabBuf, colLeftX, qrY, { width: 80 });
    doc.image(qrLaboranBuf, colRightX, qrY, { width: 80 });

    // Nama tanda tangan di bawah QR
    const namaY = qrY + 90;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(input.namaKepalaLab, colLeftX, namaY, { width: colWidth });
    doc.text(input.namaLaboran, colRightX, namaY, { width: colWidth });

    // NB footer
    doc.moveDown(3);
    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text("NB:", 60, Math.max(doc.y, namaY + 50));
    doc.text(
      "1. Dokumen ini ditandatangani secara digital dan dapat diverifikasi melalui QR Code di atas.",
      { indent: 12 },
    );
    doc.text(
      "2. Dokumen ini sah apabila terdapat stempel basah dari Laboratorium Statistika FMIPA UII.",
      { indent: 12 },
    );

    doc.end();
  });

  return outPath;
}
