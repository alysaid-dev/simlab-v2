import { useCallback, useEffect, useMemo, useState } from "react";
import { History as HistoryIcon, X } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { apiFetch } from "../lib/apiFetch";
import { useAuth } from "../contexts/AuthContext";
import { formatDateTime } from "../lib/format";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type ViewKey = "ta" | "practicum" | "clearance" | "reservation" | "consumables";

// Tab "Barang Keluar" hanya relevan untuk LABORAN (pencatat) & SUPER_ADMIN
// — role lain bukan pencatat, datanya pasti kosong → tab disembunyikan.
const BASE_SIDEBAR_ITEMS = [
  "Laptop TA",
  "Laptop Praktikum",
  "Surat Bebas Lab",
  "Peminjaman Ruang",
];
const LABORAN_SIDEBAR_ITEMS = [...BASE_SIDEBAR_ITEMS, "Barang Keluar"];

const VIEW_BY_LABEL: Record<string, ViewKey> = {
  "Laptop TA": "ta",
  "Laptop Praktikum": "practicum",
  "Surat Bebas Lab": "clearance",
  "Peminjaman Ruang": "reservation",
  "Barang Keluar": "consumables",
};

type TimelineView = Exclude<ViewKey, "consumables">;

const ENDPOINT_BY_VIEW: Record<TimelineView, { list: string; timeline: (id: string) => string }> = {
  ta: {
    list: "/api/history/loans/ta",
    timeline: (id) => `/api/history/loans/${id}/timeline`,
  },
  practicum: {
    list: "/api/history/loans/practicum",
    timeline: (id) => `/api/history/loans/${id}/timeline`,
  },
  clearance: {
    list: "/api/history/clearances",
    timeline: (id) => `/api/history/clearances/${id}/timeline`,
  },
  reservation: {
    list: "/api/history/reservations",
    timeline: (id) => `/api/history/reservations/${id}/timeline`,
  },
};

const CONSUMABLES_ENDPOINT = "/api/history/consumables/outgoing";

interface ConsumableLine {
  consumableId: string;
  name: string;
  unit: string;
  quantity: number;
}

interface ConsumableBucket {
  id: string;
  createdAt: string;
  actor: { id: string; uid: string; displayName: string };
  notes: string | null;
  totalItem: number;
  lines: ConsumableLine[];
}

// Parse penerima dari notes otomatis ("Diambil oleh NAME (NIM)"). Kalau
// notes kosong atau format tidak cocok (mis. laboran pakai endpoint per-
// item lama dengan notes bebas), kembalikan null untuk kedua field.
const RECIPIENT_RE = /^Diambil oleh (.+?) \(([^)]+)\)\s*$/;
function parseRecipient(
  notes: string | null,
): { name: string | null; nim: string | null } {
  if (!notes) return { name: null, nim: null };
  const m = RECIPIENT_RE.exec(notes);
  if (!m) return { name: null, nim: null };
  return { name: m[1] ?? null, nim: m[2] ?? null };
}

interface Row {
  id: string;
  nim: string;
  nama: string;
  status: string;
  updatedAt: string;
}

interface TimelineEvent {
  label: string;
  at: string | null;
  actorName?: string | null;
  decision?: "APPROVED" | "REJECTED" | null;
  note?: string | null;
}

function normalizeRow(view: ViewKey, item: Record<string, unknown>): Row {
  if (view === "clearance") {
    const user = (item.user as { uid: string; displayName: string }) ?? {
      uid: "-",
      displayName: "-",
    };
    return {
      id: item.id as string,
      nim: user.uid,
      nama: user.displayName,
      status: item.status as string,
      updatedAt: item.updatedAt as string,
    };
  }
  if (view === "reservation") {
    const user = (item.user as { uid: string; displayName: string }) ?? {
      uid: "-",
      displayName: "-",
    };
    return {
      id: item.id as string,
      nim: user.uid,
      nama: user.displayName,
      status: item.status as string,
      updatedAt: item.updatedAt as string,
    };
  }
  // loan (ta / practicum)
  const borrower = (item.borrower as { uid: string; displayName: string }) ?? {
    uid: "-",
    displayName: "-",
  };
  return {
    id: item.id as string,
    nim: borrower.uid,
    nama: borrower.displayName,
    status: item.status as string,
    updatedAt: item.updatedAt as string,
  };
}

export default function History() {
  const { user } = useAuth();
  const canSeeConsumables =
    user?.roles?.includes("LABORAN") ||
    user?.roles?.includes("KEPALA_LAB") ||
    user?.roles?.includes("SUPER_ADMIN") ||
    false;
  // KEPALA_LAB lihat view global (unscoped di backend) — nama halaman
  // "Riwayat Lab" supaya konsisten dengan card dashboard-nya.
  const pageName = user?.roles?.includes("KEPALA_LAB")
    ? "Riwayat Lab"
    : "Riwayat Saya";
  const sidebarItems = canSeeConsumables
    ? LABORAN_SIDEBAR_ITEMS
    : BASE_SIDEBAR_ITEMS;

  const [activeLabel, setActiveLabel] = useState<string>(sidebarItems[0]!);
  const view: ViewKey = VIEW_BY_LABEL[activeLabel]!;

  const [rows, setRows] = useState<Row[]>([]);
  const [buckets, setBuckets] = useState<ConsumableBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail untuk view loan/clearance/reservation → timeline modal.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Detail untuk view consumables → rincian barang (lines sudah dari list
  // response, tidak perlu fetch ulang).
  const [selectedBucket, setSelectedBucket] = useState<ConsumableBucket | null>(
    null,
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === "consumables") {
        const res = await apiFetch(
          `${API_BASE}${CONSUMABLES_ENDPOINT}?take=200`,
          { credentials: "include" },
        );
        if (!res.ok) {
          throw new Error(`Gagal memuat data (HTTP ${res.status})`);
        }
        const data = (await res.json()) as { items: ConsumableBucket[] };
        setBuckets(data.items);
        setRows([]);
      } else {
        const endpoint = ENDPOINT_BY_VIEW[view];
        const res = await apiFetch(`${API_BASE}${endpoint.list}?take=200`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Gagal memuat data (HTTP ${res.status})`);
        }
        const data = (await res.json()) as { items: Record<string, unknown>[] };
        setRows(data.items.map((item) => normalizeRow(view, item)));
        setBuckets([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
      setRows([]);
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = useCallback(
    async (id: string) => {
      if (view === "consumables") return; // handled separately
      const endpoint = ENDPOINT_BY_VIEW[view];
      setDetailId(id);
      setTimeline(null);
      setTimelineError(null);
      setTimelineLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}${endpoint.timeline(id)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Gagal memuat timeline (HTTP ${res.status})`);
        }
        const data = (await res.json()) as { events: TimelineEvent[] };
        setTimeline(data.events);
      } catch (e) {
        setTimelineError(
          e instanceof Error ? e.message : "Gagal memuat timeline",
        );
      } finally {
        setTimelineLoading(false);
      }
    },
    [view],
  );

  const closeDetail = () => {
    setDetailId(null);
    setTimeline(null);
    setTimelineError(null);
  };

  const tableCaption = useMemo(() => {
    if (loading) return "Memuat...";
    if (error) return error;
    const count = view === "consumables" ? buckets.length : rows.length;
    if (count === 0) return "Belum ada data riwayat";
    return `${count} data`;
  }, [loading, error, rows.length, buckets.length, view]);

  return (
    <PageLayout
      title={`${pageName} — ${activeLabel}`}
      breadcrumbs={[{ label: pageName }]}
      icon={<HistoryIcon className="w-6 h-6 text-white" />}
      sidebarItems={sidebarItems}
      activeItem={activeLabel}
      onSidebarItemClick={(item) => setActiveLabel(item)}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">{tableCaption}</div>
        <div className="overflow-x-auto border rounded-lg">
          {view === "consumables" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    NIM Penerima
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nama Penerima
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Barang
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Total Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Dicatat Oleh
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Waktu
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {buckets.map((bucket) => {
                  const { name, nim } = parseRecipient(bucket.notes);
                  const firstLine = bucket.lines[0];
                  return (
                    <tr key={bucket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {nim ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{firstLine?.name ?? "-"}</span>
                          {bucket.lines.length > 1 && (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              +{bucket.lines.length - 1} lainnya
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {bucket.totalItem}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {bucket.actor.displayName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDateTime(bucket.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBucket(bucket)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {buckets.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      {error ?? "Tidak ada data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    NIM
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Terakhir Diupdate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {row.nim}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.nama}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          row.status === "APPROVED" ||
                          row.status === "RETURNED" ||
                          row.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : row.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void openDetail(row.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      {error ?? "Tidak ada data"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedBucket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBucket(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Rincian Barang Keluar
              </h2>
              <button
                type="button"
                onClick={() => setSelectedBucket(null)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto space-y-4">
              {(() => {
                const { name, nim } = parseRecipient(selectedBucket.notes);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Waktu</p>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(selectedBucket.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dicatat Oleh</p>
                      <p className="font-medium text-gray-900">
                        {selectedBucket.actor.displayName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Penerima</p>
                      <p className="font-medium text-gray-900">
                        {name ?? "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">NIM / ID Penerima</p>
                      <p className="font-medium text-gray-900 font-mono">
                        {nim ?? "-"}
                      </p>
                    </div>
                    {selectedBucket.notes && !name && (
                      <div className="sm:col-span-2">
                        <p className="text-gray-500">Catatan (raw)</p>
                        <p className="font-medium text-gray-800 whitespace-pre-wrap">
                          {selectedBucket.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Barang ({selectedBucket.lines.length} jenis • total{" "}
                  {selectedBucket.totalItem})
                </p>
                <div className="border rounded overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                          Nama Barang
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                          Satuan
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedBucket.lines.map((line, idx) => (
                        <tr key={`${line.consumableId}-${idx}`}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {line.name}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">
                            {line.unit}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                            {line.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={closeDetail}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Timeline Transaksi
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              {timelineLoading && (
                <div className="text-sm text-gray-500">Memuat timeline...</div>
              )}
              {timelineError && (
                <div className="text-sm text-red-600">{timelineError}</div>
              )}
              {timeline && timeline.length === 0 && (
                <div className="text-sm text-gray-500">
                  Tidak ada event timeline.
                </div>
              )}
              {timeline && timeline.length > 0 && (
                <ol className="relative border-l-2 border-gray-200 pl-6 space-y-5">
                  {timeline.map((ev, idx) => (
                    <li key={idx} className="relative">
                      <span
                        className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                          ev.decision === "REJECTED"
                            ? "bg-red-500"
                            : ev.decision === "APPROVED"
                              ? "bg-green-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <div className="text-sm font-medium text-gray-900">
                        {ev.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(ev.at)}
                        {ev.actorName ? ` • ${ev.actorName}` : ""}
                      </div>
                      {ev.note && (
                        <div className="text-xs text-gray-700 mt-1 italic">
                          {ev.note}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
