/**
 * SIMLAB notification templates — email (HTML) and WhatsApp (plain text).
 *
 * Each exported function returns { subject, html, whatsapp }. Callers pick
 * which channel(s) to send. Content follows "Draft Isi Pesan SIMLAB V2".
 */

export const SIMLAB_URL = 'https://statistics.uii.ac.id/simlab';
export const LATE_FEE_PER_DAY = 'Rp25.000';
export const LOGO_URL =
  'https://raw.githubusercontent.com/alysaid-dev/simlab-v2/main/src/assets/logo-statistika.png';

export interface NotificationTemplate {
  subject: string;
  html: string;
  whatsapp: string;
}

// ---------------------------------------------------------------------------
// Shared email wrapper — gradient header (purple → blue → cyan) + footer.
// ---------------------------------------------------------------------------

interface EmailLayoutOpts {
  greeting: string;
  bodyHtml: string;
  linkSimlab?: string;
  linkLabel?: string;
}

function emailLayout({ greeting, bodyHtml, linkSimlab, linkLabel }: EmailLayoutOpts): string {
  const button = linkSimlab
    ? `<p style="margin:24px 0;text-align:center">
         <a href="${linkSimlab}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed 0%,#2563eb 50%,#06b6d4 100%);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${linkLabel ?? 'Buka SIMLAB'}</a>
       </p>
       <p style="margin:8px 0;font-size:13px;color:#475569;word-break:break-all;text-align:center">
         <a href="${linkSimlab}" style="color:#2563eb;text-decoration:underline">${linkSimlab}</a>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SIMLAB</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,0.08)">
          <tr>
            <td align="center" style="background:#DBEAFE;padding:28px 32px;border-bottom:3px solid #FFB800">
              <img src="${LOGO_URL}" alt="Laboratorium Statistika UII" height="72" style="display:block;margin:0 auto;height:72px;width:auto;border:0" />
            </td>
          </tr>
          <tr>
            <td style="height:2px;background:#003087;line-height:2px;font-size:0">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px">
              <p style="margin:0 0 16px;font-size:15px;color:#0f172a">${greeting}</p>
              <p style="margin:0 0 16px;font-style:italic;color:#334155">Assalamualaikum warahmatullahi wabarakatuh</p>
              ${bodyHtml}
              ${button}
              <p style="margin:24px 0 0;font-style:italic;color:#334155">Wassalamualaikum warahmatullahi wabarakatuh</p>
              <p style="margin:16px 0 0;font-size:14px;color:#0f172a">
                Hormat kami,<br />
                <strong>Laboratorium Statistika FMIPA</strong><br />
                Universitas Islam Indonesia
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0f172a;padding:16px 32px;text-align:center;color:#cbd5e1;font-size:12px">
              Laboratorium Statistika FMIPA Universitas Islam Indonesia<br />
              <span style="color:#64748b">Email ini dikirim otomatis oleh sistem SIMLAB. Mohon tidak membalas email ini.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([k, v]) => `<tr>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:40%;font-size:14px">${k}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px">${v}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border:1px solid #e2e8f0">${body}</table>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1e293b">${text}</p>`;
}

function waDetails(rows: Array<[string, string]>): string {
  return rows.map(([k, v]) => `${k}: ${v}`).join('\n');
}

const WA_FOOTER = '\n\nHormat kami,\n*Laboratorium Statistika FMIPA*\nUniversitas Islam Indonesia';
const WA_SALAM = '*SIMLAB Statistika UII*\n\n_Assalamualaikum warahmatullahi wabarakatuh_';

// ---------------------------------------------------------------------------
// 1. Dosen — permohonan persetujuan peminjaman laptop
// ---------------------------------------------------------------------------
export interface LoanApprovalToDosenParams {
  dosenName: string;
  namaMahasiswa: string;
  nim: string;
  linkSimlab?: string;
}

export function loanApprovalRequestToDosen(p0: LoanApprovalToDosenParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = `[SIMLAB] Permohonan Persetujuan Peminjaman Laptop an ${p0.namaMahasiswa} (${p0.nim})`;
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.dosenName}`,
    bodyHtml:
      p('Melalui email ini, kami menyampaikan bahwa terdapat pengajuan peminjaman laptop oleh mahasiswa bimbingan Bapak/Ibu dengan detail sebagai berikut:') +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['NIM', p0.nim],
      ]) +
      p('Mohon Bapak/Ibu berkenan memberikan persetujuan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Beri Persetujuan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Persetujuan Peminjaman Laptop*

Yth. Bapak/Ibu ${p0.dosenName},
Terdapat pengajuan peminjaman laptop oleh mahasiswa bimbingan Bapak/Ibu:

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
])}

Mohon berkenan memberikan persetujuan melalui SIMLAB:
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 2. Kalab — notifikasi pengajuan peminjaman laptop
// ---------------------------------------------------------------------------
export interface LoanApprovalToKalabParams {
  kalabName: string;
  namaMahasiswa: string;
  nim: string;
  disetujuiOleh: string;
  waktuPersetujuan: string;
  linkSimlab?: string;
}

export function loanApprovalRequestToKalab(p0: LoanApprovalToKalabParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Pengajuan Peminjaman Laptop';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.kalabName}`,
    bodyHtml:
      p('Melalui email ini, diberitahukan bahwa pengajuan peminjaman laptop berikut telah mendapatkan persetujuan dari dosen pembimbing dan saat ini menunggu persetujuan Kepala Laboratorium:') +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Disetujui Oleh', p0.disetujuiOleh],
        ['Waktu Persetujuan', p0.waktuPersetujuan],
      ]) +
      p('Mohon Bapak/Ibu berkenan memberikan persetujuan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Beri Persetujuan',
  });
  const whatsapp = `${WA_SALAM}

*Notifikasi Pengajuan Peminjaman Laptop*

Yth. Bapak/Ibu ${p0.kalabName},
Pengajuan peminjaman laptop telah disetujui dosen pembimbing dan menunggu persetujuan Kepala Laboratorium.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['✅ Disetujui Oleh', p0.disetujuiOleh],
  ['🕒 Waktu', p0.waktuPersetujuan],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 3. Kalab — peminjaman ruangan menunggu persetujuan
// ---------------------------------------------------------------------------
export interface RoomReservationToKalabParams {
  kalabName: string;
  namaPemohon: string;
  nomorInduk: string;
  ruangan: string;
  diperiksaOleh: string;
  linkSimlab?: string;
}

export function roomReservationToKalab(p0: RoomReservationToKalabParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Permohonan Peminjaman Ruangan - Menunggu Persetujuan Kepala Lab';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.kalabName}`,
    bodyHtml:
      p('Terdapat permohonan peminjaman ruangan laboratorium yang telah diperiksa dan diverifikasi oleh laboran, serta saat ini menunggu persetujuan Kepala Laboratorium:') +
      detailTable([
        ['Nama Pemohon', p0.namaPemohon],
        ['Nomor Induk', p0.nomorInduk],
        ['Ruangan', p0.ruangan],
        ['Diperiksa Oleh', p0.diperiksaOleh],
      ]) +
      p('Mohon Bapak/Ibu berkenan memberikan persetujuan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Beri Persetujuan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Peminjaman Ruangan*

Yth. Bapak/Ibu ${p0.kalabName},
Permohonan peminjaman ruangan telah diverifikasi laboran dan menunggu persetujuan Kepala Lab.

${waDetails([
  ['👤 Pemohon', p0.namaPemohon],
  ['🆔 No. Induk', p0.nomorInduk],
  ['🚪 Ruangan', p0.ruangan],
  ['🔍 Diperiksa Oleh', p0.diperiksaOleh],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 4. Kalab — surat keterangan bebas lab telah diperiksa
// ---------------------------------------------------------------------------
export interface ClearanceLetterToKalabParams {
  kalabName: string;
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  diperiksaOleh: string;
  waktuPemeriksaan: string;
  linkSimlab?: string;
}

export function clearanceLetterToKalab(p0: ClearanceLetterToKalabParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Permohonan Surat Keterangan Bebas Laboratorium';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.kalabName}`,
    bodyHtml:
      p('Terdapat permohonan penerbitan Surat Keterangan Bebas Laboratorium yang telah diperiksa oleh laboran dan saat ini menunggu persetujuan oleh Kepala Laboratorium:') +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['Nomor Induk', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
        ['Diperiksa Oleh', `${p0.diperiksaOleh} pada ${p0.waktuPemeriksaan}`],
      ]) +
      p('Mohon Bapak/Ibu berkenan memberikan persetujuan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Beri Persetujuan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Surat Keterangan Bebas Lab*

Yth. Bapak/Ibu ${p0.kalabName},
Permohonan Surat Keterangan Bebas Laboratorium telah diperiksa laboran dan menunggu persetujuan Kepala Lab.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Tgl Sidang', p0.tanggalSidang],
  ['🔍 Diperiksa Oleh', `${p0.diperiksaOleh} pada ${p0.waktuPemeriksaan}`],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 5. Laboran — peminjaman laptop disetujui Kalab
// ---------------------------------------------------------------------------
export interface LoanApprovedToLaboranParams {
  laboranName: string;
  namaMahasiswa: string;
  nim: string;
  kodeLaptop: string;
  namaLaptop: string;
  linkSimlab?: string;
}

export function loanApprovedToLaboran(p0: LoanApprovedToLaboranParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Peminjaman Laptop Disetujui';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.laboranName}`,
    bodyHtml:
      p('Pengajuan peminjaman laptop berikut telah disetujui oleh Kepala Laboratorium dan perlu segera ditindaklanjuti:') +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
      ]) +
      p('Mohon Bapak/Ibu mempersiapkan unit laptop sesuai jadwal peminjaman. Detail selengkapnya dapat dilihat melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Lihat Detail',
  });
  const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Disetujui*

Yth. Bapak/Ibu ${p0.laboranName},
Peminjaman laptop berikut telah disetujui Kepala Lab dan perlu segera ditindaklanjuti.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
])}

Mohon menyiapkan unit laptop sesuai jadwal.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 6. Laboran — pengajuan peminjaman ruangan baru
// ---------------------------------------------------------------------------
export interface RoomReservationToLaboranParams {
  laboranName: string;
  namaPemohon: string;
  nomorInduk: string;
  ruangan: string;
  tanggalPinjam: string;
  waktuPinjam: string;
  waktuPengajuan: string;
  linkSimlab?: string;
}

export function roomReservationToLaboran(p0: RoomReservationToLaboranParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Pengajuan Peminjaman Ruangan Baru';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.laboranName}`,
    bodyHtml:
      p('Terdapat pengajuan peminjaman ruangan laboratorium baru yang masuk melalui SIMLAB dan memerlukan pemeriksaan Laboran:') +
      detailTable([
        ['Nama Pemohon', p0.namaPemohon],
        ['Nomor Induk', p0.nomorInduk],
        ['Ruangan', p0.ruangan],
        ['Tanggal Pinjam', p0.tanggalPinjam],
        ['Waktu Pinjam', p0.waktuPinjam],
        ['Waktu Pengajuan', p0.waktuPengajuan],
      ]) +
      p('Mohon Bapak/Ibu melakukan pemeriksaan ketersediaan ruangan dan kelengkapan berkas melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Periksa Pengajuan',
  });
  const whatsapp = `${WA_SALAM}

*Pengajuan Peminjaman Ruangan Baru*

Yth. Bapak/Ibu ${p0.laboranName},
Terdapat pengajuan peminjaman ruangan baru yang memerlukan pemeriksaan.

${waDetails([
  ['👤 Pemohon', p0.namaPemohon],
  ['🆔 No. Induk', p0.nomorInduk],
  ['🚪 Ruangan', p0.ruangan],
  ['📅 Tgl Pinjam', p0.tanggalPinjam],
  ['🕒 Waktu Pinjam', p0.waktuPinjam],
  ['📝 Waktu Pengajuan', p0.waktuPengajuan],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 7. Laboran — permohonan surat keterangan bebas lab baru
// ---------------------------------------------------------------------------
export interface ClearanceLetterToLaboranParams {
  laboranName: string;
  namaPemohon: string;
  nim: string;
  tanggalSidang: string;
  waktuPengajuan: string;
  linkSimlab?: string;
}

export function clearanceLetterToLaboran(p0: ClearanceLetterToLaboranParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Permohonan Surat Keterangan Bebas Laboratorium Baru';
  const html = emailLayout({
    greeting: `Yth. Bapak/Ibu ${p0.laboranName}`,
    bodyHtml:
      p('Terdapat permohonan Surat Keterangan Bebas Laboratorium baru yang masuk melalui SIMLAB dan memerlukan pemeriksaan Laboran:') +
      detailTable([
        ['Nama Pemohon', p0.namaPemohon],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
        ['Waktu Pengajuan', p0.waktuPengajuan],
      ]) +
      p('Mohon Bapak/Ibu memeriksa status tanggungan mahasiswa tersebut (peralatan, denda, dan administrasi) melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Periksa Tanggungan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Surat Keterangan Bebas Lab Baru*

Yth. Bapak/Ibu ${p0.laboranName},
Terdapat permohonan baru yang memerlukan pemeriksaan tanggungan (peralatan, denda, administrasi).

${waDetails([
  ['👤 Pemohon', p0.namaPemohon],
  ['🆔 NIM', p0.nim],
  ['📅 Tgl Sidang', p0.tanggalSidang],
  ['📝 Waktu Pengajuan', p0.waktuPengajuan],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 8. Mahasiswa — permohonan peminjaman laptop berhasil dibuat
// ---------------------------------------------------------------------------
export interface LoanCreatedToMahasiswaParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  linkSimlab?: string;
}

export function loanCreatedToMahasiswa(p0: LoanCreatedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Notifikasi Peminjaman Laptop Disetujui';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Permohonan peminjaman laptop Anda telah berhasil dibuat melalui SIMLAB. Berikut detail pengajuan Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
      ]) +
      p('Permohonan Anda saat ini menunggu persetujuan dari dosen pembimbing. Mohon segera menghubungi dosen pembimbing Anda untuk memberikan persetujuan melalui SIMLAB.') +
      p('Anda dapat memantau status permohonan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Pantau Permohonan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Peminjaman Laptop Dibuat*

Yth. ${p0.namaMahasiswa},
Permohonan peminjaman laptop Anda berhasil dibuat dan menunggu persetujuan dosen pembimbing.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
])}

Mohon segera menghubungi dosen pembimbing untuk memberikan persetujuan.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 9. Mahasiswa — peminjaman laptop disetujui dosen pembimbing
// ---------------------------------------------------------------------------
export interface LoanApprovedByDosenParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  disetujuiOleh: string;
  waktuPersetujuan: string;
  linkSimlab?: string;
  /** Default true. Saat false, template pakai copy penolakan. */
  approved?: boolean;
  /** Alasan penolakan — hanya dipakai kalau approved=false. */
  alasan?: string;
}

export function loanApprovedByDosenToMahasiswa(p0: LoanApprovedByDosenParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const isApproved = p0.approved !== false;

  if (!isApproved) {
    const subject = '[SIMLAB] Permohonan Peminjaman Laptop Ditolak oleh Dosen Pembimbing';
    const html = emailLayout({
      greeting: `Yth. ${p0.namaMahasiswa}`,
      bodyHtml:
        p('Mohon maaf, permohonan peminjaman laptop Anda telah <strong>ditolak</strong> oleh dosen pembimbing. Berikut detail pengajuan Anda:') +
        detailTable([
          ['Kode Laptop', p0.kodeLaptop],
          ['Laptop', p0.namaLaptop],
          ['Ditolak Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
          ...(p0.alasan ? ([['Alasan', p0.alasan]] as Array<[string, string]>) : []),
        ]) +
        p('Silakan menghubungi dosen pembimbing untuk klarifikasi, atau ajukan permohonan baru jika diperlukan.'),
      linkSimlab: link,
      linkLabel: 'Buka SIMLAB',
    });
    const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Ditolak Dosen Pembimbing*

Yth. ${p0.namaMahasiswa},
Mohon maaf, permohonan peminjaman laptop Anda *ditolak* oleh dosen pembimbing.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['❌ Ditolak Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
  ...(p0.alasan ? ([['📝 Alasan', p0.alasan]] as Array<[string, string]>) : []),
])}

Silakan hubungi dosen pembimbing untuk klarifikasi.
🔗 ${link}${WA_FOOTER}`;
    return { subject, html, whatsapp };
  }

  const subject = '[SIMLAB] Permohonan Peminjaman Laptop Disetujui Dosen Pembimbing';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Permohonan peminjaman laptop Anda telah disetujui oleh dosen pembimbing. Berikut detail pengajuan Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Disetujui Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
      ]) +
      p('Permohonan Anda saat ini menunggu persetujuan dari Kepala Laboratorium. Mohon segera menghubungi Kepala Laboratorium untuk menginformasikan bahwa dosen pembimbing Anda telah memberikan persetujuan.') +
      p('Anda dapat memantau status permohonan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Pantau Permohonan',
  });
  const whatsapp = `${WA_SALAM}

*Disetujui Dosen Pembimbing*

Yth. ${p0.namaMahasiswa},
Permohonan peminjaman laptop Anda telah disetujui dosen pembimbing.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['✅ Disetujui Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
])}

Saat ini menunggu persetujuan Kepala Lab. Mohon menghubungi Kepala Lab untuk menginformasikan.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 10. Mahasiswa — peminjaman laptop disetujui Kalab
// ---------------------------------------------------------------------------
export interface LoanApprovedByKalabParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  disetujuiOleh: string;
  waktuPersetujuan: string;
  linkSimlab?: string;
  /** Default true. Saat false, template pakai copy penolakan. */
  approved?: boolean;
  /** Alasan penolakan — hanya dipakai kalau approved=false. */
  alasan?: string;
}

export function loanApprovedByKalabToMahasiswa(p0: LoanApprovedByKalabParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const isApproved = p0.approved !== false;

  if (!isApproved) {
    const subject = '[SIMLAB] Permohonan Peminjaman Laptop Ditolak oleh Kepala Laboratorium';
    const html = emailLayout({
      greeting: `Yth. ${p0.namaMahasiswa}`,
      bodyHtml:
        p('Mohon maaf, permohonan peminjaman laptop Anda telah <strong>ditolak</strong> oleh Kepala Laboratorium. Berikut detail pengajuan Anda:') +
        detailTable([
          ['Kode Laptop', p0.kodeLaptop],
          ['Laptop', p0.namaLaptop],
          ['Ditolak Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
          ...(p0.alasan ? ([['Alasan', p0.alasan]] as Array<[string, string]>) : []),
        ]) +
        p('Silakan menghubungi Kepala Laboratorium untuk klarifikasi, atau ajukan permohonan baru jika diperlukan.'),
      linkSimlab: link,
      linkLabel: 'Buka SIMLAB',
    });
    const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Ditolak Kepala Lab*

Yth. ${p0.namaMahasiswa},
Mohon maaf, permohonan peminjaman laptop Anda *ditolak* oleh Kepala Laboratorium.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['❌ Ditolak Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
  ...(p0.alasan ? ([['📝 Alasan', p0.alasan]] as Array<[string, string]>) : []),
])}

Silakan hubungi Kepala Lab untuk klarifikasi.
🔗 ${link}${WA_FOOTER}`;
    return { subject, html, whatsapp };
  }

  const subject = '[SIMLAB] Permohonan Peminjaman Laptop Disetujui - Silakan Hubungi Laboran';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Permohonan peminjaman laptop Anda telah disetujui oleh Kepala Laboratorium. Berikut detail pengajuan Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Disetujui Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
      ]) +
      p('Silakan segera menghubungi laboran untuk proses serah terima laptop. Harap menyiapkan dokumen berikut saat pengambilan:') +
      `<ol style="margin:0 0 12px 20px;font-size:14px;line-height:1.8;color:#1e293b">
         <li><strong>KTM (Kartu Tanda Mahasiswa) asli</strong></li>
         <li><strong>SIM atau KTP asli</strong></li>
       </ol>`,
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Disetujui - Silakan Hubungi Laboran*

Yth. ${p0.namaMahasiswa},
Permohonan peminjaman laptop Anda telah disetujui Kepala Lab.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['✅ Disetujui Oleh', `${p0.disetujuiOleh} pada ${p0.waktuPersetujuan}`],
])}

Silakan menghubungi laboran untuk serah terima. Harap membawa:
1. KTM asli
2. SIM/KTP asli

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 11. Mahasiswa — permohonan surat keterangan bebas lab berhasil dibuat
// ---------------------------------------------------------------------------
export interface ClearanceCreatedToMahasiswaParams {
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  linkSimlab?: string;
}

export function clearanceCreatedToMahasiswa(p0: ClearanceCreatedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] permohonan Surat Keterangan Bebas Laboratorium Berhasil Dibuat';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Permohonan Surat Keterangan Bebas Laboratorium Anda telah berhasil dibuat melalui SIMLAB. Berikut detail pengajuan Anda:') +
      detailTable([
        ['Nama Pemohon', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
      ]) +
      p('Permohonan Anda saat ini sedang dalam proses pemeriksaan oleh laboran. Mohon segera menghubungi laboran untuk memastikan tidak terdapat tanggungan atas nama Anda, meliputi pengembalian peralatan, pelunasan denda, dan kelengkapan administrasi laboratorium.') +
      p('Anda dapat memantau status permohonan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Pantau Permohonan',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Surat Bebas Lab Dibuat*

Yth. ${p0.namaMahasiswa},
Permohonan Surat Keterangan Bebas Laboratorium Anda berhasil dibuat.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Tgl Sidang', p0.tanggalSidang],
])}

Mohon menghubungi laboran untuk memastikan tidak ada tanggungan (peralatan, denda, administrasi).
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 12. Mahasiswa — surat keterangan bebas lab telah diperiksa laboran
// ---------------------------------------------------------------------------
export interface ClearanceCheckedToMahasiswaParams {
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  diperiksaOleh: string;
  linkSimlab?: string;
}

export function clearanceCheckedToMahasiswa(p0: ClearanceCheckedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Permohonan Surat Keterangan Bebas Laboratorium Telah Diperiksa';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Permohonan Surat Keterangan Bebas Laboratorium Anda telah selesai diperiksa oleh laboran. Berikut detail pengajuan Anda:') +
      detailTable([
        ['Nama Pemohon', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
        ['Diperiksa Oleh', p0.diperiksaOleh],
      ]) +
      p('Permohonan Anda saat ini menunggu persetujuan oleh Kepala Laboratorium. Mohon segera menghubungi Kepala Laboratorium untuk menginformasikan bahwa pemeriksaan oleh laboran telah selesai dilakukan.') +
      p('Anda dapat memantau status permohonan melalui tautan berikut:'),
    linkSimlab: link,
    linkLabel: 'Pantau Permohonan',
  });
  const whatsapp = `${WA_SALAM}

*Surat Bebas Lab Telah Diperiksa*

Yth. ${p0.namaMahasiswa},
Permohonan Anda telah selesai diperiksa laboran.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Tgl Sidang', p0.tanggalSidang],
  ['🔍 Diperiksa Oleh', p0.diperiksaOleh],
])}

Saat ini menunggu persetujuan Kepala Lab. Mohon menghubungi Kepala Lab untuk menginformasikan.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 13. Mahasiswa — surat keterangan bebas lab telah diterbitkan
// ---------------------------------------------------------------------------
export interface ClearanceIssuedToMahasiswaParams {
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  nomorSurat: string;
  penandatangan1: string;
  penandatangan2: string;
  linkSimlab?: string;
}

export function clearanceIssuedToMahasiswa(p0: ClearanceIssuedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Surat Keterangan Bebas Laboratorium Telah Diterbitkan';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Surat Keterangan Bebas Laboratorium Anda telah resmi diterbitkan dan ditandatangani secara digital oleh Kepala Laboratorium. Berikut detail dokumen Anda:') +
      detailTable([
        ['Nomor Surat', p0.nomorSurat],
        ['Nama', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
        ['Penandatangan 1', p0.penandatangan1],
        ['Penandatangan 2', p0.penandatangan2],
      ]) +
      p('Dokumen dapat diakses melalui dua cara:') +
      `<ol style="margin:0 0 12px 20px;font-size:14px;line-height:1.8;color:#1e293b">
         <li>Unduh melalui SIMLAB</li>
         <li>Lampiran pada email ini</li>
       </ol>` +
      `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:13px;line-height:1.6;color:#78350f">
         <strong>Perhatian:</strong> Dokumen ini ditandatangani secara digital. Dokumen ini baru dinyatakan sah secara administratif apabila telah terdapat <strong>stempel basah</strong> dari Laboratorium Statistika FMIPA UII. Silakan datang langsung ke laboratorium untuk proses pembubuhan stempel.
       </div>`,
    linkSimlab: link,
    linkLabel: 'Unduh Dokumen',
  });
  const whatsapp = `${WA_SALAM}

*Surat Bebas Lab Telah Diterbitkan*

Yth. ${p0.namaMahasiswa},
Surat Keterangan Bebas Laboratorium Anda telah resmi diterbitkan.

${waDetails([
  ['📄 Nomor Surat', p0.nomorSurat],
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Tgl Sidang', p0.tanggalSidang],
  ['✍️ Penandatangan 1', p0.penandatangan1],
  ['✍️ Penandatangan 2', p0.penandatangan2],
])}

⚠️ Dokumen sah secara administratif apabila telah terdapat *stempel basah* dari Lab Statistika FMIPA UII. Silakan datang ke laboratorium untuk pembubuhan stempel.

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 14a. Mahasiswa — reminder H-1 jatuh tempo peminjaman laptop
// ---------------------------------------------------------------------------
export interface LoanReminderH1Params {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalJatuhTempo: string;
  dendaPerHari?: string;
}

export function loanReminderH1ToMahasiswa(p0: LoanReminderH1Params): NotificationTemplate {
  const denda = p0.dendaPerHari ?? LATE_FEE_PER_DAY;
  const subject = '[SIMLAB] Pengingat: Peminjaman Laptop Jatuh Tempo Besok';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Kami mengingatkan bahwa peminjaman laptop Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
      ]) +
      p(`akan <strong>jatuh tempo besok</strong> pada tanggal <strong>${p0.tanggalJatuhTempo}</strong>.`) +
      p('Mohon segera menghubungi laboratorium untuk mengembalikan atau memperpanjang.') +
      `<div style="margin:16px 0;padding:12px 16px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:4px;font-size:13px;line-height:1.6;color:#7f1d1d">
         Keterlambatan pengembalian akan dikenakan denda sebesar <strong>${denda} per hari</strong>.
       </div>`,
  });
  const whatsapp = `${WA_SALAM}

*Pengingat: Peminjaman Jatuh Tempo Besok*

Yth. ${p0.namaMahasiswa},
Peminjaman laptop Anda akan *jatuh tempo besok* pada ${p0.tanggalJatuhTempo}.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['📅 Jatuh Tempo', p0.tanggalJatuhTempo],
])}

Mohon segera mengembalikan atau memperpanjang.
⚠️ Keterlambatan dikenakan denda ${denda}/hari.${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 14b. Mahasiswa — reminder H-0 (hari jatuh tempo) peminjaman laptop
// ---------------------------------------------------------------------------
export interface LoanReminderH0Params {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalJatuhTempo: string;
  dendaPerHari?: string;
}

export function loanReminderH0ToMahasiswa(p0: LoanReminderH0Params): NotificationTemplate {
  const denda = p0.dendaPerHari ?? LATE_FEE_PER_DAY;
  const subject = '[SIMLAB] Peminjaman Laptop Jatuh Tempo Hari Ini';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Kami mengingatkan bahwa peminjaman laptop Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Tanggal Jatuh Tempo', p0.tanggalJatuhTempo],
      ]) +
      p('<strong>jatuh tempo hari ini</strong>. Mohon segera mengembalikan ke laboratorium, atau ajukan perpanjangan bila masih diperlukan.') +
      `<div style="margin:16px 0;padding:12px 16px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:4px;font-size:13px;line-height:1.6;color:#7f1d1d">
         Keterlambatan pengembalian akan dikenakan denda sebesar <strong>${denda} per hari</strong> terhitung mulai besok.
       </div>`,
  });
  const whatsapp = `${WA_SALAM}

*Jatuh Tempo Hari Ini*

Yth. ${p0.namaMahasiswa},
Peminjaman laptop Anda *jatuh tempo hari ini* (${p0.tanggalJatuhTempo}).

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
])}

Mohon segera mengembalikan atau ajukan perpanjangan.
⚠️ Denda ${denda}/hari mulai berjalan besok bila belum dikembalikan.${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 14c. Mahasiswa — peminjaman laptop telah aktif (serah terima oleh laboran)
// ---------------------------------------------------------------------------
export interface LoanActivatedParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalHarusKembali: string;
  diserahkanOleh?: string;
  linkSimlab?: string;
  dendaPerHari?: string;
}

export function loanActivatedToMahasiswa(p0: LoanActivatedParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const denda = p0.dendaPerHari ?? LATE_FEE_PER_DAY;
  const subject = '[SIMLAB] Peminjaman Laptop Berhasil — Serah Terima Selesai';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Proses serah terima peminjaman laptop Anda telah selesai dilakukan oleh laboran. Berikut detail peminjaman aktif Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Tanggal Harus Kembali', p0.tanggalHarusKembali],
        ...(p0.diserahkanOleh ? ([['Diserahkan Oleh', p0.diserahkanOleh]] as Array<[string, string]>) : []),
      ]) +
      p('Mohon jaga laptop dengan baik dan kembalikan tepat waktu. Jika membutuhkan perpanjangan, ajukan permohonan melalui SIMLAB sebelum tanggal jatuh tempo.') +
      `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:13px;line-height:1.6;color:#78350f">
         Keterlambatan pengembalian dikenakan denda sebesar <strong>${denda} per hari</strong>.
       </div>`,
    linkSimlab: link,
    linkLabel: 'Pantau Peminjaman',
  });
  const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Berhasil*

Yth. ${p0.namaMahasiswa},
Serah terima laptop telah selesai. Peminjaman Anda kini aktif.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['📅 Harus Kembali', p0.tanggalHarusKembali],
  ...(p0.diserahkanOleh ? ([['👤 Diserahkan Oleh', p0.diserahkanOleh]] as Array<[string, string]>) : []),
])}

Mohon kembalikan tepat waktu atau ajukan perpanjangan sebelum jatuh tempo.
⚠️ Keterlambatan dikenakan denda ${denda}/hari.

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 15. Mahasiswa — peminjaman laptop terlambat
// ---------------------------------------------------------------------------
export interface LoanOverdueParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalHarusKembali: string;
  dendaPerHari?: string;
}

export function loanOverdueToMahasiswa(p0: LoanOverdueParams): NotificationTemplate {
  const denda = p0.dendaPerHari ?? LATE_FEE_PER_DAY;
  const subject = '[SIMLAB] Peminjaman Laptop Terlambat';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Kami memberitahukan bahwa peminjaman laptop Anda telah <strong>melewati batas tanggal pengembalian</strong> yang telah ditentukan. Berikut detail peminjaman Anda:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Tanggal Harus Kembali', p0.tanggalHarusKembali],
      ]) +
      `<div style="margin:16px 0;padding:12px 16px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:4px;font-size:13px;line-height:1.6;color:#7f1d1d">
         Denda keterlambatan sebesar <strong>${denda} per hari</strong> terus berjalan hingga laptop dikembalikan ke laboratorium.
       </div>`,
  });
  const whatsapp = `${WA_SALAM}

*Peminjaman Laptop Terlambat*

Yth. ${p0.namaMahasiswa},
Peminjaman laptop Anda telah *melewati batas tanggal pengembalian*.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['📅 Harus Kembali', p0.tanggalHarusKembali],
])}

⚠️ Denda ${denda}/hari terus berjalan hingga laptop dikembalikan. Mohon segera mengembalikan ke laboratorium.${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 16. Mahasiswa — pengembalian laptop tercatat (laboran terima kembali)
// ---------------------------------------------------------------------------
export interface LoanReturnedToMahasiswaParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalKembali: string;
  kondisi: string;
  diterimaOleh: string;
  catatan?: string;
  /** Hari keterlambatan. 0/undefined = tepat waktu, blok denda disembunyikan. */
  hariTelat?: number;
  /** Total denda (pre-formatted, mis. "Rp50.000"). Dihitung caller. */
  totalDenda?: string;
  linkSimlab?: string;
}

export function loanReturnedToMahasiswa(p0: LoanReturnedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const isLate = (p0.hariTelat ?? 0) > 0 && !!p0.totalDenda;
  const subject = '[SIMLAB] Konfirmasi Pengembalian Laptop';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Pengembalian laptop Anda telah berhasil dicatat oleh laboran. Berikut detail pengembalian:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Tanggal Kembali', p0.tanggalKembali],
        ['Kondisi Saat Kembali', p0.kondisi],
        ['Diterima Oleh', p0.diterimaOleh],
        ...(p0.catatan ? ([['Catatan', p0.catatan]] as Array<[string, string]>) : []),
      ]) +
      (isLate
        ? `<div style="margin:16px 0;padding:12px 16px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:4px;font-size:13px;line-height:1.6;color:#7f1d1d">
             Terdapat keterlambatan <strong>${p0.hariTelat} hari</strong>. Denda yang dikenakan: <strong>${p0.totalDenda}</strong>. Mohon segera melunasi denda di laboratorium.
           </div>`
        : '') +
      p('Terima kasih telah mengembalikan laptop sesuai prosedur. Apabila Anda sedang mempersiapkan sidang, silakan ajukan <strong>Surat Keterangan Bebas Laboratorium</strong> melalui SIMLAB jika sudah tidak memiliki tanggungan.'),
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Pengembalian Laptop Tercatat*

Yth. ${p0.namaMahasiswa},
Pengembalian laptop Anda telah berhasil dicatat oleh laboran.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['📅 Tanggal Kembali', p0.tanggalKembali],
  ['🔧 Kondisi', p0.kondisi],
  ['👤 Diterima Oleh', p0.diterimaOleh],
  ...(p0.catatan ? ([['📝 Catatan', p0.catatan]] as Array<[string, string]>) : []),
])}
${isLate ? `\n⚠️ Terlambat ${p0.hariTelat} hari — denda: *${p0.totalDenda}*. Mohon segera dilunasi di laboratorium.\n` : ''}
Terima kasih. Jika akan sidang, silakan ajukan Surat Bebas Lab melalui SIMLAB bila sudah tidak ada tanggungan.

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// 17. Mahasiswa — perpanjangan peminjaman laptop disetujui
// ---------------------------------------------------------------------------
export interface LoanExtendedToMahasiswaParams {
  namaMahasiswa: string;
  kodeLaptop: string;
  namaLaptop: string;
  tanggalLama: string;
  tanggalBaru: string;
  diprosesOleh: string;
  dendaPerHari?: string;
  linkSimlab?: string;
}

export function loanExtendedToMahasiswa(p0: LoanExtendedToMahasiswaParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const denda = p0.dendaPerHari ?? LATE_FEE_PER_DAY;
  const subject = '[SIMLAB] Perpanjangan Peminjaman Laptop Disetujui';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Perpanjangan peminjaman laptop Anda telah disetujui. Berikut detail perubahan tanggal:') +
      detailTable([
        ['Kode Laptop', p0.kodeLaptop],
        ['Laptop', p0.namaLaptop],
        ['Tanggal Jatuh Tempo Sebelumnya', p0.tanggalLama],
        ['Tanggal Jatuh Tempo Baru', p0.tanggalBaru],
        ['Diproses Oleh', p0.diprosesOleh],
      ]) +
      p('Mohon kembalikan atau perpanjang kembali paling lambat tanggal baru di atas.') +
      `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:13px;line-height:1.6;color:#78350f">
         Keterlambatan dari tanggal baru akan tetap dikenakan denda sebesar <strong>${denda} per hari</strong>.
       </div>`,
    linkSimlab: link,
    linkLabel: 'Pantau Peminjaman',
  });
  const whatsapp = `${WA_SALAM}

*Perpanjangan Peminjaman Disetujui*

Yth. ${p0.namaMahasiswa},
Perpanjangan peminjaman laptop Anda telah disetujui.

${waDetails([
  ['🏷️ Kode', p0.kodeLaptop],
  ['💻 Laptop', p0.namaLaptop],
  ['📅 Jatuh Tempo Lama', p0.tanggalLama],
  ['📅 Jatuh Tempo Baru', p0.tanggalBaru],
  ['👤 Diproses Oleh', p0.diprosesOleh],
])}

Mohon kembalikan atau perpanjang kembali paling lambat tanggal baru di atas.
⚠️ Keterlambatan dari tanggal baru tetap dikenakan denda ${denda}/hari.

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Laboran — notifikasi pengajuan surat bebas lab baru dari mahasiswa
// ---------------------------------------------------------------------------
export interface ClearanceCreatedToLaboranParams {
  laboranName: string;
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  linkSimlab?: string;
}

export function clearanceCreatedToLaboran(p0: ClearanceCreatedToLaboranParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Permohonan Surat Bebas Laboratorium oleh Mahasiswa';
  const html = emailLayout({
    greeting: `Yth. ${p0.laboranName}`,
    bodyHtml:
      p('Terdapat permohonan surat keterangan bebas laboratorium yang memerlukan pemeriksaan Anda. Berikut detail permohonan:') +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
      ]) +
      p('Mohon lakukan pemeriksaan tanggungan mahasiswa dan berikan persetujuan melalui SIMLAB.'),
    linkSimlab: link,
    linkLabel: 'Periksa di SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Surat Bebas Laboratorium*

Yth. ${p0.laboranName},
Terdapat permohonan surat bebas lab yang memerlukan pemeriksaan Anda.

${waDetails([
  ['👤 Mahasiswa', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Sidang', p0.tanggalSidang],
])}

Mohon lakukan pemeriksaan melalui SIMLAB.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Kepala Lab — notifikasi surat bebas lab sudah diperiksa laboran
// ---------------------------------------------------------------------------
export interface ClearanceCheckedToKepalaLabParams {
  kalabName: string;
  namaMahasiswa: string;
  nim: string;
  tanggalSidang: string;
  diperiksaOleh: string;
  linkSimlab?: string;
}

export function clearanceCheckedToKepalaLab(p0: ClearanceCheckedToKepalaLabParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Permohonan Surat Bebas Lab Telah Diperiksa Laboran';
  const html = emailLayout({
    greeting: `Yth. ${p0.kalabName}`,
    bodyHtml:
      p(`Permohonan surat keterangan bebas laboratorium telah diperiksa oleh <strong>${p0.diperiksaOleh}</strong> dan memerlukan persetujuan akhir Anda. Berikut detail:`) +
      detailTable([
        ['Nama Mahasiswa', p0.namaMahasiswa],
        ['NIM', p0.nim],
        ['Tanggal Sidang', p0.tanggalSidang],
        ['Diperiksa Oleh', p0.diperiksaOleh],
      ]) +
      p('Mohon berikan persetujuan akhir agar surat dapat diterbitkan.'),
    linkSimlab: link,
    linkLabel: 'Setujui di SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Surat Bebas Lab Menunggu Persetujuan*

Yth. ${p0.kalabName},
Permohonan surat bebas lab telah diperiksa oleh ${p0.diperiksaOleh} dan memerlukan persetujuan akhir Anda.

${waDetails([
  ['👤 Mahasiswa', p0.namaMahasiswa],
  ['🆔 NIM', p0.nim],
  ['📅 Sidang', p0.tanggalSidang],
])}

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa — permohonan surat bebas lab ditolak
// ---------------------------------------------------------------------------
export interface ClearanceRejectedParams {
  namaMahasiswa: string;
  alasan: string;
  ditolakOleh: string;
  tahap: 'Laboran' | 'Kepala Laboratorium';
  linkSimlab?: string;
}

export function clearanceRejectedToMahasiswa(p0: ClearanceRejectedParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Permohonan Surat Bebas Lab Ditolak';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p(`Mohon maaf, permohonan surat keterangan bebas laboratorium Anda <strong>ditolak</strong> oleh ${p0.tahap} (${p0.ditolakOleh}).`) +
      detailTable([
        ['Alasan Penolakan', p0.alasan],
      ]) +
      p('Silakan perbaiki atau konfirmasi terkait alasan di atas, lalu ajukan kembali melalui SIMLAB jika diperlukan.'),
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Surat Bebas Lab Ditolak*

Yth. ${p0.namaMahasiswa},
Mohon maaf, permohonan surat bebas lab Anda *ditolak* oleh ${p0.tahap} (${p0.ditolakOleh}).

Alasan: ${p0.alasan}

Silakan perbaiki dan ajukan kembali melalui SIMLAB bila diperlukan.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa/pengguna — serah terima barang habis pakai tercatat
// ---------------------------------------------------------------------------
export interface ConsumableHandoverItemParam {
  nama: string;
  jumlah: number;
  satuan: string;
}

export interface ConsumableHandoverParams {
  namaMahasiswa: string;
  nim: string;
  items: ConsumableHandoverItemParam[];
  totalItem: number;
  diserahkanOleh: string;
  waktuTransaksi: string;
  linkSimlab?: string;
}

export function consumableHandoverToMahasiswa(p0: ConsumableHandoverParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const itemsHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border:1px solid #e2e8f0">
    <tr style="background:#f8fafc">
      <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px;font-weight:600">Nama Barang</th>
      <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600;width:20%">Jumlah</th>
      <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px;font-weight:600;width:20%">Satuan</th>
    </tr>
    ${p0.items
      .map(
        (it) => `<tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px">${it.nama}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;text-align:right;font-weight:600">${it.jumlah}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px">${it.satuan}</td>
        </tr>`,
      )
      .join('')}
  </table>`;

  const subject = '[SIMLAB] Konfirmasi Pengambilan Barang Habis Pakai';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Pengambilan barang habis pakai Anda telah berhasil dicatat oleh laboran. Berikut detail transaksi:') +
      detailTable([
        ['Nama', p0.namaMahasiswa],
        ['NIM / ID', p0.nim],
        ['Waktu Transaksi', p0.waktuTransaksi],
        ['Diserahkan Oleh', p0.diserahkanOleh],
        ['Total Item', `${p0.totalItem}`],
      ]) +
      p('<strong>Rincian Barang:</strong>') +
      itemsHtml +
      p('Terima kasih. Jika ada ketidaksesuaian, mohon segera menghubungi laboran.'),
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Pengambilan Barang Habis Pakai Tercatat*

Yth. ${p0.namaMahasiswa},
Pengambilan barang habis pakai Anda telah berhasil dicatat.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM/ID', p0.nim],
  ['🕒 Waktu', p0.waktuTransaksi],
  ['👨‍💼 Diserahkan Oleh', p0.diserahkanOleh],
  ['📦 Total Item', `${p0.totalItem}`],
])}

*Rincian Barang:*
${p0.items.map((it) => `• ${it.nama} — ${it.jumlah} ${it.satuan}`).join('\n')}

Terima kasih. Jika ada ketidaksesuaian, mohon segera menghubungi laboran.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa — permohonan dibatalkan oleh Super Admin (sistem)
// ---------------------------------------------------------------------------
export interface CancelledBySystemParams {
  namaMahasiswa: string;
  namaModul: string;
  waktuPembatalan: string;
  kontak?: string;
  linkSimlab?: string;
}

export function cancelledBySystemToMahasiswa(p0: CancelledBySystemParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Permohonan Dibatalkan Oleh Sistem';
  const kontakLine = p0.kontak
    ? p(`Silakan konfirmasi melalui nomor atau email berikut: <strong>${p0.kontak}</strong>.`)
    : p('Silakan konfirmasi melalui nomor atau email ini.');
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p(
        `Permohonan Anda melalui <strong>${p0.namaModul}</strong> telah dibatalkan oleh sistem pada <strong>${p0.waktuPembatalan}</strong>.`,
      ) +
      kontakLine,
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Permohonan Dibatalkan Oleh Sistem*

Yth. ${p0.namaMahasiswa},

Permohonan Anda melalui *${p0.namaModul}* dibatalkan oleh sistem pada ${p0.waktuPembatalan}.

Silakan konfirmasi melalui nomor atau email ini${p0.kontak ? `: ${p0.kontak}` : ''}.${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa — serah terima peminjaman alat (walk-in / laboran-initiated)
// ---------------------------------------------------------------------------
export interface EquipmentLoanItemParam {
  nama: string;
  jumlah: number;
}

export interface EquipmentLoanActivatedParams {
  namaMahasiswa: string;
  nim: string;
  items: EquipmentLoanItemParam[];
  totalItem: number;
  tanggalHarusKembali: string;
  diserahkanOleh: string;
  waktuTransaksi: string;
  linkSimlab?: string;
}

function equipmentItemsHtml(items: EquipmentLoanItemParam[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;border:1px solid #e2e8f0">
    <tr style="background:#f8fafc">
      <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px;font-weight:600">Nama Alat</th>
      <th style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:600;width:20%">Jumlah</th>
    </tr>
    ${items
      .map(
        (it) => `<tr>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px">${it.nama}</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:14px;text-align:right;font-weight:600">${it.jumlah}</td>
        </tr>`,
      )
      .join('')}
  </table>`;
}

export function equipmentLoanActivatedToMahasiswa(p0: EquipmentLoanActivatedParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Peminjaman Alat Tercatat — Serah Terima Selesai';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Peminjaman alat laboratorium Anda telah dicatat oleh laboran. Berikut detail peminjaman:') +
      detailTable([
        ['Nama', p0.namaMahasiswa],
        ['NIM / ID', p0.nim],
        ['Waktu Transaksi', p0.waktuTransaksi],
        ['Diserahkan Oleh', p0.diserahkanOleh],
        ['Total Item', `${p0.totalItem}`],
        ['Tanggal Harus Kembali', p0.tanggalHarusKembali],
      ]) +
      p('<strong>Rincian Alat:</strong>') +
      equipmentItemsHtml(p0.items) +
      p('Mohon jaga alat dengan baik dan kembalikan tepat waktu. Jika ada ketidaksesuaian, segera hubungi laboran.'),
    linkSimlab: link,
    linkLabel: 'Pantau Peminjaman',
  });
  const whatsapp = `${WA_SALAM}

*Peminjaman Alat Tercatat*

Yth. ${p0.namaMahasiswa},
Peminjaman alat laboratorium Anda telah dicatat oleh laboran.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM/ID', p0.nim],
  ['🕒 Waktu', p0.waktuTransaksi],
  ['👨‍💼 Diserahkan Oleh', p0.diserahkanOleh],
  ['📦 Total Item', `${p0.totalItem}`],
  ['📅 Harus Kembali', p0.tanggalHarusKembali],
])}

*Rincian Alat:*
${p0.items.map((it) => `• ${it.nama} — ${it.jumlah}`).join('\n')}

Mohon jaga alat dengan baik dan kembalikan tepat waktu.

🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa — pengembalian peminjaman alat tercatat
// ---------------------------------------------------------------------------
export interface EquipmentLoanReturnedParams {
  namaMahasiswa: string;
  nim: string;
  items: EquipmentLoanItemParam[];
  totalItem: number;
  tanggalKembali: string;
  diterimaOleh: string;
  catatan?: string;
  linkSimlab?: string;
}

export function equipmentLoanReturnedToMahasiswa(p0: EquipmentLoanReturnedParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Konfirmasi Pengembalian Alat';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Pengembalian alat laboratorium Anda telah berhasil dicatat oleh laboran. Berikut detail pengembalian:') +
      detailTable([
        ['Nama', p0.namaMahasiswa],
        ['NIM / ID', p0.nim],
        ['Tanggal Kembali', p0.tanggalKembali],
        ['Diterima Oleh', p0.diterimaOleh],
        ['Total Item', `${p0.totalItem}`],
        ...(p0.catatan ? ([['Catatan', p0.catatan]] as Array<[string, string]>) : []),
      ]) +
      p('<strong>Rincian Alat yang Dikembalikan:</strong>') +
      equipmentItemsHtml(p0.items) +
      p('Terima kasih telah mengembalikan alat sesuai prosedur. Jika ada ketidaksesuaian, mohon segera menghubungi laboran.'),
    linkSimlab: link,
    linkLabel: 'Buka SIMLAB',
  });
  const whatsapp = `${WA_SALAM}

*Pengembalian Alat Tercatat*

Yth. ${p0.namaMahasiswa},
Pengembalian alat laboratorium Anda telah berhasil dicatat.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM/ID', p0.nim],
  ['📅 Tanggal Kembali', p0.tanggalKembali],
  ['👤 Diterima Oleh', p0.diterimaOleh],
  ['📦 Total Item', `${p0.totalItem}`],
  ...(p0.catatan ? ([['📝 Catatan', p0.catatan]] as Array<[string, string]>) : []),
])}

*Rincian Alat Dikembalikan:*
${p0.items.map((it) => `• ${it.nama} — ${it.jumlah}`).join('\n')}

Terima kasih. Jika ada ketidaksesuaian, mohon segera menghubungi laboran.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

// ---------------------------------------------------------------------------
// Mahasiswa — perpanjangan peminjaman alat
// ---------------------------------------------------------------------------
export interface EquipmentLoanExtendedParams {
  namaMahasiswa: string;
  nim: string;
  items: EquipmentLoanItemParam[];
  totalItem: number;
  tanggalLama: string;
  tanggalBaru: string;
  diprosesOleh: string;
  linkSimlab?: string;
}

export function equipmentLoanExtendedToMahasiswa(p0: EquipmentLoanExtendedParams): NotificationTemplate {
  const link = p0.linkSimlab ?? SIMLAB_URL;
  const subject = '[SIMLAB] Perpanjangan Peminjaman Alat';
  const html = emailLayout({
    greeting: `Yth. ${p0.namaMahasiswa}`,
    bodyHtml:
      p('Peminjaman alat laboratorium Anda telah diperpanjang. Berikut detail perubahan:') +
      detailTable([
        ['Nama', p0.namaMahasiswa],
        ['NIM / ID', p0.nim],
        ['Tanggal Jatuh Tempo Sebelumnya', p0.tanggalLama],
        ['Tanggal Jatuh Tempo Baru', p0.tanggalBaru],
        ['Diproses Oleh', p0.diprosesOleh],
        ['Total Item', `${p0.totalItem}`],
      ]) +
      p('<strong>Rincian Alat:</strong>') +
      equipmentItemsHtml(p0.items) +
      p('Mohon kembalikan atau perpanjang kembali paling lambat tanggal baru di atas.'),
    linkSimlab: link,
    linkLabel: 'Pantau Peminjaman',
  });
  const whatsapp = `${WA_SALAM}

*Perpanjangan Peminjaman Alat*

Yth. ${p0.namaMahasiswa},
Peminjaman alat laboratorium Anda telah diperpanjang.

${waDetails([
  ['👤 Nama', p0.namaMahasiswa],
  ['🆔 NIM/ID', p0.nim],
  ['📅 Jatuh Tempo Lama', p0.tanggalLama],
  ['📅 Jatuh Tempo Baru', p0.tanggalBaru],
  ['👤 Diproses Oleh', p0.diprosesOleh],
  ['📦 Total Item', `${p0.totalItem}`],
])}

*Rincian Alat:*
${p0.items.map((it) => `• ${it.nama} — ${it.jumlah}`).join('\n')}

Mohon kembalikan atau perpanjang kembali paling lambat tanggal baru di atas.
🔗 ${link}${WA_FOOTER}`;
  return { subject, html, whatsapp };
}

