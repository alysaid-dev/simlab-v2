import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Receipt, Search, ScanLine, Plus, X, CheckCircle, Eye, ShoppingBag, Minus, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/apiFetch";
import { formatDateTime } from "../lib/format";
import { useDialog } from "../lib/dialog";
import { DaftarBarangPanel } from "../components/DaftarBarangPanel";
import { TerimaBarangPanel } from "../components/TerimaBarangPanel";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface BackendConsumable {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  stock: number;
  minimumStock: number;
}

interface BackendConsumableTransaction {
  id: string;
  consumableId: string;
  userId: string;
  quantity: number;
  type: "IN" | "OUT";
  notes: string | null;
  createdAt: string;
  user?: { id: string; displayName: string; uid: string };
  consumable?: { id: string; name: string; unit: string };
}

interface ListResponse<T> {
  items: T[];
  total: number;
}
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

interface Item {
  id: string;
  code: string | null;
  nama: string;
  satuan: string;
  stok: number;
}

interface CartItem {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
}

interface Transaction {
  id: string;
  waktu: string;
  namaPengguna: string;
  nim: string;
  barang: CartItem[];
  totalItem: number;
  type: "IN" | "OUT";
  notes?: string;
}

export default function TransaksiHabisPakai() {
  const { alert } = useDialog();
  const [activeMenu, setActiveMenu] = useState<string>("");

  // Fetch barang dari /api/consumables.
  const [items, setItems] = useState<Item[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const refetchItems = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/api/consumables`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ListResponse<BackendConsumable>;
      setItems(
        data.items.map((c) => ({
          id: c.id,
          code: c.code,
          nama: c.name,
          satuan: c.unit,
          stok: c.stock,
        })),
      );
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : "Gagal memuat barang");
    }
  };

  useEffect(() => {
    void refetchItems();
  }, []);
  
  // Transaksi Keluar state
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userLookupError, setUserLookupError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeFlash, setBarcodeFlash] = useState<
    | { kind: "success"; message: string }
    | { kind: "unknown"; code: string }
    | null
  >(null);

  // Quick-add modal state — muncul saat scan barcode yang tidak dikenal dan
  // laboran klik "Tambah sebagai barang baru".
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    code: "",
    name: "",
    unit: "",
    stock: 0,
    minimumStock: 0,
  });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  // Riwayat state — di-load dari backend saat tab dibuka.
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Lookup nama dari NIM lewat /api/users?search=<uid>. Dipakai saat
  // laboran scan barcode ID mahasiswa. Kosongkan nama kalau tidak ketemu.
  const handleUserIdChange = async (id: string) => {
    setUserId(id);
    setUserName("");
    setUserLookupError(null);
    const trimmed = id.trim();
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
      if (match) {
        setUserName(match.displayName);
      } else {
        setUserLookupError("Pengguna tidak ditemukan");
      }
    } catch (err) {
      setUserLookupError(
        err instanceof Error ? err.message : "Gagal cek pengguna",
      );
    }
  };

  // Transform backend tx → group ke "Transaction" (1 row per createdAt+user
  // bundle). Karena backend simpan 1 row per consumable, transaksi yang
  // awalnya multi-item jadi multiple rows — gabungkan via (userId + menit).
  const mapBackendTransactions = (
    rows: BackendConsumableTransaction[],
  ): Transaction[] => {
    const buckets = new Map<string, Transaction>();
    for (const row of rows) {
      // Bucket by user + type + minute — supaya IN & OUT dari sesi yang sama
      // tidak bercampur.
      const bucketKey = `${row.userId}__${row.type}__${row.createdAt.slice(0, 16)}`;
      const existing = buckets.get(bucketKey);
      const line: CartItem = {
        id: row.consumableId,
        nama: row.consumable?.name ?? "-",
        satuan: row.consumable?.unit ?? "",
        jumlah: row.quantity,
      };
      if (existing) {
        existing.barang.push(line);
        existing.totalItem += row.quantity;
      } else {
        buckets.set(bucketKey, {
          id: `TX${row.type === "IN" ? "I" : "O"}-${row.id.slice(0, 6).toUpperCase()}`,
          waktu: formatDateTime(row.createdAt),
          namaPengguna: row.user?.displayName ?? "-",
          nim: row.user?.uid ?? "-",
          barang: [line],
          totalItem: row.quantity,
          type: row.type,
          notes: row.notes ?? undefined,
        });
      }
    }
    return Array.from(buckets.values());
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    setTxError(null);
    try {
      const params = new URLSearchParams({ take: "500" });
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (dateFrom) params.set("dateFrom", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.set("dateTo", end.toISOString());
      }
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const r = await apiFetch(
        `${API_BASE}/api/consumables/transactions?${params.toString()}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ListResponse<BackendConsumableTransaction>;
      setTransactions(mapBackendTransactions(data.items));
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Gagal memuat riwayat");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === "Riwayat") void fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu, typeFilter]);

  const handleAddToCart = async (item: Item) => {
    const quantity = itemQuantities[item.id] || 1;

    if (quantity > item.stok) {
      await alert("Jumlah melebihi stok yang tersedia");
      return;
    }
    
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, jumlah: cartItem.jumlah + quantity }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        nama: item.nama,
        satuan: item.satuan,
        jumlah: quantity
      }]);
    }
    
    // Reset quantity for this item
    setItemQuantities({ ...itemQuantities, [item.id]: 1 });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleIncreaseQuantity = (itemId: string) => {
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, jumlah: item.jumlah + 1 }
        : item
    ));
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, jumlah: Math.max(1, item.jumlah - 1) }
        : item
    ));
  };

  const handleQuickAdd = (item: Item) => {
    if (item.stok === 0) return;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.id === item.id ? { ...ci, jumlah: ci.jumlah + 1 } : ci,
        );
      }
      return [
        ...prev,
        { id: item.id, nama: item.nama, satuan: item.satuan, jumlah: 1 },
      ];
    });
  };

  // Dipanggil saat scanner kirim Enter di input barcode. Cari item by code
  // (case-insensitive). Ketemu → quickAdd +1. Tidak ketemu → tampilkan
  // banner kuning dengan tombol quick-add modal (pola B).
  const handleBarcodeSubmit = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const match = items.find(
      (it) => (it.code ?? "").toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      if (match.stok <= 0) {
        setBarcodeFlash({
          kind: "unknown",
          code: `${match.nama} — stok habis`,
        });
      } else {
        handleQuickAdd(match);
        setBarcodeFlash({
          kind: "success",
          message: `+1 ${match.nama}`,
        });
      }
    } else {
      setBarcodeFlash({ kind: "unknown", code });
    }
    setBarcodeInput("");
  };

  const openQuickAdd = (prefillCode: string) => {
    setQuickAddForm({
      code: prefillCode,
      name: "",
      unit: "",
      stock: 0,
      minimumStock: 0,
    });
    setQuickAddOpen(true);
  };

  const submitQuickAdd = async () => {
    if (!quickAddForm.name.trim() || !quickAddForm.unit.trim()) return;
    setQuickAddSaving(true);
    try {
      const payload = {
        code: quickAddForm.code.trim() || null,
        name: quickAddForm.name.trim(),
        unit: quickAddForm.unit.trim(),
        stock: quickAddForm.stock,
        minimumStock: quickAddForm.minimumStock,
      };
      const r = await apiFetch(`${API_BASE}/api/consumables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${r.status}`);
      }
      const created = (await r.json()) as BackendConsumable;
      const newItem: Item = {
        id: created.id,
        code: created.code,
        nama: created.name,
        satuan: created.unit,
        stok: created.stock,
      };
      setItems((prev) => [...prev, newItem]);
      if (newItem.stok > 0) handleQuickAdd(newItem);
      setBarcodeFlash({
        kind: "success",
        message: `Barang baru "${newItem.nama}" ditambahkan${newItem.stok > 0 ? " ke keranjang" : " (stok 0)"}`,
      });
      setQuickAddOpen(false);
    } catch (err) {
      await alert(
        `Gagal menambah barang: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setQuickAddSaving(false);
    }
  };

  const handleProcessTransaction = async () => {
    if (!userId || !userName || cart.length === 0) {
      await alert("Mohon lengkapi ID pengguna dan pilih barang");
      return;
    }

    // POST satu transaksi OUT per item di cart — backend tidak punya endpoint
    // bulk, jadi kita fire serial.
    try {
      const res = await apiFetch(
        `${API_BASE}/api/consumables/transactions/bulk`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUid: userId,
            lines: cart.map((line) => ({
              consumableId: line.id,
              quantity: line.jumlah,
            })),
          }),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      await alert(
        `Gagal mencatat transaksi: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    const totalItem = cart.reduce((sum, item) => sum + item.jumlah, 0);
    const newTransaction: Transaction = {
      id: `TXH-${Date.now().toString(36).toUpperCase()}`,
      waktu: formatDateTime(new Date().toISOString()),
      namaPengguna: userName,
      nim: userId,
      barang: [...cart],
      totalItem,
      type: "OUT",
    };
    setCompletedTransaction(newTransaction);
    setShowSuccess(true);

    // Refetch stok & invalidate riwayat cache.
    void refetchItems();
    setTransactions([]);

    // Reset form.
    setUserId("");
    setUserName("");
    setCart([]);
    setItemQuantities({});
  };

  const handleNewTransaction = () => {
    setShowSuccess(false);
    setCompletedTransaction(null);
  };

  const handleViewDetail = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  const getFilteredItems = () => {
    if (!itemSearchQuery) return items;
    
    return items.filter(item =>
      item.nama.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "Transaksi Keluar":
        if (showSuccess && completedTransaction) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Transaksi Berhasil Dicatat!</h2>
              </div>
              
              <Card className="p-6 text-left">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nama Pengguna</p>
                    <p className="font-medium">{completedTransaction.namaPengguna}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIM</p>
                    <p className="font-medium">{completedTransaction.nim}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Barang Diambil</p>
                    <div className="space-y-1">
                      {completedTransaction.barang.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.nama}</span>
                          <span className="text-gray-600">{item.jumlah} {item.satuan}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Waktu Transaksi</p>
                    <p className="font-medium">{completedTransaction.waktu}</p>
                  </div>
                </div>
              </Card>
              
              <Button onClick={handleNewTransaction} className="mt-6">
                Transaksi Baru
              </Button>
            </div>
          );
        }
        
        const filteredItems = getFilteredItems();
        const totalCartItems = cart.reduce((sum, item) => sum + item.jumlah, 0);
        
        return (
          <div className="space-y-6">
            {/* Step 1: User ID */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">1. Identitas Pengguna</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="userId">ID Mahasiswa / Pengguna</Label>
                  <div className="relative">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="userId"
                      value={userId}
                      onChange={(e) => handleUserIdChange(e.target.value)}
                      placeholder="Scan atau masukkan ID Mahasiswa / Pengguna"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="userName">Nama</Label>
                  <Input
                    id="userName"
                    value={userName}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {userLookupError ? (
                      <span className="text-red-600">{userLookupError}</span>
                    ) : (
                      "Terisi otomatis"
                    )}
                  </p>
                </div>
              </div>
            </Card>

            {/* Step 2: POS-Style Item Selection */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Panel: Item Catalog (60%) */}
              <div className="w-full lg:flex-[3] min-w-0">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">2. Pilih Barang</h3>
                  
                  {/* Top Bar: Search and Barcode Inputs */}
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Cari nama barang..."
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="w-52 relative">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Scan atau input kode barang..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBarcodeSubmit();
                          }
                        }}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 -mt-3 mb-4">
                    Tekan Enter / scan — 1 scan = +1 qty
                  </p>

                  {barcodeFlash?.kind === "success" && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-center justify-between">
                      <span>✓ {barcodeFlash.message}</span>
                      <button
                        onClick={() => setBarcodeFlash(null)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {barcodeFlash?.kind === "unknown" && (
                    <div className="mb-4 px-3 py-3 rounded-lg bg-yellow-50 border border-yellow-300 text-sm text-yellow-900 flex items-center justify-between gap-3">
                      <div>
                        <strong>Barcode tidak dikenal:</strong>{" "}
                        <code className="bg-yellow-100 px-1.5 py-0.5 rounded text-xs">
                          {barcodeFlash.code}
                        </code>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openQuickAdd(barcodeFlash.code)}
                        >
                          Tambah sebagai barang baru
                        </Button>
                        <button
                          onClick={() => setBarcodeFlash(null)}
                          className="text-yellow-700 hover:text-yellow-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Item Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`relative border rounded-xl p-4 transition-all ${
                          item.stok === 0 
                            ? 'bg-gray-50 opacity-50' 
                            : 'bg-white hover:shadow-md hover:scale-[1.02]'
                        }`}
                      >
                        {/* Item Name */}
                        <p className="font-medium text-gray-900 mb-2">{item.nama}</p>

                        {/* Stock */}
                        <div className="mb-3">
                          {item.stok === 0 ? (
                            <Badge className="bg-red-100 text-red-600 text-xs">
                              Stok Habis
                            </Badge>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Stok: {item.stok} {item.satuan}
                            </p>
                          )}
                        </div>
                        
                        {/* Add Button */}
                        {item.stok > 0 && (
                          <button
                            onClick={() => handleQuickAdd(item)}
                            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-blue-900 hover:bg-blue-800 flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Panel: Keranjang (40%) */}
              <div className="w-full lg:flex-[2] min-w-0">
                <Card className="sticky top-6 border-l border-gray-200 h-fit max-h-[700px] flex flex-col">
                  {/* Panel Header */}
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">Keranjang</h3>
                      <Badge className="bg-blue-100 text-blue-700 rounded-full text-xs">
                        {cart.length} item
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Cart Item List */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <ShoppingBag className="w-16 h-16 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-400">Belum ada barang dipilih.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cart.map((item, index) => (
                          <div key={item.id}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{item.nama}</p>
                              </div>
                              
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDecreaseQuantity(item.id)}
                                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                  <Minus className="w-3 h-3 text-gray-600" />
                                </button>
                                
                                <span className="min-w-8 text-center font-medium text-sm">
                                  {item.jumlah}
                                </span>
                                
                                <button
                                  onClick={() => handleIncreaseQuantity(item.id)}
                                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                >
                                  <Plus className="w-3 h-3 text-gray-600" />
                                </button>
                                
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="ml-2 p-1.5 hover:bg-red-50 rounded transition-colors"
                                >
                                  <X className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                            
                            {index < cart.length - 1 && (
                              <div className="border-t border-gray-100 mt-3" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Panel Footer */}
                  <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between mb-4">
                      <span className="font-semibold text-gray-700">Total Item</span>
                      <span className="font-semibold text-gray-900">{totalCartItems}</span>
                    </div>
                    
                    <Button 
                      onClick={handleProcessTransaction}
                      className="w-full bg-blue-900 hover:bg-blue-800 rounded-lg h-11"
                      disabled={!userId || !userName || cart.length === 0}
                    >
                      Proses Transaksi
                    </Button>
                    
                    <p className="text-xs text-gray-400 text-center mt-3">
                      Stok akan otomatis berkurang setelah transaksi diproses.
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );

      case "Riwayat":
        return (
          <div>
            {/* Filter type tabs */}
            <div className="mb-4 flex gap-2">
              {(["ALL", "IN", "OUT"] as const).map((t) => (
                <Button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  variant={typeFilter === t ? "default" : "outline"}
                  size="sm"
                >
                  {t === "ALL" ? "Semua" : t === "IN" ? "Masuk" : "Keluar"}
                </Button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex gap-2">
                <div>
                  <Label htmlFor="dateFrom" className="text-xs">Dari</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-xs">Sampai</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 max-w-md relative ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama / NIM / barang / catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void fetchTransactions();
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => void fetchTransactions()} variant="secondary">
                Terapkan
              </Button>
            </div>

            {txLoading && (
              <div className="flex items-center justify-center gap-3 p-6 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                Memuat riwayat...
              </div>
            )}

            {txError && !txLoading && (
              <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                Gagal memuat: {txError}
              </div>
            )}

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Transaksi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipe</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Waktu</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pengguna / Pencatat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM / ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Barang</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Item</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{tx.id}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            className={
                              tx.type === "IN"
                                ? "bg-green-100 text-green-800 text-xs"
                                : "bg-orange-100 text-orange-800 text-xs"
                            }
                          >
                            {tx.type === "IN" ? "Masuk" : "Keluar"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{tx.waktu}</td>
                        <td className="px-4 py-3 text-sm font-medium">{tx.namaPengguna}</td>
                        <td className="px-4 py-3 text-sm">{tx.nim}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{tx.barang[0]?.nama ?? "-"}</span>
                            {tx.barang.length > 1 && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                +{tx.barang.length - 1} lainnya
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{tx.totalItem}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleViewDetail(tx)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada transaksi yang ditemukan
                </div>
              )}
            </Card>

            {/* Detail Modal */}
            <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Detail Transaksi {selectedTransaction?.id}</DialogTitle>
                  <DialogDescription className="sr-only">
                    Detail lengkap dari transaksi barang habis pakai
                  </DialogDescription>
                </DialogHeader>
                {selectedTransaction && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Tipe</p>
                        <p className="font-medium">
                          {selectedTransaction.type === "IN" ? "Masuk (Penerimaan)" : "Keluar (Pengeluaran)"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Waktu Transaksi</p>
                        <p className="font-medium">{selectedTransaction.waktu}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          {selectedTransaction.type === "IN" ? "Dicatat Oleh" : "Pengguna"}
                        </p>
                        <p className="font-medium">{selectedTransaction.namaPengguna}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">NIM / ID</p>
                        <p className="font-medium">{selectedTransaction.nim}</p>
                      </div>
                      {selectedTransaction.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">Catatan</p>
                          <p className="font-medium whitespace-pre-wrap">
                            {selectedTransaction.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">Rincian Barang</p>
                      <Card className="overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Nama Barang</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Satuan</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {selectedTransaction.barang.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-3 py-2 text-sm">{item.nama}</td>
                                <td className="px-3 py-2 text-sm">{item.satuan}</td>
                                <td className="px-3 py-2 text-sm">
                                  {selectedTransaction.type === "IN" ? "+" : "−"}{item.jumlah}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => setDetailModalOpen(false)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Terima Barang":
        return <TerimaBarangPanel onChanged={() => void refetchItems()} />;

      case "Daftar Barang":
        return <DaftarBarangPanel onChanged={() => void refetchItems()} />;

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Transaksi Habis Pakai"
      breadcrumbs={[
        { label: "Transaksi Habis Pakai" },
        ...(activeMenu ? [{ label: activeMenu }] : [])
      ]}
      icon={<Receipt className="w-8 h-8 text-white" />}
      sidebarItems={['Transaksi Keluar', 'Terima Barang', 'Daftar Barang', 'Riwayat']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
            <Receipt className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Transaksi Habis Pakai</h2>
          <p className="text-sm text-gray-500 mb-5">Transaksi Barang Habis Pakai</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Transaksi Keluar")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Transaksi Habis Pakai
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Barang Baru</DialogTitle>
            <DialogDescription>
              Barcode belum terdaftar. Lengkapi detail barang — stok awal bisa dikosongkan (0) dan diisi saat restock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="qa-code">Kode Barcode</Label>
              <Input
                id="qa-code"
                value={quickAddForm.code}
                onChange={(e) =>
                  setQuickAddForm((f) => ({ ...f, code: e.target.value }))
                }
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="qa-name">Nama Barang *</Label>
              <Input
                id="qa-name"
                value={quickAddForm.name}
                onChange={(e) =>
                  setQuickAddForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="qa-unit">Satuan *</Label>
              <Input
                id="qa-unit"
                value={quickAddForm.unit}
                onChange={(e) =>
                  setQuickAddForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="pcs, botol, lembar..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qa-stock">Stok Awal</Label>
                <Input
                  id="qa-stock"
                  type="number"
                  min={0}
                  value={quickAddForm.stock}
                  onChange={(e) =>
                    setQuickAddForm((f) => ({
                      ...f,
                      stock: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="qa-min">Min. Stok</Label>
                <Input
                  id="qa-min"
                  type="number"
                  min={0}
                  value={quickAddForm.minimumStock}
                  onChange={(e) =>
                    setQuickAddForm((f) => ({
                      ...f,
                      minimumStock: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickAddOpen(false)}
              disabled={quickAddSaving}
            >
              Batal
            </Button>
            <Button
              onClick={() => void submitQuickAdd()}
              disabled={
                quickAddSaving ||
                !quickAddForm.name.trim() ||
                !quickAddForm.unit.trim()
              }
            >
              {quickAddSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan & Tambahkan ke Keranjang"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}