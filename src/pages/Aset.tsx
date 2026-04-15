import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Package, Search, Plus, Pencil, Wrench, Trash2, CheckCircle, AlertCircle, Eye, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

interface Asset {
  id: string;
  nama: string;
  kategori: "Laptop" | "Proyektor" | "Kamera" | "Peralatan Lab";
  kondisi: "Baik" | "Cukup" | "Rusak";
  status: "Tersedia" | "Dipinjam" | "Maintenance";
  maintenanceSejak?: string;
}

interface BorrowingHistory {
  no: number;
  namaPeminjam: string;
  nim: string;
  jenis: "Tugas Akhir" | "Praktikum";
  tanggalPinjam: string;
  tanggalKembali: string;
}

interface CurrentBorrower {
  namaPeminjam: string;
  nim: string;
  batasKembali: string;
  jenis: "Tugas Akhir" | "Praktikum";
}

// Mock borrowing history data
const mockBorrowingHistory: Record<string, BorrowingHistory[]> = {
  "AST-003": [
    {
      no: 1,
      namaPeminjam: "Siti Nurhaliza",
      nim: "21611038",
      jenis: "Praktikum",
      tanggalPinjam: "15 Februari 2026",
      tanggalKembali: "15 Februari 2026"
    },
    {
      no: 2,
      namaPeminjam: "Ahmad Fauzi",
      nim: "21611025",
      jenis: "Tugas Akhir",
      tanggalPinjam: "8 Februari 2026",
      tanggalKembali: "22 Februari 2026"
    },
    {
      no: 3,
      namaPeminjam: "Dewi Kusuma",
      nim: "21611019",
      jenis: "Praktikum",
      tanggalPinjam: "1 Februari 2026",
      tanggalKembali: "1 Februari 2026"
    }
  ],
  "AST-007": [
    {
      no: 1,
      namaPeminjam: "Budi Santoso",
      nim: "21611055",
      jenis: "Praktikum",
      tanggalPinjam: "10 Maret 2026",
      tanggalKembali: "10 Maret 2026"
    },
    {
      no: 2,
      namaPeminjam: "Lestari Wulandari",
      nim: "21611048",
      jenis: "Tugas Akhir",
      tanggalPinjam: "5 Maret 2026",
      tanggalKembali: "19 Maret 2026"
    }
  ]
};

// Mock current borrower data
const mockCurrentBorrower: Record<string, CurrentBorrower> = {
  "AST-003": {
    namaPeminjam: "Rizky Aditya Pratama",
    nim: "21611042",
    batasKembali: "2 April 2026 16:00",
    jenis: "Tugas Akhir"
  },
  "AST-002": {
    namaPeminjam: "Anisa Rahma Putri",
    nim: "21611033",
    batasKembali: "30 Maret 2026 16:00",
    jenis: "Praktikum"
  },
  "AST-007": {
    namaPeminjam: "Fajar Ramadhan",
    nim: "21611061",
    batasKembali: "28 Maret 2026 16:00",
    jenis: "Tugas Akhir"
  }
};

const mockAssets: Asset[] = [
  {
    id: "AST-001",
    nama: "Laptop Dell Latitude 5420",
    kategori: "Laptop",
    kondisi: "Baik",
    status: "Tersedia"
  },
  {
    id: "AST-002",
    nama: "Laptop HP ProBook 450 G8",
    kategori: "Laptop",
    kondisi: "Baik",
    status: "Dipinjam"
  },
  {
    id: "AST-003",
    nama: "Kamera Sony ZV-E10",
    kategori: "Kamera",
    kondisi: "Baik",
    status: "Dipinjam"
  },
  {
    id: "AST-004",
    nama: "Kamera Canon EOS 90D",
    kategori: "Kamera",
    kondisi: "Baik",
    status: "Maintenance",
    maintenanceSejak: "15 Maret 2026"
  },
  {
    id: "AST-005",
    nama: "Mikroskop Digital Zeiss",
    kategori: "Peralatan Lab",
    kondisi: "Baik",
    status: "Tersedia"
  },
  {
    id: "AST-006",
    nama: "Laptop Lenovo ThinkPad X1",
    kategori: "Laptop",
    kondisi: "Rusak",
    status: "Maintenance",
    maintenanceSejak: "18 Maret 2026"
  },
  {
    id: "AST-007",
    nama: "Proyektor Epson EB-X41",
    kategori: "Proyektor",
    kondisi: "Baik",
    status: "Tersedia"
  },
  {
    id: "AST-008",
    nama: "Spektrofotometer UV-Vis",
    kategori: "Peralatan Lab",
    kondisi: "Cukup",
    status: "Tersedia"
  }
];

export default function Aset() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Tersedia" | "Dipinjam" | "Maintenance">("Semua");
  
  // Add/Edit Asset Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Detail Peminjaman view
  const [viewingAssetDetail, setViewingAssetDetail] = useState<Asset | null>(null);
  
  // Form fields
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKategori, setFormKategori] = useState<Asset["kategori"]>("Laptop");
  const [formKondisi, setFormKondisi] = useState<Asset["kondisi"]>("Baik");
  const [formDeskripsi, setFormDeskripsi] = useState("");

  const handleAddAsset = () => {
    setFormId("");
    setFormNama("");
    setFormKategori("Laptop");
    setFormKondisi("Baik");
    setFormDeskripsi("");
    setAddModalOpen(true);
  };

  const handleSaveNewAsset = () => {
    const newAsset: Asset = {
      id: formId,
      nama: formNama,
      kategori: formKategori,
      kondisi: formKondisi,
      status: "Tersedia"
    };
    setAssets([...assets, newAsset]);
    setAddModalOpen(false);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormId(asset.id);
    setFormNama(asset.nama);
    setFormKategori(asset.kategori);
    setFormKondisi(asset.kondisi);
    setFormDeskripsi("");
    setEditModalOpen(true);
  };

  const handleSaveEditAsset = () => {
    if (selectedAsset) {
      const updatedAssets = assets.map(asset => {
        if (asset.id === selectedAsset.id) {
          return {
            ...asset,
            nama: formNama,
            kategori: formKategori,
            kondisi: formKondisi
          };
        }
        return asset;
      });
      setAssets(updatedAssets);
      setEditModalOpen(false);
      setSelectedAsset(null);
    }
  };

  const handleSetMaintenance = (asset: Asset) => {
    const updatedAssets = assets.map(a => {
      if (a.id === asset.id) {
        return {
          ...a,
          status: "Maintenance" as const,
          maintenanceSejak: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })
        };
      }
      return a;
    });
    setAssets(updatedAssets);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus aset ini?")) {
      setAssets(assets.filter(asset => asset.id !== assetId));
    }
  };

  const handleMarkMaintenanceComplete = (assetId: string) => {
    const updatedAssets = assets.map(asset => {
      if (asset.id === assetId) {
        return {
          ...asset,
          status: "Tersedia" as const,
          maintenanceSejak: undefined
        };
      }
      return asset;
    });
    setAssets(updatedAssets);
  };

  const getStatusBadge = (status: Asset["status"]) => {
    switch (status) {
      case "Tersedia":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Tersedia</Badge>;
      case "Dipinjam":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Dipinjam</Badge>;
      case "Maintenance":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Maintenance</Badge>;
    }
  };

  const getFilteredAssets = () => {
    let filtered = assets;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(asset => 
        asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.nama.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== "Semua") {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }
    
    return filtered;
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "Daftar Aset":
        // Show detail view if an asset is selected
        if (viewingAssetDetail) {
          const currentBorrower = mockCurrentBorrower[viewingAssetDetail.id];
          const history = mockBorrowingHistory[viewingAssetDetail.id] || [];
          
          const getJenisBadge = (jenis: "Tugas Akhir" | "Praktikum") => {
            return jenis === "Tugas Akhir" ? (
              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Tugas Akhir</Badge>
            ) : (
              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Praktikum</Badge>
            );
          };
          
          return (
            <div>
              {/* Back button */}
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => setViewingAssetDetail(null)}
                  className="text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Daftar Aset
                </Button>
              </div>

              {/* Asset Info Card */}
              <Card className="bg-gray-50 p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Informasi Aset</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">ID Aset</p>
                    <p className="font-mono text-sm font-medium">{viewingAssetDetail.id}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Nama Aset</p>
                    <p className="font-medium">{viewingAssetDetail.nama}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kategori</p>
                    <p className="font-medium">{viewingAssetDetail.kategori}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kondisi</p>
                    <p className="font-medium">{viewingAssetDetail.kondisi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">{getStatusBadge(viewingAssetDetail.status)}</div>
                  </div>
                </div>
              </Card>

              {/* Current Borrower Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Peminjam Saat Ini</h3>
                {viewingAssetDetail.status === "Dipinjam" && currentBorrower ? (
                  <Card className="bg-blue-50 p-6">
                    <p className="text-sm font-medium text-gray-700 mb-4">Sedang Dipinjam Oleh</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Nama Peminjam</p>
                        <p className="font-medium">{currentBorrower.namaPeminjam}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">NIM</p>
                        <p className="font-medium">{currentBorrower.nim}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Batas Kembali</p>
                        <p className="font-medium">{currentBorrower.batasKembali}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Jenis Transaksi</p>
                        <div className="mt-1">{getJenisBadge(currentBorrower.jenis)}</div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="bg-gray-50 p-6">
                    <p className="text-center text-gray-500">Aset ini sedang tidak dipinjam.</p>
                  </Card>
                )}
              </div>

              {/* Borrowing History Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Riwayat Peminjaman</h3>
                <Card className="overflow-hidden">
                  {history.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Peminjam</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jenis</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal Pinjam</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal Kembali</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {history.map((item) => (
                            <tr key={item.no} className="bg-white hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">{item.no}</td>
                              <td className="px-4 py-3 text-sm font-medium">{item.namaPeminjam}</td>
                              <td className="px-4 py-3 text-sm">{item.nim}</td>
                              <td className="px-4 py-3 text-sm">{getJenisBadge(item.jenis)}</td>
                              <td className="px-4 py-3 text-sm">{item.tanggalPinjam}</td>
                              <td className="px-4 py-3 text-sm">{item.tanggalKembali}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Belum ada riwayat peminjaman untuk aset ini.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          );
        }
        
        // Show table view
        const filteredAssets = getFilteredAssets();
        
        return (
          <div>
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau ID aset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === "Semua" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Semua")}
                  >
                    Semua
                  </Button>
                  <Button
                    variant={statusFilter === "Tersedia" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Tersedia")}
                  >
                    Tersedia
                  </Button>
                  <Button
                    variant={statusFilter === "Dipinjam" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Dipinjam")}
                  >
                    Dipinjam
                  </Button>
                  <Button
                    variant={statusFilter === "Maintenance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Maintenance")}
                  >
                    Maintenance
                  </Button>
                </div>
                
                <Button onClick={handleAddAsset}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Aset
                </Button>
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Aset</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Aset</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kondisi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{asset.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{asset.nama}</td>
                        <td className="px-4 py-3 text-sm">{asset.kategori}</td>
                        <td className="px-4 py-3 text-sm">{asset.kondisi}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(asset.status)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingAssetDetail(asset)}
                              className={`p-1.5 hover:bg-gray-100 rounded ${
                                asset.status === "Dipinjam" 
                                  ? "text-blue-600 hover:text-blue-700" 
                                  : "text-gray-600 hover:text-gray-700"
                              }`}
                              title="Lihat Detail Peminjaman"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleEditAsset(asset)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            
                            {asset.status === "Tersedia" && (
                              <>
                                <button
                                  onClick={() => handleSetMaintenance(asset)}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-yellow-600"
                                  title="Set Maintenance"
                                >
                                  <Wrench className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAsset(asset.id)}
                                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAssets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery || statusFilter !== "Semua" 
                    ? "Tidak ada aset yang sesuai dengan filter"
                    : "Belum ada aset yang ditambahkan"}
                </div>
              )}
            </Card>

            {/* Add Asset Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Aset Baru</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk menambahkan aset baru ke dalam sistem
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="id">ID Aset</Label>
                    <Input
                      id="id"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="AST-001"
                    />
                    <p className="text-xs text-gray-500 mt-1">ID unik aset. Contoh: AST-001</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="nama">Nama Aset</Label>
                    <Input
                      id="nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Laptop Dell Latitude 5420"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="kategori">Kategori</Label>
                    <Select value={formKategori} onValueChange={(value) => setFormKategori(value as Asset["kategori"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laptop">Laptop</SelectItem>
                        <SelectItem value="Proyektor">Proyektor</SelectItem>
                        <SelectItem value="Kamera">Kamera</SelectItem>
                        <SelectItem value="Peralatan Lab">Peralatan Lab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="kondisi">Kondisi</Label>
                    <Select value={formKondisi} onValueChange={(value) => setFormKondisi(value as Asset["kondisi"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baik">Baik</SelectItem>
                        <SelectItem value="Cukup">Cukup</SelectItem>
                        <SelectItem value="Rusak">Rusak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                    <Textarea
                      id="deskripsi"
                      value={formDeskripsi}
                      onChange={(e) => setFormDeskripsi(e.target.value)}
                      placeholder="Deskripsi tambahan tentang aset..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                    Batal
                  </Button>
                  <Button 
                    onClick={handleSaveNewAsset}
                    disabled={!formId || !formNama}
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Asset Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Aset</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk mengedit informasi aset yang ada
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-id">ID Aset</Label>
                    <Input
                      id="edit-id"
                      value={formId}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">ID tidak dapat diubah</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-nama">Nama Aset</Label>
                    <Input
                      id="edit-nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-kategori">Kategori</Label>
                    <Select value={formKategori} onValueChange={(value) => setFormKategori(value as Asset["kategori"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Laptop">Laptop</SelectItem>
                        <SelectItem value="Proyektor">Proyektor</SelectItem>
                        <SelectItem value="Kamera">Kamera</SelectItem>
                        <SelectItem value="Peralatan Lab">Peralatan Lab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-kondisi">Kondisi</Label>
                    <Select value={formKondisi} onValueChange={(value) => setFormKondisi(value as Asset["kondisi"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baik">Baik</SelectItem>
                        <SelectItem value="Cukup">Cukup</SelectItem>
                        <SelectItem value="Rusak">Rusak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-deskripsi">Deskripsi (Opsional)</Label>
                    <Textarea
                      id="edit-deskripsi"
                      value={formDeskripsi}
                      onChange={(e) => setFormDeskripsi(e.target.value)}
                      placeholder="Deskripsi tambahan tentang aset..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleSaveEditAsset} disabled={!formNama}>
                    Simpan Perubahan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Maintenance":
        const maintenanceAssets = assets.filter(asset => asset.status === "Maintenance");
        
        return (
          <div>
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Berikut aset yang sedang dalam status Maintenance. Tandai Selesai jika aset sudah siap digunakan kembali.
              </AlertDescription>
            </Alert>

            {maintenanceAssets.length > 0 ? (
              <>
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Aset</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Aset</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kategori</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kondisi</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sejak</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {maintenanceAssets.map((asset) => (
                          <tr key={asset.id} className="bg-white hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-500">{asset.id}</td>
                            <td className="px-4 py-3 text-sm font-medium">{asset.nama}</td>
                            <td className="px-4 py-3 text-sm">{asset.kategori}</td>
                            <td className="px-4 py-3 text-sm">{asset.kondisi}</td>
                            <td className="px-4 py-3 text-sm">{asset.maintenanceSejak}</td>
                            <td className="px-4 py-3 text-sm">
                              <Button
                                size="sm"
                                onClick={() => handleMarkMaintenanceComplete(asset.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Tandai Selesai
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <p className="text-sm text-gray-500 mt-3">
                  Menampilkan {maintenanceAssets.length} aset dalam status Maintenance
                </p>
              </>
            ) : (
              <Card className="p-12">
                <div className="text-center text-gray-500">
                  Tidak ada aset dalam status Maintenance saat ini.
                </div>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Aset"
      breadcrumbs={[
        { label: "Aset" },
        ...(activeMenu ? [{ label: activeMenu }] : []),
        ...(viewingAssetDetail ? [{ label: "Detail Peminjaman" }] : [])
      ]}
      icon={<Package className="w-8 h-8 text-white" />}
      sidebarItems={['Daftar Aset', 'Maintenance']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-amber-600 to-orange-500 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Aset</h2>
          <p className="text-sm text-gray-500 mb-5">Manajemen Aset Laboratorium Statistika</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Daftar Aset")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Aset
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}