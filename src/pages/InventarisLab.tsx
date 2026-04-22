import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Search,
  Loader2,
  AlertCircle,
  Laptop as LaptopIcon,
  Wrench,
  Package,
} from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendAssetStatus = "AVAILABLE" | "BORROWED" | "DAMAGED" | "MAINTENANCE";
type BackendAssetCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
type BackendEquipmentStatus = "AVAILABLE" | "OUT_OF_STOCK" | "DAMAGED";

interface BackendAsset {
  id: string;
  name: string;
  code: string;
  description: string | null;
  condition: BackendAssetCondition;
  status: BackendAssetStatus;
}

interface BackendEquipment {
  id: string;
  name: string;
  stock: number;
  condition: BackendAssetCondition;
  status: BackendEquipmentStatus;
}

interface BackendConsumable {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  stock: number;
  minimumStock: number;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

const conditionLabel: Record<BackendAssetCondition, string> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat",
};

const laptopStatusLabel: Record<BackendAssetStatus, string> = {
  AVAILABLE: "Tersedia",
  BORROWED: "Dipinjam",
  DAMAGED: "Maintenance",
  MAINTENANCE: "Maintenance",
};

const equipmentStatusLabel: Record<BackendEquipmentStatus, string> = {
  AVAILABLE: "Tersedia",
  OUT_OF_STOCK: "Habis",
  DAMAGED: "Rusak",
};

function LaptopStatusBadge({ status }: { status: BackendAssetStatus }) {
  const label = laptopStatusLabel[status];
  const color =
    status === "AVAILABLE"
      ? "bg-green-100 text-green-800 hover:bg-green-100"
      : status === "BORROWED"
        ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
        : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  return <Badge className={color}>{label}</Badge>;
}

function EquipmentStatusBadge({ status }: { status: BackendEquipmentStatus }) {
  const label = equipmentStatusLabel[status];
  const color =
    status === "AVAILABLE"
      ? "bg-green-100 text-green-800 hover:bg-green-100"
      : status === "OUT_OF_STOCK"
        ? "bg-gray-200 text-gray-800 hover:bg-gray-200"
        : "bg-red-100 text-red-800 hover:bg-red-100";
  return <Badge className={color}>{label}</Badge>;
}

function ConditionBadge({ condition }: { condition: BackendAssetCondition }) {
  const label = conditionLabel[condition];
  const color =
    condition === "GOOD"
      ? "bg-green-50 text-green-700 hover:bg-green-50"
      : condition === "MINOR_DAMAGE"
        ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-50"
        : "bg-red-50 text-red-700 hover:bg-red-50";
  return <Badge variant="outline" className={color}>{label}</Badge>;
}

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    default: "bg-gray-50 text-gray-800 border-gray-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  }[tone];
  return (
    <div className={`flex flex-col rounded-lg border px-4 py-3 ${toneClass}`}>
      <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}

const SIDEBAR_LAPTOP = "Daftar Laptop";
const SIDEBAR_EQUIPMENT = "Daftar Peralatan";
const SIDEBAR_CONSUMABLE = "Daftar Habis Pakai";

type ActiveMenu =
  | ""
  | typeof SIDEBAR_LAPTOP
  | typeof SIDEBAR_EQUIPMENT
  | typeof SIDEBAR_CONSUMABLE;

export default function InventarisLab() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("");

  // Laptop
  const [laptops, setLaptops] = useState<BackendAsset[]>([]);
  const [laptopsLoading, setLaptopsLoading] = useState(false);
  const [laptopsError, setLaptopsError] = useState<string | null>(null);
  const [laptopSearch, setLaptopSearch] = useState("");

  // Equipment
  const [equipments, setEquipments] = useState<BackendEquipment[]>([]);
  const [equipmentsLoading, setEquipmentsLoading] = useState(false);
  const [equipmentsError, setEquipmentsError] = useState<string | null>(null);
  const [equipmentSearch, setEquipmentSearch] = useState("");

  // Consumable
  const [consumables, setConsumables] = useState<BackendConsumable[]>([]);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [consumablesError, setConsumablesError] = useState<string | null>(null);
  const [consumableSearch, setConsumableSearch] = useState("");

  useEffect(() => {
    if (activeMenu !== SIDEBAR_LAPTOP || laptops.length > 0) {
      return;
    }
    let cancelled = false;
    setLaptopsLoading(true);
    setLaptopsError(null);
    fetch(`${API_BASE}/api/assets?take=200`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendAsset>;
      })
      .then((data) => {
        if (!cancelled) setLaptops(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setLaptopsError(err instanceof Error ? err.message : "Gagal memuat laptop");
        }
      })
      .finally(() => {
        if (!cancelled) setLaptopsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== SIDEBAR_EQUIPMENT || equipments.length > 0) {
      return;
    }
    let cancelled = false;
    setEquipmentsLoading(true);
    setEquipmentsError(null);
    fetch(`${API_BASE}/api/equipment?take=200`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendEquipment>;
      })
      .then((data) => {
        if (!cancelled) setEquipments(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setEquipmentsError(
            err instanceof Error ? err.message : "Gagal memuat peralatan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setEquipmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== SIDEBAR_CONSUMABLE || consumables.length > 0) {
      return;
    }
    let cancelled = false;
    setConsumablesLoading(true);
    setConsumablesError(null);
    fetch(`${API_BASE}/api/consumables?take=200`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendConsumable>;
      })
      .then((data) => {
        if (!cancelled) setConsumables(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setConsumablesError(
            err instanceof Error ? err.message : "Gagal memuat barang habis pakai",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setConsumablesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);

  const laptopStats = useMemo(() => {
    const total = laptops.length;
    let tersedia = 0;
    let dipinjam = 0;
    let maintenance = 0;
    for (const a of laptops) {
      if (a.status === "AVAILABLE") tersedia += 1;
      else if (a.status === "BORROWED") dipinjam += 1;
      else maintenance += 1;
    }
    return { total, tersedia, dipinjam, maintenance };
  }, [laptops]);

  const equipmentStats = useMemo(() => {
    const totalItem = equipments.length;
    let totalStok = 0;
    let rusak = 0;
    let habis = 0;
    for (const e of equipments) {
      totalStok += e.stock;
      if (e.status === "DAMAGED") rusak += 1;
      if (e.status === "OUT_OF_STOCK" || e.stock === 0) habis += 1;
    }
    return { totalItem, totalStok, rusak, habis };
  }, [equipments]);

  const consumableStats = useMemo(() => {
    const totalItem = consumables.length;
    let totalStok = 0;
    let menipis = 0;
    let habis = 0;
    for (const c of consumables) {
      totalStok += c.stock;
      if (c.stock === 0) habis += 1;
      else if (c.stock < c.minimumStock) menipis += 1;
    }
    return { totalItem, totalStok, menipis, habis };
  }, [consumables]);

  const filteredLaptops = useMemo(() => {
    const q = laptopSearch.trim().toLowerCase();
    if (!q) return laptops;
    return laptops.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [laptops, laptopSearch]);

  const filteredEquipments = useMemo(() => {
    const q = equipmentSearch.trim().toLowerCase();
    if (!q) return equipments;
    return equipments.filter((e) => e.name.toLowerCase().includes(q));
  }, [equipments, equipmentSearch]);

  const filteredConsumables = useMemo(() => {
    const q = consumableSearch.trim().toLowerCase();
    if (!q) return consumables;
    return consumables.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code ?? "").toLowerCase().includes(q),
    );
  }, [consumables, consumableSearch]);

  const renderLaptop = () => {
    if (laptopsLoading) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat data laptop...</p>
          </div>
        </Card>
      );
    }
    if (laptopsError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Gagal memuat laptop: {laptopsError}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryChip label="Total" value={laptopStats.total} />
          <SummaryChip label="Tersedia" value={laptopStats.tersedia} tone="success" />
          <SummaryChip label="Dipinjam" value={laptopStats.dipinjam} tone="info" />
          <SummaryChip label="Maintenance" value={laptopStats.maintenance} tone="warning" />
        </div>

        <div className="mb-4 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama atau ID laptop..."
            value={laptopSearch}
            onChange={(e) => setLaptopSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Aset</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Laptop</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Deskripsi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kondisi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLaptops.map((a) => (
                  <tr key={a.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{a.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{a.description || "-"}</td>
                    <td className="px-4 py-3 text-sm"><ConditionBadge condition={a.condition} /></td>
                    <td className="px-4 py-3 text-sm"><LaptopStatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLaptops.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {laptopSearch ? "Tidak ada laptop cocok dengan pencarian" : "Belum ada data laptop"}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderEquipment = () => {
    if (equipmentsLoading) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat data peralatan...</p>
          </div>
        </Card>
      );
    }
    if (equipmentsError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Gagal memuat peralatan: {equipmentsError}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryChip label="Jenis Peralatan" value={equipmentStats.totalItem} />
          <SummaryChip label="Total Stok" value={equipmentStats.totalStok} tone="info" />
          <SummaryChip label="Stok Habis" value={equipmentStats.habis} tone="warning" />
          <SummaryChip label="Rusak" value={equipmentStats.rusak} tone="danger" />
        </div>

        <div className="mb-4 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama peralatan..."
            value={equipmentSearch}
            onChange={(e) => setEquipmentSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Peralatan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stok</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kondisi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredEquipments.map((e) => (
                  <tr key={e.id} className="bg-white hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${e.stock === 0 ? "text-red-600" : "text-gray-800"}`}>{e.stock}</td>
                    <td className="px-4 py-3 text-sm"><ConditionBadge condition={e.condition} /></td>
                    <td className="px-4 py-3 text-sm"><EquipmentStatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEquipments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {equipmentSearch ? "Tidak ada peralatan cocok dengan pencarian" : "Belum ada data peralatan"}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderConsumable = () => {
    if (consumablesLoading) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat data barang habis pakai...</p>
          </div>
        </Card>
      );
    }
    if (consumablesError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Gagal memuat barang habis pakai: {consumablesError}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryChip label="Jenis Barang" value={consumableStats.totalItem} />
          <SummaryChip label="Total Stok" value={consumableStats.totalStok} tone="info" />
          <SummaryChip label="Stok Menipis" value={consumableStats.menipis} tone="warning" />
          <SummaryChip label="Stok Habis" value={consumableStats.habis} tone="danger" />
        </div>

        <div className="mb-4 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama atau kode barang..."
            value={consumableSearch}
            onChange={(e) => setConsumableSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kode</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Barang</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Satuan</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stok</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Min. Stok</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredConsumables.map((c) => {
                  const habis = c.stock === 0;
                  const menipis = !habis && c.stock < c.minimumStock;
                  return (
                    <tr key={c.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">{c.code ?? "-"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.unit}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${habis ? "text-red-600" : menipis ? "text-yellow-700" : "text-gray-800"}`}>{c.stock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.minimumStock}</td>
                      <td className="px-4 py-3 text-sm">
                        {habis ? (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Habis</Badge>
                        ) : menipis ? (
                          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menipis</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aman</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredConsumables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {consumableSearch ? "Tidak ada barang cocok dengan pencarian" : "Belum ada data barang habis pakai"}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case SIDEBAR_LAPTOP:
        return renderLaptop();
      case SIDEBAR_EQUIPMENT:
        return renderEquipment();
      case SIDEBAR_CONSUMABLE:
        return renderConsumable();
      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Inventaris Lab"
      breadcrumbs={[
        { label: "Inventaris Lab" },
        ...(activeMenu ? [{ label: activeMenu }] : []),
      ]}
      icon={<Boxes className="w-8 h-8 text-white" />}
      sidebarItems={[SIDEBAR_LAPTOP, SIDEBAR_EQUIPMENT, SIDEBAR_CONSUMABLE]}
      onSidebarItemClick={(item) => setActiveMenu(item as ActiveMenu)}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? (
        renderContent()
      ) : (
        <div className="max-w-2xl">
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-teal-600 to-emerald-500 rounded-xl flex items-center justify-center mb-3">
            <Boxes className="w-12 h-12 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Inventaris Lab</h2>
          <p className="text-sm text-gray-500 mb-5">
            Daftar aset laboratorium statistika secara menyeluruh.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveMenu(SIDEBAR_LAPTOP)}
              className="flex items-center gap-3 p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <LaptopIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900">Daftar Laptop</div>
                <div className="text-xs text-gray-500">Aset laptop & status pinjam</div>
              </div>
            </button>
            <button
              onClick={() => setActiveMenu(SIDEBAR_EQUIPMENT)}
              className="flex items-center gap-3 p-4 border rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors text-left"
            >
              <Wrench className="w-6 h-6 text-teal-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900">Daftar Peralatan</div>
                <div className="text-xs text-gray-500">Stok & kondisi peralatan</div>
              </div>
            </button>
            <button
              onClick={() => setActiveMenu(SIDEBAR_CONSUMABLE)}
              className="flex items-center gap-3 p-4 border rounded-lg hover:border-amber-400 hover:bg-amber-50 transition-colors text-left"
            >
              <Package className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900">Daftar Habis Pakai</div>
                <div className="text-xs text-gray-500">Stok barang & peringatan menipis</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
