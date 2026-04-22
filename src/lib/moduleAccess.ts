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
  "/peminjaman-ruangan": ["MAHASISWA", "DOSEN", "LABORAN", "KEPALA_LAB"],
  // Dosen
  "/persetujuan-dosen": ["DOSEN"],
  // Kepala Lab
  "/persetujuan-kepala-lab": ["KEPALA_LAB"],
  "/history": ["KEPALA_LAB"],
  // Laboran
  "/persetujuan-laboran": ["LABORAN"],
  "/transaksi": ["LABORAN"],
  "/peminjaman-alat": ["LABORAN"],
  "/aset": ["LABORAN"],
  "/transaksi-habis-pakai": ["LABORAN"],
  // "/pengaturan-aplikasi" & "/monitor-transaksi" sengaja absent — super-admin only.
};

export function canAccess(path: string, roles: RoleName[] | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes("SUPER_ADMIN")) return true;
  const allowed = MODULE_ACCESS[path];
  if (!allowed) return false;
  return allowed.some((r) => roles.includes(r));
}
