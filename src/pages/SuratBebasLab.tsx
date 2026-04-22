import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { FileCheck, Download, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDialog } from "../lib/dialog";

type View = "pengajuan" | "riwayat";

interface ObligationLoan {
  id: string;
  assetName: string;
  status: string;
  endDate: string;
}

interface ObligationEquipmentLoan {
  id: string;
  status: string;
  createdAt: string;
}

interface ObligationsResponse {
  hasObligations: boolean;
  details: {
    loans: ObligationLoan[];
    equipmentLoans: ObligationEquipmentLoan[];
  };
  message: string;
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
  approvedBy: string | null;
  approvedAt: string | null;
  documentPath: string | null;
  qrHash: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; displayName: string; uid: string };
  approver?: { id: string; displayName: string } | null;
}

interface ClearanceListResponse {
  items: BackendClearance[];
  total: number;
  skip: number;
  take: number;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

function deriveStageLabels(status: BackendClearanceStatus): {
  laboran: string;
  kalab: string;
} {
  switch (status) {
    case "PENDING_LABORAN":
      return { laboran: "Menunggu", kalab: "-" };
    case "PENDING_KEPALA_LAB":
      return { laboran: "Disetujui", kalab: "Menunggu" };
    case "APPROVED":
      return { laboran: "Disetujui", kalab: "Disetujui" };
    case "REJECTED":
    case "DRAFT":
    case "SUBMITTED":
    case "PENDING_LECTURER":
    default:
      return { laboran: "-", kalab: "-" };
  }
}

function deriveStatusLabel(status: BackendClearanceStatus): string {
  if (status === "APPROVED") return "Selesai";
  if (status === "REJECTED") return "Ditolak";
  return "Menunggu";
}

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

interface SuratRecord {
  id: string;
  tanggalPengajuan: string;
  persetujuanLaboran: string;
  persetujuanKalab: string;
  status: string;
  keterangan: string;
  documentPath: string | null;
}

export default function SuratBebasLab() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [formData, setFormData] = useState({
    nama: "",
    nim: "",
    email: "",
    tanggalSidang: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      nama: user?.displayName ?? "",
      nim: user?.uid ?? "",
      email: user?.email ?? "",
    }));
  }, [user]);

  // Riwayat — fetch user's own clearances when tab is opened.
  const [riwayat, setRiwayat] = useState<SuratRecord[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [riwayatError, setRiwayatError] = useState<string | null>(null);

  useEffect(() => {
    if (currentView !== "riwayat") return;
    if (!user?.dbUser?.id) return;
    let cancelled = false;
    setRiwayatLoading(true);
    setRiwayatError(null);
    fetch(
      `${API_BASE}/api/clearances?userId=${encodeURIComponent(user.dbUser.id)}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ClearanceListResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setRiwayat(
          data.items.map((c) => {
            const stages = deriveStageLabels(c.status);
            return {
              id: c.id,
              tanggalPengajuan: formatDate(c.createdAt),
              persetujuanLaboran: stages.laboran,
              persetujuanKalab: stages.kalab,
              status: deriveStatusLabel(c.status),
              keterangan: c.notes ?? "-",
              documentPath: c.documentPath,
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

  // Obligations gate — user tidak boleh mengajukan surat bebas lab
  // selama masih punya peminjaman aktif.
  const [obligations, setObligations] = useState<ObligationsResponse | null>(null);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [obligationsError, setObligationsError] = useState<string | null>(null);

  useEffect(() => {
    if (currentView !== "pengajuan") return;
    let cancelled = false;
    setObligationsLoading(true);
    setObligationsError(null);
    fetch(`${API_BASE}/api/users/me/obligations`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ObligationsResponse;
      })
      .then((data) => {
        if (!cancelled) setObligations(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setObligationsError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data tanggungan"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setObligationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentView]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/clearances`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: formData.tanggalSidang
            ? `Tanggal sidang: ${formData.tanggalSidang}`
            : undefined,
          tanggalSidang: formData.tanggalSidang || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(errBody?.message ?? `HTTP ${res.status}`);
      }
      await alert("Pengajuan Surat Bebas Lab berhasil dikirim!", { title: "Berhasil" });
      setFormData((prev) => ({ ...prev, tanggalSidang: "" }));
      // Refresh obligations sekaligus (kalau ada tanggungan baru muncul
      // karena race — biar UI akurat).
      setObligations(null);
      setCurrentView("riwayat");
    } catch (err) {
      await alert(
        `Gagal mengirim pengajuan: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (recordId: string) => {
    window.open(
      `${API_BASE}/api/clearances/${encodeURIComponent(recordId)}/download`,
      "_blank",
    );
  };

  const renderContent = () => {
    if (currentView === "pengajuan") {
      const isBlocked = obligations?.hasObligations === true;
      const isReady = obligations !== null && !obligations.hasObligations;

      return (
        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="space-y-6">
            {obligationsLoading && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memeriksa tanggungan aktif…</span>
              </div>
            )}

            {obligationsError && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Gagal memuat data tanggungan</p>
                  <p className="text-sm">{obligationsError}</p>
                </div>
              </div>
            )}

            {isBlocked && obligations && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">
                      Anda masih memiliki tanggungan aktif yang belum diselesaikan
                    </p>
                    <p className="text-sm text-red-800 mt-1">
                      {obligations.message}
                    </p>
                  </div>
                </div>

                {obligations.details.loans.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      Peminjaman Laptop
                    </p>
                    <ul className="space-y-1 text-sm text-red-800">
                      {obligations.details.loans.map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-wrap gap-2 items-center"
                        >
                          <span className="font-medium">{l.assetName}</span>
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                            {l.status}
                          </span>
                          <span className="text-red-700">
                            jatuh tempo {formatDate(l.endDate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {obligations.details.equipmentLoans.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-red-900 mb-2">
                      Peminjaman Peralatan
                    </p>
                    <ul className="space-y-1 text-sm text-red-800">
                      {obligations.details.equipmentLoans.map((el) => (
                        <li
                          key={el.id}
                          className="flex flex-wrap gap-2 items-center"
                        >
                          <span className="font-medium">#{el.id.slice(0, 8)}</span>
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs">
                            {el.status}
                          </span>
                          <span className="text-red-700">
                            diajukan {formatDate(el.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isReady && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Tidak ada tanggungan aktif
                </span>
              </div>
            )}

            <fieldset
              disabled={isBlocked}
              className="space-y-6 m-0 p-0 border-0 min-w-0 disabled:opacity-60"
            >
            {/* Nama (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* NIM (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nim"
                value={formData.nim}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* Email (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* Tanggal Sidang */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Sidang <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggalSidang"
                value={formData.tanggalSidang}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            </fieldset>

            {/* Submit Button — disembunyikan kalau user punya tanggungan. */}
            {!isBlocked && (
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={obligationsLoading || !!obligationsError || submitting}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? "Mengirim..." : "Submit Pengajuan"}
                </button>
              </div>
            )}
          </div>
        </form>
      );
    }

    if (currentView === "riwayat") {
      if (riwayatLoading) {
        return (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memuat riwayat pengajuan…</span>
          </div>
        );
      }
      if (riwayatError) {
        return (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Gagal memuat riwayat</p>
              <p className="text-sm">{riwayatError}</p>
            </div>
          </div>
        );
      }
      if (riwayat.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            Belum ada riwayat pengajuan surat bebas lab.
          </div>
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
                  Persetujuan Laboran
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
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Unduh Surat
                </th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((record) => (
                <tr key={record.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalPengajuan}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.persetujuanLaboran === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : record.persetujuanLaboran === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.persetujuanLaboran}
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
                        record.status === "Selesai"
                          ? "bg-green-100 text-green-800"
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
                  <td className="py-3 px-4">
                    {record.status === "Selesai" ? (
                      <button
                        onClick={() => handleDownload(record.id)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Unduh
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default landing page
    return (
      <div className="max-w-md">
        {/* Icon Container */}
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center mb-3">
          <FileCheck className="w-11 h-11 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-gray-900 text-xl mb-1">Surat Bebas Lab</h2>
        <p className="text-sm text-gray-500 mb-5">Pengajuan surat keterangan bebas lab</p>
        
        {/* Button */}
        <button
          onClick={() => setCurrentView("pengajuan")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Surat Bebas Lab
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Surat Bebas Lab"
      breadcrumbs={[{ label: "Surat Bebas Lab" }]}
      icon={<FileCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Pengajuan", "Riwayat Pengajuan"]}
      onSidebarItemClick={(item) => {
        if (item === "Pengajuan") setCurrentView("pengajuan");
        else if (item === "Riwayat Pengajuan") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "pengajuan" ? "Pengajuan" :
        currentView === "riwayat" ? "Riwayat Pengajuan" :
        undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}