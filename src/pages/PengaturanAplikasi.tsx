import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Settings, Copy, Eye, Upload, Check, Search, Plus, Trash2, ArrowLeft, ChevronDown, X, Calendar, Info } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";

const defaultLetterTemplate = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { width: 80px; height: 80px; margin: 0 auto; }
    .title { font-weight: bold; margin-top: 10px; }
    .content { text-align: justify; line-height: 1.8; }
    .signature { margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">[Logo Universitas]</div>
    <h3>LABORATORIUM STATISTIKA</h3>
    <h4>UNIVERSITAS ISLAM INDONESIA</h4>
    <p>Jl. Kaliurang Km. 14,5, Sleman, Yogyakarta 55584</p>
  </div>
  
  <h4 style="text-align: center;">SURAT KETERANGAN BEBAS PINJAMAN</h4>
  
  <div class="content">
    <p>Yang bertanda tangan di bawah ini:</p>
    <p>Nama: {{nama_kepala_lab}}<br/>
       Jabatan: Kepala Laboratorium Statistika</p>
    
    <p>Menerangkan bahwa:</p>
    <p>Nama: {{nama_mahasiswa}}<br/>
       NIM: {{nim}}</p>
    
    <p>Adalah benar mahasiswa Program Studi Statistika FMIPA UII yang telah 
    menyelesaikan seluruh kewajiban pengembalian peminjaman barang/laptop 
    di Laboratorium Statistika.</p>
    
    <p>Surat keterangan ini dibuat pada tanggal {{tanggal}} untuk dapat 
    digunakan sebagaimana mestinya.</p>
  </div>
  
  <div class="signature">
    <p>Yogyakarta, {{tanggal}}</p>
    <p>Kepala Laboratorium,</p>
    <br/><br/><br/>
    <p>{{nama_kepala_lab}}</p>
    <p style="font-size: 12px;">Diverifikasi oleh: {{nama_laboran}}</p>
  </div>
</body>
</html>`;

const dynamicVariables = [
  { name: "{{nama_mahasiswa}}", description: "Nama mahasiswa" },
  { name: "{{nim}}", description: "NIM mahasiswa" },
  { name: "{{tanggal}}", description: "Tanggal surat" },
  { name: "{{nama_kepala_lab}}", description: "Nama kepala lab" },
  { name: "{{nama_laboran}}", description: "Nama laboran" }
];

const whatsappVariables = [
  { name: "{{nama_mahasiswa}}", description: "Nama peminjam" },
  { name: "{{id_laptop}}", description: "ID laptop" },
  { name: "{{batas_kembali}}", description: "Tanggal batas kembali" },
  { name: "{{keterlambatan}}", description: "Durasi keterlambatan" }
];

interface Laboratory {
  id: number;
  namaLab: string;
  namaKepalaLab: string;
  namaLaboran: string;
  logo: string;
  alamat: string;
  email: string;
}

interface AccountOption {
  id: string;
  nama: string;
  nim: string;
}

// Mock Dosen accounts
const mockDosenAccounts: AccountOption[] = [
  { id: "1", nama: "Achmad Fauzan, S.Pd., M.Si.", nim: "DOS001" },
  { id: "2", nama: "Akhmad Fauzy, Prof., S.Si., M.Si.. Ph.D.", nim: "DOS002" },
  { id: "3", nama: "Arum Handini Primandari, S.Pd.Si., M.Sc.", nim: "DOS003" },
  { id: "4", nama: "Dr. Asyharul Mu'ala, S.H.I., M.H.I.", nim: "DOS004" },
  { id: "5", nama: "Atina Ahdika, Dr. S.Si., M.Si.", nim: "DOS005" },
  { id: "6", nama: "Ayundyah Kesumawati, S.Si., M.Si.", nim: "DOS006" },
  { id: "7", nama: "Dina Tri Utari, S.Si., M.Sc.", nim: "DOS007" },
  { id: "8", nama: "Edy Widodo, Dr., S.Si., M.Si.", nim: "DOS008" },
  { id: "9", nama: "Jaka Nugraha, Prof., Dr., S.Si., M.Si.", nim: "DOS009" },
  { id: "10", nama: "Kariyam, Dr., S.Si., M.Si.", nim: "DOS010" },
  { id: "11", nama: "Muhammad Hasan Sidiq Kurniawan, S.Si., M.Sc.", nim: "DOS011" },
  { id: "12", nama: "Muhammad Muhajir, S.Si., M.Sc.", nim: "DOS012" },
  { id: "13", nama: "Mujiati Dwi Kartikasari., S.Si., M.Sc.", nim: "DOS013" },
  { id: "14", nama: "Raden Bagus Fajriya Hakim, Dr., S.Si., M.Si.", nim: "DOS014" },
  { id: "15", nama: "Rahmadi Yotenka, S.Si., M.Sc.", nim: "DOS015" },
  { id: "16", nama: "Rohmatul Fajriyah, Dr.techn., S.Si., M.Si.", nim: "DOS016" },
  { id: "17", nama: "Sekti Kartika Dini, S.Si., M.Si.", nim: "DOS017" },
  { id: "18", nama: "Tuti Purwaningsih, S.Stat., M.Si.", nim: "DOS018" },
  { id: "19", nama: "Purnama Akbar, S.Stat., M.Si.", nim: "DOS019" },
  { id: "20", nama: "Abdullah Ahmad Dzikrullah, S.Si., M.Sc.", nim: "DOS020" },
  { id: "21", nama: "Ghiffari Ahnaf Danarwindu, M.Sc.", nim: "DOS021" }
];

// Mock Laboran accounts
const mockLaboranAccounts: AccountOption[] = [
  { id: "1", nama: "Ridhani Anggit Safitri, A.Md.", nim: "LAB001" },
  { id: "2", nama: "Rizal Pratama Putra, S.T.", nim: "LAB002" },
  { id: "3", nama: "Muhammad Aly Said", nim: "LAB003" }
];

const mockLaboratories: Laboratory[] = [
  {
    id: 1,
    namaLab: "Lab Statistika 1",
    namaKepalaLab: "Abdullah Ahmad Dzikrullah, S.Si., M.Sc.",
    namaLaboran: "Ridhani Anggit Safitri, A.Md.",
    logo: "[Logo Lab Statistika 1]",
    alamat: "Gedung FMIPA Lt. 2, Kampus Terpadu UII",
    email: "labstat1@uii.ac.id"
  },
  {
    id: 2,
    namaLab: "Lab Statistika 2",
    namaKepalaLab: "Ghiffari Ahnaf Danarwindu, M.Sc.",
    namaLaboran: "Rizal Pratama Putra, S.T.",
    logo: "[Logo Lab Statistika 2]",
    alamat: "Gedung FMIPA Lt. 3, Kampus Terpadu UII",
    email: "labstat2@uii.ac.id"
  },
  {
    id: 3,
    namaLab: "Lab Komputasi",
    namaKepalaLab: "Achmad Fauzan, S.Pd., M.Si.",
    namaLaboran: "Muhammad Aly Said",
    logo: "[Logo Lab Komputasi]",
    alamat: "Gedung FMIPA Lt. 1, Kampus Terpadu UII",
    email: "labkom@uii.ac.id"
  }
];

export default function PengaturanAplikasi() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  
  // Template Surat state
  const [letterTemplate, setLetterTemplate] = useState(defaultLetterTemplate);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  
  // Profil Laboratorium state
  const [laboratories, setLaboratories] = useState<Laboratory[]>(mockLaboratories);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [editLabNama, setEditLabNama] = useState("");
  const [editLabKepala, setEditLabKepala] = useState("");
  const [editLabLaboran, setEditLabLaboran] = useState("");
  const [showLabEditSuccess, setShowLabEditSuccess] = useState(false);
  const [addLabModalOpen, setAddLabModalOpen] = useState(false);
  const [newLabNama, setNewLabNama] = useState("");
  const [newLabKepala, setNewLabKepala] = useState("");
  const [newLabLaboran, setNewLabLaboran] = useState("");
  
  // Searchable dropdown state
  const [kepalaSearchQuery, setKepalaSearchQuery] = useState("");
  const [laboranSearchQuery, setLaboranSearchQuery] = useState("");
  const [showKepalaDropdown, setShowKepalaDropdown] = useState(false);
  const [showLaboranDropdown, setShowLaboranDropdown] = useState(false);
  const [selectedKepala, setSelectedKepala] = useState<AccountOption | null>(null);
  const [selectedLaboran, setSelectedLaboran] = useState<AccountOption | null>(null);
  
  // Notifikasi WhatsApp state
  const [jatuhTempoTemplate, setJatuhTempoTemplate] = useState(
    "Halo {{nama_mahasiswa}}, ini pengingat dari Lab Statistika UII. Laptop {{id_laptop}} yang Anda pinjam harus dikembalikan pada {{batas_kembali}}. Mohon segera dikembalikan. Terima kasih."
  );
  const [terlambatTemplate, setTerlambatTemplate] = useState(
    "Halo {{nama_mahasiswa}}, laptop {{id_laptop}} yang Anda pinjam di Lab Statistika UII telah TERLAMBAT {{keterlambatan}} dari batas waktu {{batas_kembali}}. Mohon segera hubungi laboran. Terima kasih."
  );
  const [showNotifSuccess, setShowNotifSuccess] = useState(false);

  // Denda & Keterlambatan state
  const [penaltyAmount, setPenaltyAmount] = useState<number>(5000);
  const [toleranceDays, setToleranceDays] = useState<number>(1);
  const [showPenaltySuccess, setShowPenaltySuccess] = useState(false);

  // Hari Libur state
  const [holidays, setHolidays] = useState([
    { id: 1, date: "2025-01-01", day: "Kamis", description: "Tahun Baru Masehi" },
    { id: 2, date: "2025-03-31", day: "Senin", description: "Hari Raya Idul Fitri" },
    { id: 3, date: "2025-04-01", day: "Selasa", description: "Hari Raya Idul Fitri (Cuti Bersama)" },
    { id: 4, date: "2025-05-01", day: "Kamis", description: "Hari Buruh Internasional" },
    { id: 5, date: "2025-05-29", day: "Kamis", description: "Kenaikan Yesus Kristus" },
  ]);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayDescription, setNewHolidayDescription] = useState("");

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const handleSaveLetterTemplate = () => {
    // Save letter template logic
    alert("Template surat berhasil disimpan!");
  };

  const handleSelectLab = (lab: Laboratory) => {
    setSelectedLab(lab);
    setEditLabNama(lab.namaLab);
    setEditLabKepala(lab.namaKepalaLab);
    setEditLabLaboran(lab.namaLaboran);
    setShowLabEditSuccess(false);
  };

  const handleBackToList = () => {
    setSelectedLab(null);
    setShowLabEditSuccess(false);
  };

  const handleSaveLabEdit = () => {
    if (selectedLab) {
      setLaboratories(laboratories.map(lab =>
        lab.id === selectedLab.id
          ? { ...lab, namaLab: editLabNama, namaKepalaLab: editLabKepala, namaLaboran: editLabLaboran }
          : lab
      ));
      setShowLabEditSuccess(true);
      setTimeout(() => setShowLabEditSuccess(false), 3000);
    }
  };

  const handleDeleteLab = (labId: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus laboratorium ini?")) {
      setLaboratories(laboratories.filter(lab => lab.id !== labId));
    }
  };

  const handleAddLab = () => {
    setNewLabNama("");
    setNewLabKepala("");
    setNewLabLaboran("");
    setAddLabModalOpen(true);
  };

  const handleSaveNewLab = () => {
    const newLab: Laboratory = {
      id: laboratories.length + 1,
      namaLab: newLabNama,
      namaKepalaLab: newLabKepala,
      namaLaboran: newLabLaboran,
      logo: `[Logo ${newLabNama}]`,
      alamat: "Alamat dikelola oleh sistem",
      email: "email@uii.ac.id"
    };
    setLaboratories([...laboratories, newLab]);
    setAddLabModalOpen(false);
  };

  const getFilteredLaboratories = () => {
    if (!labSearchQuery) return laboratories;
    return laboratories.filter(lab =>
      lab.namaLab.toLowerCase().includes(labSearchQuery.toLowerCase())
    );
  };

  const handleSaveNotifications = () => {
    setShowNotifSuccess(true);
    setTimeout(() => setShowNotifSuccess(false), 3000);
  };

  const handleSavePenalty = () => {
    setShowPenaltySuccess(true);
    setTimeout(() => setShowPenaltySuccess(false), 3000);
  };

  const handleAddHoliday = () => {
    if (newHolidayDate && newHolidayDescription) {
      const newHoliday = {
        id: holidays.length + 1,
        date: newHolidayDate,
        day: new Date(newHolidayDate).toLocaleDateString('id-ID', { weekday: 'long' }),
        description: newHolidayDescription
      };
      setHolidays([...holidays, newHoliday]);
      setNewHolidayDate("");
      setNewHolidayDescription("");
    }
  };

  const handleDeleteHoliday = (holidayId: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus hari libur ini?")) {
      setHolidays(holidays.filter(holiday => holiday.id !== holidayId));
    }
  };

  const renderPreview = () => {
    // Replace variables with dummy data
    const previewHtml = letterTemplate
      .replace(/{{nama_mahasiswa}}/g, "Ahmad Fauzan Hakim")
      .replace(/{{nim}}/g, "20611157")
      .replace(/{{tanggal}}/g, "26 Maret 2026")
      .replace(/{{nama_kepala_lab}}/g, "Dr. Anggit Wibisono, M.Si")
      .replace(/{{nama_laboran}}/g, "Budi Santoso");
    
    return <div dangerouslySetInnerHTML={{ __html: previewHtml }} />;
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "Template Surat":
        return (
          <div>
            {/* Info Box */}
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                Edit template HTML untuk Surat Keterangan Bebas Pinjaman Laboratorium. 
                Gunakan variabel dinamis di bawah untuk menyisipkan data otomatis.
              </AlertDescription>
            </Alert>

            {/* Dynamic Variables */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Klik untuk menyalin variabel:
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {dynamicVariables.map((variable) => (
                  <button
                    key={variable.name}
                    onClick={() => handleCopyVariable(variable.name)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-mono transition-colors"
                    title={variable.description}
                  >
                    {copiedVariable === variable.name ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-600" />
                    )}
                    {variable.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Tempelkan variabel ke dalam editor HTML. Nilai akan terisi otomatis saat surat digenerate.
              </p>
            </div>

            {/* HTML Editor */}
            <Card className="mb-4 overflow-hidden">
              <div className="bg-[#1e1e1e] p-4">
                <Textarea
                  value={letterTemplate}
                  onChange={(e) => setLetterTemplate(e.target.value)}
                  className="font-mono text-sm bg-[#1e1e1e] text-white border-none resize-none focus-visible:ring-0 min-h-[400px]"
                  spellCheck={false}
                />
              </div>
            </Card>

            {/* Toolbar */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPreviewModalOpen(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview Surat
              </Button>
              <Button onClick={handleSaveLetterTemplate}>
                Simpan Template
              </Button>
            </div>

            {/* Preview Modal */}
            <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
              <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Preview Template Surat</DialogTitle>
                  <DialogDescription className="sr-only">
                    Pratinjau template surat dengan data contoh
                  </DialogDescription>
                </DialogHeader>
                <Card className="p-8 shadow-lg bg-white">
                  {renderPreview()}
                </Card>
                <DialogFooter>
                  <Button onClick={() => setPreviewModalOpen(false)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Profil Laboratorium":
        // Show Edit Panel if a lab is selected
        if (selectedLab) {
          const getFilteredDosen = () => {
            return mockDosenAccounts.filter(account =>
              account.nama.toLowerCase().includes(kepalaSearchQuery.toLowerCase())
            );
          };

          const getFilteredLaboran = () => {
            return mockLaboranAccounts.filter(account =>
              account.nama.toLowerCase().includes(laboranSearchQuery.toLowerCase())
            );
          };

          return (
            <div>
              <Button
                variant="outline"
                onClick={handleBackToList}
                className="mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Daftar
              </Button>

              {/* Editable Form - No read-only card */}
              <Card className="p-6 shadow-sm mb-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-nama-lab">Nama Laboratorium</Label>
                    <Input
                      id="edit-nama-lab"
                      value={editLabNama}
                      onChange={(e) => setEditLabNama(e.target.value)}
                    />
                  </div>

                  {/* Searchable Dropdown for Kepala Lab */}
                  <div>
                    <Label htmlFor="edit-kepala-lab">Nama Kepala Laboratorium</Label>
                    <div className="relative">
                      {selectedKepala ? (
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedKepala.nama}</p>
                            <p className="text-xs text-gray-500">{selectedKepala.nim}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedKepala(null);
                              setEditLabKepala("");
                              setKepalaSearchQuery("");
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            id="edit-kepala-lab"
                            value={kepalaSearchQuery}
                            onChange={(e) => setKepalaSearchQuery(e.target.value)}
                            placeholder="Cari nama dosen..."
                            onFocus={() => setShowKepalaDropdown(true)}
                            onBlur={() => setTimeout(() => setShowKepalaDropdown(false), 200)}
                            className="pl-10"
                          />
                          {showKepalaDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                              {getFilteredDosen().length > 0 ? (
                                getFilteredDosen().map((account) => (
                                  <div
                                    key={account.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setSelectedKepala(account);
                                      setEditLabKepala(account.nama);
                                      setKepalaSearchQuery("");
                                      setShowKepalaDropdown(false);
                                    }}
                                  >
                                    <p className="text-sm font-medium">{account.nama}</p>
                                    <p className="text-xs text-gray-500">{account.nim}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Tidak ada dosen ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Daftar berdasarkan akun dengan peran Dosen.
                    </p>
                  </div>

                  {/* Searchable Dropdown for Laboran */}
                  <div>
                    <Label htmlFor="edit-laboran">Nama Laboran</Label>
                    <div className="relative">
                      {selectedLaboran ? (
                        <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedLaboran.nama}</p>
                            <p className="text-xs text-gray-500">{selectedLaboran.nim}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedLaboran(null);
                              setEditLabLaboran("");
                              setLaboranSearchQuery("");
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            id="edit-laboran"
                            value={laboranSearchQuery}
                            onChange={(e) => setLaboranSearchQuery(e.target.value)}
                            placeholder="Cari nama laboran..."
                            onFocus={() => setShowLaboranDropdown(true)}
                            onBlur={() => setTimeout(() => setShowLaboranDropdown(false), 200)}
                            className="pl-10"
                          />
                          {showLaboranDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
                              {getFilteredLaboran().length > 0 ? (
                                getFilteredLaboran().map((account) => (
                                  <div
                                    key={account.id}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                      setSelectedLaboran(account);
                                      setEditLabLaboran(account.nama);
                                      setLaboranSearchQuery("");
                                      setShowLaboranDropdown(false);
                                    }}
                                  >
                                    <p className="text-sm font-medium">{account.nama}</p>
                                    <p className="text-xs text-gray-500">{account.nim}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                  Tidak ada laboran ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Daftar berdasarkan akun dengan peran Laboran.
                    </p>
                  </div>
                </div>
              </Card>

              <Button onClick={handleSaveLabEdit} className="w-full">
                Simpan Perubahan
              </Button>

              {/* Success State */}
              {showLabEditSuccess && (
                <Alert className="mt-4 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    Profil laboratorium berhasil diperbarui.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        }

        // Show Laboratory List (main view)
        const filteredLabs = getFilteredLaboratories();
        
        return (
          <div>
            <p className="text-sm text-gray-600 mb-6">
              Kelola profil masing-masing laboratorium. Klik pada nama laboratorium untuk mengedit profilnya.
            </p>

            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama laboratorium..."
                  value={labSearchQuery}
                  onChange={(e) => setLabSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button onClick={handleAddLab}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Laboratorium
              </Button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Laboratorium</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Kepala Laboratorium</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Laboran</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLabs.map((lab, index) => (
                      <tr 
                        key={lab.id} 
                        className="bg-white hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectLab(lab)}
                      >
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{lab.namaLab}</td>
                        <td className="px-4 py-3 text-sm">{lab.namaKepalaLab}</td>
                        <td className="px-4 py-3 text-sm">{lab.namaLaboran}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLab(lab.id);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredLabs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada laboratorium yang ditemukan
                </div>
              )}
            </Card>

            {/* Add Laboratory Modal */}
            <Dialog open={addLabModalOpen} onOpenChange={setAddLabModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Laboratorium</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk menambahkan laboratorium baru
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-nama-lab">Nama Laboratorium</Label>
                    <Input
                      id="new-nama-lab"
                      value={newLabNama}
                      onChange={(e) => setNewLabNama(e.target.value)}
                      placeholder="Lab Statistika 3"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-kepala-lab">Nama Kepala Laboratorium</Label>
                    <Input
                      id="new-kepala-lab"
                      value={newLabKepala}
                      onChange={(e) => setNewLabKepala(e.target.value)}
                      placeholder="Dr. Nama Kepala Lab"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="new-laboran">Nama Laboran</Label>
                    <Input
                      id="new-laboran"
                      value={newLabLaboran}
                      onChange={(e) => setNewLabLaboran(e.target.value)}
                      placeholder="Nama Laboran"
                    />
                  </div>

                  <p className="text-sm text-gray-500 italic">
                    Logo, alamat, dan email dikelola oleh sistem.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddLabModalOpen(false)}>
                    Batal
                  </Button>
                  <Button 
                    onClick={handleSaveNewLab}
                    disabled={!newLabNama || !newLabKepala || !newLabLaboran}
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Notifikasi WhatsApp":
        return (
          <div className="max-w-3xl">
            {/* Info Box */}
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                Template pesan berikut digunakan saat laboran menekan tombol 'Kirim Pengingat' di modul Transaksi. 
                Gunakan variabel dinamis untuk menyesuaikan isi pesan.
              </AlertDescription>
            </Alert>

            {/* Variables */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Variabel yang tersedia:
              </p>
              <div className="flex flex-wrap gap-2">
                {whatsappVariables.map((variable) => (
                  <Badge
                    key={variable.name}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-mono"
                    title={variable.description}
                  >
                    {variable.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Template 1: Jatuh Tempo */}
            <Card className="p-6 bg-gray-50 mb-4">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Label>Template Pesan</Label>
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                    Jatuh Tempo
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Dikirim saat laptop mendekati batas waktu pengembalian (H-2 hingga hari H).
                </p>
              </div>
              <Textarea
                rows={4}
                value={jatuhTempoTemplate}
                onChange={(e) => setJatuhTempoTemplate(e.target.value)}
                maxLength={300}
              />
              <p className="text-xs text-gray-500 mt-2">
                {jatuhTempoTemplate.length} / 300 karakter
              </p>
            </Card>

            {/* Template 2: Terlambat */}
            <Card className="p-6 bg-gray-50 mb-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Label>Template Pesan</Label>
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                    Terlambat
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Dikirim saat laptop telah melewati batas waktu pengembalian.
                </p>
              </div>
              <Textarea
                rows={4}
                value={terlambatTemplate}
                onChange={(e) => setTerlambatTemplate(e.target.value)}
                maxLength={300}
              />
              <p className="text-xs text-gray-500 mt-2">
                {terlambatTemplate.length} / 300 karakter
              </p>
            </Card>

            <Button onClick={handleSaveNotifications} className="w-full">
              Simpan Template Notifikasi
            </Button>

            {/* Success State */}
            {showNotifSuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  Template notifikasi WhatsApp berhasil disimpan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "Denda & Keterlambatan":
        return (
          <div className="max-w-2xl">
            <Card className="p-6">
              <div className="space-y-6">
                {/* Besaran Denda per Hari */}
                <div>
                  <Label htmlFor="penalty-amount" className="text-sm font-medium text-gray-700 mb-2 block">
                    Besaran Denda per Hari
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">
                      Rp
                    </span>
                    <Input
                      id="penalty-amount"
                      type="number"
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                      placeholder="0"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Denda akan dihitung per hari keterlambatan pengembalian aset.
                  </p>
                </div>

                {/* Toleransi Keterlambatan */}
                <div>
                  <Label htmlFor="tolerance-days" className="text-sm font-medium text-gray-700 mb-2 block">
                    Toleransi Keterlambatan
                  </Label>
                  <div className="relative">
                    <Input
                      id="tolerance-days"
                      type="number"
                      value={toleranceDays}
                      onChange={(e) => setToleranceDays(Number(e.target.value))}
                      placeholder="0"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">
                      hari
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Jumlah hari setelah jatuh tempo sebelum denda mulai dihitung.
                  </p>
                </div>

                {/* Preview Block */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Contoh Perhitungan</p>
                  <p className="text-sm text-gray-600">
                    Keterlambatan 5 hari × Rp {penaltyAmount.toLocaleString('id-ID')} = Rp {(5 * penaltyAmount).toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Save Button */}
                <Button onClick={handleSavePenalty} className="bg-blue-900 hover:bg-blue-800">
                  Simpan Pengaturan
                </Button>
              </div>
            </Card>

            {/* Success State */}
            {showPenaltySuccess && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Pengaturan denda berhasil disimpan.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "Hari Libur":
        const formatDateDisplay = (dateStr: string) => {
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
          const day = date.getDate();
          const month = date.toLocaleDateString('id-ID', { month: 'long' });
          const year = date.getFullYear();
          return `${dayName}, ${day} ${month} ${year}`;
        };

        return (
          <div>
            {/* Toolbar */}
            <div className="mb-6 flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  placeholder="Pilih tanggal hari libur"
                  className="pl-10 w-[220px]"
                />
              </div>
              <Input
                type="text"
                value={newHolidayDescription}
                onChange={(e) => setNewHolidayDescription(e.target.value)}
                placeholder="Keterangan (opsional) — contoh: Hari Raya Idul Fitri"
                className="flex-1"
              />
              <Button
                onClick={handleAddHoliday}
                disabled={!newHolidayDate}
                className="bg-blue-900 hover:bg-blue-800 flex-shrink-0"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Hari Libur
              </Button>
            </div>

            {/* Table */}
            <Card className="overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Keterangan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {holidays.map((holiday, index) => (
                      <tr 
                        key={holiday.id} 
                        className="bg-white hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatDateDisplay(holiday.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {holiday.description || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm">Hapus</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {holidays.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada hari libur yang ditemukan
                </div>
              )}
            </Card>

            {/* Info Banner */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Tanggal yang terdaftar sebagai hari libur tidak akan dihitung dalam kalkulasi denda keterlambatan.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Pengaturan"
      breadcrumbs={[
        { label: "Pengaturan" },
        ...(activeMenu ? [{ label: activeMenu }] : [])
      ]}
      icon={<Settings className="w-8 h-8 text-white" />}
      sidebarItems={['Template Surat', 'Profil Laboratorium', 'Notifikasi WhatsApp', 'Denda & Keterlambatan', 'Hari Libur']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-gray-600 to-slate-500 rounded-xl flex items-center justify-center mb-3">
            <Settings className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Pengaturan Aplikasi</h2>
          <p className="text-sm text-gray-500 mb-5">Konfigurasi dan Pengaturan Sistem</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Template Surat")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Pengaturan Aplikasi
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}