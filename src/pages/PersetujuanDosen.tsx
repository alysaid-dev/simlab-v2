import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { UserCheck, X, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "../lib/apiFetch";

type View = "permohonan-persetujuan" | "riwayat-persetujuan";

interface PermohonanRecord {
  id: string;
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  judulTA: string;
  abstrak: string;
  alasan: string;
}

interface RiwayatRecord {
  nama: string;
  nim: string;
  tindakan: string;
  tanggalDisetujui: string;
  keterangan: string;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendLoanStatus =
  | "PENDING"
  | "APPROVED_BY_DOSEN"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "RETURNED"
  | "OVERDUE"
  | "CANCELLED";

interface BackendLoan {
  id: string;
  status: BackendLoanStatus;
  thesisTitle: string | null;
  thesisAbstract: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  borrower?: { id: string; displayName: string; uid: string };
  asset?: { id: string; name: string; code: string };
}

interface LoanListResponse {
  items: BackendLoan[];
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

function statusToTindakan(status: BackendLoanStatus): string {
  switch (status) {
    case "APPROVED_BY_DOSEN":
    case "APPROVED":
    case "ACTIVE":
    case "RETURNED":
    case "OVERDUE":
      return "Disetujui";
    case "REJECTED":
      return "Ditolak";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return "-";
  }
}

export default function PersetujuanDosen() {
  const { user } = useAuth();
  const lecturerId = user?.dbUser?.id ?? null;
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  // Super Admin lihat semua bimbingan (oversight). Dosen biasa: hanya miliknya.
  const loansQuery = isSuperAdmin
    ? `take=200`
    : `lecturerId=${encodeURIComponent(lecturerId ?? "")}&take=200`;
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTindakanModal, setShowTindakanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PermohonanRecord | null>(null);
  const [tindakanForm, setTindakanForm] = useState({
    tindakan: "",
    keterangan: "",
  });

  const [allLoans, setAllLoans] = useState<BackendLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState<string | null>(null);

  // Hanya tampilkan permohonan yang lecturerId-nya = user yang sedang login.
  // Dosen lain tidak akan melihat bimbingan yang bukan miliknya.
  useEffect(() => {
    if (!lecturerId && !isSuperAdmin) {
      setLoansLoading(false);
      return;
    }
    let cancelled = false;
    setLoansLoading(true);
    setLoansError(null);
    apiFetch(
      `${API_BASE}/api/loans?${loansQuery}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as LoanListResponse;
      })
      .then((data) => {
        if (!cancelled) setAllLoans(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoansError(
            err instanceof Error ? err.message : "Gagal memuat data persetujuan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lecturerId, isSuperAdmin, loansQuery]);

  const permohonanData: PermohonanRecord[] = allLoans
    .filter((l) => l.status === "PENDING")
    .map((l) => ({
      id: l.id,
      tanggalPengajuan: formatDateFull(l.createdAt),
      namaMahasiswa: l.borrower?.displayName ?? "-",
      nim: l.borrower?.uid ?? "-",
      judulTA: l.thesisTitle ?? "-",
      abstrak: l.thesisAbstract ?? "-",
      alasan: l.notes ?? "-",
    }));

  const [submitting, setSubmitting] = useState(false);

  const refetchLoans = () => {
    if (!lecturerId && !isSuperAdmin) return;
    apiFetch(
      `${API_BASE}/api/loans?${loansQuery}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as LoanListResponse;
      })
      .then((data) => setAllLoans(data.items))
      .catch((err) => {
        console.error("[refetchLoans]", err);
      });
  };

  const riwayatData: RiwayatRecord[] = allLoans
    .filter((l) => l.status !== "PENDING")
    .map((l) => ({
      nama: l.borrower?.displayName ?? "-",
      nim: l.borrower?.uid ?? "-",
      tindakan: statusToTindakan(l.status),
      tanggalDisetujui: formatDateFull(l.updatedAt),
      keterangan: l.notes ?? "-",
    }));

  const handleDetailClick = (record: PermohonanRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleTindakanClick = (record: PermohonanRecord) => {
    setSelectedRecord(record);
    setShowTindakanModal(true);
  };

  const handleTindakanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    // Dosen approval hanya menggeser ke APPROVED_BY_DOSEN — final APPROVED
    // adalah wewenang Kepala Lab.
    const nextStatus =
      tindakanForm.tindakan === "Setujui" ? "APPROVED_BY_DOSEN" : "REJECTED";
    setSubmitting(true);
    try {
      const res = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(selectedRecord.id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert(
        `Permohonan ${selectedRecord.namaMahasiswa} telah ${
          tindakanForm.tindakan === "Setujui" ? "disetujui" : "ditolak"
        }`,
      );
      setShowTindakanModal(false);
      setTindakanForm({ tindakan: "", keterangan: "" });
      refetchLoans();
    } catch (err) {
      alert(
        `Gagal memproses tindakan: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (currentView && loansLoading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data persetujuan…</span>
        </div>
      );
    }
    if (currentView && loansError) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat data persetujuan</p>
            <p className="text-sm">{loansError}</p>
          </div>
        </div>
      );
    }

    if (currentView === "permohonan-persetujuan") {
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
                {permohonanData.map((record, index) => (
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
                        Judul TA
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.judulTA}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Abstrak
                      </label>
                      <textarea
                        value={selectedRecord.abstrak}
                        readOnly
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan
                      </label>
                      <textarea
                        value={selectedRecord.alasan}
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

    if (currentView === "riwayat-persetujuan") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Nama
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  NIM
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tindakan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tanggal Disetujui
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {riwayatData.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{record.nama}</td>
                  <td className="py-3 px-4 text-gray-700">{record.nim}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.tindakan === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.tindakan}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalDisetujui}
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
  };

  return (
    <PageLayout
      title="Persetujuan Dosen"
      breadcrumbs={[{ label: "Persetujuan Dosen" }]}
      icon={<UserCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Permohonan Persetujuan", "Riwayat Persetujuan"]}
      onSidebarItemClick={(item) => {
        if (item === "Permohonan Persetujuan") {
          setCurrentView("permohonan-persetujuan");
        } else if (item === "Riwayat Persetujuan") {
          setCurrentView("riwayat-persetujuan");
        }
      }}
      activeItem={
        currentView === "permohonan-persetujuan"
          ? "Permohonan Persetujuan"
          : currentView === "riwayat-persetujuan"
          ? "Riwayat Persetujuan"
          : undefined
      }
      hideHeader={!currentView}
    >
      {currentView ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center mb-3">
            <UserCheck className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Persetujuan Dosen</h2>
          <p className="text-sm text-gray-500 mb-5">Persetujuan peminjaman oleh dosen</p>
          
          {/* Button */}
          <button
            onClick={() => setCurrentView("permohonan-persetujuan")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Persetujuan Dosen
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}