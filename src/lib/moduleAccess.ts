import type { RoleName } from "../contexts/AuthContext";

/**
 * Single source of truth untuk akses per-modul.
 *
 * Kunci: path route (tanpa basename). Nilai: daftar role yang boleh akses.
 * `SUPER_ADMIN` selalu bypass — tidak perlu dicantumkan di setiap entry.
 * Path yang tidak terdaftar di map = hanya SUPER_ADMIN.
 */
export const MODULE_ACCESS: Record<string, RoleName[]> = {
  "/dashboard": [
    "MAHASISWA",
    "DOSEN",
    "LABORAN",
    "KEPALA_LAB",
    "STAFF",
  ],
  "/akun": ["LABORAN"],
  // Mahasiswa
  "/peminjaman-laptop": ["MAHASISWA"],
  "/surat-bebas-lab": ["MAHASISWA"],
  // Semua user aktif boleh pinjam ruangan
  "/peminjaman-ruangan": ["MAHASISWA", "DOSEN", "STAFF", "LABORAN", "KEPALA_LAB"],
  // Dosen
  "/persetujuan-dosen": ["DOSEN"],
  // Kepala Lab
  "/persetujuan-kepala-lab": ["KEPALA_LAB"],
  "/inventaris-lab": ["KEPALA_LAB"],
  // "/history" — dua persona:
  //   MAHASISWA: "Riwayat Saya" (5 tab, data milik sendiri, scoped backend)
  //   KEPALA_LAB: view global riwayat lab (backend treat sebagai unscoped,
  //     perilaku lama sebelum modul di-repurpose untuk mahasiswa).
  // Role lain pakai "/transaksi-saya" atau "/dashboard".
  "/history": ["MAHASISWA", "KEPALA_LAB"],
  // "Transaksi Saya" — DOSEN & STAFF, perspektif peminjam/pengaju.
  // 4 tab: Peminjaman Laptop, Peminjaman Alat, Habis Pakai, Peminjaman
  // Ruangan. Backend scope userId=me (consumables via notes match).
  "/transaksi-saya": ["DOSEN", "STAFF"],
  // Laboran
  "/persetujuan-laboran": ["LABORAN"],
  "/transaksi": ["LABORAN"],
  "/peminjaman-alat": ["LABORAN"],
  "/aset": ["LABORAN"],
  "/transaksi-habis-pakai": ["LABORAN"],
  // "/pengaturan-aplikasi" & "/monitor-transaksi" sengaja absent — super-admin only.
  // Petunjuk penggunaan — strict per role.
  "/petunjuk-mahasiswa": ["MAHASISWA"],
  "/petunjuk-dosen": ["DOSEN"],
  "/petunjuk-tendik": ["STAFF"],
  // "/manajemen-petunjuk" — super-admin only (absent dari map).
  // Tentang — informasi aplikasi, terbuka untuk semua role aktif.
  "/tentang": ["MAHASISWA", "DOSEN", "LABORAN", "KEPALA_LAB", "STAFF"],
};

export function canAccess(path: string, roles: RoleName[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes("SUPER_ADMIN")) return true;
  const allowed = MODULE_ACCESS[path];
  if (!allowed) return false;
  return allowed.some((r) => roles.includes(r));
}
