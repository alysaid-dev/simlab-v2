import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Receipt, Search, ScanLine, Plus, X, CheckCircle, Eye, ShoppingBag, Minus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";

interface Item {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  kategori: string;
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
}

const mockItems: Item[] = [
  { id: "HBP-001", nama: "Pulpen", satuan: "Pcs", stok: 45, kategori: "Alat Tulis" },
  { id: "HBP-002", nama: "Kertas HVS A4", satuan: "Rim", stok: 12, kategori: "Kertas" },
  { id: "HBP-003", nama: "Baterai AA", satuan: "Pak", stok: 0, kategori: "Baterai" },
  { id: "HBP-004", nama: "Spidol Whiteboard", satuan: "Pcs", stok: 8, kategori: "Alat Tulis" },
  { id: "HBP-005", nama: "Tisu Meja", satuan: "Pak", stok: 20, kategori: "Perlengkapan Meja" },
  { id: "HBP-006", nama: "Penggaris", satuan: "Pcs", stok: 6, kategori: "Alat Tulis" }
];

const mockTransactions: Transaction[] = [
  {
    id: "TXH-001",
    waktu: "26 Maret 2026, 14:30",
    namaPengguna: "Ahmad Fauzan",
    nim: "20611157",
    barang: [
      { id: "HBP-001", nama: "Pulpen", satuan: "Pcs", jumlah: 2 },
      { id: "HBP-002", nama: "Kertas HVS A4", satuan: "Rim", jumlah: 1 }
    ],
    totalItem: 3
  },
  {
    id: "TXH-002",
    waktu: "26 Maret 2026, 10:15",
    namaPengguna: "Siti Nurhaliza",
    nim: "21611038",
    barang: [
      { id: "HBP-004", nama: "Spidol Whiteboard", satuan: "Pcs", jumlah: 3 }
    ],
    totalItem: 3
  },
  {
    id: "TXH-003",
    waktu: "25 Maret 2026, 16:45",
    namaPengguna: "Budi Santoso",
    nim: "21611055",
    barang: [
      { id: "HBP-005", nama: "Tisu Meja", satuan: "Pak", jumlah: 2 }
    ],
    totalItem: 2
  },
  {
    id: "TXH-004",
    waktu: "25 Maret 2026, 09:20",
    namaPengguna: "Dewi Kusuma",
    nim: "21611019",
    barang: [
      { id: "HBP-001", nama: "Pulpen", satuan: "Pcs", jumlah: 5 },
      { id: "HBP-006", nama: "Penggaris", satuan: "Pcs", jumlah: 2 },
      { id: "HBP-002", nama: "Kertas HVS A4", satuan: "Rim", jumlah: 1 }
    ],
    totalItem: 8
  }
];

// Mock user database
const mockUsers: Record<string, string> = {
  "20611157": "Ahmad Fauzan",
  "21611038": "Siti Nurhaliza",
  "21611042": "Rizky Aditya Pratama",
  "21611055": "Budi Santoso",
  "21611019": "Dewi Kusuma"
};

export default function TransaksiHabisPakai() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  
  // Transaksi Keluar state
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([
    { id: "HBP-001", nama: "Pulpen", satuan: "Pcs", jumlah: 2 },
    { id: "HBP-002", nama: "Kertas HVS A4", satuan: "Rim", jumlah: 1 }
  ]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  
  // Riwayat state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleUserIdChange = (id: string) => {
    setUserId(id);
    if (mockUsers[id]) {
      setUserName(mockUsers[id]);
    } else {
      setUserName("");
    }
  };

  const handleAddToCart = (item: Item) => {
    const quantity = itemQuantities[item.id] || 1;
    
    if (quantity > item.stok) {
      alert("Jumlah melebihi stok yang tersedia");
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
    
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, jumlah: cartItem.jumlah + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, {
        id: item.id,
        nama: item.nama,
        satuan: item.satuan,
        jumlah: 1
      }]);
    }
  };

  const getCategoryBadgeClass = (kategori: string) => {
    switch (kategori) {
      case "Alat Tulis":
        return "bg-blue-100 text-blue-700";
      case "Kertas":
        return "bg-green-100 text-green-700";
      case "Baterai":
        return "bg-yellow-100 text-yellow-700";
      case "Kebersihan":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const handleProcessTransaction = () => {
    if (!userId || !userName || cart.length === 0) {
      alert("Mohon lengkapi ID pengguna dan pilih barang");
      return;
    }
    
    const totalItem = cart.reduce((sum, item) => sum + item.jumlah, 0);
    const newTransaction: Transaction = {
      id: `TXH-${String(transactions.length + 1).padStart(3, '0')}`,
      waktu: new Date().toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      namaPengguna: userName,
      nim: userId,
      barang: [...cart],
      totalItem
    };
    
    setTransactions([newTransaction, ...transactions]);
    setCompletedTransaction(newTransaction);
    setShowSuccess(true);
    
    // Reset form
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
    if (!itemSearchQuery) return mockItems;
    
    return mockItems.filter(item =>
      item.nama.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(itemSearchQuery.toLowerCase())
    );
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;
    
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.namaPengguna.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.nim.includes(searchQuery)
      );
    }
    
    return filtered;
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
                  <p className="text-xs text-gray-500 mt-1">Terisi otomatis</p>
                </div>
              </div>
            </Card>

            {/* Step 2: POS-Style Item Selection */}
            <div className="flex gap-6">
              {/* Left Panel: Item Catalog (60%) */}
              <div className="flex-[3]">
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
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 -mt-3 mb-4">Tekan Enter untuk menambahkan</p>
                  
                  {/* Item Grid */}
                  <div className="grid grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
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
                        
                        {/* Category Badge */}
                        <Badge className={`${getCategoryBadgeClass(item.kategori)} rounded-full text-xs mb-2`}>
                          {item.kategori}
                        </Badge>
                        
                        {/* Stock */}
                        <div className="mb-3">
                          {item.stok === 0 ? (
                            <Badge className="bg-red-100 text-red-600 text-xs">
                              Stok Habis
                            </Badge>
                          ) : (
                            <p className="text-sm text-gray-500">Stok: {item.stok}</p>
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
              <div className="flex-[2]">
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
        const filteredTransactions = getFilteredTransactions();
        
        return (
          <div>
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
                  placeholder="Cari nama pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Transaksi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Waktu</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Pengguna</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Barang Diambil</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Item</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{tx.id}</td>
                        <td className="px-4 py-3 text-sm">{tx.waktu}</td>
                        <td className="px-4 py-3 text-sm font-medium">{tx.namaPengguna}</td>
                        <td className="px-4 py-3 text-sm">{tx.nim}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{tx.barang[0].nama}</span>
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
              {filteredTransactions.length === 0 && (
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nama</p>
                        <p className="font-medium">{selectedTransaction.namaPengguna}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">NIM</p>
                        <p className="font-medium">{selectedTransaction.nim}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Waktu Transaksi</p>
                        <p className="font-medium">{selectedTransaction.waktu}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold mb-2">Barang Diambil</p>
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
                                <td className="px-3 py-2 text-sm">{item.jumlah}</td>
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
      sidebarItems={['Transaksi Keluar', 'Riwayat']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-violet-600 to-purple-500 rounded-xl flex items-center justify-center mb-3">
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
    </PageLayout>
  );
}