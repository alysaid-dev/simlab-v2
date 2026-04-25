---
title: "SIMLAB V2 — User Requirement Document"
subtitle: "Sistem Informasi Manajemen Laboratorium Statistika FMIPA UII"
author: "Laboratorium Statistika FMIPA UII"
date: "April 2026"
version: "2.0.1"
---

\newpage

# 1. Pendahuluan

## 1.1 Latar Belakang

Sejak diluncurkan pada tanggal **18 Maret 2025**, Sistem Informasi Manajemen Laboratorium (SIMLAB) Statistika versi 1 telah digunakan secara aktif oleh mahasiswa, dosen, dan tenaga kependidikan FMIPA UII. Dalam masa operasinya, ditemukan sejumlah kendala yang tersebar ke berbagai tingkatan pengguna serta diterima berbagai umpan balik (*feedback*) dari mahasiswa, dosen, dan tenaga kependidikan.

Dokumen ini disusun sebagai **dasar perencanaan perbaikan dan peningkatan fitur** pada SIMLAB Statistika menuju versi 2 (v2.0.1). URD ini memformalkan kebutuhan pengguna yang akan diakomodasi pada versi baru, sekaligus menjadi acuan bersama antara pengelola laboratorium dan tim pengembang dalam proses *handover*.

## 1.2 Temuan Kendala pada Versi 1

Subbagian ini merangkum kendala signifikan yang ditemukan pada SIMLAB V1 setelah dioperasionalkan. Kendala-kendala berikut menjadi salah satu pendorong utama penyusunan persyaratan pada versi 2.

### 1.2.1 Nama Dosen Tidak Muncul di Form Peminjaman Laptop

Kendala ini terjadi pada tingkatan pengguna **Mahasiswa**. Mahasiswa yang hendak meminjam laptop tidak dapat memilih nama dosen pembimbing karena data dosen tidak muncul pada *dropdown*. Pemeriksaan pada basis data menunjukkan data dosen tetap ada, dan pada *dashboard* Super Admin peran dosen telah sesuai. Dengan demikian, akar masalah berada pada lapisan tampilan/penyajian, bukan pada data.

*[Gambar 1 — Data dosen pada basis data (disisipkan)]*

*[Gambar 2 — Peran dosen pada Super Admin (disisipkan)]*

*[Gambar 3 — Tampilan dosen tidak ditemukan pada pengguna mahasiswa (disisipkan)]*

### 1.2.2 Data Peminjaman Muncul Selain ID yang Diinput

Kendala ini terjadi pada tingkatan pengguna **Laboran**. Ketika laboran memeriksa detail peminjaman seorang mahasiswa dengan memasukkan ID pada kolom pencarian, sistem justru menampilkan **seluruh peminjaman aktif**, bukan hanya yang sesuai ID. Akibatnya, laboran harus kembali ke tab Aset dan menelusuri detail peminjaman satu per satu — alur yang tidak efisien dan rawan kesalahan.

*[Gambar 4 — Tampilan detail peminjaman dengan input ID pengguna (disisipkan)]*

### 1.2.3 Mahasiswa Sudah Bebas Pinjaman tetapi Tidak Bisa Mengajukan Surat Bebas Lab

Kendala ini terjadi pada tingkatan pengguna **Mahasiswa**. Mahasiswa yang pernah meminjam laptop dan telah mengembalikannya tidak dapat mengajukan permohonan Surat Bebas Lab. Pemeriksaan pada basis data menunjukkan mahasiswa bersangkutan **tidak lagi memiliki tanggungan**, namun tombol "Pengajuan Surat Bebas Lab" tetap berstatus *disabled*. Hal ini mengindikasikan logika *gating* pada sisi tampilan tidak konsisten dengan kondisi data sebenarnya.

*[Gambar 5 — Basis data: mahasiswa tidak memiliki pinjaman aktif (disisipkan)]*

*[Gambar 6 — Tombol Pengajuan Surat Bebas Lab masih ter-disable (disisipkan)]*

### 1.2.4 Nama Dosen Tercampur dengan Mahasiswa

Pada fitur pengajuan peminjaman laptop, ketika mahasiswa memilih nama dosen pada *dropdown*, sistem menampilkan **seluruh pengguna yang terdaftar** di SIMLAB tanpa filter peran. Akibatnya, mahasiswa berisiko salah memilih nama bukan-dosen sebagai pembimbing dan UX menjadi membingungkan.

*[Gambar 7 — Nama dosen bercampur dengan seluruh pengguna terdaftar (disisipkan)]*

### 1.2.5 Implikasi terhadap Persyaratan Versi 2

Keempat temuan di atas dipetakan menjadi persyaratan eksplisit pada SIMLAB V2:

| Temuan V1                                      | Persyaratan V2 yang Mengakomodasi                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| 1.2.1 Nama dosen tidak muncul                  | FR-LOAN-001 + FR-USER-001 (filter peran DOSEN pada *dropdown*)          |
| 1.2.2 Pencarian peminjaman tidak ter-filter    | FR-LOAN-010 + FR-HIST-001 (riwayat ter-filter per pengguna)             |
| 1.2.3 Tombol Surat Bebas Lab salah *gating*    | FR-CLEAR-001 + NFR-USE-001 (otorisasi & UX konsisten dengan data)       |
| 1.2.4 Dosen bercampur dengan semua pengguna    | FR-USER-001 (daftar pengguna dengan filter peran)                       |

## 1.3 Tujuan

Dokumen ini adalah *User Requirement Document* (URD) untuk sistem **SIMLAB V2** versi 2.0.1. Tujuannya:

a. Mendefinisikan kebutuhan fungsional dan non-fungsional sistem secara formal.
b. Menjadi acuan baku saat *handover* sistem kepada pengelola Laboratorium Statistika FMIPA UII dan pemangku kepentingan terkait.
c. Menjadi dasar verifikasi penerimaan (*acceptance*) bahwa sistem yang dibangun memenuhi kebutuhan pengguna.
d. Menjadi rujukan bila kelak dilakukan perubahan, audit, atau pengembangan lanjutan.

Dokumen ini disusun mengikuti pendekatan **IEEE Std 29148-2018** (sebelumnya IEEE 830) untuk spesifikasi kebutuhan perangkat lunak.

## 1.4 Ruang Lingkup

**Nama Produk:** Sistem Informasi Manajemen Laboratorium (SIMLAB) Statistika versi 2.0.1.

**Cakupan Fungsional:**

- Manajemen identitas pengguna terintegrasi dengan SSO UII (Shibboleth).
- Pengaturan otorisasi berbasis peran (RBAC) bagi enam jenis pengguna.
- Pengelolaan inventaris laboratorium: aset laptop, alat non-laptop, ruangan, dan barang habis pakai.
- Pengajuan, persetujuan, dan pencatatan peminjaman laptop (Tugas Akhir & Praktikum).
- Pengajuan, persetujuan, dan pencatatan peminjaman alat non-laptop.
- Pengajuan dan persetujuan reservasi ruangan oleh mahasiswa, dosen, dan tendik.
- Pengajuan, penandatanganan digital, dan penerbitan Surat Bebas Lab untuk pendaftaran yudisium.
- Notifikasi otomatis multi-saluran (*email* dan WhatsApp) atas peristiwa bisnis.
- Verifikasi keaslian dokumen melalui kode QR.
- Modul Petunjuk yang dapat dikelola oleh administrator (mini-CMS).
- Pencatatan aktivitas pengguna (audit log).

**Di Luar Cakupan:**

- Sistem keuangan/akuntansi (denda dicatat namun pelunasannya di luar sistem).
- Manajemen jadwal praktikum mata kuliah.
- Sistem absensi pengguna lab.
- Integrasi dengan sistem akademik kampus (SIMAK).

## 1.5 Definisi & Akronim

| Istilah         | Definisi                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| **SIMLAB**      | Sistem Informasi Manajemen Laboratorium                                       |
| **SSO**         | *Single Sign-On*                                                              |
| **IdP**         | *Identity Provider* — sistem otentikasi pusat (UII Shibboleth)                |
| **SP**          | *Service Provider* — komponen Shibboleth pada sisi aplikasi                   |
| **RBAC**        | *Role-Based Access Control*                                                   |
| **FR**          | *Functional Requirement*                                                      |
| **NFR**         | *Non-Functional Requirement*                                                  |
| **WAF**         | *Web Application Firewall*                                                    |
| **TA**          | Tugas Akhir / Skripsi                                                         |
| **Praktikum**   | Peminjaman laptop *walk-in* untuk kegiatan praktikum                          |
| **Yudisium**    | Pendaftaran kelulusan setelah sidang skripsi                                  |
| **Tendik**      | Tenaga Kependidikan (staf administrasi/teknis non-dosen)                      |
| **Approval Chain** | Rangkaian persetujuan multi-tahap                                          |
| **API**         | *Application Programming Interface*                                           |
| **UI/UX**       | *User Interface / User Experience*                                            |

## 1.6 Referensi

- IEEE Std 29148-2018 — *Systems and software engineering — Life cycle processes — Requirements engineering.*
- Dokumen "SIMLAB V2 — Dokumentasi Teknis" (April 2026) — referensi arsitektur dan implementasi.
- Pedoman Penyelenggaraan Akademik FMIPA UII (terkait alur yudisium dan kelengkapan administratif).

## 1.7 Struktur Dokumen

Bab 1 (sedang dibaca) memuat latar belakang, temuan kendala V1, tujuan, ruang lingkup, akronim, dan referensi. Bab 2 menjelaskan deskripsi umum sistem, peran pengguna, dan asumsi/konsekuensi yang berlaku. Bab 3 berisi persyaratan fungsional (FR) per modul. Bab 4 berisi persyaratan non-fungsional (NFR). Bab 5 menyajikan *use case* utama per peran. Bab 6 menjabarkan *constraints* dan asumsi. Bab 7 berisi kriteria penerimaan dan halaman pengesahan.

\newpage

# 2. Deskripsi Umum

## 2.1 Perspektif Produk

SIMLAB V2 adalah aplikasi web mandiri yang berfungsi sebagai sistem operasional inti Laboratorium Statistika FMIPA UII. Sistem berdiri di atas infrastruktur jaringan UII dan mengintegrasikan tiga layanan eksternal:

1. **UII Shibboleth IdP** — sebagai sumber otentikasi tunggal.
2. **Layanan SMTP (Gmail SMTP)** — sebagai saluran *email* keluar.
3. **Fonnte WhatsApp API** — sebagai saluran pesan WhatsApp keluar.

Sistem **menggantikan** SIMLAB versi 1.x yang sebelumnya berbasis stack legacy.

## 2.2 Fungsi Produk (Tingkat Tinggi)

| Fungsi                              | Pengguna Utama                       |
| ----------------------------------- | ------------------------------------ |
| Otentikasi & otorisasi              | Semua peran                          |
| Manajemen akun & peran              | Laboran, Kepala Lab, Super Admin     |
| Manajemen aset & inventaris         | Laboran, Kepala Lab                  |
| Peminjaman laptop TA                | Mahasiswa, Dosen, Kepala Lab, Laboran|
| Peminjaman laptop Praktikum         | Laboran (input *walk-in*)            |
| Peminjaman alat non-laptop          | Mahasiswa, Laboran                   |
| Reservasi ruangan                   | Mahasiswa, Dosen, Tendik, Laboran, Kepala Lab |
| Penerbitan Surat Bebas Lab          | Mahasiswa, Laboran, Kepala Lab       |
| Manajemen barang habis pakai        | Laboran                              |
| Notifikasi *email* & WhatsApp       | Sistem (otomatis)                    |
| Verifikasi dokumen via QR           | Pihak eksternal (publik)             |
| Pengelolaan modul Petunjuk          | Super Admin                          |
| Audit aktivitas                     | Super Admin, Kepala Lab              |

## 2.3 Karakteristik Pengguna

### 2.3.1 Mahasiswa (`MAHASISWA`)

- Status mahasiswa aktif Program Studi Statistika FMIPA UII (atau program studi lain di FMIPA jika relevan).
- Memiliki akun Google for Education UII dengan domain `@students.uii.ac.id`.
- Diasumsikan memiliki *literasi digital* dasar (bisa mengoperasikan formulir web, mengirim *email*, menggunakan WhatsApp).
- Mengakses sistem dari perangkat pribadi (laptop atau ponsel).

### 2.3.2 Dosen (`DOSEN`)

- Dosen tetap atau tidak tetap FMIPA UII.
- Memiliki akun UII dan terdaftar di IdP UII.
- Berperan sebagai *approver* peminjaman TA mahasiswa bimbingan.
- Mengakses sistem secara *occasional* (tidak harian).

### 2.3.3 Laboran (`LABORAN`)

- Pegawai tetap/kontrak yang ditugaskan mengelola operasional harian satu laboratorium.
- Mengakses sistem **harian**, sebagai pengguna paling intensif.
- Bertanggung jawab atas serah-terima fisik aset, pencatatan denda, dan persetujuan tahap awal (laboran).

### 2.3.4 Kepala Lab (`KEPALA_LAB`)

- Dosen yang ditunjuk memimpin satu atau lebih laboratorium.
- Berperan sebagai *final approver* untuk transaksi yang membutuhkan otorisasi tingkat lab.
- Memiliki akses audit dan inventaris penuh atas lab yang dipimpin.

### 2.3.5 Tendik / Staff (`STAFF`)

- Tenaga Kependidikan FMIPA UII (staf administrasi, kemahasiswaan, dll).
- Mengakses sistem khusus untuk **reservasi ruangan** kegiatan ketendikan.

### 2.3.6 Super Admin (`SUPER_ADMIN`)

- Administrator sistem yang ditunjuk oleh pimpinan lab atau dekanat.
- Memiliki akses tanpa pembatasan modul (akses penuh).
- Bertanggung jawab atas konfigurasi global, pemeliharaan modul Petunjuk, dan audit lintas-lab.

## 2.4 Lingkungan Operasi

| Komponen                  | Spesifikasi                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| **Sisi pengguna**         | Browser modern (Chrome ≥120, Firefox ≥120, Safari ≥17, Edge ≥120)      |
| **Sisi server**           | Linux server (saat ini Ubuntu 24.04), Node.js ≥18, PostgreSQL ≥14      |
| **Otentikasi**            | UII Shibboleth IdP                                                     |
| **Edge / proxy**          | Cloudflare + nginx                                                     |
| **Penyimpanan file**      | Filesystem lokal pada server backend                                   |
| **Backup database**       | Manual via `pg_dump` (frekuensi mengikuti SLA institusi)               |

## 2.5 Asumsi dan Ketergantungan

a. UII Shibboleth IdP tersedia dan responsif. Kegagalan IdP **memblokir** seluruh akses login.
b. Layanan SMTP keluar (saat ini Gmail) tetap diizinkan oleh administrator jaringan UII.
c. Fonnte API tersedia dengan kuota mencukupi. Kegagalan WA tidak menghentikan transaksi (*non-blocking*).
d. Pengelola lab (laboran) hadir secara fisik untuk tahap serah-terima aset (sistem hanya mencatat, tidak melakukan otomasi fisik).
e. Pengguna mahasiswa memberikan nomor WhatsApp aktif untuk menerima notifikasi.
f. Penyimpanan file PDF (surat permohonan, surat bebas lab, gambar Petunjuk) disimpan di filesystem lokal; backup tergantung pada strategi backup server.

\newpage

# 3. Persyaratan Fungsional

## 3.1 Konvensi Penomoran

Setiap persyaratan fungsional diberi kode unik:

```
FR-<MODUL>-<NOMOR>     Contoh: FR-AUTH-001
```

Setiap persyaratan dilengkapi dengan:

- **Aktor**: peran pengguna yang dijelaskan
- **Deskripsi**: pernyataan kebutuhan
- **Prioritas**: TINGGI (wajib v2.0.1), SEDANG (penting), RENDAH (nice-to-have)
- **Kriteria Penerimaan**: kondisi terverifikasi

## 3.2 Modul Otentikasi (AUTH)

### FR-AUTH-001 — Login Tunggal via Shibboleth UII

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** memungkinkan pengguna *sign-in* menggunakan kredensial UII tunggal melalui Shibboleth IdP.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Klik tombol "Login" mengarahkan ke halaman IdP UII.
  - Setelah otentikasi sukses, pengguna kembali ke `/dashboard` aplikasi.
  - Sesi pengguna persisten selama *cookie* `_shibsession_*` valid.

### FR-AUTH-002 — Tidak Menyimpan Kata Sandi Lokal

- **Aktor**: sistem
- **Deskripsi**: Sistem **tidak boleh** menyimpan kata sandi pengguna pada basis data lokal. Otentikasi sepenuhnya didelegasikan kepada IdP.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Skema basis data tidak memuat kolom `password_hash` pada tabel `users`.

### FR-AUTH-003 — Logout Tunggal

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** menyediakan *logout* yang memutus sesi SP dan mengarahkan pengguna kembali ke halaman muka.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Setelah klik "Logout", *cookie* `_shibsession_*` dihapus dan akses kembali memerlukan otentikasi ulang IdP.

### FR-AUTH-004 — Resolusi Identitas Otomatis

- **Aktor**: sistem
- **Deskripsi**: Sistem **harus** secara otomatis membuat atau memperbarui *record* pengguna pada basis data lokal saat pengguna pertama kali *sign-in*, dengan memetakan atribut Shibboleth (`uid`, `mail`, `displayName`).
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Tabel `users` memiliki *row* yang konsisten dengan atribut SSO setelah login pertama.

### FR-AUTH-005 — Endpoint Profil Pengguna

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** menyediakan *endpoint* `GET /api/auth/me` yang mengembalikan profil pengguna saat ini beserta *roles* yang dimiliki.
- **Prioritas**: TINGGI

## 3.3 Modul Manajemen Pengguna & Peran (USER)

### FR-USER-001 — Daftar Pengguna

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** menyediakan daftar pengguna dengan kemampuan filter berdasarkan peran dan pencarian berbasis nama/email/UID.
- **Prioritas**: TINGGI

### FR-USER-002 — Penugasan Peran

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan administrator memberikan satu atau lebih peran kepada pengguna melalui antarmuka tabel akun.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Pengguna dapat memiliki beberapa peran sekaligus (mis. DOSEN + KEPALA_LAB).
  - Perubahan peran tercatat di *activity log*.
  - Peran efektif berlaku pada permintaan API berikutnya tanpa perlu *logout*.

### FR-USER-003 — Pembaruan Profil Mandiri

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** memungkinkan pengguna memperbarui nomor WhatsApp mereka sendiri melalui modal *onboarding* atau halaman profil.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Hanya field `waNumber` yang dapat diubah pengguna sendiri; field lain (mis. `email`, `roles`) hanya bisa diubah oleh administrator.

### FR-USER-004 — Penonaktifan Pengguna

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan administrator menonaktifkan akun pengguna (`isActive=false`) tanpa menghapus data historisnya.
- **Prioritas**: SEDANG

### FR-USER-005 — Identifikasi Otomatis Mahasiswa

- **Aktor**: sistem
- **Deskripsi**: Pengguna dengan email berakhiran `@students.uii.ac.id` **harus** otomatis mendapatkan peran MAHASISWA tanpa intervensi administrator.
- **Prioritas**: TINGGI

## 3.4 Modul Manajemen Laboratorium & Ruangan (LAB)

### FR-LAB-001 — Daftar Laboratorium

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** menampilkan daftar laboratorium beserta nama, kode, dan Kepala Lab yang ditugaskan.
- **Prioritas**: TINGGI

### FR-LAB-002 — Penugasan Kepala Lab

- **Aktor**: Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan Super Admin mengubah Kepala Lab pada suatu laboratorium.
- **Prioritas**: TINGGI

### FR-LAB-003 — Penugasan Laboran ke Laboratorium

- **Aktor**: Super Admin (melalui pengelolaan akun)
- **Deskripsi**: Sistem **harus** memungkinkan asosiasi pengguna berperan LABORAN dengan satu laboratorium.
- **Prioritas**: TINGGI
- **Aturan Domain**: Satu laboran melayani satu laboratorium; satu Kepala Lab dapat memimpin lebih dari satu laboratorium.

### FR-LAB-004 — Daftar Ruangan

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** menampilkan daftar ruangan beserta laboratorium induknya, kapasitas, dan status aktif.
- **Prioritas**: TINGGI

## 3.5 Modul Aset Laptop (ASSET)

### FR-ASSET-001 — Pendaftaran Laptop

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan laptop baru dengan kode unik, nama, kondisi, dan asosiasi laboratorium.
- **Prioritas**: TINGGI

### FR-ASSET-002 — Pengubahan Status & Kondisi

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pengubahan status (AVAILABLE/BORROWED/DAMAGED/MAINTENANCE) dan kondisi (GOOD/MINOR_DAMAGE/MAJOR_DAMAGE) laptop.
- **Prioritas**: TINGGI

### FR-ASSET-003 — Penghapusan Laptop

- **Aktor**: Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan penghapusan laptop dengan validasi bahwa tidak ada peminjaman aktif.
- **Prioritas**: SEDANG

### FR-ASSET-004 — Tautan QR Verifikasi

- **Aktor**: sistem
- **Deskripsi**: Setiap laptop **harus** memiliki QR hash unik yang dapat digunakan untuk verifikasi keaslian fisik.
- **Prioritas**: SEDANG

## 3.6 Modul Peminjaman Laptop (LOAN)

### FR-LOAN-001 — Pengajuan Peminjaman TA

- **Aktor**: Mahasiswa
- **Deskripsi**: Mahasiswa **harus** dapat mengajukan peminjaman laptop untuk Tugas Akhir dengan menyertakan judul tugas akhir, abstrak, dosen pembimbing, dan periode peminjaman.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Permohonan tersimpan dengan status `PENDING`.
  - Notifikasi otomatis dikirim ke dosen pembimbing.

### FR-LOAN-002 — Persetujuan Tahap Dosen

- **Aktor**: Dosen
- **Deskripsi**: Dosen pembimbing **harus** dapat menyetujui atau menolak permohonan peminjaman TA mahasiswa bimbingan.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Status berubah menjadi `APPROVED_BY_DOSEN` saat disetujui.
  - Status berubah menjadi `REJECTED` dengan alasan saat ditolak.
  - Notifikasi otomatis dikirim ke mahasiswa dan ke Kepala Lab (jika disetujui).

### FR-LOAN-003 — Persetujuan Tahap Kepala Lab

- **Aktor**: Kepala Lab
- **Deskripsi**: Kepala Lab **harus** dapat menyetujui atau menolak permohonan yang sudah disetujui dosen.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Status berubah menjadi `APPROVED` saat disetujui.
  - Notifikasi otomatis dikirim ke mahasiswa dan ke laboran.

### FR-LOAN-004 — Serah Aset oleh Laboran

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** dapat menandai serah-terima fisik laptop sehingga peminjaman menjadi aktif.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Status berubah menjadi `ACTIVE`.
  - Status laptop pada tabel `assets` berubah menjadi `BORROWED`.
  - Audit *handover* (`laboranHandoverBy`, `laboranHandoverAt`) tercatat.

### FR-LOAN-005 — Pencatatan Pengembalian

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** dapat mencatat pengembalian laptop, termasuk kondisi laptop pasca-peminjaman.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Status berubah menjadi `RETURNED`.
  - Status laptop berubah menjadi `AVAILABLE` (atau `DAMAGED` bila kondisi rusak).
  - Bila terlambat, sistem otomatis menghitung `dayLate` dan `fine`.

### FR-LOAN-006 — Pencatatan Peminjaman Praktikum (Walk-in)

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** dapat mencatat peminjaman *walk-in* untuk kegiatan praktikum atas nama mahasiswa, tanpa perlu permohonan online.
- **Prioritas**: TINGGI

### FR-LOAN-007 — Perpanjangan Peminjaman

- **Aktor**: Mahasiswa, Laboran
- **Deskripsi**: Mahasiswa **harus** dapat mengajukan perpanjangan peminjaman aktif; laboran **harus** dapat memperpanjang `endDate` atas dasar permintaan tersebut.
- **Prioritas**: SEDANG

### FR-LOAN-008 — Penandaan Status Denda

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan penandaan status pelunasan denda (`UNPAID`/`PAID`/`WAIVED`) beserta catatan.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Penandaan `WAIVED` mensyaratkan input alasan/catatan.
  - Mahasiswa dengan denda `UNPAID` tidak dapat menerbitkan Surat Bebas Lab (lihat FR-CLEAR-001).

### FR-LOAN-009 — Status Otomatis OVERDUE

- **Aktor**: sistem (penjadwal harian)
- **Deskripsi**: Sistem **harus** secara otomatis mengubah peminjaman aktif menjadi `OVERDUE` ketika `endDate` terlampaui pada batas waktu yang ditentukan.
- **Prioritas**: TINGGI

### FR-LOAN-010 — Tampilan Riwayat Peminjaman

- **Aktor**: Mahasiswa, Dosen, Laboran, Kepala Lab
- **Deskripsi**: Sistem **harus** menyediakan riwayat peminjaman per pengguna dan riwayat agregat per peran (untuk admin).
- **Prioritas**: TINGGI

## 3.7 Modul Peminjaman Alat (ELOAN)

### FR-ELOAN-001 — Pendaftaran Alat

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan alat non-laptop dengan kode unik, nama, kategori, dan stok.
- **Prioritas**: TINGGI

### FR-ELOAN-002 — Pengajuan Peminjaman Alat (Multi-Item)

- **Aktor**: Mahasiswa
- **Deskripsi**: Mahasiswa **harus** dapat mengajukan peminjaman beberapa alat sekaligus dalam satu permohonan dengan menyebutkan kuantitas per item.
- **Prioritas**: TINGGI

### FR-ELOAN-003 — Persetujuan & Aktivasi

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan persetujuan peminjaman alat dan menandai aktif saat serah-terima fisik.
- **Prioritas**: TINGGI

### FR-ELOAN-004 — Pencatatan Pengembalian Alat

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** dapat mencatat pengembalian alat dan menyesuaikan stok.
- **Prioritas**: TINGGI

## 3.8 Modul Reservasi Ruangan (RESV)

### FR-RESV-001 — Pengajuan Reservasi

- **Aktor**: Mahasiswa, Dosen, Tendik, Laboran, Kepala Lab
- **Deskripsi**: Pengguna **harus** dapat mengajukan reservasi ruangan dengan menyebutkan keperluan, tanggal/jam mulai, tanggal/jam selesai, dan catatan.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**:
  - Pengguna dengan peran TENDIK/STAFF wajib melampirkan surat permohonan dalam format PDF (max 200 KB).
  - Permohonan tersimpan dengan status `PENDING`.
  - Notifikasi otomatis dikirim ke laboran.

### FR-RESV-002 — Pengecekan oleh Laboran

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** dapat memeriksa permohonan dan menandainya `CHECKED` atau `REJECTED` (dengan alasan).
- **Prioritas**: TINGGI

### FR-RESV-003 — Persetujuan Akhir oleh Kepala Lab

- **Aktor**: Kepala Lab
- **Deskripsi**: Kepala Lab **harus** dapat menyetujui (`APPROVED`) atau menolak (`REJECTED`) permohonan yang sudah dicek laboran.
- **Prioritas**: TINGGI

### FR-RESV-004 — Pratinjau Surat Permohonan

- **Aktor**: Laboran, Kepala Lab, Super Admin, pemilik reservasi
- **Deskripsi**: Sistem **harus** memungkinkan pratinjau PDF surat permohonan langsung dari antarmuka tabel persetujuan.
- **Prioritas**: SEDANG

### FR-RESV-005 — Pencegahan Konflik Jadwal

- **Aktor**: sistem
- **Deskripsi**: Sistem **harus** mencegah persetujuan reservasi yang berbenturan jadwal (overlap waktu) untuk ruangan yang sama.
- **Prioritas**: SEDANG

### FR-RESV-006 — Pembatalan Mandiri

- **Aktor**: pemilik reservasi
- **Deskripsi**: Pemilik **harus** dapat membatalkan permohonan yang masih berstatus `PENDING` atau `CHECKED` (`CANCELLED`).
- **Prioritas**: SEDANG

## 3.9 Modul Surat Bebas Lab (CLEAR)

### FR-CLEAR-001 — Pengajuan Surat

- **Aktor**: Mahasiswa
- **Deskripsi**: Mahasiswa **harus** dapat mengajukan permohonan Surat Bebas Lab dengan mengisi `tanggalSidang` (tanggal sidang yang sudah berlangsung) dan catatan opsional.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Sistem **harus** menolak permohonan dari mahasiswa dengan kewajiban terbuka (peminjaman aktif, denda `UNPAID`, atau alat belum dikembalikan).

### FR-CLEAR-002 — Verifikasi & Penandatanganan oleh Laboran

- **Aktor**: Laboran
- **Deskripsi**: Laboran **harus** memverifikasi tidak adanya kewajiban peminjam dan menandatangani digital tahap pertama (`signedAtLaboran`, `hashLaboran`).
- **Prioritas**: TINGGI

### FR-CLEAR-003 — Pengesahan oleh Kepala Lab

- **Aktor**: Kepala Lab
- **Deskripsi**: Kepala Lab **harus** memberikan tanda tangan digital tahap kedua (`signedAtKepalaLab`, `hashKepalaLab`) sebagai pengesahan akhir.
- **Prioritas**: TINGGI

### FR-CLEAR-004 — Generasi Surat PDF

- **Aktor**: sistem
- **Deskripsi**: Sistem **harus** menggenerasi PDF surat bebas lab yang memuat: nomor surat, tanggal sidang, identitas pemohon, kode QR verifikasi, dan jejak tanda tangan kedua *signer*.
- **Prioritas**: TINGGI

### FR-CLEAR-005 — Verifikasi Publik via QR

- **Aktor**: pihak eksternal (publik)
- **Deskripsi**: Sistem **harus** menyediakan halaman verifikasi publik (`/verify/:hash`) yang menampilkan ringkasan keabsahan surat tanpa mengekspos data pribadi sensitif.
- **Prioritas**: TINGGI

### FR-CLEAR-006 — Unduh Ulang Surat

- **Aktor**: Mahasiswa pemilik surat
- **Deskripsi**: Pemilik surat **harus** dapat mengunduh ulang PDF surat yang sudah disahkan.
- **Prioritas**: SEDANG

## 3.10 Modul Habis Pakai (CONS)

### FR-CONS-001 — Pendaftaran Item

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan item habis pakai dengan satuan, stok, dan stok minimum.
- **Prioritas**: TINGGI

### FR-CONS-002 — Transaksi Penambahan Stok (IN)

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan transaksi penambahan stok dengan catatan opsional.
- **Prioritas**: TINGGI

### FR-CONS-003 — Transaksi Penyaluran (OUT)

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan penyaluran item kepada pengguna (mahasiswa) dengan kuantitas per transaksi.
- **Prioritas**: TINGGI

### FR-CONS-004 — Transaksi Massal (Bulk)

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** memungkinkan pencatatan beberapa transaksi sekaligus untuk satu penerima.
- **Prioritas**: SEDANG

### FR-CONS-005 — Notifikasi Stok Rendah

- **Aktor**: sistem (UI)
- **Deskripsi**: Sistem **harus** menampilkan indikator visual untuk item dengan stok di bawah `minimumStock` pada daftar.
- **Prioritas**: SEDANG

### FR-CONS-006 — Riwayat Transaksi

- **Aktor**: Laboran, Kepala Lab, Super Admin
- **Deskripsi**: Sistem **harus** menyediakan riwayat transaksi per item dan agregat lintas item dengan filter tanggal.
- **Prioritas**: TINGGI

## 3.11 Modul Self-Service (ME)

### FR-ME-001 — Daftar Item Aktif Pengguna

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** menampilkan daftar transaksi aktif (peminjaman, reservasi, surat dalam proses) milik pengguna saat ini.
- **Prioritas**: TINGGI

### FR-ME-002 — Riwayat Transaksi Pribadi per Kategori

- **Aktor**: semua peran
- **Deskripsi**: Sistem **harus** memungkinkan pengguna menelusuri riwayat transaksi pribadi per kategori (laptop, alat, ruangan, habis pakai).
- **Prioritas**: TINGGI

## 3.12 Modul Riwayat & Audit (HIST)

### FR-HIST-001 — Riwayat Lintas Modul

- **Aktor**: Mahasiswa, Kepala Lab
- **Deskripsi**: Sistem **harus** menyediakan halaman *Riwayat* yang merangkum jejak peminjaman, reservasi, dan surat yang relevan dengan peran pengguna.
- **Prioritas**: TINGGI

### FR-HIST-002 — Timeline Per Transaksi

- **Aktor**: Mahasiswa, Kepala Lab
- **Deskripsi**: Sistem **harus** menampilkan *timeline* perubahan status sebuah transaksi (siapa dan kapan melakukan tindakan).
- **Prioritas**: SEDANG

### FR-HIST-003 — Pencatatan Aktivitas (Activity Log)

- **Aktor**: sistem
- **Deskripsi**: Sistem **harus** mencatat tiap perubahan status signifikan (peminjaman, persetujuan, penolakan, tanda tangan) di tabel `activity_logs`.
- **Prioritas**: TINGGI

## 3.13 Modul Petunjuk (GUIDE)

### FR-GUIDE-001 — Pembacaan Petunjuk per Audience

- **Aktor**: Mahasiswa, Dosen, Tendik
- **Deskripsi**: Sistem **harus** menampilkan petunjuk penggunaan yang relevan dengan peran pengguna pada halaman terdedikasi.
- **Prioritas**: TINGGI

### FR-GUIDE-002 — Pengelolaan Konten oleh Super Admin

- **Aktor**: Super Admin
- **Deskripsi**: Super Admin **harus** dapat menyunting, menambah, menerbitkan, dan menarik kembali konten Petunjuk berbasis Markdown melalui antarmuka khusus.
- **Prioritas**: TINGGI

### FR-GUIDE-003 — Riwayat Revisi

- **Aktor**: Super Admin
- **Deskripsi**: Sistem **harus** mencatat tiap revisi konten Petunjuk untuk keperluan audit dan potensi *rollback*.
- **Prioritas**: SEDANG

### FR-GUIDE-004 — Unggah Gambar Pendukung

- **Aktor**: Super Admin
- **Deskripsi**: Super Admin **harus** dapat mengunggah gambar pendukung (max 2 MB; format JPG/PNG/WebP/GIF) yang dapat dirujuk dalam markdown.
- **Prioritas**: SEDANG

## 3.14 Modul Notifikasi (NOTIF)

### FR-NOTIF-001 — Notifikasi Multi-Saluran

- **Aktor**: sistem
- **Deskripsi**: Sistem **harus** mengirim notifikasi peristiwa bisnis ke kanal *email* dan WhatsApp pengguna secara paralel.
- **Prioritas**: TINGGI

### FR-NOTIF-002 — Toleransi Galat Saluran WA

- **Aktor**: sistem
- **Deskripsi**: Kegagalan WhatsApp **tidak boleh** menggagalkan transaksi inti; transaksi tetap tercatat meski WA gagal.
- **Prioritas**: TINGGI
- **Kriteria Penerimaan**: Sistem mencatat status `wa:failed(<reason>)` di log dan transaksi tetap terkirim via *email*.

### FR-NOTIF-003 — Pengingat Otomatis

- **Aktor**: sistem (penjadwal)
- **Deskripsi**: Sistem **harus** mengirim pengingat harian kepada peminjam yang mendekati atau telah melewati batas waktu pengembalian.
- **Prioritas**: TINGGI

### FR-NOTIF-004 — Konten Notifikasi yang Konsisten

- **Aktor**: sistem
- **Deskripsi**: Setiap notifikasi WA dan *email* untuk peristiwa yang sama **harus** memuat informasi inti yang konsisten (siapa, apa, kapan, status, tindakan berikutnya).
- **Prioritas**: TINGGI

## 3.15 Modul Verifikasi Publik (VERIFY)

### FR-VERIFY-001 — Verifikasi Dokumen via QR Code

- **Aktor**: publik
- **Deskripsi**: Sistem **harus** menyediakan halaman publik yang menerima *hash* dokumen (dari QR) dan menampilkan keabsahan beserta ringkasan dokumen.
- **Prioritas**: TINGGI

### FR-VERIFY-002 — Pelindungan Data Pribadi pada Verifikasi

- **Aktor**: sistem
- **Deskripsi**: Halaman verifikasi publik **tidak boleh** menampilkan data pribadi sensitif (mis. nomor WA, alamat, NIK lengkap di luar yang sudah tertera di surat fisik).
- **Prioritas**: TINGGI

## 3.16 Modul Konfigurasi (CONFIG)

### FR-CONFIG-001 — Pengaturan Denda

- **Aktor**: Super Admin
- **Deskripsi**: Super Admin **harus** dapat mengatur tarif denda per hari dan toleransi keterlambatan secara global.
- **Prioritas**: TINGGI

### FR-CONFIG-002 — Pengaturan tanpa Restart

- **Aktor**: sistem
- **Deskripsi**: Perubahan pada pengaturan aplikasi **harus** berlaku pada permintaan berikutnya tanpa memerlukan *restart* layanan.
- **Prioritas**: SEDANG

\newpage

# 4. Persyaratan Non-Fungsional

## 4.1 Konvensi Penomoran

```
NFR-<KATEGORI>-<NOMOR>     Contoh: NFR-SEC-001
```

## 4.2 Performa (PERF)

### NFR-PERF-001 — Waktu Respons Halaman Utama

- **Deskripsi**: Halaman utama (Dashboard) **harus** dimuat dalam waktu ≤ 3 detik pada koneksi internet kampus normal (≥10 Mbps).
- **Prioritas**: SEDANG

### NFR-PERF-002 — Waktu Respons API

- **Deskripsi**: Endpoint API yang membaca data (GET) **harus** merespons dalam waktu ≤ 1 detik untuk *payload* berukuran wajar (≤100 baris).
- **Prioritas**: SEDANG

### NFR-PERF-003 — Pengiriman Notifikasi

- **Deskripsi**: Notifikasi **harus** dikirim ke saluran eksternal dalam waktu ≤ 10 detik setelah peristiwa pemicu pada kondisi normal.
- **Prioritas**: SEDANG

## 4.3 Keamanan (SEC)

### NFR-SEC-001 — Enkripsi Lalu Lintas

- **Deskripsi**: Semua lalu lintas antara *client* dan server **harus** dienkripsi via HTTPS (TLS ≥1.2).
- **Prioritas**: TINGGI

### NFR-SEC-002 — Otorisasi Sisi Server

- **Deskripsi**: Setiap *endpoint* destruktif (POST/PATCH/DELETE) **harus** dilindungi oleh *middleware* otorisasi pada sisi server. Frontend *guard* tidak dianggap sebagai jaminan keamanan.
- **Prioritas**: TINGGI

### NFR-SEC-003 — Validasi *Input*

- **Deskripsi**: Semua *body* dan *query* permintaan **harus** divalidasi dengan skema Zod sebelum diproses oleh *handler*.
- **Prioritas**: TINGGI

### NFR-SEC-004 — Pencegahan *Path Traversal*

- **Deskripsi**: Setiap *endpoint* yang me-*serve* file dari *filesystem* **harus** memastikan path yang di-*resolve* berada di dalam direktori yang diizinkan.
- **Prioritas**: TINGGI

### NFR-SEC-005 — Pengelolaan Atribut Sensitif

- **Deskripsi**: Sistem **tidak boleh** menampilkan kredensial, *token* API, atau data sensitif pada halaman verifikasi publik atau dalam *log* aplikasi.
- **Prioritas**: TINGGI

### NFR-SEC-006 — Sanitasi Konten Pengguna

- **Deskripsi**: Konten Markdown yang ditampilkan dari basis data (Petunjuk) **harus** disanitasi untuk mencegah XSS (memakai *rehype-sanitize* atau setara).
- **Prioritas**: TINGGI

### NFR-SEC-007 — Audit Trail

- **Deskripsi**: Tindakan administratif (penugasan peran, persetujuan, penerbitan surat) **harus** tercatat dengan identitas pelaku, *timestamp*, dan konteks tindakan.
- **Prioritas**: TINGGI

## 4.4 Usability (USE)

### NFR-USE-001 — Bahasa Antarmuka

- **Deskripsi**: Bahasa antarmuka utama **harus** Bahasa Indonesia, mengikuti istilah administratif kampus UII.
- **Prioritas**: TINGGI

### NFR-USE-002 — Petunjuk Konteks

- **Deskripsi**: Setiap peran utama **harus** memiliki halaman Petunjuk yang dapat dikelola tanpa perubahan kode.
- **Prioritas**: TINGGI

### NFR-USE-003 — Konfirmasi Tindakan Destruktif

- **Deskripsi**: Tindakan destruktif (mis. hapus, tolak) **harus** memerlukan konfirmasi pengguna; alasan penolakan **harus** dapat dimasukkan.
- **Prioritas**: TINGGI

### NFR-USE-004 — Responsif

- **Deskripsi**: Antarmuka **harus** dapat digunakan pada layar desktop (≥1024px) dan ponsel (≥360px) tanpa kerusakan layout fatal.
- **Prioritas**: SEDANG

## 4.5 Reliabilitas (REL)

### NFR-REL-001 — Ketersediaan

- **Deskripsi**: Sistem **harus** tersedia ≥ 99% pada jam operasional kampus (Senin-Jumat, 07:00-17:00 WIB) di luar pemeliharaan terencana.
- **Prioritas**: TINGGI

### NFR-REL-002 — Pemulihan dari Galat

- **Deskripsi**: Layanan backend **harus** otomatis *restart* pada kegagalan tidak terduga (`Restart=on-failure` pada systemd).
- **Prioritas**: TINGGI

### NFR-REL-003 — Penanganan Galat Saluran Eksternal

- **Deskripsi**: Galat sementara dari Fonnte (5xx) **harus** dicoba ulang otomatis hingga 3 kali dengan *backoff*.
- **Prioritas**: TINGGI

### NFR-REL-004 — Persistensi Data

- **Deskripsi**: Data transaksi yang sudah disimpan **tidak boleh** hilang akibat *restart* atau *redeploy* sistem.
- **Prioritas**: TINGGI

## 4.6 Kompatibilitas (COMP)

### NFR-COMP-001 — Browser yang Didukung

- **Deskripsi**: Antarmuka **harus** berfungsi penuh pada Chrome ≥120, Firefox ≥120, Safari ≥17, dan Edge ≥120.
- **Prioritas**: TINGGI

### NFR-COMP-002 — Integrasi UII Shibboleth

- **Deskripsi**: Sistem **harus** menerima atribut SAML standar UII (`uid`, `mail`, `displayName`, `eduPersonAffiliation`, `eduPersonOrgUnitDN`, `memberOf`).
- **Prioritas**: TINGGI

## 4.7 Maintainability (MAIN)

### NFR-MAIN-001 — Pemisahan Sumber Kebenaran

- **Deskripsi**: Skema basis data **harus** didefinisikan secara terpusat (Prisma) sehingga perubahan struktur dilakukan di satu tempat.
- **Prioritas**: TINGGI

### NFR-MAIN-002 — Konfigurasi via *Environment*

- **Deskripsi**: Konfigurasi yang berbeda antar lingkungan (URL, kredensial, token) **harus** dikelola melalui *environment variable*, bukan di-*hardcode*.
- **Prioritas**: TINGGI

### NFR-MAIN-003 — Dokumentasi Teknis

- **Deskripsi**: Sistem **harus** dilengkapi dokumentasi teknis (arsitektur, API, schema DB) yang dipelihara seiring perubahan.
- **Prioritas**: TINGGI

### NFR-MAIN-004 — Logging Operasional

- **Deskripsi**: Sistem **harus** mencatat *log* kunci ke `journalctl` agar dapat ditelusuri tanpa akses basis data.
- **Prioritas**: TINGGI

## 4.8 Legal & Kepatuhan (LEGAL)

### NFR-LEGAL-001 — Penggunaan Identitas UII

- **Deskripsi**: Sistem **harus** menggunakan SSO UII Shibboleth sebagai satu-satunya jalur otentikasi (kecuali mode *mock* untuk pengembangan).
- **Prioritas**: TINGGI

### NFR-LEGAL-002 — Perlindungan Data Pribadi

- **Deskripsi**: Sistem **harus** menyimpan data pribadi (nama, email, NIM/NIK, nomor WA) hanya sebatas yang dibutuhkan untuk operasi lab dan **tidak boleh** dibagikan kepada pihak ketiga selain melalui penyalur notifikasi yang sah (SMTP, Fonnte).
- **Prioritas**: TINGGI

### NFR-LEGAL-003 — Keaslian Dokumen Resmi

- **Deskripsi**: Surat Bebas Lab yang diterbitkan **harus** dilengkapi mekanisme verifikasi keaslian (QR + tanda tangan digital ber-*hash*) yang dapat dicek pihak ketiga.
- **Prioritas**: TINGGI

\newpage

# 5. Use Cases per Peran

## 5.1 Mahasiswa

| ID         | Use Case                                       | FR Terkait                       |
| ---------- | ---------------------------------------------- | -------------------------------- |
| UC-MHS-01  | *Sign-in* via SSO UII                          | FR-AUTH-001                      |
| UC-MHS-02  | Mengubah nomor WhatsApp pribadi                | FR-USER-003                      |
| UC-MHS-03  | Mengajukan peminjaman laptop TA                | FR-LOAN-001                      |
| UC-MHS-04  | Memantau status permohonan TA                  | FR-LOAN-010, FR-ME-001           |
| UC-MHS-05  | Mengajukan peminjaman alat                     | FR-ELOAN-002                     |
| UC-MHS-06  | Mengajukan reservasi ruangan                   | FR-RESV-001                      |
| UC-MHS-07  | Membatalkan permohonan reservasi               | FR-RESV-006                      |
| UC-MHS-08  | Mengajukan Surat Bebas Lab                     | FR-CLEAR-001                     |
| UC-MHS-09  | Mengunduh ulang Surat Bebas Lab                | FR-CLEAR-006                     |
| UC-MHS-10  | Membaca petunjuk penggunaan                    | FR-GUIDE-001                     |
| UC-MHS-11  | Memantau riwayat transaksi pribadi             | FR-ME-002, FR-HIST-001           |

## 5.2 Dosen

| ID         | Use Case                                              | FR Terkait    |
| ---------- | ----------------------------------------------------- | ------------- |
| UC-DSN-01  | *Sign-in* via SSO UII                                 | FR-AUTH-001   |
| UC-DSN-02  | Menyetujui/menolak permohonan TA mahasiswa bimbingan  | FR-LOAN-002   |
| UC-DSN-03  | Mengajukan reservasi ruangan                          | FR-RESV-001   |
| UC-DSN-04  | Memantau persetujuan yang menunggu                    | FR-LOAN-010   |
| UC-DSN-05  | Membaca petunjuk untuk dosen                          | FR-GUIDE-001  |

## 5.3 Tendik (Staff)

| ID         | Use Case                                       | FR Terkait    |
| ---------- | ---------------------------------------------- | ------------- |
| UC-TDK-01  | *Sign-in* via SSO UII                          | FR-AUTH-001   |
| UC-TDK-02  | Mengajukan reservasi ruangan dengan PDF        | FR-RESV-001   |
| UC-TDK-03  | Memantau status permohonan reservasi           | FR-RESV-001   |
| UC-TDK-04  | Membatalkan reservasi yang masih PENDING       | FR-RESV-006   |
| UC-TDK-05  | Membaca petunjuk untuk tendik                  | FR-GUIDE-001  |

## 5.4 Laboran

| ID         | Use Case                                                  | FR Terkait                            |
| ---------- | --------------------------------------------------------- | ------------------------------------- |
| UC-LAB-01  | Mengelola daftar laptop (CRUD)                            | FR-ASSET-001..002                     |
| UC-LAB-02  | Mengelola daftar alat (CRUD)                              | FR-ELOAN-001                          |
| UC-LAB-03  | Mengelola daftar habis pakai (CRUD)                       | FR-CONS-001                           |
| UC-LAB-04  | Mencatat penambahan / penyaluran habis pakai              | FR-CONS-002, FR-CONS-003              |
| UC-LAB-05  | Mencatat peminjaman *walk-in* praktikum                   | FR-LOAN-006                           |
| UC-LAB-06  | Memeriksa permohonan reservasi                            | FR-RESV-002                           |
| UC-LAB-07  | Menyetujui peminjaman alat                                | FR-ELOAN-003                          |
| UC-LAB-08  | Menyerahkan & menerima kembali laptop secara fisik        | FR-LOAN-004, FR-LOAN-005              |
| UC-LAB-09  | Menandai status pelunasan denda                           | FR-LOAN-008                           |
| UC-LAB-10  | Memverifikasi & menandatangani Surat Bebas Lab            | FR-CLEAR-002                          |
| UC-LAB-11  | Mengelola akun pengguna (peran)                           | FR-USER-002                           |

## 5.5 Kepala Lab

| ID         | Use Case                                           | FR Terkait               |
| ---------- | -------------------------------------------------- | ------------------------ |
| UC-KLB-01  | Menyetujui peminjaman tahap akhir                  | FR-LOAN-003              |
| UC-KLB-02  | Menyetujui reservasi ruangan tahap akhir           | FR-RESV-003              |
| UC-KLB-03  | Menandatangani Surat Bebas Lab tahap akhir         | FR-CLEAR-003             |
| UC-KLB-04  | Memantau inventaris lab yang dipimpin              | FR-LAB-001, FR-ASSET-001 |
| UC-KLB-05  | Memantau riwayat transaksi lab                     | FR-HIST-001              |

## 5.6 Super Admin

| ID         | Use Case                                       | FR Terkait                  |
| ---------- | ---------------------------------------------- | --------------------------- |
| UC-ADM-01  | Mengatur konfigurasi denda                     | FR-CONFIG-001               |
| UC-ADM-02  | Memantau seluruh transaksi (cross-lab)         | FR-HIST-001                 |
| UC-ADM-03  | Mengelola Petunjuk per peran                   | FR-GUIDE-002, FR-GUIDE-003  |
| UC-ADM-04  | Menugaskan / mencabut peran pengguna           | FR-USER-002                 |
| UC-ADM-05  | Mengubah penugasan Kepala Lab                  | FR-LAB-002                  |

\newpage

# 6. Constraints & Asumsi

## 6.1 Constraints Bisnis

| Kode    | Constraint                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------- |
| C-BIZ-1 | Surat Bebas Lab adalah dokumen resmi untuk pendaftaran yudisium; nomor surat dan tanda tangan digital wajib unik.|
| C-BIZ-2 | Mahasiswa dengan kewajiban terbuka tidak diperkenankan menerbitkan Surat Bebas Lab.                     |
| C-BIZ-3 | Reservasi ruangan oleh Tendik wajib dilampiri surat permohonan tertulis dalam format PDF.               |
| C-BIZ-4 | Satu laboratorium dikelola oleh satu laboran utama; Kepala Lab boleh memimpin lebih dari satu lab.      |

## 6.2 Constraints Teknis

| Kode      | Constraint                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------ |
| C-TEK-1   | Otentikasi tunggal didelegasikan kepada UII Shibboleth IdP.                                      |
| C-TEK-2   | Server berjalan di Linux dengan Node.js dan PostgreSQL; tidak ada ketergantungan pada Windows/IIS.|
| C-TEK-3   | Lalu lintas masuk melewati Cloudflare WAF; *managed rules* berpotensi mem-*block* PATCH/DELETE dari IP non-trusted.|
| C-TEK-4   | Notifikasi WA melalui Fonnte API bersifat *best-effort* — kegagalan WA tidak menghentikan transaksi.|
| C-TEK-5   | Penyimpanan file menggunakan filesystem lokal pada server backend (bukan object storage).        |

## 6.3 Constraints Hukum & Regulasi

| Kode       | Constraint                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| C-LGL-1    | Sistem mematuhi kebijakan SSO UII; tidak ada otentikasi alternatif yang menyimpan kata sandi lokal.       |
| C-LGL-2    | Data pribadi pengguna dikumpulkan terbatas pada kebutuhan operasional (UU PDP).                            |
| C-LGL-3    | Surat Bebas Lab harus dapat diverifikasi pihak ketiga (transparansi keaslian dokumen).                    |

## 6.4 Asumsi Operasional

| Kode      | Asumsi                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------- |
| A-OPS-1   | Pengelola lab (laboran) hadir secara fisik untuk serah-terima aset.                                     |
| A-OPS-2   | Backup harian basis data dilakukan oleh administrator infrastruktur.                                    |
| A-OPS-3   | Akses Super Admin dipegang oleh personel terbatas dan terverifikasi.                                    |
| A-OPS-4   | Mahasiswa secara umum bersedia memberikan nomor WhatsApp pada saat *onboarding*.                        |
| A-OPS-5   | Pelunasan denda terjadi di luar sistem (uang tunai / transfer manual ke pengelola lab); sistem hanya menandai status pelunasan.|

\newpage

# 7. Acceptance Criteria & Pengesahan

## 7.1 Definisi *Done* (Acceptance)

Sistem dinyatakan **memenuhi URD** apabila kondisi berikut terverifikasi:

a. **Cakupan Persyaratan**
   - Seluruh persyaratan ber-prioritas TINGGI (FR & NFR) telah terimplementasi dan dapat diverifikasi.
   - Persyaratan ber-prioritas SEDANG terimplementasi minimal 80%.

b. **Pengujian Fungsional**
   - Semua *use case* utama (Bab 5) dapat dijalankan dari awal hingga akhir tanpa galat fatal pada lingkungan produksi.
   - Otorisasi sisi server menolak akses lintas-peran sebagaimana dispesifikasikan.

c. **Pengujian Integrasi Eksternal**
   - Login melalui Shibboleth UII berhasil di lingkungan produksi.
   - Notifikasi *email* terkirim ke kotak masuk penerima nyata.
   - Notifikasi WhatsApp terkirim ke perangkat penerima nyata (toleransi galat sementara Fonnte diterima).

d. **Dokumen Pendamping Tersedia**
   - Dokumen Teknis (arsitektur, API, schema DB) tersedia.
   - URD ini telah disahkan oleh pemangku kepentingan.

e. **Operasional**
   - Layanan backend dapat di-*restart* dan *redeploy* tanpa kehilangan data.
   - *Log* operasional dapat diakses melalui `journalctl` dengan otorisasi yang sesuai.

## 7.2 Pengujian Penerimaan (Cuplikan)

Pengujian penerimaan dilakukan dengan skenario representatif berikut. Setiap skenario harus berstatus **PASS** sebelum sistem dianggap diterima.

| ID         | Skenario                                                                                                                         | Hasil yang Diharapkan                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| AT-01      | Mahasiswa baru *sign-in* pertama kali via SSO UII                                                                                | Profil ter-*upsert* di DB; peran MAHASISWA otomatis terisi; redirect ke `/dashboard`.                  |
| AT-02      | Mahasiswa mengajukan TA → Dosen approve → Kepala Lab approve → Laboran serahkan → Laboran terima kembali (tepat waktu)            | Status berubah `PENDING → APPROVED_BY_DOSEN → APPROVED → ACTIVE → RETURNED`. Tidak ada denda.          |
| AT-03      | Skenario sama, tapi mahasiswa terlambat 3 hari                                                                                   | `dayLate=3`, `fine` dihitung sesuai tarif denda. Status `OVERDUE` muncul lalu menjadi `RETURNED`.       |
| AT-04      | Tendik mengajukan reservasi tanpa lampiran PDF                                                                                   | Permohonan ditolak validasi *form* dengan pesan jelas.                                                  |
| AT-05      | Mahasiswa dengan denda `UNPAID` mencoba menerbitkan Surat Bebas Lab                                                              | Sistem menolak permohonan dengan alasan kewajiban terbuka.                                              |
| AT-06      | Pemindaian QR pada Surat Bebas Lab menggunakan ponsel umum                                                                       | Halaman `/verify/:hash` menampilkan ringkasan keabsahan tanpa data pribadi sensitif.                   |
| AT-07      | Pengguna tanpa peran LABORAN mencoba mengakses `/transaksi`                                                                       | Sistem mengarahkan ke `/dashboard`; permintaan API ditolak 403.                                         |
| AT-08      | Server backend *restart* paksa selama 1 transaksi penyimpanan                                                                    | Setelah restart, data yang sudah di-*commit* tidak hilang; transaksi yang belum *commit* tidak tersimpan.|
| AT-09      | Fonnte API mengembalikan 502 transien                                                                                            | Sistem mencoba ulang otomatis hingga 3 kali; *email* tetap terkirim; transaksi inti tetap tersimpan.   |

## 7.3 Lembar Pengesahan

Dengan menandatangani halaman ini, pemangku kepentingan menyatakan bahwa kebutuhan yang termuat dalam dokumen URD ini **telah disepakati** sebagai dasar pengembangan dan penerimaan sistem SIMLAB V2 versi 2.0.1.

\vspace{1cm}

\begin{center}
\textbf{LEMBAR PENGESAHAN}
\end{center}

\vspace{0.5cm}

| Peran                              | Nama                       | Tanda Tangan & Tanggal       |
| ---------------------------------- | -------------------------- | ---------------------------- |
| Kepala Laboratorium Statistika     | _______________________    | __________________________   |
| Pengelola / Laboran                | _______________________    | __________________________   |
| Perwakilan Pengembang              | _______________________    | __________________________   |
| Penanggung Jawab Akademik (FMIPA)  | _______________________    | __________________________   |

\vspace{0.5cm}

Yogyakarta, ____ April 2026

\newpage

# Lampiran A — Matriks Telusur (FR ↔ Use Case)

| FR ID         | Use Case Utama                                |
| ------------- | --------------------------------------------- |
| FR-AUTH-001   | UC-MHS-01, UC-DSN-01, UC-TDK-01               |
| FR-USER-002   | UC-LAB-11, UC-ADM-04                          |
| FR-USER-003   | UC-MHS-02                                     |
| FR-LAB-002    | UC-ADM-05                                     |
| FR-LOAN-001   | UC-MHS-03                                     |
| FR-LOAN-002   | UC-DSN-02                                     |
| FR-LOAN-003   | UC-KLB-01                                     |
| FR-LOAN-004   | UC-LAB-08                                     |
| FR-LOAN-005   | UC-LAB-08                                     |
| FR-LOAN-006   | UC-LAB-05                                     |
| FR-LOAN-008   | UC-LAB-09                                     |
| FR-ELOAN-002  | UC-MHS-05                                     |
| FR-ELOAN-003  | UC-LAB-07                                     |
| FR-RESV-001   | UC-MHS-06, UC-DSN-03, UC-TDK-02               |
| FR-RESV-002   | UC-LAB-06                                     |
| FR-RESV-003   | UC-KLB-02                                     |
| FR-CLEAR-001  | UC-MHS-08                                     |
| FR-CLEAR-002  | UC-LAB-10                                     |
| FR-CLEAR-003  | UC-KLB-03                                     |
| FR-CLEAR-005  | publik (di luar peran sistem)                 |
| FR-CONS-002   | UC-LAB-04                                     |
| FR-CONS-003   | UC-LAB-04                                     |
| FR-GUIDE-001  | UC-MHS-10, UC-DSN-05, UC-TDK-05               |
| FR-GUIDE-002  | UC-ADM-03                                     |
| FR-CONFIG-001 | UC-ADM-01                                     |

# Lampiran B — Daftar Singkat Persyaratan

**Persyaratan Fungsional**: total 60 FR tersebar di 16 modul (AUTH, USER, LAB, ASSET, LOAN, ELOAN, RESV, CLEAR, CONS, ME, HIST, GUIDE, NOTIF, VERIFY, CONFIG).

**Persyaratan Non-Fungsional**: total 24 NFR tersebar di 7 kategori (PERF, SEC, USE, REL, COMP, MAIN, LEGAL).

---

*Dokumen ini bersifat normatif untuk penerimaan sistem. Setelah ditandatangani, perubahan signifikan pada persyaratan harus melalui proses revisi formal dan pengesahan ulang.*
