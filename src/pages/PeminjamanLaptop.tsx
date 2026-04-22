import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Laptop, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDialog } from "../lib/dialog";

type View = "peminjaman-baru" | "aktif" | "riwayat";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendAssetCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
type BackendAssetStatus = "AVAILABLE" | "BORROWED" | "DAMAGED" | "MAINTENANCE";

interface BackendAsset {
  id: string;
  name: string;
  code: string;
  description: string | null;
  condition: BackendAssetCondition;
  status: BackendAssetStatus;
}
interface AssetListResponse {
  items: BackendAsset[];
  total: number;
  skip: number;
  take: number;
}

type BackendLoanStatus =
  | "PENDING"
  | "APPROVED_BY_DOSEN"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "RETURNED"
  | "OVERDUE"
  | "CANCELLED";

const FINAL_STATUSES: BackendLoanStatus[] = ["RETURNED", "REJECTED", "CANCELLED"];

interface BackendLoan {
  id: string;
  status: BackendLoanStatus;
  startDate: string;
  endDate: string;
  notes: string | null;
  createdAt: string;
  asset?: { id: string; name: string; code: string };
}

interface LoanListResponse {
  items: BackendLoan[];
  total: number;
  skip: number;
  take: number;
}

const conditionLabel: Record<BackendAssetCondition, "Baik" | "Cukup" | "Rusak"> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Cukup",
  MAJOR_DAMAGE: "Rusak",
};

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Loan memang tidak punya kolom per-stage (dosen/kalab) di backend;
// status tunggal di-derive ke dua kolom agar cocok dengan layout tabel lama.
function deriveLoanStages(status: BackendLoanStatus): {
  dosen: string;
  kalab: string;
  statusLabel: string;
} {
  switch (status) {
    case "PENDING":
      return { dosen: "Menunggu", kalab: "-", statusLabel: "Menunggu" };
    case "APPROVED_BY_DOSEN":
      return { dosen: "Disetujui", kalab: "Menunggu", statusLabel: "Menunggu Kalab" };
    case "APPROVED":
      return { dosen: "Disetujui", kalab: "Disetujui", statusLabel: "Disetujui" };
    case "ACTIVE":
      return { dosen: "Disetujui", kalab: "Disetujui", statusLabel: "Aktif" };
    case "RETURNED":
      return { dosen: "Disetujui", kalab: "Disetujui", statusLabel: "Selesai" };
    case "OVERDUE":
      return { dosen: "Disetujui", kalab: "Disetujui", statusLabel: "Terlambat" };
    case "REJECTED":
      return { dosen: "Ditolak", kalab: "-", statusLabel: "Ditolak" };
    case "CANCELLED":
      return { dosen: "-", kalab: "-", statusLabel: "Dibatalkan" };
  }
}

interface LoanRecord {
  id: string;
  tanggalPengajuan: string;
  item: string;
  persetujuanDosen: string;
  persetujuanKalab: string;
  status: string;
  rawStatus: BackendLoanStatus;
  keterangan: string;
}

interface LaptopSpec {
  prosesor: string;
  ram: string;
  penyimpanan: string;
  layar: string;
  os: string;
  kondisi: "Baik" | "Cukup" | "Rusak";
}

// Legacy mock spec lookup — kept for future when backend exposes laptop specs.
// Tidak dipakai di render saat ini; keys "Laptop 1..10" tidak match code real.
const laptopSpecs: Record<string, LaptopSpec> = {
  "Laptop 1": {
    prosesor: "Intel Core i5-1035G1 @ 1.00GHz",
    ram: "8 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 10 Pro",
    kondisi: "Baik",
  },
  "Laptop 2": {
    prosesor: "Intel Core i5-8265U @ 1.60GHz",
    ram: "8 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 3": {
    prosesor: "AMD Ryzen 5 4500U @ 2.30GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 4": {
    prosesor: "Intel Core i7-1165G7 @ 2.80GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 5": {
    prosesor: "Intel Core i5-10210U @ 1.60GHz",
    ram: "8 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Pro",
    kondisi: "Cukup",
  },
  "Laptop 6": {
    prosesor: "AMD Ryzen 7 5700U @ 1.80GHz",
    ram: "16 GB DDR4",
    penyimpanan: "1 TB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 7": {
    prosesor: "Intel Core i3-10110U @ 2.10GHz",
    ram: "4 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Home",
    kondisi: "Cukup",
  },
  "Laptop 8": {
    prosesor: "Intel Core i7-10750H @ 2.60GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 9": {
    prosesor: "Intel Core i5-1135G7 @ 2.40GHz",
    ram: "8 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 10": {
    prosesor: "AMD Ryzen 3 3250U @ 2.60GHz",
    ram: "4 GB DDR4",
    penyimpanan: "128 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Home",
    kondisi: "Rusak",
  },
};

export default function PeminjamanLaptop() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [formData, setFormData] = useState({
    itemDipilih: "",
    nama: "",
    nim: "",
    email: "",
    noWhatsapp: "",
    dosenPembimbing: "",
    judulSkripsi: "",
    abstrak: "",
    alasanPeminjaman: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      nama: user?.displayName ?? "",
      nim: user?.uid ?? "",
      email: user?.email ?? "",
    }));
  }, [user]);

  // Laptop dropdown — fetched AVAILABLE assets.
  const [laptops, setLaptops] = useState<BackendAsset[]>([]);
  const [laptopsLoading, setLaptopsLoading] = useState(true);
  const [laptopsError, setLaptopsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLaptopsLoading(true);
    setLaptopsError(null);
    fetch(`${API_BASE}/api/assets?status=AVAILABLE`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as AssetListResponse;
      })
      .then((data) => {
        if (!cancelled) setLaptops(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setLaptopsError(
            err instanceof Error ? err.message : "Gagal memuat daftar laptop",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLaptopsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Riwayat — own loans.
  const [riwayat, setRiwayat] = useState<LoanRecord[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [riwayatError, setRiwayatError] = useState<string | null>(null);

  useEffect(() => {
    if (currentView !== "riwayat" && currentView !== "aktif") return;
    if (!user?.dbUser?.id) return;
    let cancelled = false;
    setRiwayatLoading(true);
    setRiwayatError(null);
    fetch(
      `${API_BASE}/api/loans?userId=${encodeURIComponent(user.dbUser.id)}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as LoanListResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setRiwayat(
          data.items.map((l) => {
            const stages = deriveLoanStages(l.status);
            return {
              id: l.id,
              tanggalPengajuan: formatDate(l.createdAt),
              item: l.asset
                ? `${l.asset.code} — ${l.asset.name}`
                : "-",
              persetujuanDosen: stages.dosen,
              persetujuanKalab: stages.kalab,
              status: stages.statusLabel,
              rawStatus: l.status,
              keterangan: l.notes ?? "-",
            };
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setRiwayatError(
            err instanceof Error ? err.message : "Gagal memuat riwayat",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRiwayatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentView, user?.dbUser?.id]);

  const riwayatAktif = riwayat.filter((r) => !FINAL_STATUSES.includes(r.rawStatus));
  const riwayatFinal = riwayat.filter((r) => FINAL_STATUSES.includes(r.rawStatus));
  // Daftar dosen — diambil dari /api/users?role=DOSEN (diseed dari
  // data dosen Lab Statistika). Endpoint ini terbuka untuk semua user
  // ter-autentikasi, khusus kalau filter role=DOSEN.
  interface DosenOption {
    id: string;
    displayName: string;
  }
  const [dosenList, setDosenList] = useState<DosenOption[]>([]);
  const [dosenLoading, setDosenLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDosenLoading(true);
    fetch(`${API_BASE}/api/users?role=DOSEN&take=200`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as {
          items: Array<{ id: string; displayName: string }>;
        };
      })
      .then((data) => {
        if (!cancelled) {
          setDosenList(
            data.items.map((u) => ({ id: u.id, displayName: u.displayName })),
          );
        }
      })
      .catch((err) => {
        console.error("[dosenList]", err);
      })
      .finally(() => {
        if (!cancelled) setDosenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Resolve assetId dari kode laptop yang dipilih.
    const asset = laptops.find((a) => a.code === formData.itemDipilih);
    if (!asset) {
      await alert("Pilih laptop terlebih dahulu.");
      return;
    }
    if (!formData.dosenPembimbing) {
      await alert("Pilih dosen pembimbing.");
      return;
    }

    // Default durasi peminjaman: hari ini + 14 hari. Laboran bisa sesuaikan
    // saat serah terima / extend.
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/loans`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          lecturerId: formData.dosenPembimbing,
          type: "TA",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          thesisTitle: formData.judulSkripsi || undefined,
          thesisAbstract: formData.abstrak || undefined,
          notes: formData.alasanPeminjaman || undefined,
          waNumber: formData.noWhatsapp || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      await alert(
        "Pengajuan peminjaman berhasil dikirim!\n\n" +
          "Notifikasi telah dikirim ke dosen pembimbing untuk persetujuan.",
        { title: "Berhasil" },
      );
      setFormData((prev) => ({
        ...prev,
        itemDipilih: "",
        noWhatsapp: "",
        dosenPembimbing: "",
        judulSkripsi: "",
        abstrak: "",
        alasanPeminjaman: "",
      }));
      setCurrentView("riwayat");
    } catch (err) {
      await alert(
        `Gagal mengirim permohonan: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (currentView === "peminjaman-baru") {
      const selectedAsset =
        formData.itemDipilih
          ? laptops.find((a) => a.code === formData.itemDipilih) ?? null
          : null;
      
      return (
        <form onSubmit={handleSubmit} className="w-full max-w-3xl">
          <div className="space-y-6">
            {/* Item Dipilih - Two Column Layout (stacks on mobile) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Dipilih <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                {/* Left: Dropdown */}
                <div className="w-full md:w-[180px] md:flex-shrink-0">
                  <select
                    name="itemDipilih"
                    value={formData.itemDipilih}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {laptopsLoading
                        ? "Memuat..."
                        : laptopsError
                        ? "Gagal memuat"
                        : laptops.length === 0
                        ? "Tidak ada laptop tersedia"
                        : "Pilih Laptop"}
                    </option>
                    {laptops.map((a) => (
                      <option key={a.id} value={a.code}>
                        {a.code} — {a.name}
                      </option>
                    ))}
                  </select>
                  {laptopsError && (
                    <p className="text-xs text-red-600 mt-1">
                      {laptopsError}
                    </p>
                  )}
                </div>

                {/* Right: Info Card */}
                <div className="flex-1">
                  {!selectedAsset ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center text-gray-400 text-sm h-full min-h-[120px]">
                      Pilih laptop untuk melihat info
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-blue-800">
                          {selectedAsset.code}
                        </span>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            selectedAsset.condition === "GOOD"
                              ? "bg-green-100 text-green-800"
                              : selectedAsset.condition === "MINOR_DAMAGE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {conditionLabel[selectedAsset.condition]}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-blue-900">
                        {selectedAsset.name}
                      </div>
                      {selectedAsset.description && (
                        <div className="mt-2 text-sm text-blue-900/80 whitespace-pre-wrap">
                          {selectedAsset.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DATA PEMINJAM - Read-only Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-4">
                DATA PEMINJAM
              </div>
              <div className="space-y-4">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* NIM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nim"
                    value={formData.nim}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Helper Text */}
              <p className="text-xs text-gray-400 mt-4 flex items-start gap-1">
                <span>ℹ</span>
                <span>Data diisi otomatis berdasarkan akun yang sedang login.</span>
              </p>
            </div>

            {/* No Whatsapp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No Whatsapp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="noWhatsapp"
                value={formData.noWhatsapp}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Dosen Pembimbing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosen Pembimbing <span className="text-red-500">*</span>
              </label>
              <select
                name="dosenPembimbing"
                value={formData.dosenPembimbing}
                onChange={handleInputChange}
                required
                disabled={dosenLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">
                  {dosenLoading ? "Memuat daftar dosen..." : "Pilih Dosen Pembimbing"}
                </option>
                {dosenList.map((dosen) => (
                  <option key={dosen.id} value={dosen.id}>
                    {dosen.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Judul Skripsi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Skripsi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="judulSkripsi"
                value={formData.judulSkripsi}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan judul skripsi"
              />
            </div>

            {/* Abstrak */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abstrak <span className="text-red-500">*</span>
              </label>
              <textarea
                name="abstrak"
                value={formData.abstrak}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Masukkan abstrak skripsi"
              />
            </div>

            {/* Alasan Peminjaman */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Peminjaman <span className="text-red-500">*</span>
              </label>
              <textarea
                name="alasanPeminjaman"
                value={formData.alasanPeminjaman}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Jelaskan alasan peminjaman laptop"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? "Mengirim..." : "Submit Pengajuan"}
              </button>
            </div>
          </div>
        </form>
      );
    }

    if (currentView === "aktif" || currentView === "riwayat") {
      const records = currentView === "aktif" ? riwayatAktif : riwayatFinal;
      const emptyLabel =
        currentView === "aktif"
          ? "Tidak ada peminjaman yang sedang berjalan."
          : "Belum ada riwayat peminjaman laptop.";
      if (riwayatLoading) {
        return (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memuat data…</span>
          </div>
        );
      }
      if (riwayatError) {
        return (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Gagal memuat data</p>
              <p className="text-sm">{riwayatError}</p>
            </div>
          </div>
        );
      }
      if (records.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">{emptyLabel}</div>
        );
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tanggal Pengajuan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Item
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Persetujuan Dosen
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Persetujuan Kalab
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalPengajuan}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{record.item}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.persetujuanDosen === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : record.persetujuanDosen === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.persetujuanDosen}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {record.persetujuanKalab !== "-" ? (
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          record.persetujuanKalab === "Disetujui"
                            ? "bg-green-100 text-green-800"
                            : record.persetujuanKalab === "Ditolak"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {record.persetujuanKalab}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === "Aktif"
                          ? "bg-blue-100 text-blue-800"
                          : record.status === "Selesai"
                          ? "bg-gray-100 text-gray-800"
                          : record.status === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 max-w-xs">
                    {record.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default landing page with centered button
    return (
      <div className="max-w-md">
        {/* Icon Container */}
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
          <Laptop className="w-11 h-11 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-gray-900 text-xl mb-1">Peminjaman Laptop</h2>
        <p className="text-sm text-gray-500 mb-5">Peminjaman Laptop Tugas Akhir</p>
        
        {/* Button */}
        <button
          onClick={() => setCurrentView("peminjaman-baru")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Peminjaman Laptop
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Peminjaman Laptop"
      breadcrumbs={[{ label: "Peminjaman Laptop" }]}
      icon={<Laptop className="w-8 h-8 text-white" />}
      sidebarItems={['Peminjaman Baru', 'Peminjaman Aktif', 'Riwayat']}
      onSidebarItemClick={(item) => {
        if (item === "Peminjaman Baru") setCurrentView("peminjaman-baru");
        else if (item === "Peminjaman Aktif") setCurrentView("aktif");
        else if (item === "Riwayat") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "peminjaman-baru" ? "Peminjaman Baru" :
        currentView === "aktif" ? "Peminjaman Aktif" :
        currentView === "riwayat" ? "Riwayat" :
        undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}