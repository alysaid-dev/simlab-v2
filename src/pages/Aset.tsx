import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Package, Search, Plus, Pencil, Wrench, Trash2, CheckCircle, AlertCircle, Eye, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { apiFetch } from "@/lib/apiFetch";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface Asset {
  dbId: string;
  id: string;
  nama: string;
  deskripsi: string;
  kondisi: "Baik" | "Cukup" | "Rusak";
  status: "Tersedia" | "Dipinjam" | "Maintenance";
  maintenanceSejak?: string;
}

type BackendAssetStatus = "AVAILABLE" | "BORROWED" | "DAMAGED" | "MAINTENANCE";
type BackendAssetCondition = "GOOD" | "MINOR_DAMAGE" | "MAJOR_DAMAGE";

interface BackendAsset {
  id: string;
  name: string;
  code: string;
  description: string | null;
  condition: BackendAssetCondition;
  status: BackendAssetStatus;
  qrHash: string | null;
  laboratoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssetListResponse {
  items: BackendAsset[];
  total: number;
  skip: number;
  take: number;
}

const conditionMap: Record<BackendAssetCondition, Asset["kondisi"]> = {
  GOOD: "Baik",
  MINOR_DAMAGE: "Cukup",
  MAJOR_DAMAGE: "Rusak",
};

const statusMap: Record<BackendAssetStatus, Asset["status"]> = {
  AVAILABLE: "Tersedia",
  BORROWED: "Dipinjam",
  DAMAGED: "Maintenance",
  MAINTENANCE: "Maintenance",
};

function transformAsset(be: BackendAsset): Asset {
  return {
    dbId: be.id,
    id: be.code,
    nama: be.name,
    deskripsi: be.description ?? "",
    kondisi: conditionMap[be.condition],
    status: statusMap[be.status],
  };
}

const conditionToBackend: Record<Asset["kondisi"], BackendAssetCondition> = {
  Baik: "GOOD",
  Cukup: "MINOR_DAMAGE",
  Rusak: "MAJOR_DAMAGE",
};

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

export default function Aset() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [formKondisi, setFormKondisi] = useState<Asset["kondisi"]>("Baik");
  const [formDeskripsi, setFormDeskripsi] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/assets`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as AssetListResponse;
      })
      .then((data) => {
        if (!cancelled) setAssets(data.items.map(transformAsset));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat aset");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddAsset = () => {
    setFormId("");
    setFormNama("");
    setFormKondisi("Baik");
    setFormDeskripsi("");
    setAddModalOpen(true);
  };

  const [saving, setSaving] = useState(false);

  const handleSaveNewAsset = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/assets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formId,
          name: formNama,
          condition: conditionToBackend[formKondisi],
          description: formDeskripsi.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as BackendAsset;
      setAssets((prev) => [transformAsset(created), ...prev]);
      setAddModalOpen(false);
    } catch (err) {
      alert(
        `Gagal menyimpan aset: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormId(asset.id);
    setFormNama(asset.nama);
    setFormKondisi(asset.kondisi);
    setFormDeskripsi(asset.deskripsi);
    setEditModalOpen(true);
  };

  const handleSaveEditAsset = async () => {
    if (!selectedAsset || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch(
        `${API_BASE}/api/assets/${selectedAsset.dbId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formNama,
            condition: conditionToBackend[formKondisi],
            description: formDeskripsi.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      const updated = (await res.json()) as BackendAsset;
      setAssets((prev) =>
        prev.map((a) => (a.dbId === selectedAsset.dbId ? transformAsset(updated) : a)),
      );
      setEditModalOpen(false);
      setSelectedAsset(null);
    } catch (err) {
      alert(
        `Gagal menyimpan perubahan: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const patchAssetStatus = async (
    asset: Asset,
    backendStatus: BackendAssetStatus,
  ) => {
    const res = await apiFetch(`${API_BASE}/api/assets/${asset.dbId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: backendStatus }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(err?.message ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as BackendAsset;
  };

  const handleSetMaintenance = async (asset: Asset) => {
    try {
      const updated = await patchAssetStatus(asset, "MAINTENANCE");
      setAssets((prev) =>
        prev.map((a) =>
          a.dbId === asset.dbId
            ? {
                ...transformAsset(updated),
                maintenanceSejak: new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              }
            : a,
        ),
      );
    } catch (err) {
      alert(
        `Gagal set maintenance: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleMarkMaintenanceComplete = async (asset: Asset) => {
    try {
      const updated = await patchAssetStatus(asset, "AVAILABLE");
      setAssets((prev) =>
        prev.map((a) =>
          a.dbId === asset.dbId
            ? { ...transformAsset(updated), maintenanceSejak: undefined }
            : a,
        ),
      );
    } catch (err) {
      alert(
        `Gagal menandai selesai: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm("Apakah Anda yakin ingin menghapus aset ini?")) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/assets/${asset.dbId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const err = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      setAssets((prev) => prev.filter((a) => a.dbId !== asset.dbId));
    } catch (err) {
      alert(
        `Gagal menghapus aset: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
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
    if (isLoading) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat data aset...</p>
          </div>
        </Card>
      );
    }

    if (error) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Gagal memuat aset: {error}
          </AlertDescription>
        </Alert>
      );
    }

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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">ID Aset</p>
                    <p className="font-mono text-sm font-medium">{viewingAssetDetail.id}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Nama Aset</p>
                    <p className="font-medium">{viewingAssetDetail.nama}</p>
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
                                  onClick={() => handleDeleteAsset(asset)}
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
                    disabled={!formId || !formNama || saving}
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
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
                  <Button onClick={handleSaveEditAsset} disabled={!formNama || saving}>
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
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
                            <td className="px-4 py-3 text-sm">{asset.kondisi}</td>
                            <td className="px-4 py-3 text-sm">{asset.maintenanceSejak}</td>
                            <td className="px-4 py-3 text-sm">
                              <Button
                                size="sm"
                                onClick={() => handleMarkMaintenanceComplete(asset)}
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