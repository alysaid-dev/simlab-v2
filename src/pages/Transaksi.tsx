import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { RiwayatDendaPanel } from "../components/RiwayatDendaPanel";
import { CreditCard, Search, Loader2, CheckCircle, AlertCircle, Scan, Barcode, Calendar, Clock, MessageCircle, ChevronDown, RotateCcw, CalendarIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { apiFetch } from "../lib/apiFetch";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendLoanStatus =
  | "PENDING"
  | "APPROVED_BY_DOSEN"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "RETURNED"
  | "OVERDUE"
  | "CANCELLED";
type BackendLoanType = "TA" | "PRACTICUM";

interface BackendLoan {
  id: string;
  userId: string;
  assetId: string;
  lecturerId: string | null;
  type: BackendLoanType;
  status: BackendLoanStatus;
  startDate: string;
  endDate: string;
  returnDate: string | null;
  dayLate: number;
  fine: string | number;
  thesisTitle: string | null;
  thesisAbstract: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  borrower?: { id: string; displayName: string; uid: string; waNumber?: string | null };
  asset?: { id: string; name: string; code: string };
  lecturer?: { id: string; displayName: string } | null;
}

interface LoanListResponse {
  items: BackendLoan[];
  total: number;
  skip: number;
  take: number;
}

interface BackendAsset {
  id: string;
  name: string;
  code: string;
  status: "AVAILABLE" | "BORROWED" | "DAMAGED" | "MAINTENANCE";
}

interface BackendUser {
  id: string;
  uid: string;
  displayName: string;
}

interface FoundStudent {
  nama: string;
  nim: string;
  userId: string;
  loanId: string;
  laptop: string;
  laptopCode: string;
  assetId: string;
  dosenPembimbing: string;
  judulSkripsi: string;
  abstrakSkripsi: string;
  tanggalPengajuan: string;
  approvedByDosen: boolean;
  approvedByKepalaLab: boolean;
  whatsapp: string;
}

function deriveUrgency(endDateIso: string): "normal" | "mendekati" | "terlambat" {
  const diffMs = new Date(endDateIso).getTime() - Date.now();
  if (diffMs < 0) return "terlambat";
  if (diffMs < 2 * 24 * 60 * 60 * 1000) return "mendekati";
  return "normal";
}

// Active loan record
interface ActiveLoan {
  id: string; // display-only "TRX-XXXX"
  backendId: string; // real UUID untuk PATCH ke backend
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

export default function Transaksi() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  
  // Pengajuan states
  const [searchNIM, setSearchNIM] = useState("");
  const [searchState, setSearchState] = useState<"idle" | "loading" | "found" | "notfound" | "success">("idle");
  const [foundStudent, setFoundStudent] = useState<FoundStudent | null>(null);
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
  const [praktikumNamaLaptop, setPraktikumNamaLaptop] = useState("");
  const [praktikumNamaPraktikum, setPraktikumNamaPraktikum] = useState("");
  const [praktikumReturnDate, setPraktikumReturnDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [praktikumReturnTime, setPraktikumReturnTime] = useState("16:00");
  const [praktikumSuccess, setPraktikumSuccess] = useState(false);
  const [praktikumData, setPraktikumData] = useState<any>(null);

  // Active loans state — fetched from /api/loans.
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState<string | null>(null);

  const fetchActiveLoans = async () => {
    setLoansLoading(true);
    setLoansError(null);
    try {
      const r = await apiFetch(`${API_BASE}/api/loans`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as LoanListResponse;
      const mapped: ActiveLoan[] = data.items
        .filter((l) => l.status === "ACTIVE" || l.status === "OVERDUE")
        .map((l) => ({
          id: `TRX-${l.id.slice(0, 8).toUpperCase()}`,
          backendId: l.id,
          nama: l.borrower?.displayName ?? "-",
          jenis: l.type === "TA" ? "Skripsi" : "Praktikum",
          laptop: l.asset?.code ?? "-",
          batasKembali: new Date(l.endDate),
          whatsapp: l.borrower?.waNumber ?? "-",
          status: deriveUrgency(l.endDate),
          denda: typeof l.fine === "string" ? Number(l.fine) : l.fine,
        }));
      setActiveLoans(mapped);
    } catch (err) {
      setLoansError(
        err instanceof Error ? err.message : "Gagal memuat peminjaman",
      );
    } finally {
      setLoansLoading(false);
    }
  };

  useEffect(() => {
    void fetchActiveLoans();
  }, []);

  // Extension dialog state
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [selectedLoanForExtension, setSelectedLoanForExtension] = useState<ActiveLoan | null>(null);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionTime, setExtensionTime] = useState("16:00");

  // Return asset dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState<ActiveLoan | null>(null);
  const [assetCondition, setAssetCondition] = useState("Baik");
  const [returnNotes, setReturnNotes] = useState("");

  // New perpanjang dialog state
  const [newPerpanjangDialogOpen, setNewPerpanjangDialogOpen] = useState(false);
  const [selectedLoanForNewExtension, setSelectedLoanForNewExtension] = useState<ActiveLoan | null>(null);
  const [newExtensionDate, setNewExtensionDate] = useState("");

  const handleSearch = async () => {
    setSearchState("loading");
    try {
      // Cari loan yang sudah fully APPROVED (lolos kalab) untuk NIM ini.
      // Filter client-side karena backend /api/loans tidak support search by
      // borrower.uid langsung.
      const r = await apiFetch(`${API_BASE}/api/loans?status=APPROVED&take=200`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as LoanListResponse;
      const match = data.items.find(
        (l) => l.borrower?.uid === searchNIM,
      );
      if (!match) {
        setSearchState("notfound");
        setFoundStudent(null);
        return;
      }
      setFoundStudent({
        nama: match.borrower?.displayName ?? "-",
        nim: match.borrower?.uid ?? "-",
        userId: match.userId,
        loanId: match.id,
        laptop: match.asset?.name ?? "-",
        laptopCode: match.asset?.code ?? "-",
        assetId: match.assetId,
        dosenPembimbing: match.lecturer?.displayName ?? "-",
        judulSkripsi: match.thesisTitle ?? "-",
        abstrakSkripsi: match.thesisAbstract ?? "-",
        tanggalPengajuan: new Date(match.createdAt).toLocaleDateString(
          "id-ID",
          { day: "numeric", month: "long", year: "numeric" },
        ),
        approvedByDosen: true,
        approvedByKepalaLab: true,
        whatsapp: match.borrower?.waNumber ?? "-",
      });
      setSearchState("found");
    } catch (err) {
      console.error("[handleSearch]", err);
      setSearchState("notfound");
      setFoundStudent(null);
    }
  };

  // Mengaktifkan loan APPROVED yang ditemukan: update endDate (kalau laboran
  // menyesuaikan) + transisi status ke ACTIVE. Backend akan sync Asset.status
  // → BORROWED secara otomatis di loans.service.ts.
  const handleProses = async () => {
    if (!foundStudent?.loanId) return;
    try {
      const newEnd = new Date(`${returnDate}T${returnTime}`);
      await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(foundStudent.loanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: newEnd.toISOString() }),
        },
      );
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(foundStudent.loanId)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ACTIVE" }),
        },
      );
      if (!r.ok) {
        const err = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${r.status}`);
      }
      setSearchState("success");
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal memproses peminjaman: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
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

  const handlePraktikumLaptopIdChange = async (value: string) => {
    setPraktikumIdLaptop(value);
    if (value.trim().length < 3) {
      setPraktikumNamaLaptop("");
      return;
    }
    try {
      const r = await apiFetch(
        `${API_BASE}/api/assets?search=${encodeURIComponent(value)}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items: BackendAsset[] };
      const match = data.items.find((a) => a.code === value);
      if (!match) {
        setPraktikumNamaLaptop("Laptop Tidak Ditemukan");
        return;
      }
      if (match.status !== "AVAILABLE") {
        setPraktikumNamaLaptop(`${match.name} (sedang ${match.status.toLowerCase()})`);
        return;
      }
      setPraktikumNamaLaptop(match.name);
    } catch {
      setPraktikumNamaLaptop("Gagal memuat data laptop");
    }
  };

  const handlePraktikumIdChange = async (value: string) => {
    setPraktikumIdPengguna(value);
    if (value.length < 5) {
      setPraktikumNama("");
      return;
    }
    // Lookup user by UID (NIM). Backend list endpoint supports search by uid.
    try {
      const r = await apiFetch(
        `${API_BASE}/api/users?search=${encodeURIComponent(value)}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items: BackendUser[] };
      const match = data.items.find((u) => u.uid === value);
      setPraktikumNama(match ? match.displayName : "Mahasiswa Tidak Ditemukan");
    } catch {
      setPraktikumNama("Mahasiswa Tidak Ditemukan");
    }
  };

  // POST /api/loans untuk peminjaman praktikum (walk-in). Laboran perlu
  // role LABORAN+ di backend supaya `userId` di body dipakai (bukan session
  // laboran).
  const handlePraktikumSubmit = async () => {
    try {
      const [usersRes, assetsRes] = await Promise.all([
        apiFetch(
          `${API_BASE}/api/users?search=${encodeURIComponent(praktikumIdPengguna)}`,
          { credentials: "include" },
        ),
        apiFetch(`${API_BASE}/api/assets`, { credentials: "include" }),
      ]);
      if (!usersRes.ok) throw new Error(`Gagal cari mahasiswa: ${usersRes.status}`);
      if (!assetsRes.ok) throw new Error(`Gagal cari laptop: ${assetsRes.status}`);
      const usersData = (await usersRes.json()) as { items: BackendUser[] };
      const assetsData = (await assetsRes.json()) as { items: BackendAsset[] };

      const user = usersData.items.find((u) => u.uid === praktikumIdPengguna);
      if (!user) throw new Error(`Mahasiswa dengan NIM ${praktikumIdPengguna} tidak ditemukan`);

      const asset = assetsData.items.find((a) => a.code === praktikumIdLaptop);
      if (!asset) throw new Error(`Laptop dengan kode ${praktikumIdLaptop} tidak ditemukan`);
      if (asset.status !== "AVAILABLE") {
        throw new Error(`Laptop ${asset.code} sedang ${asset.status.toLowerCase()}, tidak bisa dipinjam`);
      }

      const startDate = new Date();
      const endDate = new Date(`${praktikumReturnDate}T${praktikumReturnTime}`);
      const r = await apiFetch(`${API_BASE}/api/loans`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          assetId: asset.id,
          type: "PRACTICUM",
          status: "ACTIVE",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          notes: praktikumNamaPraktikum
            ? `Praktikum: ${praktikumNamaPraktikum}`
            : undefined,
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${r.status}`);
      }

      setPraktikumData({
        idPengguna: praktikumIdPengguna,
        nama: praktikumNama,
        idLaptop: praktikumIdLaptop,
        namaPraktikum: praktikumNamaPraktikum,
        returnDate: praktikumReturnDate,
        returnTime: praktikumReturnTime,
      });
      setPraktikumSuccess(true);
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal mencatat transaksi praktikum: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handlePraktikumBaru = () => {
    setPraktikumIdPengguna("");
    setPraktikumNama("");
    setPraktikumIdLaptop("");
    setPraktikumNamaLaptop("");
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

  // "Tandai Selesai" pada peminjaman terlambat — PATCH status ke RETURNED.
  const handleMarkComplete = async (id: string) => {
    const loan = activeLoans.find((l) => l.id === id);
    if (!loan) return;
    try {
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(loan.backendId)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RETURNED" }),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal menandai selesai: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleExtensionSubmit = async () => {
    if (!selectedLoanForExtension) return;
    try {
      const newEnd = new Date(`${extensionDate}T${extensionTime}`);
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(selectedLoanForExtension.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: newEnd.toISOString() }),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setExtensionDialogOpen(false);
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal memperpanjang: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleReturnSubmit = async () => {
    if (!selectedLoanForReturn) return;
    try {
      const noteSuffix = [
        `Kondisi: ${assetCondition}`,
        returnNotes ? `Catatan: ${returnNotes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(selectedLoanForReturn.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: noteSuffix }),
        },
      );
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(selectedLoanForReturn.backendId)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RETURNED" }),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReturnDialogOpen(false);
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal mencatat pengembalian: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleNewPerpanjangSubmit = async () => {
    if (!selectedLoanForNewExtension) return;
    try {
      const newEnd = new Date(`${newExtensionDate}T16:00`);
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(selectedLoanForNewExtension.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endDate: newEnd.toISOString() }),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setNewPerpanjangDialogOpen(false);
      void fetchActiveLoans();
    } catch (err) {
      alert(
        `Gagal memperpanjang: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  // Calculate summary stats
  const totalAktif = activeLoans.length;
  const mendekatiBefore = activeLoans.filter(loan => loan.status === "mendekati").length;
  const terlambatCount = activeLoans.filter(loan => loan.status === "terlambat").length;

  const renderContent = () => {
    const loanMenus = new Set(["Peminjaman Aktif", "Jatuh Tempo", "Terlambat"]);
    if (loanMenus.has(activeMenu)) {
      if (loansLoading) {
        return (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Memuat data peminjaman...</p>
            </div>
          </Card>
        );
      }
      if (loansError) {
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Gagal memuat peminjaman: {loansError}
            </AlertDescription>
          </Alert>
        );
      }
    }

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
                            <p className="text-sm text-gray-600">Tanggal Pengajuan</p>
                            <p className="font-medium">{foundStudent.tanggalPengajuan}</p>
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
                          onChange={(e) => handlePraktikumLaptopIdChange(e.target.value)}
                          placeholder="Scan barcode laptop"
                          className="text-base pr-10"
                        />
                        <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="namaLaptop" className="text-base font-medium">Nama Laptop</Label>
                      <div className="mt-2">
                        <Input
                          id="namaLaptop"
                          value={praktikumNamaLaptop}
                          readOnly
                          placeholder="Terisi otomatis"
                          className="text-base bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Terisi otomatis berdasarkan ID Laptop</p>
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
                      disabled={
                        !praktikumIdPengguna ||
                        !praktikumNama ||
                        praktikumNama === "Mahasiswa Tidak Ditemukan" ||
                        !praktikumIdLaptop ||
                        !praktikumNamaLaptop ||
                        praktikumNamaLaptop === "Laptop Tidak Ditemukan" ||
                        praktikumNamaLaptop === "Gagal memuat data laptop" ||
                        praktikumNamaLaptop.includes("(sedang") ||
                        !praktikumNamaPraktikum
                      }
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

      case "Riwayat Denda":
        return <RiwayatDendaPanel />;

      default:
        return null;
    }
  };

  return (
    <PageLayout
      title="Transaksi"
      breadcrumbs={[{ label: "Transaksi" }]}
      icon={<CreditCard className="w-8 h-8 text-white" />}
      sidebarItems={['Pengajuan', 'Praktikum', 'Peminjaman Aktif', 'Jatuh Tempo', 'Terlambat', 'Riwayat Denda']}
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