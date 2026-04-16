import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { CreditCard, Search, Loader2, CheckCircle, AlertCircle, Scan, Barcode, Calendar, Clock, MessageCircle, ChevronDown, RotateCcw, CalendarIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

// Mock data for student lookup
const mockStudentData = {
  "20611157": {
    nama: "Ridhani Rizal Said",
    nim: "20611157",
    programStudi: "Statistika",
    laptop: "Laptop 4",
    dosenPembimbing: "Dr. Anggit Wibisono, M.Si",
    judulSkripsi: "Analisis Faktor-Faktor yang Mempengaruhi Indeks Prestasi Mahasiswa Menggunakan Regresi Logistik Ordinal",
    tanggalPengajuan: "10 Maret 2026",
    approvedByDosen: true,
    approvedByKepalaLab: true,
    whatsapp: "081234567890"
  },
  "2101234567": {
    nama: "Ahmad Rizki Maulana",
    nim: "2101234567",
    programStudi: "S1 Statistika",
    laptop: "LAB-LP-001",
    dosenPembimbing: "Dr. Siti Nurjanah, M.Si",
    judulSkripsi: "Analisis Regresi Logistik untuk Prediksi Kelulusan Mahasiswa",
    tanggalPengajuan: "20 Maret 2026",
    approvedByDosen: true,
    approvedByKepalaLab: true,
    whatsapp: "081234567890"
  },
  "2101234568": {
    nama: "Dewi Kusuma Wardani",
    nim: "2101234568",
    programStudi: "S1 Statistika",
    laptop: "LAB-LP-003",
    dosenPembimbing: "Prof. Dr. Budiman Santoso, M.Sc",
    judulSkripsi: "Implementasi Algoritma Machine Learning dalam Klasifikasi Data",
    tanggalPengajuan: "22 Maret 2026",
    approvedByDosen: true,
    approvedByKepalaLab: true,
    whatsapp: "081234567891"
  }
};

// Active loan record
interface ActiveLoan {
  id: string;
  nama: string;
  jenis: string;
  laptop: string;
  batasKembali: Date;
  whatsapp: string;
  status: string;
  denda: number;
  kondisiPengembalian?: string;
  catatanPengembalian?: string;
}

// Mock active loans data
const mockActiveLoans: ActiveLoan[] = [
  {
    id: "TRX-2026-001",
    nama: "Ahmad Rizki Maulana",
    jenis: "Skripsi",
    laptop: "LAB-LP-001",
    batasKembali: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    whatsapp: "081234567890",
    status: "normal",
    denda: 0
  },
  {
    id: "TRX-2026-002",
    nama: "Dewi Kusuma Wardani",
    jenis: "Praktikum",
    laptop: "LAB-LP-003",
    batasKembali: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 1 day 3 hours from now
    whatsapp: "081234567891",
    status: "mendekati",
    denda: 0
  },
  {
    id: "TRX-2026-003",
    nama: "Budi Santoso",
    jenis: "Skripsi",
    laptop: "LAB-LP-005",
    batasKembali: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    whatsapp: "081234567892",
    status: "terlambat",
    denda: 100000 // Rp 50.000 per day
  },
  {
    id: "TRX-2026-004",
    nama: "Siti Aminah",
    jenis: "Praktikum",
    laptop: "LAB-LP-007",
    batasKembali: new Date(Date.now() + 10 * 60 * 60 * 1000), // 10 hours from now
    whatsapp: "081234567893",
    status: "mendekati",
    denda: 0
  },
  {
    id: "TRX-2026-005",
    nama: "Rudi Hermawan",
    jenis: "Skripsi",
    laptop: "LAB-LP-009",
    batasKembali: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    whatsapp: "081234567894",
    status: "terlambat",
    denda: 250000 // Rp 50.000 per day
  },
  {
    id: "TRX-2026-006",
    nama: "Ratna Sari",
    jenis: "Skripsi",
    laptop: "LAB-LP-012",
    batasKembali: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    whatsapp: "081234567895",
    status: "terlambat",
    denda: 0 // Not yet calculated
  }
];

export default function Transaksi() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  
  // Pengajuan states
  const [searchNIM, setSearchNIM] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "found" | "notfound" | "success">("idle");
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [returnDate, setReturnDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 2 weeks from now
    return date.toISOString().split('T')[0];
  });
  const [returnTime, setReturnTime] = useState("16:00");

  // Praktikum states
  const [praktikumIdPengguna, setPraktikumIdPengguna] = useState("");
  const [praktikumNama, setPraktikumNama] = useState("");
  const [praktikumIdLaptop, setPraktikumIdLaptop] = useState("");
  const [praktikumNamaPraktikum, setPraktikumNamaPraktikum] = useState("");
  const [praktikumReturnDate, setPraktikumReturnDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [praktikumReturnTime, setPraktikumReturnTime] = useState("16:00");
  const [praktikumSuccess, setPraktikumSuccess] = useState(false);
  const [praktikumData, setPraktikumData] = useState<any>(null);

  // Active loans state
  const [activeLoans, setActiveLoans] = useState(mockActiveLoans);

  // Extension dialog state
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedLoanForExtension, setSelectedLoanForExtension] = useState<any>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionTime, setExtensionTime] = useState("16:00");

  // Return asset dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<any>(null);
  const [assetCondition, setAssetCondition] = useState("Baik");
  const [returnNotes, setReturnNotes] = useState("");

  // New perpanjang dialog state
  const [newPerpanjangDialogOpen, setNewPerpanjangDialogOpen] = useState(false);
  const [selectedLoanForNewExtension, setSelectedLoanForNewExtension] = useState<any>(null);
  const [newExtensionDate, setNewExtensionDate] = useState("");

  const handleSearch = () => {
    setSearchState("loading");
    
    setTimeout(() => {
      const student = mockStudentData[searchNIM as keyof typeof mockStudentData];
      if (student) {
        setFoundStudent(student);
        setSearchState("found");
      } else {
        setSearchState("notfound");
        setFoundStudent(null);
      }
    }, 1000);
  };

  const handleProses = () => {
    // Process the transaction
    setSearchState("success");
  };

  const handleProsesLagi = () => {
    setSearchNIM("");
    setSearchState("idle");
    setFoundStudent(null);
    setReturnDate(() => {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date.toISOString().split('T')[0];
    });
    setReturnTime("16:00");
  };

  const handlePraktikumIdChange = (value: string) => {
    setPraktikumIdPengguna(value);
    // Auto-fill name when ID is entered
    if (value.length >= 5) {
      const student = mockStudentData[value as keyof typeof mockStudentData];
      if (student) {
        setPraktikumNama(student.nama);
      } else {
        setPraktikumNama("Mahasiswa Tidak Ditemukan");
      }
    } else {
      setPraktikumNama("");
    }
  };

  const handlePraktikumSubmit = () => {
    setPraktikumData({
      idPengguna: praktikumIdPengguna,
      nama: praktikumNama,
      idLaptop: praktikumIdLaptop,
      namaPraktikum: praktikumNamaPraktikum,
      returnDate: praktikumReturnDate,
      returnTime: praktikumReturnTime
    });
    setPraktikumSuccess(true);
  };

  const handlePraktikumBaru = () => {
    setPraktikumIdPengguna("");
    setPraktikumNama("");
    setPraktikumIdLaptop("");
    setPraktikumNamaPraktikum("");
    setPraktikumReturnDate(new Date().toISOString().split('T')[0]);
    setPraktikumReturnTime("16:00");
    setPraktikumSuccess(false);
    setPraktikumData(null);
  };

  const getTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff < 0) {
      const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
      if (days > 0) return `Terlambat ${days} hari`;
      const hours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
      return `Terlambat ${hours} jam`;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 2) return `${days} hari lagi`;
    if (days === 0 && hours < 24) {
      if (hours === 0) return "Kurang dari 1 jam";
      return `${hours} jam lagi`;
    }
    return `${days} hari ${hours} jam lagi`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "normal":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Aktif</Badge>;
      case "mendekati":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Mendekati Jatuh Tempo</Badge>;
      case "terlambat":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Terlambat</Badge>;
      default:
        return null;
    }
  };

  const getRowClass = (status: string) => {
    switch (status) {
      case "mendekati":
        return "bg-yellow-50";
      case "terlambat":
        return "bg-red-50";
      default:
        return "bg-white";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getOverdueDays = (deadline: Date) => {
    const now = new Date();
    const diff = now.getTime() - deadline.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const sendWhatsAppReminder = (nama: string, laptop: string, deadline: Date, isOverdue: boolean = false) => {
    const dateStr = formatDate(deadline);
    const whatsapp = "081234567890"; // Would get from data in real implementation
    
    let message = "";
    if (isOverdue) {
      const days = getOverdueDays(deadline);
      message = `Halo ${nama}, laptop ${laptop} yang Anda pinjam di Lab Statistika UII telah TERLAMBAT ${days} hari dari batas waktu pengembalian ${dateStr}. Mohon segera hubungi laboran. Terima kasih.`;
    } else {
      message = `Halo ${nama}, ini pengingat dari Lab Statistika UII. Laptop ${laptop} yang Anda pinjam harus dikembalikan pada ${dateStr}. Mohon segera dikembalikan. Terima kasih.`;
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsapp}?text=${encodedMessage}`, '_blank');
  };

  const handleMarkComplete = (id: string) => {
    setActiveLoans(activeLoans.filter(loan => loan.id !== id));
  };

  const handleExtensionSubmit = () => {
    if (selectedLoanForExtension) {
      const updatedLoans = activeLoans.map(loan => {
        if (loan.id === selectedLoanForExtension.id) {
          loan.batasKembali = new Date(extensionDate + 'T' + extensionTime);
          loan.status = "normal";
        }
        return loan;
      });
      setActiveLoans(updatedLoans);
      setExtensionDialogOpen(false);
    }
  };

  const handleReturnSubmit = () => {
    if (selectedLoanForReturn) {
      const updatedLoans = activeLoans.map(loan => {
        if (loan.id === selectedLoanForReturn.id) {
          loan.status = "selesai";
          loan.kondisiPengembalian = assetCondition;
          loan.catatanPengembalian = returnNotes;
        }
        return loan;
      });
      setActiveLoans(updatedLoans);
      setReturnDialogOpen(false);
    }
  };

  const handleNewPerpanjangSubmit = () => {
    if (selectedLoanForNewExtension) {
      const updatedLoans = activeLoans.map(loan => {
        if (loan.id === selectedLoanForNewExtension.id) {
          loan.batasKembali = new Date(newExtensionDate + 'T' + "16:00");
          loan.status = "normal";
        }
        return loan;
      });
      setActiveLoans(updatedLoans);
      setNewPerpanjangDialogOpen(false);
    }
  };

  // Calculate summary stats
  const totalAktif = activeLoans.length;
  const mendekatiBefore = activeLoans.filter(loan => loan.status === "mendekati").length;
  const terlambatCount = activeLoans.filter(loan => loan.status === "terlambat").length;

  const renderContent = () => {
    switch (activeMenu) {
      case "Pengajuan":
        return (
          <div className="max-w-3xl mx-auto">
            {searchState === "idle" || searchState === "loading" || searchState === "found" || searchState === "notfound" ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">ID Lookup - Peminjaman Laptop</h2>
                  <p className="text-gray-600">Cari data mahasiswa yang telah mendapat persetujuan</p>
                </div>

                <Card className="p-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nim" className="text-base font-medium">NIM / ID Mahasiswa</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="flex-1 relative">
                          <Input
                            id="nim"
                            value={searchNIM}
                            onChange={(e) => setSearchNIM(e.target.value)}
                            placeholder="Scan atau masukkan NIM Mahasiswa"
                            className="text-base pr-10"
                            disabled={searchState === "loading"}
                          />
                          <Scan className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                        <Button 
                          onClick={handleSearch}
                          disabled={!searchNIM || searchState === "loading"}
                          className="px-8"
                        >
                          {searchState === "loading" ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Mencari...
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-2" />
                              Cari
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {searchState === "loading" && (
                  <Card className="p-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-gray-600">Mencari data...</p>
                    </div>
                  </Card>
                )}

                {searchState === "notfound" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Data tidak ditemukan atau belum mendapat persetujuan Kepala Laboratorium.
                    </AlertDescription>
                  </Alert>
                )}

                {searchState === "found" && foundStudent && (
                  <Card className="p-6">
                    <div className="space-y-6">
                      {/* Student Info */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3">Informasi Mahasiswa</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Nama</p>
                            <p className="font-medium">{foundStudent.nama}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">NIM</p>
                            <p className="font-medium">{foundStudent.nim}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Program Studi</p>
                            <p className="font-medium">{foundStudent.programStudi}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-lg mb-3">Detail Peminjaman</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600">Laptop yang Diajukan</p>
                            <p className="font-medium">{foundStudent.laptop}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dosen Pembimbing</p>
                            <p className="font-medium">{foundStudent.dosenPembimbing}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Judul Skripsi</p>
                            <p className="font-medium">{foundStudent.judulSkripsi}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Tanggal Pengajuan</p>
                            <p className="font-medium">{foundStudent.tanggalPengajuan}</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-lg mb-3">Status Persetujuan</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm">Dosen</span>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disetujui</Badge>
                          </div>
                          <span className="text-gray-400">·</span>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm">Kepala Lab</span>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disetujui</Badge>
                          </div>
                          <span className="text-gray-400">·</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Laboran</span>
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menunggu</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-semibold text-lg mb-3">Tanggal & Waktu Harus Kembali</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="returnDate">Tanggal</Label>
                            <div className="relative mt-1">
                              <Input
                                id="returnDate"
                                type="date"
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                              />
                              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="returnTime">Waktu</Label>
                            <div className="relative mt-1">
                              <Input
                                id="returnTime"
                                type="time"
                                value={returnTime}
                                onChange={(e) => setReturnTime(e.target.value)}
                              />
                              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">Dapat disesuaikan atau diperpanjang oleh laboran.</p>
                      </div>

                      <div className="pt-4">
                        <Button onClick={handleProses} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base">
                          Proses
                        </Button>
                        <p className="text-sm text-gray-600 text-center mt-3">
                          Klik Proses untuk menyimpan transaksi dan mencatat peminjaman laptop.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-4">Transaksi Berhasil Diproses!</h2>
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama Mahasiswa:</span>
                        <span className="font-medium">{foundStudent?.nama}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Laptop Dipinjam:</span>
                        <span className="font-medium">{foundStudent?.laptop}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Harus Kembali:</span>
                        <span className="font-medium">
                          {new Date(returnDate + 'T' + returnTime).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleProsesLagi} className="w-full max-w-md">
                    Proses Pengajuan Lain
                  </Button>
                </div>
              </Card>
            )}
          </div>
        );

      case "Praktikum":
        return (
          <div className="max-w-3xl mx-auto">
            {!praktikumSuccess ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Catat Transaksi Praktikum</h2>
                  <p className="text-gray-600">Peminjaman laptop untuk sesi praktikum</p>
                </div>

                <Alert className="mb-6 border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Pastikan mahasiswa mengembalikan laptop sesuai tanggal dan waktu yang ditentukan.
                  </AlertDescription>
                </Alert>

                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="idPengguna" className="text-base font-medium">ID Pengguna</Label>
                      <div className="relative mt-2">
                        <Input
                          id="idPengguna"
                          value={praktikumIdPengguna}
                          onChange={(e) => handlePraktikumIdChange(e.target.value)}
                          placeholder="Scan atau masukkan ID Mahasiswa"
                          className="text-base pr-10"
                        />
                        <Scan className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="nama" className="text-base font-medium">Nama</Label>
                      <div className="mt-2">
                        <Input
                          id="nama"
                          value={praktikumNama}
                          readOnly
                          placeholder="Terisi otomatis"
                          className="text-base bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Terisi otomatis</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="idLaptop" className="text-base font-medium">ID Laptop</Label>
                      <div className="relative mt-2">
                        <Input
                          id="idLaptop"
                          value={praktikumIdLaptop}
                          onChange={(e) => setPraktikumIdLaptop(e.target.value)}
                          placeholder="Scan barcode laptop"
                          className="text-base pr-10"
                        />
                        <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="namaPraktikum" className="text-base font-medium">Nama Praktikum</Label>
                      <Input
                        id="namaPraktikum"
                        value={praktikumNamaPraktikum}
                        onChange={(e) => setPraktikumNamaPraktikum(e.target.value)}
                        placeholder="Contoh: Statistika Komputasi — Sesi 5"
                        className="text-base mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">Tanggal & Waktu Harus Kembali</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="relative">
                          <Input
                            type="date"
                            value={praktikumReturnDate}
                            onChange={(e) => setPraktikumReturnDate(e.target.value)}
                          />
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={praktikumReturnTime}
                            onChange={(e) => setPraktikumReturnTime(e.target.value)}
                          />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">Default: hari yang sama pukul 16.00. Dapat disesuaikan.</p>
                    </div>

                    <Button 
                      onClick={handlePraktikumSubmit}
                      disabled={!praktikumIdPengguna || !praktikumNama || !praktikumIdLaptop || !praktikumNamaPraktikum}
                      className="w-full py-6 text-base"
                    >
                      Catat Transaksi Praktikum
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-4">Transaksi Praktikum Tercatat!</h2>
                  <div className="bg-gray-50 rounded-lg p-6 mb-4 text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama Mahasiswa:</span>
                        <span className="font-medium">{praktikumData?.nama}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID Laptop:</span>
                        <span className="font-medium">{praktikumData?.idLaptop}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama Praktikum:</span>
                        <span className="font-medium">{praktikumData?.namaPraktikum}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Harus Kembali:</span>
                        <span className="font-medium">
                          {new Date(praktikumData?.returnDate + 'T' + praktikumData?.returnTime).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Alert className="mb-6 border-orange-200 bg-orange-50 text-left">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      Ingatkan mahasiswa untuk mengembalikan laptop tepat waktu.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handlePraktikumBaru} className="w-full max-w-md">
                    Catat Transaksi Baru
                  </Button>
                </div>
              </Card>
            )}
          </div>
        );

      case "Peminjaman Aktif":
        return (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Ringkasan Peminjaman</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-600">
                  <p className="text-sm text-gray-600 mb-1">Total Aktif</p>
                  <p className="text-3xl font-bold text-blue-600">{totalAktif}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-yellow-600">
                  <p className="text-sm text-gray-600 mb-1">Mendekati Jatuh Tempo</p>
                  <p className="text-3xl font-bold text-yellow-600">{mendekatiBefore}</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-600">
                  <p className="text-sm text-gray-600 mb-1">Terlambat</p>
                  <p className="text-3xl font-bold text-red-600">{terlambatCount}</p>
                </Card>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Transaksi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Mahasiswa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jenis</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Laptop</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batas Kembali</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sisa Waktu</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {activeLoans.map((loan) => (
                      <tr key={loan.id} className={getRowClass(loan.status)}>
                        <td className="px-4 py-3 text-sm font-medium">{loan.id}</td>
                        <td className="px-4 py-3 text-sm">{loan.nama}</td>
                        <td className="px-4 py-3 text-sm">{loan.jenis}</td>
                        <td className="px-4 py-3 text-sm font-medium">{loan.laptop}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(loan.batasKembali)}</td>
                        <td className="px-4 py-3 text-sm font-medium">{getTimeRemaining(loan.batasKembali)}</td>
                        <td className="px-4 py-3 text-sm">{getStatusBadge(loan.status)}</td>
                        <td className="px-4 py-3 text-sm">
                          {loan.status !== "terlambat" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                Tindakan
                                <ChevronDown className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLoanForReturn(loan);
                                    setAssetCondition("Baik");
                                    setReturnNotes("");
                                    setReturnDialogOpen(true);
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Kembalikan
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLoanForNewExtension(loan);
                                    const newDate = new Date();
                                    newDate.setDate(newDate.getDate() + 14);
                                    setNewExtensionDate(newDate.toISOString().split('T')[0]);
                                    setNewPerpanjangDialogOpen(true);
                                  }}
                                >
                                  <CalendarIcon className="w-4 h-4 mr-2" />
                                  Perpanjang
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Extension Dialog */}
            <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Perpanjang Peminjaman</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk memperpanjang batas waktu peminjaman laptop
                  </DialogDescription>
                </DialogHeader>
                {selectedLoanForExtension && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mahasiswa</Label>
                      <p className="text-base">{selectedLoanForExtension.nama}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Laptop</Label>
                      <p className="text-base">{selectedLoanForExtension.laptop}</p>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Batas Kembali Saat Ini</Label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {formatDate(selectedLoanForExtension.batasKembali)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Batas Kembali Baru</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <Input
                            type="date"
                            value={extensionDate}
                            onChange={(e) => setExtensionDate(e.target.value)}
                          />
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <Input
                            type="time"
                            value={extensionTime}
                            onChange={(e) => setExtensionTime(e.target.value)}
                          />
                          <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExtensionDialogOpen(false);
                      setSelectedLoanForExtension(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleExtensionSubmit}>
                    Simpan Perpanjangan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Return Asset Dialog */}
            <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Kembalikan Aset</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk mencatat pengembalian aset
                  </DialogDescription>
                </DialogHeader>
                {selectedLoanForReturn && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mahasiswa</Label>
                      <p className="text-base">{selectedLoanForReturn.nama}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Laptop</Label>
                      <p className="text-base">{selectedLoanForReturn.laptop}</p>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Batas Kembali Saat Ini</Label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {formatDate(selectedLoanForReturn.batasKembali)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Kondisi Aset</Label>
                      <RadioGroup
                        value={assetCondition}
                        onValueChange={setAssetCondition}
                        className="space-y-2"
                      >
                        <label
                          className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                            assetCondition === "Baik"
                              ? "bg-blue-50 border-blue-900"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <RadioGroupItem value="Baik" className="mr-3" />
                          <span className="text-sm font-medium text-gray-900">Baik</span>
                        </label>
                        <label
                          className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                            assetCondition === "Rusak Ringan"
                              ? "bg-blue-50 border-blue-900"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <RadioGroupItem value="Rusak Ringan" className="mr-3" />
                          <span className="text-sm font-medium text-gray-900">Rusak Ringan</span>
                        </label>
                        <label
                          className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                            assetCondition === "Rusak Berat"
                              ? "bg-blue-50 border-blue-900"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <RadioGroupItem value="Rusak Berat" className="mr-3" />
                          <span className="text-sm font-medium text-gray-900">Rusak Berat</span>
                        </label>
                        <label
                          className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
                            assetCondition === "Hilang"
                              ? "bg-blue-50 border-blue-900"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <RadioGroupItem value="Hilang" className="mr-3" />
                          <span className="text-sm font-medium text-gray-900">Hilang</span>
                        </label>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Catatan Pengembalian</Label>
                      <Textarea
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        placeholder="Tulis catatan jika diperlukan"
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReturnDialogOpen(false);
                      setSelectedLoanForReturn(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleReturnSubmit}>
                    Simpan Pengembalian
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Perpanjang Dialog */}
            <Dialog open={newPerpanjangDialogOpen} onOpenChange={setNewPerpanjangDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Perpanjang Peminjaman</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk memperpanjang batas waktu peminjaman laptop
                  </DialogDescription>
                </DialogHeader>
                {selectedLoanForNewExtension && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Mahasiswa</Label>
                      <p className="text-base">{selectedLoanForNewExtension.nama}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Laptop</Label>
                      <p className="text-base">{selectedLoanForNewExtension.laptop}</p>
                    </div>
                    <div className="border-t pt-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Batas Kembali Saat Ini</Label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {formatDate(selectedLoanForNewExtension.batasKembali)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Batas Kembali Baru</Label>
                      <div className="relative">
                        <Input
                          type="date"
                          value={newExtensionDate}
                          onChange={(e) => setNewExtensionDate(e.target.value)}
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewPerpanjangDialogOpen(false);
                      setSelectedLoanForNewExtension(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleNewPerpanjangSubmit}>
                    Simpan Perpanjangan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Jatuh Tempo":
        const dueLoans = activeLoans.filter(loan => loan.status === "mendekati");
        
        return (
          <div>
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Berikut peminjaman yang akan segera jatuh tempo. Kirim pengingat kepada mahasiswa.
              </AlertDescription>
            </Alert>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Transaksi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Mahasiswa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. WhatsApp</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Laptop</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batas Kembali</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sisa Waktu</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dueLoans.map((loan) => (
                      <tr key={loan.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{loan.id}</td>
                        <td className="px-4 py-3 text-sm">{loan.nama}</td>
                        <td className="px-4 py-3 text-sm">{loan.whatsapp}</td>
                        <td className="px-4 py-3 text-sm font-medium">{loan.laptop}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(loan.batasKembali)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-yellow-700">{getTimeRemaining(loan.batasKembali)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Button 
                            onClick={() => sendWhatsAppReminder(loan.nama, loan.laptop, loan.batasKembali)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Kirim Pengingat
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dueLoans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada peminjaman yang mendekati jatuh tempo
                </div>
              )}
            </Card>
          </div>
        );

      case "Terlambat":
        const overdueLoans = activeLoans.filter(loan => loan.status === "terlambat");
        
        const formatDenda = (denda: number) => {
          if (denda === 0) {
            return <span className="text-gray-400">Rp 0</span>;
          }
          return <span className="font-bold text-red-600">Rp {denda.toLocaleString('id-ID')}</span>;
        };
        
        return (
          <div>
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Berikut peminjaman yang telah melewati batas waktu pengembalian.
              </AlertDescription>
            </Alert>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID Transaksi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama Mahasiswa</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. WhatsApp</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Laptop</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batas Kembali</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Keterlambatan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Denda</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {overdueLoans.map((loan) => (
                      <tr key={loan.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{loan.id}</td>
                        <td className="px-4 py-3 text-sm">{loan.nama}</td>
                        <td className="px-4 py-3 text-sm">{loan.whatsapp}</td>
                        <td className="px-4 py-3 text-sm font-medium">{loan.laptop}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(loan.batasKembali)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="font-bold text-red-600">{getOverdueDays(loan.batasKembali)} hari</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDenda(loan.denda)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => sendWhatsAppReminder(loan.nama, loan.laptop, loan.batasKembali, true)}
                              size="sm"
                              variant="destructive"
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Kirim Pengingat
                            </Button>
                            <Button 
                              onClick={() => handleMarkComplete(loan.id)}
                              size="sm"
                              variant="outline"
                            >
                              Tandai Selesai
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {overdueLoans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada peminjaman yang terlambat
                </div>
              )}
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Transaksi"
      breadcrumbs={[{ label: "Transaksi" }]}
      icon={<CreditCard className="w-8 h-8 text-white" />}
      sidebarItems={['Pengajuan', 'Praktikum', 'Peminjaman Aktif', 'Jatuh Tempo', 'Terlambat']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center mb-3">
            <CreditCard className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Transaksi</h2>
          <p className="text-sm text-gray-500 mb-5">Proses transaksi peminjaman laptop</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Pengajuan")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Transaksi
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}