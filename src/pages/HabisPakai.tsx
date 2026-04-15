import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { ShoppingBag, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

interface Item {
  id: string;
  nama: string;
  kategori: "Alat Tulis" | "Kertas" | "Baterai" | "Kebersihan" | "Lainnya";
  satuan: "Pcs" | "Rim" | "Pak" | "Buah" | "Lusin";
  stok: number;
}

const mockItems: Item[] = [
  {
    id: "HBP-001",
    nama: "Pulpen",
    kategori: "Alat Tulis",
    satuan: "Pcs",
    stok: 45
  },
  {
    id: "HBP-002",
    nama: "Kertas HVS A4",
    kategori: "Kertas",
    satuan: "Rim",
    stok: 12
  },
  {
    id: "HBP-003",
    nama: "Baterai AA",
    kategori: "Baterai",
    satuan: "Pak",
    stok: 0
  },
  {
    id: "HBP-004",
    nama: "Spidol Whiteboard",
    kategori: "Alat Tulis",
    satuan: "Pcs",
    stok: 8
  },
  {
    id: "HBP-005",
    nama: "Tisu Meja",
    kategori: "Kebersihan",
    satuan: "Pak",
    stok: 20
  },
  {
    id: "HBP-006",
    nama: "Penggaris",
    kategori: "Alat Tulis",
    satuan: "Pcs",
    stok: 6
  }
];

export default function HabisPakai() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [items, setItems] = useState<Item[]>(mockItems);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add/Edit Item Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  // Form fields
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formKategori, setFormKategori] = useState<Item["kategori"]>("Alat Tulis");
  const [formSatuan, setFormSatuan] = useState<Item["satuan"]>("Pcs");
  const [formStok, setFormStok] = useState<number>(0);

  const handleAddItem = () => {
    setFormId("");
    setFormNama("");
    setFormKategori("Alat Tulis");
    setFormSatuan("Pcs");
    setFormStok(0);
    setAddModalOpen(true);
  };

  const handleSaveNewItem = () => {
    const newItem: Item = {
      id: formId,
      nama: formNama,
      kategori: formKategori,
      satuan: formSatuan,
      stok: formStok
    };
    setItems([...items, newItem]);
    setAddModalOpen(false);
  };

  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setFormId(item.id);
    setFormNama(item.nama);
    setFormKategori(item.kategori);
    setFormSatuan(item.satuan);
    setFormStok(item.stok);
    setEditModalOpen(true);
  };

  const handleSaveEditItem = () => {
    if (selectedItem) {
      const updatedItems = items.map(item => {
        if (item.id === selectedItem.id) {
          return {
            ...item,
            nama: formNama,
            kategori: formKategori,
            satuan: formSatuan,
            stok: formStok
          };
        }
        return item;
      });
      setItems(updatedItems);
      setEditModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus barang ini?")) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const getFilteredItems = () => {
    if (!searchQuery) return items;
    
    return items.filter(item => 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "Daftar Barang":
        const filteredItems = getFilteredItems();
        
        return (
          <div>
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau ID barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Barang
              </Button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Barang</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Barang</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kategori</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Satuan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stok</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{item.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.nama}</td>
                        <td className="px-4 py-3 text-sm">{item.kategori}</td>
                        <td className="px-4 py-3 text-sm">{item.satuan}</td>
                        <td className={`px-4 py-3 text-sm ${item.stok === 0 ? 'font-bold text-red-600 bg-red-100' : ''}`}>
                          {item.stok}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery 
                    ? "Tidak ada barang yang sesuai dengan pencarian"
                    : "Belum ada barang yang ditambahkan"}
                </div>
              )}
            </Card>

            {/* Add Item Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Barang Baru</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk menambahkan barang habis pakai baru
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="id">ID Barang</Label>
                    <Input
                      id="id"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="HBP-001"
                    />
                    <p className="text-xs text-gray-500 mt-1">ID unik barang. Contoh: HBP-001</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="nama">Nama Barang</Label>
                    <Input
                      id="nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Pulpen"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="kategori">Kategori</Label>
                    <Select value={formKategori} onValueChange={(value) => setFormKategori(value as Item["kategori"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alat Tulis">Alat Tulis</SelectItem>
                        <SelectItem value="Kertas">Kertas</SelectItem>
                        <SelectItem value="Baterai">Baterai</SelectItem>
                        <SelectItem value="Kebersihan">Kebersihan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="satuan">Satuan</Label>
                    <Select value={formSatuan} onValueChange={(value) => setFormSatuan(value as Item["satuan"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Rim">Rim</SelectItem>
                        <SelectItem value="Pak">Pak</SelectItem>
                        <SelectItem value="Buah">Buah</SelectItem>
                        <SelectItem value="Lusin">Lusin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="stok">Stok Awal</Label>
                    <Input
                      id="stok"
                      type="number"
                      min="0"
                      value={formStok}
                      onChange={(e) => setFormStok(parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                    Batal
                  </Button>
                  <Button 
                    onClick={handleSaveNewItem}
                    disabled={!formId || !formNama}
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Item Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Barang</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk mengedit informasi barang habis pakai
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-id">ID Barang</Label>
                    <Input
                      id="edit-id"
                      value={formId}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">ID tidak dapat diubah</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-nama">Nama Barang</Label>
                    <Input
                      id="edit-nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-kategori">Kategori</Label>
                    <Select value={formKategori} onValueChange={(value) => setFormKategori(value as Item["kategori"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alat Tulis">Alat Tulis</SelectItem>
                        <SelectItem value="Kertas">Kertas</SelectItem>
                        <SelectItem value="Baterai">Baterai</SelectItem>
                        <SelectItem value="Kebersihan">Kebersihan</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-satuan">Satuan</Label>
                    <Select value={formSatuan} onValueChange={(value) => setFormSatuan(value as Item["satuan"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pcs">Pcs</SelectItem>
                        <SelectItem value="Rim">Rim</SelectItem>
                        <SelectItem value="Pak">Pak</SelectItem>
                        <SelectItem value="Buah">Buah</SelectItem>
                        <SelectItem value="Lusin">Lusin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-stok">Stok</Label>
                    <Input
                      id="edit-stok"
                      type="number"
                      min="0"
                      value={formStok}
                      onChange={(e) => setFormStok(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Perbarui jumlah stok sesuai kondisi terkini.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleSaveEditItem} disabled={!formNama}>
                    Simpan Perubahan
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
      title="Habis Pakai"
      breadcrumbs={[
        { label: "Habis Pakai" },
        ...(activeMenu ? [{ label: activeMenu }] : [])
      ]}
      icon={<ShoppingBag className="w-8 h-8 text-white" />}
      sidebarItems={['Daftar Barang']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-rose-600 to-red-500 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBag className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Habis Pakai</h2>
          <p className="text-sm text-gray-500 mb-5">Manajemen Barang Habis Pakai</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Daftar Barang")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Habis Pakai
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}