import { useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { apiFetch } from "../lib/apiFetch";
import { formatDateTime } from "../lib/format";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type TabKey = "laptops" | "equipment" | "consumables" | "rooms";

const SIDEBAR_ITEMS = [
  "Peminjaman Laptop",
  "Peminjaman Alat",
  "Habis Pakai",
  "Peminjaman Ruangan",
];

const TAB_BY_LABEL: Record<string, TabKey> = {
  "Peminjaman Laptop": "laptops",
  "Peminjaman Alat": "equipment",
  "Habis Pakai": "consumables",
  "Peminjaman Ruangan": "rooms",
};

const ENDPOINT_BY_TAB: Record<TabKey, string> = {
  laptops: "/api/me/transactions/laptops",
  equipment: "/api/me/transactions/equipment",
  consumables: "/api/me/transactions/consumables",
  rooms: "/api/me/transactions/rooms",
};

// Kelompok status → warna badge. "Aktif" = sedang berjalan; "Selesai"
// = sukses; "Batal/Tolak" = merah.
const STATUS_GROUP: Record<string, "active" | "success" | "fail"> = {
  PENDING: "active",
  APPROVED_BY_DOSEN: "active",
  APPROVED: "active",
  CHECKED: "active",
  ACTIVE: "active",
  OVERDUE: "active",
  RETURNED: "success",
  COMPLETED: "success",
  REJECTED: "fail",
  CANCELLED: "fail",
};

function statusBadge(status: string) {
  const group = STATUS_GROUP[status] ?? "active";
  const cls =
    group === "success"
      ? "bg-green-100 text-green-800"
      : group === "fail"
        ? "bg-red-100 text-red-800"
        : "bg-blue-100 text-blue-800";
  return (
    <span
      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

interface LaptopRow {
  id: string;
  type: "TA" | "PRACTICUM";
  status: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
  asset: { code: string; name: string } | null;
  lecturer: { displayName: string } | null;
}

interface EquipmentRow {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  updatedAt: string;
  totalItem: number;
  items: { name: string; category: string | null; quantity: number }[];
}

interface RoomRow {
  id: string;
  status: string;
  purpose: string;
  startTime: string;
  endTime: string;
  room: { name: string; code: string } | null;
}

interface ConsumableRow {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  notes: string | null;
  recordedByName: string;
  createdAt: string;
}

export default function TransaksiSaya() {
  const [activeLabel, setActiveLabel] = useState<string>(SIDEBAR_ITEMS[0]!);
  const tab: TabKey = TAB_BY_LABEL[activeLabel]!;

  // State per-tab — shape beda per endpoint, tidak bisa pakai satu state
  // polymorphic tanpa risiko bocor antar tab saat fetch tumpang-tindih.
  const [laptops, setLaptops] = useState<LaptopRow[]>([]);
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [consumables, setConsumables] = useState<ConsumableRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await apiFetch(
          `${API_BASE}${ENDPOINT_BY_TAB[tab]}?take=200`,
          { credentials: "include", signal: controller.signal },
        );
        if (!active) return;
        if (!res.ok) throw new Error(`Gagal memuat data (HTTP ${res.status})`);
        const data = (await res.json()) as { items: unknown[] };
        if (!active) return;
        if (tab === "laptops") setLaptops(data.items as LaptopRow[]);
        else if (tab === "equipment") setEquipment(data.items as EquipmentRow[]);
        else if (tab === "consumables")
          setConsumables(data.items as ConsumableRow[]);
        else setRooms(data.items as RoomRow[]);
      } catch (e) {
        if (!active || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Gagal memuat data");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [tab]);

  const currentCount =
    tab === "laptops"
      ? laptops.length
      : tab === "equipment"
        ? equipment.length
        : tab === "consumables"
          ? consumables.length
          : rooms.length;

  const caption = useMemo(() => {
    if (loading) return "Memuat...";
    if (error) return error;
    if (currentCount === 0) return "Belum ada data";
    return `${currentCount} data`;
  }, [loading, error, currentCount]);

  return (
    <PageLayout
      title={`Transaksi Saya — ${activeLabel}`}
      breadcrumbs={[{ label: "Transaksi Saya" }]}
      icon={<Receipt className="w-6 h-6 text-white" />}
      sidebarItems={SIDEBAR_ITEMS}
      activeItem={activeLabel}
      onSidebarItemClick={(item) => setActiveLabel(item)}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">{caption}</div>
        <div className="overflow-x-auto border rounded-lg">
          {tab === "laptops" && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Laptop</Th>
                  <Th>Tanggal Pinjam</Th>
                  <Th>Tanggal Kembali</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {laptops.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="font-medium text-gray-900">
                        {r.asset?.name ?? "-"}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {r.asset?.code ?? "-"}
                      </div>
                    </Td>
                    <Td>{formatDateTime(r.startDate)}</Td>
                    <Td>{formatDateTime(r.endDate)}</Td>
                    <Td>{statusBadge(r.status)}</Td>
                  </tr>
                ))}
                <EmptyRow show={!loading && laptops.length === 0} cols={4} />
              </tbody>
            </table>
          )}

          {tab === "equipment" && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Barang</Th>
                  <Th>Total Item</Th>
                  <Th>Tanggal Pinjam</Th>
                  <Th>Tanggal Kembali</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {equipment.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="font-medium text-gray-900">
                        {r.items[0]?.name ?? "-"}
                      </div>
                      {r.items.length > 1 && (
                        <div className="text-xs text-gray-500">
                          +{r.items.length - 1} jenis lainnya
                        </div>
                      )}
                    </Td>
                    <Td>{r.totalItem}</Td>
                    <Td>{formatDateTime(r.startDate)}</Td>
                    <Td>{formatDateTime(r.endDate)}</Td>
                    <Td>{statusBadge(r.status)}</Td>
                  </tr>
                ))}
                <EmptyRow show={!loading && equipment.length === 0} cols={5} />
              </tbody>
            </table>
          )}

          {tab === "consumables" && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Barang</Th>
                  <Th>Jumlah</Th>
                  <Th>Dicatat Oleh</Th>
                  <Th>Tanggal</Th>
                  <Th>Catatan</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consumables.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>{r.name}</Td>
                    <Td>
                      {r.quantity} {r.unit}
                    </Td>
                    <Td>{r.recordedByName}</Td>
                    <Td>{formatDateTime(r.createdAt)}</Td>
                    <Td>
                      <span className="text-xs text-gray-600">
                        {r.notes ?? "-"}
                      </span>
                    </Td>
                  </tr>
                ))}
                <EmptyRow show={!loading && consumables.length === 0} cols={5} />
              </tbody>
            </table>
          )}

          {tab === "rooms" && (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Ruangan</Th>
                  <Th>Tujuan</Th>
                  <Th>Waktu Mulai</Th>
                  <Th>Waktu Selesai</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <Td>
                      <div className="font-medium text-gray-900">
                        {r.room?.name ?? "-"}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        {r.room?.code ?? "-"}
                      </div>
                    </Td>
                    <Td>{r.purpose}</Td>
                    <Td>{formatDateTime(r.startTime)}</Td>
                    <Td>{formatDateTime(r.endTime)}</Td>
                    <Td>{statusBadge(r.status)}</Td>
                  </tr>
                ))}
                <EmptyRow show={!loading && rooms.length === 0} cols={5} />
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-gray-900">{children}</td>;
}

function EmptyRow({ show, cols }: { show: boolean; cols: number }) {
  if (!show) return null;
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-8 text-center text-sm text-gray-500"
      >
        Tidak ada data
      </td>
    </tr>
  );
}
