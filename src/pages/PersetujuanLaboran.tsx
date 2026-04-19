import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { ClipboardCheck, X, Construction, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type View = "peminjaman-ruangan" | "bebas-lab";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendReservationStatus =
  | "PENDING"
  | "CHECKED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

interface BackendReservation {
  id: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BackendReservationStatus;
  notes: string | null;
  createdAt: string;
  user?: { displayName: string; uid: string; email: string };
  room?: { name: string; code: string };
}

type BackendClearanceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_LECTURER"
  | "PENDING_KEPALA_LAB"
  | "PENDING_LABORAN"
  | "APPROVED"
  | "REJECTED";

interface BackendClearance {
  id: string;
  userId: string;
  status: BackendClearanceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; displayName: string; uid: string; email?: string };
}

interface ClearanceListResponse {
  items: BackendClearance[];
  total: number;
  skip: number;
  take: number;
}

function formatDateFull(iso: string): string {
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

interface PeminjamanRuanganRecord {
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  email: string;
  ruangan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keperluan: string;
}

interface BebasLabRecord {
  id: string;
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  email: string;
  tanggalSidang: string;
}

export default function PersetujuanLaboran() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTindakanModal, setShowTindakanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [tindakanForm, setTindakanForm] = useState({
    tindakan: "",
    keterangan: "",
  });

  // Mock data for Peminjaman Ruangan
  const peminjamanRuanganData: PeminjamanRuanganRecord[] = [
    {
      tanggalPengajuan: "22 Januari 2025",
      namaMahasiswa: "Anggit Wicaksono",
      nim: "201001113",
      email: "201001113@uii.ac.id",
      ruangan: "Lab SD",
      tanggalMulai: "2025-01-25 09:00",
      tanggalSelesai: "2025-01-25 12:00",
      keperluan: "Pelaksanaan praktikum Statistika untuk mahasiswa semester 4",
    },
    {
      tanggalPengajuan: "21 Januari 2025",
      namaMahasiswa: "Aly Rahman",
      nim: "201001114",
      email: "201001114@uii.ac.id",
      ruangan: "Lab MRK",
      tanggalMulai: "2025-01-26 13:00",
      tanggalSelesai: "2025-01-26 16:00",
      keperluan: "Workshop analisis data untuk organisasi mahasiswa",
    },
    {
      tanggalPengajuan: "20 Januari 2025",
      namaMahasiswa: "Rizal Pratama",
      nim: "201001115",
      email: "201001115@uii.ac.id",
      ruangan: "Lab BIS",
      tanggalMulai: "2025-01-27 10:00",
      tanggalSelesai: "2025-01-27 14:00",
      keperluan: "Presentasi hasil penelitian kelompok",
    },
  ];

  // Bebas Lab — fetched from /api/clearances (PENDING_LABORAN stage).
  const [pendingClearances, setPendingClearances] = useState<BackendClearance[]>(
    [],
  );
  const [clearancesLoading, setClearancesLoading] = useState(true);
  const [clearancesError, setClearancesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClearances = () => {
    setClearancesLoading(true);
    setClearancesError(null);
    return fetch(
      `${API_BASE}/api/clearances?status=PENDING_LABORAN`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ClearanceListResponse;
      })
      .then((data) => setPendingClearances(data.items))
      .catch((err) => {
        setClearancesError(
          err instanceof Error ? err.message : "Gagal memuat data",
        );
      })
      .finally(() => setClearancesLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setClearancesLoading(true);
    setClearancesError(null);
    fetch(`${API_BASE}/api/clearances?status=PENDING_LABORAN`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ClearanceListResponse;
      })
      .then((data) => {
        if (!cancelled) setPendingClearances(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setClearancesError(
            err instanceof Error ? err.message : "Gagal memuat data",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setClearancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reservations awaiting Laboran check (status=PENDING).
  const [pendingReservations, setPendingReservations] = useState<
    BackendReservation[]
  >([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(
    null,
  );

  const fetchReservations = () => {
    setReservationsLoading(true);
    setReservationsError(null);
    return fetch(`${API_BASE}/api/reservations?status=PENDING`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as {
          items: BackendReservation[];
          total: number;
        };
      })
      .then((data) => setPendingReservations(data.items))
      .catch((err) => {
        setReservationsError(
          err instanceof Error ? err.message : "Gagal memuat",
        );
      })
      .finally(() => setReservationsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setReservationsLoading(true);
    setReservationsError(null);
    fetch(`${API_BASE}/api/reservations?status=PENDING`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as {
          items: BackendReservation[];
          total: number;
        };
      })
      .then((data) => {
        if (!cancelled) setPendingReservations(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setReservationsError(
            err instanceof Error ? err.message : "Gagal memuat",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReservationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReservationAction = async (
    id: string,
    setuju: boolean,
  ) => {
    if (
      !confirm(
        setuju
          ? "Setujui reservasi ini dan teruskan ke Kepala Lab?"
          : "Tolak reservasi ini?",
      )
    )
      return;
    const status = setuju ? "CHECKED" : "REJECTED";
    try {
      const res = await fetch(
        `${API_BASE}/api/reservations/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      void fetchReservations();
    } catch (err) {
      alert(
        `Gagal: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const bebasLabData: BebasLabRecord[] = pendingClearances.map((c) => ({
    id: c.id,
    tanggalPengajuan: formatDateFull(c.createdAt),
    namaMahasiswa: c.user?.displayName ?? "-",
    nim: c.user?.uid ?? "-",
    email: c.user?.email ?? "-",
    tanggalSidang: "-", // tidak tersimpan di model
  }));

  const handleDetailClick = (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleTindakanClick = (record: any) => {
    setSelectedRecord(record);
    setShowTindakanModal(true);
  };

  const handleTindakanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord?.id) return;
    // Laboran approves Bebas Lab: PENDING_LABORAN → APPROVED (setujui) or REJECTED (tolak).
    const nextStatus =
      tindakanForm.tindakan === "Setujui" ? "APPROVED" : "REJECTED";
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/clearances/${encodeURIComponent(selectedRecord.id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            notes: tindakanForm.keterangan || undefined,
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert(
        `Permohonan dari ${selectedRecord.namaMahasiswa} telah ${
          tindakanForm.tindakan === "Setujui" ? "disetujui" : "ditolak"
        }`,
      );
      setShowTindakanModal(false);
      setTindakanForm({ tindakan: "", keterangan: "" });
      void fetchClearances();
    } catch (err) {
      alert(
        `Gagal memproses: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (currentView === "peminjaman-ruangan") {
      if (reservationsLoading) {
        return (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memuat reservasi ruangan…</span>
          </div>
        );
      }
      if (reservationsError) {
        return (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Gagal memuat</p>
              <p className="text-sm">{reservationsError}</p>
            </div>
          </div>
        );
      }
      if (pendingReservations.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            Tidak ada reservasi menunggu pemeriksaan.
          </div>
        );
      }
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Pemohon
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ruangan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Waktu
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Keperluan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingReservations.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">
                      {r.user?.displayName ?? "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.user?.uid ?? "-"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {r.room?.name ?? "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(r.startTime).toLocaleString("id-ID")}
                    <br />
                    s/d {new Date(r.endTime).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 text-gray-700 max-w-xs truncate">
                    {r.purpose}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReservationAction(r.id, true)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Periksa & Teruskan
                      </button>
                      <button
                        onClick={() => handleReservationAction(r.id, false)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (currentView === "bebas-lab" && clearancesLoading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat permohonan surat bebas lab…</span>
        </div>
      );
    }
    if (currentView === "bebas-lab" && clearancesError) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat</p>
            <p className="text-sm">{clearancesError}</p>
          </div>
        </div>
      );
    }

    if (false && currentView === "peminjaman-ruangan") {
      return (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Tanggal Pengajuan
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Nama Mahasiswa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Detail
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Persetujuan
                  </th>
                </tr>
              </thead>
              <tbody>
                {peminjamanRuanganData.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {record.tanggalPengajuan}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {record.namaMahasiswa}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDetailClick(record)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Lihat Detail
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {isSuperAdmin ? (
                        <span className="text-xs text-gray-400 italic">View-only</span>
                      ) : (
                        <button
                          onClick={() => handleTindakanClick(record)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Tindakan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Detail Permohonan
                    </h3>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.namaMahasiswa}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIM
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.nim}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aset yang Dipinjam
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.ruangan}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Pinjam
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalMulai}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Kembali
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalSelesai}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan Peminjaman
                      </label>
                      <textarea
                        value={selectedRecord.keperluan}
                        readOnly
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tindakan Modal */}
          {showTindakanModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Tindakan Persetujuan
                    </h3>
                    <button
                      onClick={() => {
                        setShowTindakanModal(false);
                        setTindakanForm({ tindakan: "", keterangan: "" });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleTindakanSubmit} className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Permohonan dari: <span className="font-semibold">{selectedRecord.namaMahasiswa}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tindakan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={tindakanForm.tindakan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, tindakan: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pilih Tindakan</option>
                        <option value="Setujui">Setujui</option>
                        <option value="Tolak">Tolak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keterangan
                      </label>
                      <textarea
                        value={tindakanForm.keterangan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, keterangan: e.target.value })
                        }
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tambahkan keterangan (opsional)"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTindakanModal(false);
                          setTindakanForm({ tindakan: "", keterangan: "" });
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !tindakanForm.tindakan}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Memproses..." : "Submit"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (currentView === "bebas-lab") {
      return (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Tanggal Pengajuan
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Nama Mahasiswa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Detail
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Persetujuan
                  </th>
                </tr>
              </thead>
              <tbody>
                {bebasLabData.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {record.tanggalPengajuan}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {record.namaMahasiswa}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDetailClick(record)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Lihat Detail
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {isSuperAdmin ? (
                        <span className="text-xs text-gray-400 italic">View-only</span>
                      ) : (
                        <button
                          onClick={() => handleTindakanClick(record)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Tindakan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Detail Permohonan
                    </h3>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.namaMahasiswa}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIM
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.nim}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Sidang
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalSidang}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tindakan Modal */}
          {showTindakanModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Tindakan Persetujuan
                    </h3>
                    <button
                      onClick={() => {
                        setShowTindakanModal(false);
                        setTindakanForm({ tindakan: "", keterangan: "" });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleTindakanSubmit} className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Permohonan dari: <span className="font-semibold">{selectedRecord.namaMahasiswa}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tindakan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={tindakanForm.tindakan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, tindakan: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pilih Tindakan</option>
                        <option value="Setujui">Setujui</option>
                        <option value="Tolak">Tolak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keterangan
                      </label>
                      <textarea
                        value={tindakanForm.keterangan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, keterangan: e.target.value })
                        }
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tambahkan keterangan (opsional)"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTindakanModal(false);
                          setTindakanForm({ tindakan: "", keterangan: "" });
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !tindakanForm.tindakan}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Memproses..." : "Submit"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  };

  return (
    <PageLayout
      title="Persetujuan Laboran"
      breadcrumbs={[{ label: "Persetujuan Laboran" }]}
      icon={<ClipboardCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Peminjaman Ruangan", "Bebas Lab"]}
      onSidebarItemClick={(item) => {
        if (item === "Peminjaman Ruangan") {
          setCurrentView("peminjaman-ruangan");
        } else if (item === "Bebas Lab") {
          setCurrentView("bebas-lab");
        }
      }}
      activeItem={
        currentView === "peminjaman-ruangan"
          ? "Peminjaman Ruangan"
          : currentView === "bebas-lab"
          ? "Bebas Lab"
          : undefined
      }
      hideHeader={!currentView}
    >
      {currentView ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-teal-600 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
            <ClipboardCheck className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Persetujuan Laboran</h2>
          <p className="text-sm text-gray-500 mb-5">Persetujuan oleh Laboran</p>
          
          {/* Button */}
          <button
            onClick={() => setCurrentView("peminjaman-ruangan")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Persetujuan Laboran
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}
