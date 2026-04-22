import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Activity, Laptop, Wrench, DoorOpen, FileCheck, Receipt } from "lucide-react";
import { apiFetch } from "../lib/apiFetch";
import { formatDateTime, formatDate, formatRupiah } from "../lib/format";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type LaptopStatus = "PENDING" | "APPROVED_BY_DOSEN" | "APPROVED" | "ACTIVE" | "OVERDUE";
type EquipmentStatus = "ACTIVE" | "OVERDUE";
type ReservationStatus = "PENDING" | "CHECKED" | "APPROVED";
type ClearanceStatus = "PENDING_LABORAN" | "PENDING_KEPALA_LAB";

interface LaptopLoan {
  id: string;
  status: LaptopStatus;
  startDate: string;
  endDate: string;
  type: "TA" | "PRAKTIKUM";
  asset: { code: string; name: string } | null;
  lecturerName: string | null;
}

interface EquipmentLoan {
  id: string;
  status: EquipmentStatus;
  startDate: string;
  endDate: string;
  totalItem: number;
  items: { name: string; quantity: number }[];
}

interface Reservation {
  id: string;
  status: ReservationStatus;
  startTime: string;
  endTime: string;
  purpose: string;
  room: { name: string; code: string } | null;
}

interface Clearance {
  id: string;
  status: ClearanceStatus;
  tanggalSidang: string | null;
  createdAt: string;
}

interface UnpaidFine {
  loanId: string;
  dayLate: number;
  fine: string | number;
  returnDate: string | null;
  asset: { code: string; name: string } | null;
}

interface ActiveItemsResponse {
  laptopLoans: LaptopLoan[];
  equipmentLoans: EquipmentLoan[];
  reservations: Reservation[];
  clearances: Clearance[];
  unpaidFines: UnpaidFine[];
  counts: {
    laptopLoans: number;
    equipmentLoans: number;
    reservations: number;
    clearances: number;
    unpaidFines: number;
    total: number;
  };
}

const LAPTOP_STATUS_LABEL: Record<LaptopStatus, string> = {
  PENDING: "Menunggu persetujuan Dosen",
  APPROVED_BY_DOSEN: "Menunggu Kepala Lab",
  APPROVED: "Menunggu serah terima Laboran",
  ACTIVE: "Dipinjam",
  OVERDUE: "Terlambat",
};

const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Dipinjam",
  OVERDUE: "Terlambat",
};

const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Menunggu Laboran",
  CHECKED: "Menunggu Kepala Lab",
  APPROVED: "Disetujui",
};

const CLEARANCE_STATUS_LABEL: Record<ClearanceStatus, string> = {
  PENDING_LABORAN: "Menunggu Laboran",
  PENDING_KEPALA_LAB: "Menunggu Kepala Lab",
};

function statusBadge(status: string, isDanger = false): string {
  if (isDanger) return "bg-red-100 text-red-700 border-red-200";
  if (status === "ACTIVE") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "APPROVED") return "bg-green-100 text-green-700 border-green-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export function AktivitasSayaCard() {
  const [data, setData] = useState<ActiveItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`${API_BASE}/api/me/active-items`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ActiveItemsResponse;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // diam — card tidak tampil kalau gagal
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data || data.counts.total === 0) return null;

  return (
    <Card className="mb-6 p-6 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Aktivitas Saya</h2>
          <p className="text-xs text-gray-600">
            {data.counts.total} item sedang berjalan
            {data.counts.unpaidFines > 0 ? ` • ${data.counts.unpaidFines} denda belum lunas` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.unpaidFines.length > 0 && (
          <Section
            title="Denda Belum Lunas"
            icon={<Receipt className="w-4 h-4" />}
            danger
          >
            {data.unpaidFines.map((f) => (
              <ItemRow
                key={f.loanId}
                primary={f.asset ? `${f.asset.code} — ${f.asset.name}` : "Laptop"}
                secondary={`Telat ${f.dayLate} hari${f.returnDate ? ` • kembali ${formatDate(f.returnDate)}` : ""}`}
                badge={formatRupiah(Number(f.fine))}
                danger
                linkTo="/peminjaman-laptop"
              />
            ))}
          </Section>
        )}

        {data.laptopLoans.length > 0 && (
          <Section title="Peminjaman Laptop" icon={<Laptop className="w-4 h-4" />}>
            {data.laptopLoans.map((l) => (
              <ItemRow
                key={l.id}
                primary={l.asset ? `${l.asset.code} — ${l.asset.name}` : `Peminjaman ${l.type}`}
                secondary={`Jatuh tempo ${formatDate(l.endDate)}`}
                badge={LAPTOP_STATUS_LABEL[l.status]}
                badgeClass={statusBadge(l.status, l.status === "OVERDUE")}
                linkTo="/peminjaman-laptop"
              />
            ))}
          </Section>
        )}

        {data.equipmentLoans.length > 0 && (
          <Section title="Peminjaman Alat" icon={<Wrench className="w-4 h-4" />}>
            {data.equipmentLoans.map((l) => (
              <ItemRow
                key={l.id}
                primary={`${l.totalItem} item — ${l.items
                  .slice(0, 2)
                  .map((i) => i.name)
                  .join(", ")}${l.items.length > 2 ? `, +${l.items.length - 2} lain` : ""}`}
                secondary={`Jatuh tempo ${formatDate(l.endDate)}`}
                badge={EQUIPMENT_STATUS_LABEL[l.status]}
                badgeClass={statusBadge(l.status, l.status === "OVERDUE")}
              />
            ))}
          </Section>
        )}

        {data.reservations.length > 0 && (
          <Section title="Reservasi Ruangan" icon={<DoorOpen className="w-4 h-4" />}>
            {data.reservations.map((r) => (
              <ItemRow
                key={r.id}
                primary={r.room?.name ?? "Ruangan"}
                secondary={`${formatDateTime(r.startTime)} — ${new Date(r.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                badge={RESERVATION_STATUS_LABEL[r.status]}
                badgeClass={statusBadge(r.status)}
                linkTo="/peminjaman-ruangan"
              />
            ))}
          </Section>
        )}

        {data.clearances.length > 0 && (
          <Section title="Surat Bebas Lab" icon={<FileCheck className="w-4 h-4" />}>
            {data.clearances.map((c) => (
              <ItemRow
                key={c.id}
                primary={c.tanggalSidang ? `Sidang ${formatDate(c.tanggalSidang)}` : "Permohonan surat bebas lab"}
                secondary={`Diajukan ${formatDate(c.createdAt)}`}
                badge={CLEARANCE_STATUS_LABEL[c.status]}
                badgeClass={statusBadge(c.status)}
                linkTo="/surat-bebas-lab"
              />
            ))}
          </Section>
        )}
      </div>
    </Card>
  );
}

function Section({
  title,
  icon,
  danger,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${danger ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"}`}
    >
      <div className={`flex items-center gap-2 mb-2 text-sm font-semibold ${danger ? "text-red-700" : "text-gray-700"}`}>
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ItemRow({
  primary,
  secondary,
  badge,
  badgeClass,
  danger,
  linkTo,
}: {
  primary: string;
  secondary?: string;
  badge: string;
  badgeClass?: string;
  danger?: boolean;
  linkTo?: string;
}) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${danger ? "font-semibold text-red-900" : "text-gray-900"}`}>
          {primary}
        </p>
        {secondary && <p className="text-xs text-gray-500 mt-0.5">{secondary}</p>}
      </div>
      <Badge
        variant="outline"
        className={`shrink-0 text-xs ${badgeClass ?? (danger ? "bg-red-100 text-red-700 border-red-200" : "")}`}
      >
        {badge}
      </Badge>
    </div>
  );
  return linkTo ? (
    <Link to={linkTo} className="block hover:bg-gray-50 rounded px-2 -mx-2 py-1">
      {content}
    </Link>
  ) : (
    <div className="px-2 -mx-2 py-1">{content}</div>
  );
}
