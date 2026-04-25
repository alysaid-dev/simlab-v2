---
title: "SIMLAB V2 — Dokumentasi Teknis"
subtitle: "Sistem Informasi Manajemen Laboratorium Statistika FMIPA UII"
author: "Laboratorium Statistika FMIPA UII"
date: "April 2026"
version: "2.0.1"
---

\newpage

# Pendahuluan

## Tujuan Dokumen

Dokumen ini adalah referensi teknis sistem **SIMLAB V2** (Sistem Informasi Manajemen Laboratorium Statistika) versi 2.0.1. Isinya mencakup arsitektur perangkat lunak, model autentikasi & otorisasi, skema basis data, daftar lengkap *endpoint* API, mekanisme notifikasi, *routing* sisi *frontend*, dan prosedur *deployment*. Audiens utama dokumen ini adalah pengembang, administrator sistem, dan pihak yang melakukan *handover* atau audit teknis.

Dokumen ini **bukan** panduan penggunaan untuk pengguna akhir (mahasiswa, dosen, laboran). Panduan penggunaan tersedia di dalam aplikasi pada modul **Petunjuk** (`/petunjuk-mahasiswa`, `/petunjuk-dosen`, `/petunjuk-tendik`) dan dapat dikelola oleh Super Admin melalui modul **Manajemen Petunjuk**.

## Ruang Lingkup

SIMLAB V2 mengelola seluruh siklus operasional Laboratorium Statistika, meliputi:

- Peminjaman laptop untuk Tugas Akhir (TA) dan praktikum
- Peminjaman alat (non-laptop) per item dan stok terhitung
- Reservasi ruangan oleh mahasiswa, dosen, dan tendik
- Penerbitan Surat Bebas Lab untuk pendaftaran yudisium
- Manajemen barang habis pakai
- Manajemen aset, alat, ruangan, akun pengguna, dan laboratorium
- Notifikasi otomatis melalui *email* dan WhatsApp
- Verifikasi keaslian dokumen melalui kode QR
- Pencatatan riwayat aktivitas

## Stakeholder

| Peran           | Tanggung Jawab Utama                                          |
| --------------- | ------------------------------------------------------------- |
| **Super Admin** | Konfigurasi sistem, manajemen modul Petunjuk, audit penuh     |
| **Kepala Lab**  | Persetujuan akhir peminjaman & reservasi, audit inventaris    |
| **Dosen**       | Persetujuan peminjaman laptop TA mahasiswa bimbingan          |
| **Laboran**     | Operasional harian: serah-terima alat, transaksi, persetujuan |
| **Staff**       | Reservasi ruangan untuk kegiatan ketendikan                   |
| **Mahasiswa**   | Pemohon peminjaman, reservasi, dan Surat Bebas Lab            |

\newpage

# Bab 1 — Arsitektur Sistem

## 1.1 Stack Teknologi

SIMLAB V2 menggunakan arsitektur tiga lapis dengan pemisahan tegas antara *client* (browser), *backend* (API server), dan basis data.

### Frontend

| Komponen          | Teknologi                                       |
| ----------------- | ----------------------------------------------- |
| Bahasa            | TypeScript 5.7                                  |
| Pustaka UI        | React 18.3                                      |
| *Build tool*      | Vite 6                                          |
| *Routing*         | React Router 7                                  |
| *Styling*         | Tailwind CSS 4 + Radix UI                       |
| *Form*            | react-hook-form + Zod                           |
| Render *markdown* | react-markdown + remark-gfm + rehype-sanitize   |
| Visualisasi data  | Recharts                                        |
| Notifikasi UI     | Sonner (toast)                                  |

### Backend

| Komponen        | Teknologi                                     |
| --------------- | --------------------------------------------- |
| Bahasa          | TypeScript 5.7 (ES Modules)                   |
| *Runtime*       | Node.js                                       |
| *Framework*     | Express 4.21                                  |
| ORM             | Prisma 5.22                                   |
| Validasi        | Zod 3.24                                      |
| *Security*      | helmet, cors                                  |
| *File upload*   | multer                                        |
| *Email*         | nodemailer (SMTP)                             |
| *WhatsApp*      | axios → Fonnte API                            |
| *Scheduler*     | node-cron                                     |
| *Logging HTTP*  | morgan                                        |
| Generasi PDF    | pdfkit                                        |
| QR Code         | qrcode                                        |

### Basis Data & Infrastruktur

| Komponen           | Teknologi                                 |
| ------------------ | ----------------------------------------- |
| RDBMS              | PostgreSQL                                |
| *Reverse proxy*    | nginx                                     |
| *Process manager*  | systemd (`simlab-v2-be.service`)          |
| *Authentication*   | Shibboleth SSO (UII IdP)                  |
| *Edge protection*  | Cloudflare                                |

## 1.2 Topologi Deployment

```
                  ┌─────────────────────────┐
                  │       End User          │
                  │  (browser / mobile)     │
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │      Cloudflare         │
                  │   (TLS, WAF, cache)     │
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │   nginx (statistics.    │
                  │      uii.ac.id)         │
                  │  ┌────────┬──────────┐  │
                  │  │ /simlab│/Shibbol- │  │
                  │  │  /api  │ eth.sso  │  │
                  │  └────────┴──────────┘  │
                  └──────┬─────────┬────────┘
                         │         │
                         │         └──────────► Shibboleth SP
                         │                       (mod_shib)
                         ▼
              ┌─────────────────────────┐
              │  simlab-v2-be (systemd) │
              │  Express on :3000       │
              └─────────────┬───────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   PostgreSQL :5432      │
              └─────────────────────────┘

              ┌──── Sisi statis ────┐
              │ nginx serve /simlab │
              │ → /var/www/simlab-  │
              │   v2/dist           │
              └─────────────────────┘
```

- **Frontend** dilayani sebagai *static asset* dari direktori `dist/` oleh nginx pada *base path* `/simlab/`.
- **Backend** berjalan sebagai *daemon* yang diproksi oleh nginx pada `/simlab/api/`.
- **Shibboleth SP** (Service Provider) di-*mount* oleh Apache/nginx pada `/Shibboleth.sso/*`. Backend membaca *cookie* sesi Shibboleth dan *resolve* atribut pengguna dari endpoint `/Shibboleth.sso/Session`.
- **Cloudflare** berfungsi sebagai *edge* untuk TLS, *cache* aset, dan *WAF*. Lihat catatan operasional pada Bab 9.

## 1.3 Struktur Direktori

### Direktori Repositori

```
/var/www/simlab-v2/
├── backend/                   # Service API Express
│   ├── prisma/
│   │   ├── schema.prisma      # Model & enum Prisma (sumber kebenaran)
│   │   └── seedGuides.ts      # Seeder untuk modul Petunjuk
│   └── src/
│       ├── config/            # Parsing env, koneksi Prisma
│       ├── controllers/       # 16 controller (handler + validasi Zod)
│       ├── middleware/        # auth (Shibboleth), errorHandler
│       ├── routes/            # 17 file router (definisi endpoint)
│       ├── services/          # Logic bisnis + notifikasi
│       │   └── notification/
│       ├── types/             # Augmentasi tipe Express
│       └── utils/             # Helper umum (asyncHandler, format, dll)
│
├── src/                       # Frontend React
│   ├── App.tsx
│   ├── main.tsx
│   ├── routes.ts              # Definisi rute (react-router)
│   ├── pages/                 # 24 halaman per modul
│   ├── components/            # Komponen UI yang dapat dipakai ulang
│   ├── contexts/              # AuthContext
│   └── lib/                   # moduleAccess, helpers
│
├── docs/
│   ├── sessions/              # Catatan sesi pengembangan
│   └── teknis/                # Dokumen ini
│
├── dist/                      # Hasil build frontend (di-serve nginx)
├── package.json               # Frontend
└── vite.config.ts             # base: "/simlab/"
```

### Direktori Operasional

| Direktori                                    | Isi                                       |
| -------------------------------------------- | ----------------------------------------- |
| `/var/www/simlab-v2/dist`                    | Bundle frontend hasil `npm run build`     |
| `/var/www/simlab-v2/backend/dist`            | Bundle backend hasil `npm run build`      |
| `/var/www/simlab-v2/backend/uploads`         | *Upload* file (PDF surat, gambar petunjuk)|
| `/etc/systemd/system/simlab-v2-be.service`   | Definisi systemd unit                     |

\newpage

# Bab 2 — Autentikasi & RBAC

## 2.1 Mekanisme SSO Shibboleth

Autentikasi delegasi penuh kepada IdP (*Identity Provider*) UII melalui Shibboleth SP. Backend SIMLAB tidak menyimpan kata sandi.

### Alur Login

1. Pengguna mengakses URL terproteksi (mis. `/simlab/dashboard`).
2. Frontend memanggil `GET /api/auth/me`. Bila tidak ada sesi, backend mengembalikan 401.
3. Frontend mengarahkan pengguna ke `/Shibboleth.sso/Login?target=...`.
4. Shibboleth SP menegosiasikan SAML *handshake* dengan IdP UII; pengguna login.
5. SP membuat *session cookie* `_shibsession_*` dan mengembalikan pengguna ke aplikasi.
6. Backend membaca *cookie* tersebut, memanggil `/Shibboleth.sso/Session`, *parse* atribut (`uid`, `mail`, `displayName`, `eduPersonAffiliation`, `eduPersonOrgUnitDN`, `memberOf`), lalu mengisi `req.user`.

### Cache Sesi

Hasil resolusi sesi di-*cache* di memori proses backend dengan TTL ~60 detik (dapat dikonfigurasi melalui `SHIBBOLETH_SESSION_CACHE_TTL_MS`). Tujuannya menghindari *roundtrip* berulang ke SP pada burst *request*.

### Mode *Mock* untuk Pengembangan

Saat variabel `SHIBBOLETH_DEV_MOCK=1`, backend mem-*bypass* pemanggilan SP dan memakai pengguna *mock* statis. Mode ini **wajib non-aktif di produksi**.

### Logout

`POST /api/auth/logout` mengembalikan instruksi *redirect* ke `SHIBBOLETH_LOGOUT_URL` dengan `return` ke `SHIBBOLETH_LOGOUT_RETURN`. Logout memutus sesi SP, namun sesi IdP UII bisa tetap aktif (single-logout tidak dijamin).

## 2.2 Struktur Pengguna

```typescript
interface ShibbolethUser {
  uid: string;              // 9-digit NIM/NIK; primary identity
  email: string;
  displayName: string;
  affiliation: string[];    // dari eduPersonAffiliation (e.g. "Staff", "Student")
  orgUnitDN: string | null; // dari eduPersonOrgUnitDN
  memberOf: string[];       // grup LDAP, dipakai untuk role marker
  dbRoles?: Role[];         // hasil query ke tabel user_roles
}
```

## 2.3 Role-Based Access Control

### Daftar Role

```
SUPER_ADMIN  | Akses penuh sistem
KEPALA_LAB   | Persetujuan akhir per laboratorium
DOSEN        | Persetujuan peminjaman laptop TA
LABORAN      | Operasional harian per laboratorium
STAFF        | Tendik FMIPA — reservasi ruangan
MAHASISWA    | Pemohon
```

### Sumber Role (Resolusi *Deriving*)

Fungsi `deriveRoles(user)` menggabungkan empat sumber:

1. **`memberOf` (LDAP groups)** — *common name* tiap *DN* dicocokkan dengan `ROLE_MAP`.
2. **`affiliation`** — nilai atribut Shibboleth dicocokkan dengan `ROLE_MAP`.
3. **`dbRoles`** — kolom `roles.name` dari tabel `user_roles` (hasil *upsert* manual oleh admin).
4. **Heuristik tetap:**
   - Email berakhiran `@students.uii.ac.id` → otomatis `MAHASISWA`.
   - `uid` terdaftar pada `SHIBBOLETH_SUPER_ADMIN_UIDS` → otomatis `SUPER_ADMIN`.

### `ROLE_MAP` (penanda eksplisit)

```typescript
const ROLE_MAP = {
  "simlab-super-admin": "SUPER_ADMIN",
  "simlab-kepala-lab":  "KEPALA_LAB",
  "simlab-dosen":       "DOSEN",
  "simlab-laboran":     "LABORAN",
  "simlab-staff":       "STAFF",
  "simlab-mahasiswa":   "MAHASISWA",
};
```

`ROLE_MAP` sengaja dibatasi pada penanda eksplisit `simlab-*`. Pemetaan generik seperti `staff → STAFF` telah dihapus karena IdP UII memberikan `affiliation=Staff` kepada **semua** karyawan (dosen, laboran, tendik), sehingga akan menyebabkan *over-grant*. Konsekuensinya: pengguna non-mahasiswa **harus** ditambahkan rolenya secara eksplisit ke tabel `user_roles` melalui modul **Akun**.

### *Middleware* Penjaga

| Middleware                           | Fungsi                                             |
| ------------------------------------ | -------------------------------------------------- |
| `shibbolethAttach`                   | Mengisi `req.user` dari *cookie* sesi              |
| `requireAuth`                        | 401 bila `req.user` kosong                         |
| `requireRole(...roles)`              | 403 bila pengguna tidak memegang salah satu role   |

`requireRole` bersifat *whitelist*: minimal satu role pada parameter harus dimiliki pengguna.

### Penegakan Otorisasi

Otorisasi diterapkan **dua lapis**:

- **Frontend**: `canAccess(path, roles)` di `src/lib/moduleAccess.ts` menentukan *card* mana yang muncul di Dashboard dan rute mana yang dapat dimasuki. Ini bukan jaminan keamanan, melainkan UX guard.
- **Backend**: `requireRole(...)` pada *router* adalah *source of truth* keamanan. Setiap *endpoint* destruktif (POST/PATCH/DELETE) wajib memasang penjaga ini.

\newpage

# Bab 3 — Skema Basis Data

PostgreSQL dengan ORM Prisma. Konvensi: semua *primary key* menggunakan UUID; nama tabel di basis data di-*map* ke `snake_case`; *timestamp* `createdAt`/`updatedAt` otomatis.

## 3.1 Daftar Enum

| Enum                       | Nilai                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `RoleName`                 | SUPER_ADMIN, KEPALA_LAB, DOSEN, LABORAN, STAFF, MAHASISWA                                      |
| `AssetCondition`           | GOOD, MINOR_DAMAGE, MAJOR_DAMAGE                                                               |
| `AssetStatus`              | AVAILABLE, BORROWED, DAMAGED, MAINTENANCE                                                      |
| `EquipmentStatus`          | AVAILABLE, OUT_OF_STOCK, DAMAGED                                                               |
| `LoanType`                 | TA, PRACTICUM                                                                                  |
| `LoanStatus`               | PENDING, APPROVED_BY_DOSEN, APPROVED, REJECTED, ACTIVE, RETURNED, OVERDUE, CANCELLED           |
| `EquipmentLoanStatus`      | PENDING, APPROVED, REJECTED, ACTIVE, RETURNED, OVERDUE, CANCELLED                              |
| `ConsumableTransactionType`| IN, OUT                                                                                        |
| `ReservationStatus`        | PENDING, CHECKED, APPROVED, REJECTED, CANCELLED, COMPLETED                                     |
| `ClearanceStatus`          | DRAFT, SUBMITTED, PENDING_LECTURER, PENDING_KEPALA_LAB, PENDING_LABORAN, APPROVED, REJECTED    |
| `DocumentType`             | CLEARANCE_LETTER, LOAN_AGREEMENT, EQUIPMENT_LOAN, OTHER                                        |
| `FinePaidStatus`           | UNPAID, PAID, WAIVED                                                                           |
| `GuideAudience`            | MAHASISWA, DOSEN, STAFF                                                                        |

## 3.2 Pengelompokan Model

Schema dibagi menjadi delapan kelompok logis:

1. **Users & Roles** — `User`, `Role`, `UserRole`
2. **Laboratories** — `Laboratory`, `LaboratoryLaboran`
3. **Aset & Alat** — `Asset` (laptop), `Equipment` (non-laptop)
4. **Ruangan & Reservasi** — `Room`, `RoomReservation`
5. **Peminjaman** — `Loan` (laptop), `EquipmentLoan`, `EquipmentLoanItem`
6. **Habis Pakai** — `Consumable`, `ConsumableTransaction`
7. **Dokumen** — `ClearanceLetter`, `DigitalSignature`
8. **Pendukung** — `ActivityLog`, `AppSettings`, `Guide`, `GuideSectionRevision`, `GuideImage`

### Kelompok 1: Users & Roles

**`User`** (`users`)

| Kolom         | Tipe        | Catatan                         |
| ------------- | ----------- | ------------------------------- |
| id            | UUID PK     |                                 |
| uid           | String UQ   | NIM/NIK dari Shibboleth         |
| email         | String UQ   |                                 |
| displayName   | String      |                                 |
| waNumber      | String?     | Nomor WhatsApp                  |
| institute     | String?     |                                 |
| isActive      | Boolean     | Default `true`                  |
| createdAt     | DateTime    |                                 |
| updatedAt     | DateTime    |                                 |

**`Role`** (`roles`) — 6 baris (sesuai enum `RoleName`).

**`UserRole`** (`user_roles`) — *junction table* M2M (`@@unique([userId, roleId])`).

### Kelompok 2: Laboratories

**`Laboratory`** (`laboratories`)

| Kolom        | Tipe       | Catatan                                  |
| ------------ | ---------- | ---------------------------------------- |
| id           | UUID PK    |                                          |
| name         | String UQ  |                                          |
| code         | String? UQ |                                          |
| description  | String?    |                                          |
| isActive     | Boolean    |                                          |
| kepalaLabId  | UUID? FK   | Satu Kepala Lab per laboratorium         |

Aturan domain: Kepala Lab boleh memimpin lebih dari satu lab; Laboran satu lab saja (relasi M2M `LaboratoryLaboran` tetap mengizinkan multi-lab di skema, tapi ditegakkan oleh praktik admin).

**`LaboratoryLaboran`** (`laboratory_laborans`) — *junction* M2M (`@@unique([laboratoryId, userId])`).

### Kelompok 3: Aset & Alat

**`Asset`** (`assets`) — Laptop, dilacak per *unit*.

| Kolom        | Tipe                          | Catatan                       |
| ------------ | ----------------------------- | ----------------------------- |
| id           | UUID PK                       |                               |
| name         | String                        |                               |
| code         | String UQ                     | Kode aset (mis. `LP-001`)     |
| description  | String?                       |                               |
| condition    | AssetCondition                | Default `GOOD`                |
| status       | AssetStatus                   | Default `AVAILABLE`           |
| qrHash       | String? UQ                    | Untuk verifikasi QR           |
| laboratoryId | UUID? FK                      |                               |

**`Equipment`** (`equipment`) — Alat non-laptop, dilacak sebagai stok.

| Kolom        | Tipe                          | Catatan                                    |
| ------------ | ----------------------------- | ------------------------------------------ |
| id           | UUID PK                       |                                            |
| code         | String? UQ                    | Kode alat custom (mis. `ALT-001`); nullable untuk *legacy* |
| name         | String                        |                                            |
| category     | String?                       |                                            |
| stock        | Int                           | Default `0`                                |
| condition    | AssetCondition                | Default `GOOD`                             |
| status       | EquipmentStatus               | Default `AVAILABLE`                        |
| laboratoryId | UUID? FK                      |                                            |

> **Catatan**: kolom `code` pada `Equipment` di-*nullable* karena terdapat baris *legacy* yang sudah ada sebelum kolom diperkenalkan. Pengelola lab perlu mengisi `code` untuk baris-baris tersebut melalui modul **Peminjaman Alat → Aset → Edit**.

### Kelompok 4: Ruangan & Reservasi

**`Room`** (`rooms`)

| Kolom        | Tipe      | Catatan                         |
| ------------ | --------- | ------------------------------- |
| id           | UUID PK   |                                 |
| name         | String    |                                 |
| code         | String UQ |                                 |
| capacity     | Int       |                                 |
| location     | String?   |                                 |
| isActive     | Boolean   |                                 |
| laboratoryId | UUID? FK  |                                 |

**`RoomReservation`** (`room_reservations`)

Alur: `PENDING` → `CHECKED` (oleh Laboran) → `APPROVED` (oleh Kepala Lab) → `COMPLETED`. Bisa berakhir `REJECTED` (dengan `rejectionReason`) di tiap *stage* atau `CANCELLED` oleh pemilik.

| Kolom               | Tipe                | Catatan                                    |
| ------------------- | ------------------- | ------------------------------------------ |
| id                  | UUID PK             |                                            |
| userId              | UUID FK             | Pemohon                                    |
| roomId              | UUID FK             |                                            |
| laboratoryId        | UUID? FK            | Otomatis turunan `room.laboratoryId`       |
| purpose             | String              | Keperluan                                  |
| startTime           | DateTime            |                                            |
| endTime             | DateTime            |                                            |
| status              | ReservationStatus   | Default `PENDING`                          |
| notes               | Text?               |                                            |
| suratPermohonanPath | String?             | Path ke PDF surat (tendik wajib lampirkan) |
| checkedBy / At      | UUID? / DateTime?   | Audit Laboran                              |
| approvedBy / At     | UUID? / DateTime?   | Audit Kepala Lab                           |
| rejectionReason     | Text?               |                                            |

### Kelompok 5: Peminjaman

**`Loan`** (`loans`) — Laptop. *Approval chain* per stage tercatat di kolom dedikasi:

| Kolom                           | Tipe              | Stage                          |
| ------------------------------- | ----------------- | ------------------------------ |
| dosenDecision / At              | String? / DateTime? | DOSEN (untuk LoanType=TA)    |
| kalabDecisionBy / Decision / At | UUID? / String? / DateTime? | KEPALA_LAB           |
| laboranHandoverBy / At          | UUID? / DateTime? | LABORAN — serah                |
| laboranReturnBy                 | UUID?             | LABORAN — terima kembali       |

Field denda:

| Kolom         | Tipe              | Catatan                              |
| ------------- | ----------------- | ------------------------------------ |
| dayLate       | Int               | Default `0`                          |
| fine          | Decimal(12,2)     | Default `0`                          |
| finePaid      | FinePaidStatus    | UNPAID / PAID / WAIVED               |
| finePaidAt    | DateTime?         |                                      |
| finePaidBy    | UUID?             |                                      |
| fineNote      | Text?             | Misal alasan WAIVED                  |

Field substansi tugas akhir:

| Kolom          | Tipe    | Catatan |
| -------------- | ------- | ------- |
| thesisTitle    | String? |         |
| thesisAbstract | Text?   |         |

**`EquipmentLoan`** (`equipment_loans`) — *header* peminjaman alat (multi-item).

**`EquipmentLoanItem`** (`equipment_loan_items`) — baris item, relasi M2M `EquipmentLoan` ⇄ `Equipment` dengan `quantity`.

### Kelompok 6: Habis Pakai

**`Consumable`** (`consumables`) — `code? UQ`, `name`, `unit`, `stock`, `minimumStock`. Bila `stock < minimumStock`, item dianggap stok rendah (filter `lowStock=true`).

**`ConsumableTransaction`** (`consumable_transactions`) — IN (penambahan stok) atau OUT (penyaluran ke pengguna). Pencatat = `userId` (laboran).

### Kelompok 7: Dokumen

**`ClearanceLetter`** (`clearance_letters`) — Surat Bebas Lab untuk pendaftaran yudisium.

| Kolom                             | Tipe              | Catatan                                  |
| --------------------------------- | ----------------- | ---------------------------------------- |
| status                            | ClearanceStatus   | DRAFT → SUBMITTED → PENDING_LECTURER → PENDING_KEPALA_LAB → PENDING_LABORAN → APPROVED |
| approvedBy / At                   | UUID? / DateTime? |                                          |
| documentPath                      | String?           | Path PDF tergenerasi                     |
| qrHash                            | String? UQ        | QR untuk verifikasi publik               |
| tanggalSidang                     | DateTime?         | Tanggal sidang yang **sudah lewat**      |
| nomorSurat                        | String? UQ        |                                          |
| signerUidLaboran / KepalaLab      | String?           | UID *signer*                             |
| hashLaboran / KepalaLab           | String? UQ        | Hash tanda tangan digital per stage      |
| signedAtLaboran / KepalaLab       | DateTime?         |                                          |
| pdfUrl                            | String?           |                                          |
| rejectionReason                   | Text?             |                                          |

> **Catatan**: `tanggalSidang` adalah tanggal **sidang yang sudah berlangsung**, bukan rencana. Surat ini dipakai untuk pendaftaran yudisium pasca-sidang.

**`DigitalSignature`** (`digital_signatures`) — penanda *signing* per dokumen (`documentType` enum: CLEARANCE_LETTER / LOAN_AGREEMENT / EQUIPMENT_LOAN / OTHER).

### Kelompok 8: Pendukung

**`ActivityLog`** (`activity_logs`) — `action`, `entity`, `entityId`, `metadata` (JSON), `createdAt`. Indeks pada `(entity, entityId)` dan `createdAt` untuk pelacakan timeline.

**`AppSettings`** (`app_settings`) — *singleton* (`id="singleton"`); konfigurasi `lateFeePerDayIdr` (default 25.000) dan `lateFeeToleranceDays`.

**`Guide`** (`guides`) — modul Petunjuk per *audience*. Unik gabungan `(audience, slug)`. Konten markdown disimpan di kolom `contentMd`.

**`GuideSectionRevision`** — riwayat revisi konten Petunjuk (audit & potensi *rollback*).

**`GuideImage`** — metadata gambar yang di-*upload* untuk konten Petunjuk.

## 3.3 Migrasi & Manajemen Skema

Repositori **tidak** menyimpan *migration files*. Perubahan skema diterapkan melalui:

```bash
cd /var/www/simlab-v2/backend
npx prisma db push
```

Untuk perubahan yang mengubah *unique constraint* pada kolom *nullable*, Prisma menampilkan peringatan "data loss" yang sebenarnya bersifat *false alarm*. Gunakan flag `--accept-data-loss` setelah memverifikasi bahwa baris *existing* tetap aman.

\newpage

# Bab 4 — Referensi API

Seluruh endpoint berada di bawah *prefix* `/api/`. Diakses melalui *reverse proxy* nginx pada `https://statistics.uii.ac.id/simlab/api/...`.

## 4.1 Konvensi

- *Content-Type*: `application/json` untuk request body biasa; `multipart/form-data` untuk upload file.
- Otentikasi: *cookie* sesi Shibboleth (`_shibsession_*`). Tidak ada *bearer token*.
- Validasi: setiap *body* dan *query* divalidasi oleh skema Zod sebelum *handler* dijalankan. Kegagalan validasi mengembalikan 400 dengan detail kolom yang gagal.
- Otorisasi: *middleware* `requireRole(...)` pada router. Pengguna yang tidak memenuhi akan menerima 403.
- *Pagination*: `?skip=N&take=M`. *Default* `take` ditentukan per *endpoint*.
- Tanggal: format ISO 8601 (`2026-04-25T08:00:00Z`).
- *Method override*: header `X-HTTP-Method-Override: PATCH` (atau DELETE) di-rewrite dari POST untuk menghindari blokir Cloudflare WAF pada PATCH/DELETE *non-trusted*.

## 4.2 Endpoint Auth

| Method | Path                  | Otorisasi | Deskripsi                                                  |
| ------ | --------------------- | --------- | ---------------------------------------------------------- |
| GET    | `/api/auth/me`        | Auth      | Mengembalikan profil pengguna saat ini + roles + dbRoles  |
| POST   | `/api/auth/logout`    | Auth      | Memutus sesi; return URL Shibboleth logout                 |

**Contoh respons `GET /api/auth/me`:**

```json
{
  "uid": "241003314",
  "email": "namauser@uii.ac.id",
  "displayName": "Nama Pengguna",
  "affiliation": ["Staff"],
  "memberOf": ["CN=simlab-laboran,OU=Groups,..."],
  "roles": ["LABORAN"]
}
```

## 4.3 Endpoint Users & Roles

| Method | Path                            | Otorisasi                                | Deskripsi                                  |
| ------ | ------------------------------- | ---------------------------------------- | ------------------------------------------ |
| GET    | `/api/users`                    | Auth (filter di controller)              | List users dengan paginasi & filter role   |
| GET    | `/api/users/:id`                | Auth                                     | Detail user                                |
| GET    | `/api/users/me/obligations`     | Auth                                     | Kewajiban aktif user (loan/denda terbuka)  |
| PATCH  | `/api/users/me`                 | Auth                                     | Update `waNumber` saja (self-update)       |
| POST   | `/api/users`                    | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Tambah user manual                         |
| PATCH  | `/api/users/:id`                | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Update profil (kecuali roles)              |
| PUT    | `/api/users/:id/roles`          | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Replace seluruh roles user                 |
| DELETE | `/api/users/:id`                | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Soft-delete (`isActive=false`)             |

**Skema validasi:**

- `createBody`: `{ uid, email, displayName, waNumber, roles: RoleName[] }`
- `updateBody`: `{ displayName?, email?, waNumber?, isActive? }`
- `updateMeBody`: `{ waNumber? }` (hanya untuk self)
- `rolesBody`: `{ roles: RoleName[] }`

## 4.4 Endpoint Laboratories & Rooms

| Method | Path                          | Otorisasi    | Deskripsi                       |
| ------ | ----------------------------- | ------------ | ------------------------------- |
| GET    | `/api/laboratories`           | Auth         | List laboratorium               |
| GET    | `/api/laboratories/:id`       | Auth         | Detail laboratorium             |
| PATCH  | `/api/laboratories/:id`       | SUPER_ADMIN  | Update lab (kepalaLabId, dst)   |
| GET    | `/api/rooms`                  | Auth         | List ruangan                    |
| GET    | `/api/rooms/:id`              | Auth         | Detail ruangan                  |

## 4.5 Endpoint Assets (Laptop)

| Method | Path                  | Otorisasi                                | Deskripsi                              |
| ------ | --------------------- | ---------------------------------------- | -------------------------------------- |
| GET    | `/api/assets`         | Auth                                     | List laptop dengan filter & paginasi   |
| GET    | `/api/assets/:id`     | Auth                                     | Detail laptop                          |
| POST   | `/api/assets`         | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Tambah laptop                          |
| PATCH  | `/api/assets/:id`     | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Update laptop                          |
| DELETE | `/api/assets/:id`     | KEPALA_LAB, SUPER_ADMIN                  | Hapus laptop                           |

**Skema:**

- `listQuery`: `{ skip?, take?, status?, search? }`
- `createBody`: `{ name, code, description?, condition?, status?, qrHash?, laboratoryId? }`
- `updateBody`: partial dari `createBody`

## 4.6 Endpoint Loans (Peminjaman Laptop)

| Method | Path                              | Otorisasi                                | Deskripsi                                |
| ------ | --------------------------------- | ---------------------------------------- | ---------------------------------------- |
| GET    | `/api/loans`                      | Auth                                     | List peminjaman                          |
| GET    | `/api/loans/fines`                | LABORAN, KEPALA_LAB, SUPER_ADMIN         | List denda untuk diproses                |
| GET    | `/api/loans/:id`                  | Auth                                     | Detail peminjaman                        |
| POST   | `/api/loans`                      | Auth                                     | Buat permohonan baru                     |
| PATCH  | `/api/loans/:id/status`           | Auth (penjaga di service per stage)      | Update status mengikuti *approval chain* |
| PATCH  | `/api/loans/:id`                  | Auth                                     | Update field non-status (perpanjangan)   |
| PATCH  | `/api/loans/:id/fine`             | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Tandai denda PAID/WAIVED                 |

**Skema:**

- `createBody`: `{ userId?, assetId, lecturerId, type, status?, startDate, endDate, thesisTitle?, thesisAbstract?, notes?, waNumber? }`
  - `userId` opsional, hanya boleh diisi oleh LABORAN+ (untuk pencatatan walk-in praktikum).
- `statusBody`: `{ status, returnCondition?, returnNote?, rejectionReason? }`
- `fineBody`: `{ finePaid, fineNote? }`

**Approval chain `LoanType=TA`:**

```
PENDING                     [mahasiswa submit]
  → APPROVED_BY_DOSEN       [dosen approve]
  → APPROVED                [kepala lab approve]
  → ACTIVE                  [laboran handover]
  → RETURNED                [laboran return]
```

Pada tiap stage, *reject* memindahkan ke `REJECTED`. `OVERDUE` di-set otomatis oleh scheduler bila `endDate` terlewati saat status masih `ACTIVE`.

## 4.7 Endpoint Equipment & Equipment Loans

**Equipment:**

| Method | Path                       | Otorisasi                                |
| ------ | -------------------------- | ---------------------------------------- |
| GET    | `/api/equipment`           | Auth                                     |
| GET    | `/api/equipment/:id`       | Auth                                     |
| POST   | `/api/equipment`           | LABORAN, KEPALA_LAB, SUPER_ADMIN         |
| PATCH  | `/api/equipment/:id`       | LABORAN, KEPALA_LAB, SUPER_ADMIN         |
| DELETE | `/api/equipment/:id`       | SUPER_ADMIN                              |

`createBody`: `{ code?, name, category?, stock?, condition?, status?, laboratoryId? }`.

**Equipment Loans:**

| Method | Path                                       | Otorisasi                                |
| ------ | ------------------------------------------ | ---------------------------------------- |
| GET    | `/api/equipment-loans`                     | Auth                                     |
| GET    | `/api/equipment-loans/:id`                 | Auth                                     |
| POST   | `/api/equipment-loans`                     | Auth                                     |
| PATCH  | `/api/equipment-loans/:id`                 | LABORAN, KEPALA_LAB, SUPER_ADMIN         |
| PATCH  | `/api/equipment-loans/:id/status`          | LABORAN, KEPALA_LAB, SUPER_ADMIN         |

`createBody`: `{ userUid?, startDate, endDate, notes?, status?, items: [{ equipmentId, quantity }] }`.

## 4.8 Endpoint Consumables

| Method | Path                                              | Otorisasi                                | Deskripsi                                  |
| ------ | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| GET    | `/api/consumables`                                | Auth                                     | List dengan filter `lowStock`              |
| GET    | `/api/consumables/transactions`                   | LABORAN, KEPALA_LAB, SUPER_ADMIN         | List **semua** transaksi (max 500/hal)     |
| GET    | `/api/consumables/:id`                            | Auth                                     | Detail                                     |
| GET    | `/api/consumables/:id/transactions`               | Auth                                     | Riwayat transaksi item                     |
| POST   | `/api/consumables`                                | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Tambah item                                |
| PATCH  | `/api/consumables/:id`                            | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Update item                                |
| POST   | `/api/consumables/:id/transactions`               | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Buat transaksi tunggal                     |
| POST   | `/api/consumables/transactions/bulk`              | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Buat banyak transaksi sekaligus            |
| DELETE | `/api/consumables/:id`                            | SUPER_ADMIN                              | Hapus item                                 |

**Skema penting:**

- `txBody`: `{ type, quantity, notes? }`
- `bulkBody`: `{ type, recipientUid?, notes?, lines: [{ consumableId, quantity }] }`

## 4.9 Endpoint Reservations (Ruangan)

| Method | Path                                  | Otorisasi                                | Deskripsi                              |
| ------ | ------------------------------------- | ---------------------------------------- | -------------------------------------- |
| GET    | `/api/reservations`                   | Auth                                     | List reservasi                         |
| GET    | `/api/reservations/:id`               | Auth                                     | Detail                                 |
| GET    | `/api/reservations/:id/surat`         | Auth                                     | Stream PDF surat permohonan inline     |
| POST   | `/api/reservations`                   | Auth (multipart, file: `surat`)          | Buat reservasi (dengan PDF lampiran)   |
| PATCH  | `/api/reservations/:id/status`        | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Approve/Reject                         |

**Constraint upload:**

- File: `surat` (PDF saja)
- Max size: 200 KB
- Direktori: `backend/uploads/reservations/`

**Otorisasi serve PDF**: hanya pemilik reservasi atau LABORAN/KEPALA_LAB/SUPER_ADMIN; *path traversal guard* memastikan file yang di-resolve berada di dalam `UPLOAD_DIR`.

## 4.10 Endpoint Clearances (Surat Bebas Lab)

| Method | Path                                      | Otorisasi                                | Deskripsi                                |
| ------ | ----------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| GET    | `/api/clearances`                         | Auth                                     | List                                     |
| GET    | `/api/clearances/:id`                     | Auth                                     | Detail                                   |
| GET    | `/api/clearances/:id/download`            | Auth                                     | Download PDF surat                       |
| POST   | `/api/clearances`                         | Auth                                     | Submit permohonan                        |
| PATCH  | `/api/clearances/:id/status`              | LABORAN, KEPALA_LAB, SUPER_ADMIN         | Update status (chain Laboran → Kalab)    |

`createBody`: `{ notes?, tanggalSidang? }`. Field lain (nomor surat, hash signing, dll) di-*populate* oleh service saat APPROVED.

## 4.11 Endpoint Self-Service (`/api/me`)

| Method | Path                                       | Otorisasi |
| ------ | ------------------------------------------ | --------- |
| GET    | `/api/me/active-items`                     | Auth      |
| GET    | `/api/me/transactions/laptops`             | Auth      |
| GET    | `/api/me/transactions/equipment`           | Auth      |
| GET    | `/api/me/transactions/rooms`               | Auth      |
| GET    | `/api/me/transactions/consumables`         | Auth      |

`/transactions/laptops` mengembalikan **semua** loan milik pengguna tanpa filter `type`, sehingga TA + PRACTICUM tampil. Modul **Transaksi Saya** di frontend memanfaatkan endpoint ini.

## 4.12 Endpoint History

| Method | Path                                              | Otorisasi |
| ------ | ------------------------------------------------- | --------- |
| GET    | `/api/history/loans/ta`                           | Auth      |
| GET    | `/api/history/loans/practicum`                    | Auth      |
| GET    | `/api/history/loans/:id/timeline`                 | Auth      |
| GET    | `/api/history/clearances`                         | Auth      |
| GET    | `/api/history/clearances/:id/timeline`            | Auth      |
| GET    | `/api/history/reservations`                       | Auth      |
| GET    | `/api/history/reservations/:id/timeline`          | Auth      |
| GET    | `/api/history/consumables/outgoing`               | Auth      |

Endpoint *timeline* menyusun jejak status transaksi dari `ActivityLog` + kolom audit (`*By`, `*At`).

## 4.13 Endpoint Guides (Petunjuk)

| Method | Path                                  | Otorisasi    | Deskripsi                                |
| ------ | ------------------------------------- | ------------ | ---------------------------------------- |
| GET    | `/api/guides/image/:filename`         | Public       | Serve gambar petunjuk                    |
| GET    | `/api/guides/my`                      | Auth         | List guide untuk audience pengguna       |
| GET    | `/api/guides/audience/:audience`      | Auth         | List guide per audience                  |
| GET    | `/api/guides`                         | SUPER_ADMIN  | List **semua** guide                     |
| GET    | `/api/guides/:id`                     | SUPER_ADMIN  | Detail guide                             |
| GET    | `/api/guides/:id/revisions`           | SUPER_ADMIN  | List revisi konten                       |
| POST   | `/api/guides`                         | SUPER_ADMIN  | Buat guide                               |
| PATCH  | `/api/guides/:id`                     | SUPER_ADMIN  | Update guide (revisi otomatis dicatat)   |
| DELETE | `/api/guides/:id/publish`             | SUPER_ADMIN  | Unpublish (`isPublished=false`)          |
| DELETE | `/api/guides/:id`                     | SUPER_ADMIN  | Hard-delete                              |
| POST   | `/api/guides/image`                   | SUPER_ADMIN  | Upload gambar (max 2 MB; JPG/PNG/WebP/GIF) |

**Slug**: harus mengikuti regex `^[a-z0-9-]+$`, max 80 karakter. Unik pada `(audience, slug)`.

## 4.14 Endpoint App Settings

| Method | Path                  | Otorisasi   | Deskripsi                               |
| ------ | --------------------- | ----------- | --------------------------------------- |
| GET    | `/api/app-settings`   | Auth        | Baca konfigurasi singleton              |
| PATCH  | `/api/app-settings`   | SUPER_ADMIN | Update `lateFeePerDayIdr`, toleransi    |

## 4.15 Endpoint Verifikasi (Public)

| Method | Path                  | Otorisasi | Deskripsi                                |
| ------ | --------------------- | --------- | ---------------------------------------- |
| GET    | `/api/verify/:hash`   | Public    | Verifikasi hash dokumen (clearance, dsb) |

Endpoint ini sengaja publik agar dapat diakses oleh siapa pun yang men-*scan* QR di dokumen tercetak. Mengembalikan ringkasan dokumen tanpa mengekspos data pribadi yang sensitif.

\newpage

# Bab 5 — Sistem Notifikasi

## 5.1 Saluran (Channels)

Setiap notifikasi dikirim ke dua saluran secara paralel: **email** (SMTP) dan **WhatsApp** (Fonnte API). Ketiadaan kanal pada penerima (mis. `waNumber=null`) di-*skip* tanpa men-*throw*.

```typescript
type NotificationChannel = 'email' | 'whatsapp';
type NotifyStatus = 'sent' | 'skipped' | 'failed';
```

## 5.2 Transport

### `sendEmail`

- Memakai `nodemailer` dengan transport SMTP.
- Konfigurasi via env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`.
- Mendukung *attachment* berupa *path* file (mis. PDF Surat Bebas Lab).
- Mengembalikan `false` (skipped) jika SMTP belum dikonfigurasi.

### `sendWhatsApp`

- Memakai `axios` ke endpoint Fonnte: `WA_API_URL` (default `https://api.fonnte.com/send`) dengan header token `WA_API_TOKEN`.
- **Retry**: maksimum 3 percobaan dengan *backoff* `[0, 1000, 3000]` ms. *Retry* hanya untuk respons 5xx atau galat jaringan; 4xx langsung *throw* (tidak ada gunanya retry).
- *Worst-case* total ~4 detik sebelum menyerah.
- Mengembalikan `false` jika WA belum dikonfigurasi.

## 5.3 Dispatch & Logging

`dispatch(recipient, template, attachments?)` mengirim ke kedua kanal lalu mencatat log per *call-site*:

```
[notif] to=email:foo@uii.ac.id phone:0822... subj="..." email:sent wa:sent
[notif] to=email:foo@uii.ac.id phone:0822... subj="..." email:sent wa:failed(502 Bad Gateway)
```

Level log adalah `error` bila ada kegagalan di salah satu kanal, atau `log` bila keduanya sukses/skipped. Log ini muncul di `journalctl -u simlab-v2-be`.

## 5.4 Daftar Helper Notifikasi

Setiap helper memetakan satu peristiwa bisnis ke satu pasangan template (email + WA). Daftar utama:

**Peminjaman Laptop:**

- `notifyLoanCreatedToMahasiswa`
- `notifyLoanApprovalToDosen`
- `notifyLoanApprovedByDosenToMahasiswa`
- `notifyLoanApprovalToKalab`
- `notifyLoanApprovedByKalabToMahasiswa`
- `notifyLoanApprovedToLaboran`
- `notifyLoanActivatedToMahasiswa`
- `notifyLoanExtendedToMahasiswa`
- `notifyLoanReturnedToMahasiswa`

**Peminjaman Alat:**

- `notifyEquipmentLoanActivatedToMahasiswa`
- `notifyEquipmentLoanExtendedToMahasiswa`
- `notifyEquipmentLoanReturnedToMahasiswa`

**Reservasi Ruangan:**

- `notifyRoomReservationCreatedToMahasiswa`
- `notifyRoomReservationToLaboran`
- `notifyRoomReservationCheckedToMahasiswa`
- `notifyRoomReservationToKalab`
- `notifyRoomReservationApprovedToLaboran`
- `notifyRoomReservationDecisionToMahasiswa`

**Surat Bebas Lab:**

- `notifyClearanceCreatedToMahasiswa`
- `notifyClearanceCreatedToLaboran`
- `notifyClearanceCheckedToMahasiswa`
- `notifyClearanceCheckedToKepalaLab`
- `notifyClearanceLetterToKalab`
- `notifyClearanceLetterToLaboran`
- `notifyClearanceRejectedToMahasiswa`
- `notifyClearanceIssuedToMahasiswa`

**Lain-lain:**

- `notifyConsumableHandoverToMahasiswa`
- `notifyCancelledBySystemToMahasiswa`

## 5.5 Scheduler

`backend/src/services/notification/scheduler.service.ts` menjalankan `node-cron` job pada *startup*:

| Variable env                | Default              | Fungsi                          |
| --------------------------- | -------------------- | ------------------------------- |
| `SCHEDULER_ENABLED`         | `1`                  | Toggle global                   |
| `SCHEDULER_TZ`              | `Asia/Jakarta`       | Zona waktu cron                 |
| `SCHEDULER_REMINDER_CRON`   | `"0 8 * * *"`        | Cron pengingat harian (08:00)   |

*Job* utama:

- **Reminder H-1 / overdue**: scan `Loan` dengan status `ACTIVE` dan `endDate` mendekati / terlewati; kirim notifikasi ke peminjam.
- **Auto-mark OVERDUE**: ubah status `ACTIVE` → `OVERDUE` ketika `endDate` terlewati.

\newpage

# Bab 6 — Frontend Routing & Akses Modul

## 6.1 Daftar Rute

Frontend memakai React Router 7 dengan *base* `/simlab/`. Rute terbagi tiga jenis:

- **Public-only** (`/`, `/login`) — pengguna sudah login otomatis di-redirect.
- **Public** (`/verify/:hash`) — bisa diakses tanpa login.
- **Guarded** — di-*wrap* `ProtectedRoute`; redirect ke `/login` bila tanpa sesi, atau ke `/dashboard` bila tidak punya role yang cocok.

| Path                       | Komponen              | Role yang diizinkan                                     |
| -------------------------- | --------------------- | ------------------------------------------------------- |
| `/dashboard`               | Dashboard             | semua role yang login                                   |
| `/peminjaman-laptop`       | PeminjamanLaptop      | MAHASISWA                                               |
| `/peminjaman-ruangan`      | PeminjamanRuangan     | MAHASISWA, DOSEN, STAFF, LABORAN, KEPALA_LAB           |
| `/surat-bebas-lab`         | SuratBebasLab         | MAHASISWA                                               |
| `/persetujuan-dosen`       | PersetujuanDosen      | DOSEN                                                   |
| `/persetujuan-kepala-lab`  | PersetujuanKepalaLab  | KEPALA_LAB                                              |
| `/persetujuan-laboran`     | PersetujuanLaboran    | LABORAN                                                 |
| `/transaksi`               | Transaksi             | LABORAN                                                 |
| `/peminjaman-alat`         | PeminjamanAlat        | LABORAN                                                 |
| `/aset`                    | Aset                  | LABORAN                                                 |
| `/transaksi-habis-pakai`   | TransaksiHabisPakai   | LABORAN                                                 |
| `/akun`                    | Akun                  | LABORAN                                                 |
| `/inventaris-lab`          | InventarisLab         | KEPALA_LAB                                              |
| `/transaksi-saya`          | TransaksiSaya         | DOSEN, STAFF                                            |
| `/history`                 | History               | MAHASISWA, KEPALA_LAB                                   |
| `/petunjuk-mahasiswa`      | PetunjukMahasiswa     | MAHASISWA                                               |
| `/petunjuk-dosen`          | PetunjukDosen         | DOSEN                                                   |
| `/petunjuk-tendik`         | PetunjukTendik        | STAFF                                                   |
| `/manajemen-petunjuk`      | ManajemenPetunjuk     | SUPER_ADMIN                                             |
| `/pengaturan-aplikasi`     | PengaturanAplikasi    | SUPER_ADMIN                                             |
| `/monitor-transaksi`       | MonitorTransaksi      | SUPER_ADMIN                                             |
| `/tentang`                 | TentangAplikasi       | semua role yang login                                   |
| `/verify/:hash`            | VerifyQR              | publik                                                  |

## 6.2 Akses Modul (`moduleAccess.ts`)

Fungsi `canAccess(path, roles)`:

```typescript
function canAccess(path: string, roles: RoleName[] | undefined): boolean {
  if (!roles?.length) return false;
  if (roles.includes("SUPER_ADMIN")) return true;
  const allowed = MODULE_ACCESS[path];
  if (!allowed) return false; // path tidak ada → tolak
  return roles.some(r => allowed.includes(r));
}
```

Tiga path yang **tidak terdaftar** di `MODULE_ACCESS` (sehingga hanya SUPER_ADMIN yang lolos):

- `/pengaturan-aplikasi`
- `/monitor-transaksi`
- `/manajemen-petunjuk`

## 6.3 Konfigurasi Vite & Environment

`vite.config.ts`:

```typescript
{
  base: '/simlab/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": "./src" } },
  server: { port: 5173 }
}
```

Variabel environment frontend (`.env`):

```
VITE_API_URL="/simlab"
```

`API_BASE = import.meta.env.VITE_API_URL` dipakai sebagai prefix untuk seluruh `fetch()` ke backend (mis. `${API_BASE}/api/loans`).

\newpage

# Bab 7 — Deployment & Operasional

## 7.1 Systemd Unit

**File:** `/etc/systemd/system/simlab-v2-be.service`

```ini
[Unit]
Description=simlab-v2-backend
After=syslog.target network.target postgresql.service

[Service]
Type=simple
User=simfmipa
WorkingDirectory=/var/www/simlab-v2/backend
EnvironmentFile=/var/www/simlab-v2/backend/.env
ExecStartPre=/usr/bin/npx --no-install prisma generate
ExecStartPre=/usr/bin/npm run build
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
KillMode=mixed
TimeoutStopSec=15

[Install]
WantedBy=multi-user.target
```

Operasi standar:

```bash
sudo systemctl restart simlab-v2-be      # restart setelah edit backend
sudo systemctl status  simlab-v2-be      # cek status
sudo journalctl -u     simlab-v2-be -n 200 --no-pager   # lihat log
```

> **Catatan:** Backend **tidak** menjalankan *hot-reload* di produksi. Setiap edit pada `backend/src/**` mengharuskan `systemctl restart` (yang juga memicu `prisma generate` + `npm run build` lewat `ExecStartPre`).

## 7.2 Frontend Build & Serve

Frontend di-*build* statis dan di-*serve* oleh nginx dari direktori `dist/`.

```bash
cd /var/www/simlab-v2
npm run build        # menghasilkan dist/index.html + dist/assets/*
```

Nginx konfigurasi (sketsa):

```
location /simlab/ {
  alias /var/www/simlab-v2/dist/;
  try_files $uri $uri/ /simlab/index.html;
}

location /simlab/api/ {
  proxy_pass http://127.0.0.1:3000/api/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

> **Catatan:** Setiap edit pada `src/**` (frontend) wajib `npm run build`, dan pengguna **harus** *hard-refresh* karena nama bundle berubah (cache-busting hash).

## 7.3 Variabel Lingkungan

**Backend (`backend/.env`):**

```
# Database
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/simlab_v2

# Shibboleth
SHIBBOLETH_LOGOUT_URL=/Shibboleth.sso/Logout
SHIBBOLETH_LOGOUT_RETURN=https://statistics.uii.ac.id/simlab/
SHIBBOLETH_DEV_MOCK=0
SHIBBOLETH_SUPER_ADMIN_UIDS=<csv UID>
# Opsional override:
# SHIBBOLETH_SESSION_URL=https://127.0.0.1/simlab/Shibboleth.sso/Session
# SHIBBOLETH_HOSTNAME=statistics.uii.ac.id
# SHIBBOLETH_SESSION_CACHE_TTL_MS=60000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=labstatistika.uii@gmail.com
SMTP_PASS=<app password>
SMTP_FROM=labstatistika.uii@gmail.com
SMTP_FROM_NAME=SIMLAB Laboratorium Statistika UII

# WhatsApp (Fonnte)
WA_API_URL=https://api.fonnte.com/send
WA_API_TOKEN=<device token>

# Scheduler
SCHEDULER_ENABLED=1
SCHEDULER_TZ=Asia/Jakarta
SCHEDULER_REMINDER_CRON="0 8 * * *"

# CORS
CORS_ORIGIN=https://statistics.uii.ac.id

# Server
PORT=3000
```

**Frontend (`/.env`):**

```
VITE_API_URL=/simlab
```

## 7.4 Operasi Database

### Inisialisasi Skema

```bash
cd /var/www/simlab-v2/backend
npx prisma db push                  # apply schema.prisma ke DB
npx prisma db push --accept-data-loss   # bila ada warning data-loss false alarm
npx prisma generate                 # generate client (otomatis oleh systemd)
```

### Backup

Disarankan rutin `pg_dump` untuk seluruh database `simlab_v2`. Frekuensi mengikuti SLA institusi.

### Seed Data

- `backend/prisma/seedGuides.ts` — seeder kerangka modul Petunjuk (7 section per audience). Konten diisi via UI Manajemen Petunjuk.

## 7.5 Catatan Operasional

- **Cloudflare WAF**: PATCH/DELETE dari IP non-trusted (mis. VPN luar UII) berisiko di-*block* sebagai 403 oleh Cloudflare *managed rules*. Indikator: response 403 dengan header `server: cloudflare` + `cf-ray`. Solusi praktis: gunakan jaringan UII / Cloudflare Tunnel; alternatif kode: header `X-HTTP-Method-Override` (sudah didukung backend).
- **Cloudflare scan multipart**: upload PDF tertentu dapat memicu rule XSS Cloudflare (false positive). VPN UII tergolong *trusted-tier* sehingga lolos.
- **Fonnte 502 sporadis**: Fonnte API kadang mengembalikan 502 transien. Retry 3x sudah ada di `transports.ts`; kegagalan permanen ter-log sebagai `wa:failed(...)`.
- **Cache 301 lawas**: pengguna yang pernah memakai URL v1 (`/simlab → /schedule`) bisa terjebak cache 301 di browser. Solusi: *clear site data*.
- **Sudoers**: untuk akses logs tanpa interaktif, tambahkan baris non-password untuk `systemctl status simlab-v2-be *` dan `journalctl -u simlab-v2-be *` (bukan kebijakan default; opsional).

\newpage

# Lampiran A — Glosarium

| Istilah                | Definisi                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **IdP**                | *Identity Provider* — sistem yang mengelola identitas dan otentikasi (UII Shibboleth).  |
| **SP**                 | *Service Provider* — komponen Shibboleth pada sisi aplikasi yang menerima atribut SAML. |
| **RBAC**               | *Role-Based Access Control* — model otorisasi berbasis peran.                           |
| **WAF**                | *Web Application Firewall* — lapisan filter request di tepi (Cloudflare).               |
| **TA**                 | Tugas Akhir — peminjaman laptop multi-bulan untuk pengerjaan skripsi.                   |
| **Praktikum**          | Peminjaman laptop *walk-in*, dicatat oleh laboran tanpa permohonan online.              |
| **Yudisium**           | Pendaftaran kelulusan setelah sidang skripsi; memerlukan Surat Bebas Lab.               |
| **Walk-in**            | Transaksi yang dimulai langsung di lab (bukan via permohonan online).                   |
| **Laboran**            | Pengelola harian lab (operasional, serah-terima, persetujuan tahap awal).               |
| **Tendik**             | Tenaga Kependidikan — staf administrasi/teknis non-dosen.                               |
| **Trusted-tier**       | Jaringan/IP yang diizinkan melewati rule WAF tertentu (mis. jaringan UII).              |
| **Approval chain**     | Rangkaian persetujuan multi-tahap (Mahasiswa → Dosen → Kepala Lab → Laboran).           |
| **Fonnte**             | Penyedia layanan WhatsApp API (https://fonnte.com).                                     |

# Lampiran B — Referensi Cepat

## B.1 Perintah Operasional

```bash
# Backend restart (wajib setelah edit backend/src)
sudo systemctl restart simlab-v2-be

# Frontend rebuild (wajib setelah edit src/)
cd /var/www/simlab-v2 && npm run build

# Database push schema baru
cd /var/www/simlab-v2/backend && npx prisma db push

# Tail log backend
sudo journalctl -u simlab-v2-be -f --no-pager
```

## B.2 Path Rute Penting

| Bagian                | Path                                             |
| --------------------- | ------------------------------------------------ |
| Aplikasi              | `https://statistics.uii.ac.id/simlab/`           |
| Login Shibboleth      | `https://statistics.uii.ac.id/Shibboleth.sso/Login` |
| Logout Shibboleth     | `https://statistics.uii.ac.id/Shibboleth.sso/Logout` |
| Verifikasi QR publik  | `https://statistics.uii.ac.id/simlab/verify/:hash` |
| API base              | `https://statistics.uii.ac.id/simlab/api/`       |
| `/auth/me`            | `/simlab/api/auth/me`                            |

## B.3 Nomor Versi & Riwayat

Versi aplikasi: **2.0.1** (April 2026)

Riwayat versi mayor:

- **v1.x** — implementasi awal (legacy, *deprecated*).
- **v2.0** — penulisan ulang dengan stack modern (React 18 + Express + Prisma + Shibboleth).
- **v2.0.1** — penambahan modul *Tentang*, kolom `Equipment.code`, retry WA, perbaikan RBAC IdP UII.

---

*Dokumen ini bersifat hidup; perubahan signifikan pada arsitektur, skema, atau API harus diikuti pemutakhiran dokumen.*
