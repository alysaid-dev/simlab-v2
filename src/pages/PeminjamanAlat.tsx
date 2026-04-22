import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import {
  Wrench,
  X,
  Scan,
  Search,
  Barcode,
  Plus,
  Minus,
  CheckCircle,
  ChevronDown,
  Calendar,
  Clock,
  Upload,
  Pencil,
  Trash2,
  Undo2,
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useDialog } from "../lib/dialog";
import { apiFetch } from "../lib/apiFetch";

type View = "transaksi" | "peminjaman-aktif" | "terlambat" | "aset" | "riwayat";
type ToolCondition = "Baik" | "Rusak Ringan" | "Rusak Berat" | "Hilang";
type BorrowStatus = "Normal" | "Mendekati" | "Terlambat";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendAssetCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";
type BackendEquipmentStatus = "AVAILABLE" | "OUT_OF_STOCK" | "DAMAGED";

interface BackendEquipment {
  id: string;
  name: string;
  category: string | null;
  stock: number;
  condition: BackendAssetCondition;
  status: BackendEquipmentStatus;
  laboratoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EquipmentListResponse {
  items: BackendEquipment[];
  total: number;
  skip: number;
  take: number;
}

type BackendEqLoanStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "RETURNED"
  | "OVERDUE"
  | "CANCELLED";

interface BackendEqLoanItem {
  id: string;
  equipmentId: string;
  quantity: number;
  equipment?: { id: string; name: string; category: string | null };
}

interface BackendEquipmentLoan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: BackendEqLoanStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; displayName: string; uid: string };
  items: BackendEqLoanItem[];
}

interface EquipmentLoanListResponse {
  items: BackendEquipmentLoan[];
  total: number;
  skip: number;
  take: number;
}

const conditionFrontLabel: Record<BackendAssetCondition, ToolCondition> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Rusak Ringan",
  MAJOR_DAMAGE: "Rusak Berat",
};

function formatIdDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatIdDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart} — ${timePart}`;
  } catch {
    return iso;
  }
}

function deriveBorrowStatus(endIso: string): BorrowStatus {
  const diffMs = new Date(endIso).getTime() - Date.now();
  if (diffMs < 0) return "Terlambat";
  if (diffMs < 2 * 24 * 60 * 60 * 1000) return "Mendekati";
  return "Normal";
}

function overdueDays(endIso: string): number {
  const diffMs = Date.now() - new Date(endIso).getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

interface Tool {
  id: string;
  name: string;
  stock: number;
  totalStock: number;
  condition: ToolCondition;
}

interface CartItem {
  tool: Tool;
  quantity: number;
}

interface ActiveBorrowing {
  id: string;
  backendId: string;
  endDate: string;
  borrowerName: string;
  tools: { name: string; quantity: number }[];
  dueDate: string;
  dueTime: string;
  status: BorrowStatus;
}

interface OverdueBorrowing {
  id: string;
  backendId: string;
  borrowerName: string;
  tools: { name: string; quantity: number }[];
  dueDate: string;
  overdueDays: number;
  fine: number;
}

interface HistoryRecord {
  id: string;
  userId: string;
  userName: string;
  tools: { name: string; id: string; quantity: number; returnCondition: string }[];
  borrowTime: string;
  returnTime: string | null;
}

export default function PeminjamanAlat() {
  const { alert } = useDialog();
  const [currentView, setCurrentView] = useState<View | null>(null);

  // Default return date: +7 hari dari hari ini, jam 16:00.
  const defaultReturnDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  // Transaksi states
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [returnDate, setReturnDate] = useState(defaultReturnDate);
  const [returnTime, setReturnTime] = useState("16:00");
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Peminjaman Aktif states
  const [showKembalikanModal, setShowKembalikanModal] = useState(false);
  const [showPerpanjangModal, setShowPerpanjangModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<ActiveBorrowing | null>(null);
  const [toolCondition, setToolCondition] = useState<ToolCondition>("Baik");
  const [returnNotes, setReturnNotes] = useState("");
  const [extensionDate, setExtensionDate] = useState("2026-04-29");
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("Semua");

  // Aset states
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [showEditToolModal, setShowEditToolModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolForm, setToolForm] = useState({
    id: "",
    name: "",
    stock: 0,
    condition: "Baik" as ToolCondition,
  });

  // Riwayat states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-15");

  // Tools catalog — fetched from /api/equipment.
  const [toolsCatalog, setToolsCatalog] = useState<Tool[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentError, setEquipmentError] = useState<string | null>(null);

  const refetchEquipment = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/api/equipment`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as EquipmentListResponse;
      setToolsCatalog(
        data.items.map((e) => ({
          id: e.id,
          name: e.name,
          stock: e.stock,
          totalStock: e.stock,
          condition: conditionFrontLabel[e.condition],
        })),
      );
      setEquipmentError(null);
    } catch (err) {
      setEquipmentError(err instanceof Error ? err.message : "Gagal memuat peralatan");
    }
  };

  useEffect(() => {
    let cancelled = false;
    setEquipmentLoading(true);
    setEquipmentError(null);
    fetch(`${API_BASE}/api/equipment`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as EquipmentListResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setToolsCatalog(
          data.items.map((e) => ({
            id: e.id,
            name: e.name,
              stock: e.stock,
            totalStock: e.stock,
            condition: conditionFrontLabel[e.condition],
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setEquipmentError(
            err instanceof Error
              ? err.message
              : "Gagal memuat katalog peralatan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setEquipmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Equipment loans — fetched once, then client-side filter per view.
  const [allEqLoans, setAllEqLoans] = useState<BackendEquipmentLoan[]>([]);
  const [eqLoansLoading, setEqLoansLoading] = useState(true);
  const [eqLoansError, setEqLoansError] = useState<string | null>(null);

  const refetchEqLoans = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/api/equipment-loans`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as EquipmentLoanListResponse;
      setAllEqLoans(data.items);
      setEqLoansError(null);
    } catch (err) {
      setEqLoansError(err instanceof Error ? err.message : "Gagal memuat data peminjaman");
    }
  };

  useEffect(() => {
    let cancelled = false;
    setEqLoansLoading(true);
    setEqLoansError(null);
    fetch(`${API_BASE}/api/equipment-loans`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as EquipmentLoanListResponse;
      })
      .then((data) => {
        if (!cancelled) setAllEqLoans(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setEqLoansError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data peminjaman",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setEqLoansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBorrowings: ActiveBorrowing[] = allEqLoans
    .filter((l) => l.status === "ACTIVE" || l.status === "OVERDUE")
    .map((l) => ({
      id: `TRX-ALT-${l.id.slice(0, 8).toUpperCase()}`,
      backendId: l.id,
      endDate: l.endDate,
      borrowerName: l.user?.displayName ?? "-",
      tools: l.items.map((it) => ({
        name: it.equipment?.name ?? "-",
        quantity: it.quantity,
      })),
      dueDate: formatIdDate(l.endDate),
      dueTime: new Date(l.endDate).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: deriveBorrowStatus(l.endDate),
    }));

  const overdueBorrowings: OverdueBorrowing[] = allEqLoans
    .filter((l) => l.status === "OVERDUE" || (l.status === "ACTIVE" && overdueDays(l.endDate) > 0))
    .map((l) => ({
      id: `TRX-ALT-${l.id.slice(0, 8).toUpperCase()}`,
      backendId: l.id,
      borrowerName: l.user?.displayName ?? "-",
      tools: l.items.map((it) => ({
        name: it.equipment?.name ?? "-",
        quantity: it.quantity,
      })),
      dueDate: formatIdDateTime(l.endDate),
      overdueDays: overdueDays(l.endDate),
      fine: 0, // backend tidak menyimpan fine untuk equipment loan
    }));

  const historyRecords: HistoryRecord[] = allEqLoans
    .filter((l) => l.status === "RETURNED")
    .map((l) => ({
      id: `TRX-ALT-${l.id.slice(0, 8).toUpperCase()}`,
      userId: l.user?.uid ?? "-",
      userName: l.user?.displayName ?? "-",
      tools: l.items.map((it) => ({
        name: it.equipment?.name ?? "-",
        id: it.equipmentId,
        quantity: it.quantity,
        returnCondition: "Baik",
      })),
      borrowTime: formatIdDateTime(l.startDate),
      returnTime: formatIdDateTime(l.endDate),
    }));


  const handleUserIdChange = async (value: string) => {
    setUserId(value);
    setUserName("");
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    try {
      const r = await apiFetch(
        `${API_BASE}/api/users?search=${encodeURIComponent(trimmed)}&take=10`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as {
        items: Array<{ uid: string; displayName: string }>;
      };
      const match = data.items.find((u) => u.uid === trimmed);
      if (match) setUserName(match.displayName);
    } catch {
      // abaikan; nama kosong = user belum ketemu
    }
  };

  const addToCart = (tool: Tool) => {
    if (tool.stock === 0) return;

    const existingItem = cart.find((item) => item.tool.id === tool.id);
    if (existingItem) {
      if (existingItem.quantity < tool.stock) {
        setCart(
          cart.map((item) =>
            item.tool.id === tool.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        );
      }
    } else {
      setCart([...cart, { tool, quantity: 1 }]);
    }
  };

  const updateQuantity = (toolId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.tool.id === toolId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.tool.stock) return item;
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item !== null) as CartItem[]
    );
  };

  const removeFromCart = (toolId: string) => {
    setCart(cart.filter((item) => item.tool.id !== toolId));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitTransaction = async () => {
    if (!userId.trim() || !userName || cart.length === 0) {
      await alert("Lengkapi ID peminjam dan minimal pilih satu alat");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const end = new Date(`${returnDate}T${returnTime || "16:00"}:00`);
      if (Number.isNaN(end.getTime())) {
        await alert("Tanggal / waktu kembali tidak valid");
        return;
      }
      const r = await apiFetch(`${API_BASE}/api/equipment-loans`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userUid: userId.trim(),
          startDate: new Date().toISOString(),
          endDate: end.toISOString(),
          status: "ACTIVE",
          items: cart.map((c) => ({
            equipmentId: c.tool.id,
            quantity: c.quantity,
          })),
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `HTTP ${r.status}`);
      }
      await Promise.all([refetchEquipment(), refetchEqLoans()]);
      setShowSuccess(true);
    } catch (err) {
      await alert(
        `Gagal mencatat peminjaman: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewTransaction = () => {
    setShowSuccess(false);
    setUserId("");
    setUserName("");
    setCart([]);
    setReturnDate(defaultReturnDate);
    setReturnTime("16:00");
  };

  const getStatusColor = (status: BorrowStatus) => {
    switch (status) {
      case "Normal":
        return "bg-green-100 text-green-700";
      case "Mendekati":
        return "bg-yellow-100 text-yellow-700";
      case "Terlambat":
        return "bg-red-100 text-red-700";
    }
  };

  const getConditionColor = (condition: ToolCondition) => {
    switch (condition) {
      case "Baik":
        return "bg-green-100 text-green-700";
      case "Rusak Ringan":
        return "bg-yellow-100 text-yellow-700";
      case "Rusak Berat":
        return "bg-red-100 text-red-700";
      case "Hilang":
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredTools = toolsCatalog.filter((tool) =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActiveBorrowings = activeBorrowings.filter((borrowing) => {
    if (statusFilter === "Semua") return true;
    return borrowing.status === statusFilter;
  });

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const renderContent = () => {
    // Loading/error gate for views that depend on backend data.
    const needsEquipment = new Set<View>([
      "transaksi",
      "aset",
    ]);
    const needsEqLoans = new Set<View>([
      "peminjaman-aktif",
      "terlambat",
      "riwayat",
    ]);

    if (currentView && needsEquipment.has(currentView) && equipmentLoading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat katalog peralatan…</span>
        </div>
      );
    }
    if (currentView && needsEquipment.has(currentView) && equipmentError) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat katalog</p>
            <p className="text-sm">{equipmentError}</p>
          </div>
        </div>
      );
    }
    if (currentView && needsEqLoans.has(currentView) && eqLoansLoading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data peminjaman…</span>
        </div>
      );
    }
    if (currentView && needsEqLoans.has(currentView) && eqLoansError) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat peminjaman</p>
            <p className="text-sm">{eqLoansError}</p>
          </div>
        </div>
      );
    }

    if (currentView === "transaksi") {
      if (showSuccess) {
        return (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Transaksi Berhasil Dicatat!
              </h2>
              <p className="text-gray-600 mb-6">Peminjaman alat telah dicatat ke sistem</p>

              <div className="bg-gray-50 rounded-lg p-6 text-left mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Pengguna:</span>
                    <span className="font-medium">{userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-medium">{userName}</span>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-gray-600 mb-2">Alat yang Dipinjam:</p>
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm mb-1">
                        <span>{item.tool.name}</span>
                        <span className="font-medium">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-gray-600">Harus Kembali:</span>
                    <span className="font-medium">
                      {returnDate} — {returnTime}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNewTransaction}
                className="w-full px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
              >
                Catat Transaksi Baru
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Catat Transaksi Peminjaman Alat
            </h2>
            <p className="text-gray-600">Peminjaman peralatan laboratorium</p>
          </div>

          {/* Alert Banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-800 text-sm">
              ⚠️ Pastikan peminjam mengembalikan semua alat sesuai tanggal yang ditentukan.
            </p>
          </div>

          {/* User Identity */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Identitas Peminjam</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID Pengguna <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => handleUserIdChange(e.target.value)}
                    placeholder="Scan atau masukkan ID Pengguna"
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Scan className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
                <input
                  type="text"
                  value={userName}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Terisi otomatis</p>
              </div>
            </div>
          </div>

          {/* Two-column layout: Catalog + Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Left: Catalog (60% = 3/5) */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4">Katalog Alat</h3>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama alat..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Barcode */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan atau input kode alat..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Tekan Enter untuk menambahkan</p>
              </div>

              {/* Tool Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.id}
                    className={`border rounded-lg p-3 ${
                      tool.stock === 0 ? "opacity-50 bg-gray-50" : "hover:shadow-md transition-shadow"
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 mb-2">{tool.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">Stok: {tool.stock}</p>
                      {tool.stock === 0 ? (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                          Stok Habis
                        </span>
                      ) : (
                        <button
                          onClick={() => addToCart(tool)}
                          className="w-6 h-6 rounded-full bg-blue-900 text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart (40% = 2/5) */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 h-fit sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Alat yang Dipinjam</h3>
                {cart.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {totalItems} item
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Belum ada alat dipilih.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {cart.map((item) => (
                      <div key={item.tool.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.tool.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.tool.id, -1)}
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.tool.id, 1)}
                            className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.tool.id)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Total: {totalItems} item
                    </p>
                    <p className="text-xs text-gray-500">
                      Stok alat akan berkurang setelah transaksi dicatat.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitTransaction}
                    disabled={!userId || !userName || cart.length === 0 || submitting}
                    className="w-full px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Mencatat…" : "Catat Transaksi"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Return Date & Time */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-900 mb-4">Tanggal & Waktu Harus Kembali</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Sesuaikan tanggal dan waktu pengembalian.
            </p>
          </div>
        </div>
      );
    }

    if (currentView === "peminjaman-aktif") {
      return (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama atau ID pengguna..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Semua</option>
                <option>Normal</option>
                <option>Mendekati</option>
                <option>Terlambat</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Transaksi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama Peminjam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Alat Dipinjam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Batas Kembali</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredActiveBorrowings.map((borrowing, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm text-gray-500">{borrowing.id}</td>
                    <td className="py-3 px-4 text-gray-700">{borrowing.borrowerName}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {borrowing.tools[0].name}
                      {borrowing.tools.length > 1 && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          +{borrowing.tools.length - 1} lainnya
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {borrowing.dueDate} — {borrowing.dueTime}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(borrowing.status)}`}
                      >
                        {borrowing.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 relative">
                      <button
                        onClick={() => {
                          setSelectedBorrowing(borrowing);
                          setOpenDropdownIndex(openDropdownIndex === index ? null : index);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50"
                      >
                        Tindakan
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {openDropdownIndex === index && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => {
                              setShowKembalikanModal(true);
                              setOpenDropdownIndex(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                          >
                            <Undo2 className="w-4 h-4" />
                            Kembalikan
                          </button>
                          <button
                            onClick={() => {
                              setShowPerpanjangModal(true);
                              setOpenDropdownIndex(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                          >
                            <Calendar className="w-4 h-4" />
                            Perpanjang
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kembalikan Modal */}
          {showKembalikanModal && selectedBorrowing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Kembalikan Alat</h3>
                    <button
                      onClick={() => setShowKembalikanModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Peminjam
                      </label>
                      <input
                        type="text"
                        value={selectedBorrowing.borrowerName}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alat yang Dipinjam
                      </label>
                      {selectedBorrowing.tools.map((tool, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          • {tool.name} × {tool.quantity}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kondisi Alat <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {(["Baik", "Rusak Ringan", "Rusak Berat", "Hilang"] as ToolCondition[]).map((condition) => (
                        <button
                          key={condition}
                          onClick={() => setToolCondition(condition)}
                          className={`w-full px-4 py-3 border rounded-lg text-left transition-all ${
                            toolCondition === condition
                              ? "border-blue-900 bg-blue-50"
                              : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan (opsional)
                    </label>
                    <textarea
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Tambahkan catatan kondisi..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowKembalikanModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedBorrowing) return;
                        try {
                          const r = await apiFetch(
                            `${API_BASE}/api/equipment-loans/${encodeURIComponent(selectedBorrowing.backendId)}/status`,
                            {
                              method: "PATCH",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "RETURNED" }),
                            },
                          );
                          if (!r.ok) {
                            const body = (await r.json().catch(() => null)) as { message?: string } | null;
                            throw new Error(body?.message ?? `HTTP ${r.status}`);
                          }
                          await Promise.all([refetchEquipment(), refetchEqLoans()]);
                          setShowKembalikanModal(false);
                          setToolCondition("Baik");
                          setReturnNotes("");
                          await alert("Pengembalian alat berhasil dicatat", { title: "Berhasil" });
                        } catch (err) {
                          await alert(
                            `Gagal mencatat pengembalian: ${err instanceof Error ? err.message : String(err)}`,
                          );
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                    >
                      Konfirmasi Pengembalian
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Perpanjang Modal */}
          {showPerpanjangModal && selectedBorrowing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Perpanjang Peminjaman</h3>
                    <button
                      onClick={() => setShowPerpanjangModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Peminjam
                      </label>
                      <input
                        type="text"
                        value={selectedBorrowing.borrowerName}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alat yang Dipinjam
                      </label>
                      {selectedBorrowing.tools.map((tool, idx) => (
                        <div key={idx} className="text-sm text-gray-700">
                          • {tool.name} × {tool.quantity}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batas Kembali Saat Ini
                      </label>
                      <input
                        type="text"
                        value={`${selectedBorrowing.dueDate} — ${selectedBorrowing.dueTime}`}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Kembali Baru <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={extensionDate}
                      onChange={(e) => setExtensionDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Perpanjangan maksimal 14 hari dari tanggal hari ini.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPerpanjangModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedBorrowing) return;
                        try {
                          const existingEnd = new Date(selectedBorrowing.endDate);
                          const hours = existingEnd.getHours();
                          const minutes = existingEnd.getMinutes();
                          const newEnd = new Date(`${extensionDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
                          if (Number.isNaN(newEnd.getTime())) {
                            await alert("Tanggal perpanjangan tidak valid");
                            return;
                          }
                          const r = await apiFetch(
                            `${API_BASE}/api/equipment-loans/${encodeURIComponent(selectedBorrowing.backendId)}`,
                            {
                              method: "PATCH",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ endDate: newEnd.toISOString() }),
                            },
                          );
                          if (!r.ok) {
                            const body = (await r.json().catch(() => null)) as { message?: string } | null;
                            throw new Error(body?.message ?? `HTTP ${r.status}`);
                          }
                          await refetchEqLoans();
                          setShowPerpanjangModal(false);
                          await alert("Perpanjangan berhasil dicatat", { title: "Berhasil" });
                        } catch (err) {
                          await alert(
                            `Gagal memperpanjang: ${err instanceof Error ? err.message : String(err)}`,
                          );
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
                    >
                      Konfirmasi Perpanjangan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (currentView === "terlambat") {
      return (
        <>
          {/* Toolbar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama atau ID pengguna..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Transaksi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama Peminjam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Alat Dipinjam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Batas Kembali</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Keterlambatan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Denda</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {overdueBorrowings.map((borrowing, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm text-gray-500">{borrowing.id}</td>
                    <td className="py-3 px-4 text-gray-700">{borrowing.borrowerName}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {borrowing.tools[0].name}
                      {borrowing.tools.length > 1 && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          +{borrowing.tools.length - 1} lainnya
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{borrowing.dueDate}</td>
                    <td className="py-3 px-4 text-red-600 font-bold">{borrowing.overdueDays} hari</td>
                    <td className={`py-3 px-4 font-bold ${borrowing.fine > 0 ? "text-red-600" : "text-gray-400"}`}>
                      Rp {borrowing.fine.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          const full = activeBorrowings.find((a) => a.backendId === borrowing.backendId);
                          if (full) {
                            setSelectedBorrowing(full);
                            setShowKembalikanModal(true);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Kembalikan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (currentView === "aset") {
      return (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama atau ID alat..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                onClick={() => {
                  setToolForm({ id: "", name: "", stock: 0, condition: "Baik" });
                  setShowAddToolModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Alat
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Alat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama Alat</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Stok Tersedia</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Stok Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Kondisi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {toolsCatalog.map((tool, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm text-gray-500">{tool.id}</td>
                    <td className="py-3 px-4 text-gray-700">{tool.name}</td>
                    <td className={`py-3 px-4 font-bold ${tool.stock === 0 ? "text-red-600 bg-red-100" : "text-gray-700"}`}>
                      {tool.stock}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{tool.totalStock}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getConditionColor(tool.condition)}`}>
                        {tool.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTool(tool);
                            setToolForm({
                              id: tool.id,
                              name: tool.name,
                              stock: tool.stock,
                              condition: tool.condition,
                            });
                            setShowEditToolModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Tool Modal */}
          {showAddToolModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Tambah Alat Baru</h3>
                    <button
                      onClick={() => setShowAddToolModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Alat <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={toolForm.id}
                        onChange={(e) => setToolForm({ ...toolForm, id: e.target.value })}
                        placeholder="ALT-001"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">ID unik alat. Contoh: ALT-001</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Alat <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={toolForm.name}
                        onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stok Awal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={toolForm.stock}
                        onChange={(e) => setToolForm({ ...toolForm, stock: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kondisi <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={toolForm.condition}
                        onChange={(e) => setToolForm({ ...toolForm, condition: e.target.value as ToolCondition })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>Baik</option>
                        <option>Rusak Ringan</option>
                        <option>Rusak Berat</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddToolModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={async () => {
                        console.log("Tool added:", toolForm);
                        await alert("Alat berhasil ditambahkan!", { title: "Berhasil" });
                        setShowAddToolModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Tool Modal */}
          {showEditToolModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Alat</h3>
                    <button
                      onClick={() => setShowEditToolModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ID Alat</label>
                      <input
                        type="text"
                        value={toolForm.id}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Alat <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={toolForm.name}
                        onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stok <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={toolForm.stock}
                        onChange={(e) => setToolForm({ ...toolForm, stock: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Perbarui stok sesuai kondisi terkini.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kondisi <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={toolForm.condition}
                        onChange={(e) => setToolForm({ ...toolForm, condition: e.target.value as ToolCondition })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>Baik</option>
                        <option>Rusak Ringan</option>
                        <option>Rusak Berat</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowEditToolModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={async () => {
                        console.log("Tool updated:", toolForm);
                        await alert("Alat berhasil diperbarui!", { title: "Berhasil" });
                        setShowEditToolModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import CSV Modal */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Import Data Alat dari CSV</h3>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-8 text-center mb-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 mb-1">Seret file CSV ke sini atau klik untuk memilih</p>
                    <p className="text-xs text-gray-500">Format: ID Alat, Nama Alat, Stok, Kondisi</p>
                  </div>

                  <div className="mb-6">
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-700 underline">
                      Unduh template CSV
                    </a>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (currentView === "riwayat") {
      return (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Dari</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sampai</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="relative">
                <label className="block text-xs text-gray-600 mb-1">&nbsp;</label>
                <input
                  type="text"
                  placeholder="Cari nama atau ID pengguna..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute right-3 bottom-2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Transaksi</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">ID Pengguna</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Detail Peminjaman</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm text-gray-500">{record.id}</td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-500">{record.userId}</td>
                    <td className="py-3 px-4 text-gray-700">{record.userName}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedHistory(record);
                          setShowDetailModal(true);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedHistory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Detail Peminjaman {selectedHistory.id}
                    </h3>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ID Pengguna</label>
                      <input
                        type="text"
                        value={selectedHistory.userId}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                      <input
                        type="text"
                        value={selectedHistory.userName}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Pinjam</label>
                      <input
                        type="text"
                        value={selectedHistory.borrowTime}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waktu Kembali</label>
                      <input
                        type="text"
                        value={selectedHistory.returnTime || "Belum dikembalikan"}
                        readOnly
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                          selectedHistory.returnTime ? "bg-gray-100" : "bg-gray-100 text-red-600"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Daftar Barang</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Nama Alat</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">ID Alat</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Jumlah</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700">Kondisi Kembali</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHistory.tools.map((tool, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2 px-3">{tool.name}</td>
                              <td className="py-2 px-3 font-mono text-sm text-gray-500">{tool.id}</td>
                              <td className="py-2 px-3">{tool.quantity}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getConditionColor(
                                    tool.returnCondition as ToolCondition
                                  )}`}
                                >
                                  {tool.returnCondition}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
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
      title="Peminjaman Alat"
      breadcrumbs={[{ label: "Peminjaman Alat" }]}
      icon={<Wrench className="w-8 h-8 text-white" />}
      sidebarItems={["Transaksi", "Peminjaman Aktif", "Terlambat", "Aset", "Riwayat"]}
      onSidebarItemClick={(item) => {
        if (item === "Transaksi") setCurrentView("transaksi");
        else if (item === "Peminjaman Aktif") setCurrentView("peminjaman-aktif");
        else if (item === "Terlambat") setCurrentView("terlambat");
        else if (item === "Aset") setCurrentView("aset");
        else if (item === "Riwayat") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "transaksi"
          ? "Transaksi"
          : currentView === "peminjaman-aktif"
          ? "Peminjaman Aktif"
          : currentView === "terlambat"
          ? "Terlambat"
          : currentView === "aset"
          ? "Aset"
          : currentView === "riwayat"
          ? "Riwayat"
          : undefined
      }
      hideHeader={!currentView}
    >
      {currentView ? (
        renderContent()
      ) : (
        <div className="max-w-md">
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-cyan-600 to-teal-500 rounded-xl flex items-center justify-center mb-3">
            <Wrench className="w-11 h-11 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Peminjaman Alat</h2>
          <p className="text-sm text-gray-500 mb-5">Peminjaman Peralatan Laboratorium</p>
          <button
            onClick={() => setCurrentView("transaksi")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Peminjaman Alat
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}
