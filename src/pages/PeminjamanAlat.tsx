import { useState } from "react";
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
} from "lucide-react";

type View = "transaksi" | "peminjaman-aktif" | "terlambat" | "aset" | "riwayat";
type ToolCategory = "Elektronik" | "Optik" | "Audio" | "Mekanik" | "Lainnya";
type ToolCondition = "Baik" | "Rusak Ringan" | "Rusak Berat" | "Hilang";
type BorrowStatus = "Normal" | "Mendekati" | "Terlambat";

interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
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
  borrowerName: string;
  tools: { name: string; quantity: number }[];
  dueDate: string;
  dueTime: string;
  status: BorrowStatus;
}

interface OverdueBorrowing {
  id: string;
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
  const [currentView, setCurrentView] = useState<View | null>(null);

  // Transaksi states
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [returnDate, setReturnDate] = useState("2026-04-15");
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
    category: "Elektronik" as ToolCategory,
    stock: 0,
    condition: "Baik" as ToolCondition,
  });

  // Riwayat states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-15");

  // Mock data for tools catalog
  const toolsCatalog: Tool[] = [
    { id: "ALT-001", name: "Multimeter Digital", category: "Elektronik", stock: 8, totalStock: 8, condition: "Baik" },
    { id: "ALT-002", name: "Osiloskop", category: "Elektronik", stock: 3, totalStock: 3, condition: "Baik" },
    { id: "ALT-003", name: "Solder", category: "Elektronik", stock: 12, totalStock: 12, condition: "Baik" },
    { id: "ALT-004", name: "Tripod Kamera", category: "Optik", stock: 5, totalStock: 5, condition: "Baik" },
    { id: "ALT-005", name: "Mikrofon Kondenser", category: "Audio", stock: 0, totalStock: 4, condition: "Rusak Ringan" },
    { id: "ALT-006", name: "Tang Kombinasi", category: "Mekanik", stock: 10, totalStock: 10, condition: "Baik" },
  ];

  // Mock data for active borrowings
  const activeBorrowings: ActiveBorrowing[] = [
    {
      id: "TRX-ALT-001",
      borrowerName: "Ahmad Fauzan",
      tools: [
        { name: "Multimeter Digital", quantity: 1 },
        { name: "Solder", quantity: 2 },
      ],
      dueDate: "Kamis, 17 April 2026",
      dueTime: "16:00",
      status: "Normal",
    },
    {
      id: "TRX-ALT-002",
      borrowerName: "Dewi Lestari",
      tools: [{ name: "Osiloskop", quantity: 1 }],
      dueDate: "Rabu, 16 April 2026",
      dueTime: "14:00",
      status: "Mendekati",
    },
    {
      id: "TRX-ALT-003",
      borrowerName: "Rizal Maulana",
      tools: [{ name: "Tang Kombinasi", quantity: 1 }],
      dueDate: "Senin, 14 April 2026",
      dueTime: "10:00",
      status: "Terlambat",
    },
    {
      id: "TRX-ALT-004",
      borrowerName: "Siti Aminah",
      tools: [{ name: "Tripod Kamera", quantity: 1 }],
      dueDate: "Jumat, 18 April 2026",
      dueTime: "15:00",
      status: "Normal",
    },
    {
      id: "TRX-ALT-005",
      borrowerName: "Budi Santoso",
      tools: [{ name: "Solder", quantity: 1 }],
      dueDate: "Rabu, 16 April 2026",
      dueTime: "16:00",
      status: "Mendekati",
    },
  ];

  // Mock data for overdue borrowings
  const overdueBorrowings: OverdueBorrowing[] = [
    {
      id: "TRX-ALT-003",
      borrowerName: "Rizal Maulana",
      tools: [{ name: "Tang Kombinasi", quantity: 1 }],
      dueDate: "Senin, 14 April 2026 — 10:00",
      overdueDays: 3,
      fine: 15000,
    },
    {
      id: "TRX-ALT-006",
      borrowerName: "Hendra Wijaya",
      tools: [{ name: "Multimeter Digital", quantity: 1 }],
      dueDate: "Selasa, 15 April 2026 — 16:00",
      overdueDays: 1,
      fine: 5000,
    },
    {
      id: "TRX-ALT-007",
      borrowerName: "Putri Ayu",
      tools: [
        { name: "Solder", quantity: 2 },
        { name: "Tripod Kamera", quantity: 1 },
      ],
      dueDate: "Minggu, 13 April 2026 — 12:00",
      overdueDays: 5,
      fine: 25000,
    },
  ];

  // Mock data for history
  const historyRecords: HistoryRecord[] = [
    {
      id: "TRX-ALT-008",
      userId: "20611001",
      userName: "Fajar Nugraha",
      tools: [
        { name: "Multimeter Digital", id: "ALT-001", quantity: 1, returnCondition: "Baik" },
        { name: "Solder", id: "ALT-003", quantity: 2, returnCondition: "Baik" },
      ],
      borrowTime: "Senin, 8 April 2026 — 09:00",
      returnTime: "Rabu, 10 April 2026 — 15:30",
    },
    {
      id: "TRX-ALT-009",
      userId: "20611002",
      userName: "Laila Fitriani",
      tools: [{ name: "Osiloskop", id: "ALT-002", quantity: 1, returnCondition: "Baik" }],
      borrowTime: "Selasa, 9 April 2026 — 10:00",
      returnTime: "Kamis, 11 April 2026 — 14:00",
    },
    {
      id: "TRX-ALT-010",
      userId: "20611003",
      userName: "Deni Pratama",
      tools: [{ name: "Tang Kombinasi", id: "ALT-006", quantity: 1, returnCondition: "Baik" }],
      borrowTime: "Rabu, 10 April 2026 — 11:00",
      returnTime: "Jumat, 12 April 2026 — 16:00",
    },
    {
      id: "TRX-ALT-011",
      userId: "20611004",
      userName: "Maya Sari",
      tools: [{ name: "Tripod Kamera", id: "ALT-004", quantity: 1, returnCondition: "Baik" }],
      borrowTime: "Kamis, 11 April 2026 — 13:00",
      returnTime: "Sabtu, 13 April 2026 — 10:00",
    },
    {
      id: "TRX-ALT-012",
      userId: "20611005",
      userName: "Yusuf Hidayat",
      tools: [{ name: "Solder", id: "ALT-003", quantity: 1, returnCondition: "Rusak Ringan" }],
      borrowTime: "Jumat, 12 April 2026 — 14:00",
      returnTime: "Minggu, 14 April 2026 — 12:00",
    },
  ];

  const handleUserIdChange = (value: string) => {
    setUserId(value);
    // Auto-fill name based on ID (mock data)
    if (value === "20611001") {
      setUserName("Ahmad Fauzan");
    } else if (value) {
      setUserName("Mahasiswa Test");
    } else {
      setUserName("");
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

  const handleSubmitTransaction = () => {
    console.log("Transaction submitted:", { userId, userName, cart, returnDate, returnTime });
    setShowSuccess(true);
  };

  const handleNewTransaction = () => {
    setShowSuccess(false);
    setUserId("");
    setUserName("");
    setCart([]);
    setReturnDate("2026-04-15");
    setReturnTime("16:00");
  };

  const getCategoryColor = (category: ToolCategory) => {
    switch (category) {
      case "Elektronik":
        return "bg-blue-100 text-blue-700";
      case "Optik":
        return "bg-purple-100 text-purple-700";
      case "Audio":
        return "bg-pink-100 text-pink-700";
      case "Mekanik":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
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
                    <p className="font-medium text-sm text-gray-900 mb-1">{tool.name}</p>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded ${getCategoryColor(tool.category)} mb-2`}
                    >
                      {tool.category}
                    </span>
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
                    disabled={!userId || cart.length === 0}
                    className="w-full px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Catat Transaksi
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
                      onClick={() => {
                        console.log("Return confirmed:", toolCondition, returnNotes);
                        alert("Alat berhasil dikembalikan!");
                        setShowKembalikanModal(false);
                        setToolCondition("Baik");
                        setReturnNotes("");
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
                      onClick={() => {
                        console.log("Extension confirmed:", extensionDate);
                        alert("Peminjaman berhasil diperpanjang!");
                        setShowPerpanjangModal(false);
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
                          setSelectedBorrowing({
                            id: borrowing.id,
                            borrowerName: borrowing.borrowerName,
                            tools: borrowing.tools,
                            dueDate: borrowing.dueDate,
                            dueTime: "",
                            status: "Terlambat",
                          });
                          setShowKembalikanModal(true);
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
                  setToolForm({ id: "", name: "", category: "Elektronik", stock: 0, condition: "Baik" });
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Kategori</th>
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
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(tool.category)}`}>
                        {tool.category}
                      </span>
                    </td>
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
                              category: tool.category,
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
                        Kategori <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={toolForm.category}
                        onChange={(e) => setToolForm({ ...toolForm, category: e.target.value as ToolCategory })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>Elektronik</option>
                        <option>Optik</option>
                        <option>Audio</option>
                        <option>Mekanik</option>
                        <option>Lainnya</option>
                      </select>
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
                      onClick={() => {
                        console.log("Tool added:", toolForm);
                        alert("Alat berhasil ditambahkan!");
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
                        Kategori <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={toolForm.category}
                        onChange={(e) => setToolForm({ ...toolForm, category: e.target.value as ToolCategory })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option>Elektronik</option>
                        <option>Optik</option>
                        <option>Audio</option>
                        <option>Mekanik</option>
                        <option>Lainnya</option>
                      </select>
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
                      onClick={() => {
                        console.log("Tool updated:", toolForm);
                        alert("Alat berhasil diperbarui!");
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
                    <p className="text-xs text-gray-500">Format: ID Alat, Nama Alat, Kategori, Stok, Kondisi</p>
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
