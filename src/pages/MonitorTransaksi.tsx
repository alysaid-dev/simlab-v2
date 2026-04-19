import { useEffect, useMemo, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { ShieldCheck, Loader2, AlertTriangle, Ban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router";

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
  type: "TA" | "PRACTICUM";
  startDate: string;
  endDate: string;
  createdAt: string;
  borrower?: { id: string; displayName: string; uid: string };
  asset?: { id: string; name: string; code: string };
  lecturer?: { id: string; displayName: string } | null;
}

interface LoanListResponse {
  items: BackendLoan[];
  total: number;
  skip: number;
  take: number;
}

const STATUS_LABEL: Record<BackendLoanStatus, string> = {
  PENDING: "Menunggu Dosen",
  APPROVED_BY_DOSEN: "Menunggu Kalab",
  APPROVED: "Disetujui",
  ACTIVE: "Aktif",
  RETURNED: "Selesai",
  OVERDUE: "Terlambat",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

const STATUS_COLOR: Record<BackendLoanStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED_BY_DOSEN: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  ACTIVE: "bg-blue-100 text-blue-800",
  RETURNED: "bg-gray-100 text-gray-700",
  OVERDUE: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

const UNFINISHED: BackendLoanStatus[] = [
  "PENDING",
  "APPROVED_BY_DOSEN",
  "APPROVED",
  "ACTIVE",
  "OVERDUE",
];

type FilterTab = "unfinished" | "all";

function formatDate(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MonitorTransaksi() {
  const { user, loading: authLoading } = useAuth();
  const [loans, setLoans] = useState<BackendLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("unfinished");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/loans?take=200`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as LoanListResponse;
      })
      .then((data) => {
        if (!cancelled) setLoans(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, refreshKey]);

  const filtered = useMemo(() => {
    if (filter === "unfinished") {
      return loans.filter((l) => UNFINISHED.includes(l.status));
    }
    return loans;
  }, [loans, filter]);

  const handleCancel = async (loan: BackendLoan) => {
    const borrower = loan.borrower?.displayName ?? "peminjam";
    const item = loan.asset ? `${loan.asset.code} — ${loan.asset.name}` : "aset";
    if (
      !confirm(
        `Batalkan peminjaman ini?\n\nPeminjam: ${borrower}\nAset: ${item}\nStatus: ${STATUS_LABEL[loan.status]}\n\nAset akan kembali tersedia untuk peminjam lain.`,
      )
    )
      return;

    setCancellingId(loan.id);
    try {
      const res = await fetch(
        `${API_BASE}/api/loans/${encodeURIComponent(loan.id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CANCELLED" }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(
        `Gagal membatalkan: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat transaksi…</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {filter === "unfinished"
            ? "Tidak ada transaksi berjalan."
            : "Belum ada transaksi."}
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Tanggal
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Peminjam
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Aset
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Dosen
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Periode
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                Tindakan
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const canCancel = UNFINISHED.includes(l.status);
              return (
                <tr key={l.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(l.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <div className="font-medium text-gray-900">
                      {l.borrower?.displayName ?? "-"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {l.borrower?.uid ?? ""}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {l.asset ? `${l.asset.code} — ${l.asset.name}` : "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {l.lecturer?.displayName ?? "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[l.status]}`}
                    >
                      {STATUS_LABEL[l.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {canCancel ? (
                      <button
                        onClick={() => handleCancel(l)}
                        disabled={cancellingId === l.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === l.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                        Batalkan
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <PageLayout
      title="Monitor Transaksi"
      breadcrumbs={[{ label: "Monitor Transaksi" }]}
      icon={<ShieldCheck className="w-8 h-8 text-white" />}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setFilter("unfinished")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "unfinished"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Berjalan ({loans.filter((l) => UNFINISHED.includes(l.status)).length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Semua ({loans.length})
          </button>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>
      {renderBody()}
    </PageLayout>
  );
}
