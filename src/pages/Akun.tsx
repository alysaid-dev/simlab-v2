import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Users, Search, Plus, Pencil, Trash2, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../components/ui/pagination";
import { apiFetch } from "../lib/apiFetch";
import { useDialog } from "../lib/dialog";

type Peran =
  | "Super Admin"
  | "Laboran"
  | "Dosen"
  | "Kepala Laboratorium"
  | "Staff"
  | "Mahasiswa";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendRoleName =
  | "SUPER_ADMIN"
  | "KEPALA_LAB"
  | "DOSEN"
  | "LABORAN"
  | "STAFF"
  | "MAHASISWA";

interface BackendUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  isActive: boolean;
  waNumber: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Array<{
    userId: string;
    roleId: string;
    role: { id: string; name: BackendRoleName };
  }>;
}

interface UserListResponse {
  items: BackendUser[];
  total: number;
  skip: number;
  take: number;
}

const roleLabel: Record<BackendRoleName, Peran> = {
  SUPER_ADMIN: "Super Admin",
  KEPALA_LAB: "Kepala Laboratorium",
  DOSEN: "Dosen",
  LABORAN: "Laboran",
  STAFF: "Staff",
  MAHASISWA: "Mahasiswa",
};

// Order untuk dropdown/checkbox — highest authority first.
const ROLE_CHOICES: BackendRoleName[] = [
  "SUPER_ADMIN",
  "KEPALA_LAB",
  "DOSEN",
  "LABORAN",
  "STAFF",
  "MAHASISWA",
];

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Bangun daftar nomor halaman dengan ellipsis: 1 ... 4 5 6 ... 20.
// Untuk total ≤ 7, tampilkan semua.
function buildPageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

interface Account {
  id: string;           // display NIM/UID
  backendId: string;    // UUID untuk API calls
  nama: string;
  email: string;
  waNumber: string | null;
  peran: BackendRoleName[];
  status: "Aktif" | "Nonaktif";
  tanggalDibuat: string;
}

export default function Akun() {
  const { alert, confirm } = useDialog();
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  // Akun screen state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 25;

  const mapBackendUser = (u: BackendUser): Account => ({
    id: u.uid,
    backendId: u.id,
    nama: u.displayName,
    email: u.email,
    waNumber: u.waNumber,
    peran: u.roles.map((r) => r.role.name),
    status: u.isActive ? "Aktif" : "Nonaktif",
    tanggalDibuat: formatDateShort(u.createdAt),
  });

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const params = new URLSearchParams({
        skip: String((currentPage - 1) * PAGE_SIZE),
        take: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (statusFilter === "Aktif") params.set("isActive", "true");
      else if (statusFilter === "Nonaktif") params.set("isActive", "false");
      const r = await apiFetch(
        `${API_BASE}/api/users?${params.toString()}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as UserListResponse;
      setAccounts(data.items.map(mapBackendUser));
      setTotal(data.total);
    } catch (err) {
      setAccountsError(
        err instanceof Error ? err.message : "Gagal memuat daftar akun",
      );
    } finally {
      setAccountsLoading(false);
    }
  };

  // Debounce search input — delay 300ms supaya tidak fetch tiap keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset ke halaman 1 saat filter berubah supaya tidak nyangkut di
  // currentPage lama yang mungkin out-of-range untuk filter baru.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, statusFilter]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // Form fields
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWa, setFormWa] = useState("");
  const [formPeran, setFormPeran] = useState<BackendRoleName[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const peranColors: Record<Peran, string> = {
    "Super Admin": "bg-red-100 text-red-700",
    Laboran: "bg-blue-100 text-blue-700",
    Dosen: "bg-indigo-100 text-indigo-700",
    "Kepala Laboratorium": "bg-purple-100 text-purple-700",
    Staff: "bg-gray-100 text-gray-700",
    Mahasiswa: "bg-green-100 text-green-700",
  };

  const getPeranBadge = (peran: Peran) => (
    <Badge className={`${peranColors[peran]} hover:${peranColors[peran]}`}>
      {peran}
    </Badge>
  );

  // Multi-role: render semua role user sebagai kumpulan badge kecil.
  const renderPeranList = (roles: BackendRoleName[]) => {
    if (roles.length === 0) {
      return <span className="text-gray-400 text-xs">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {roles.map((r) => (
          <Badge key={r} className={`${peranColors[roleLabel[r]]}`}>
            {roleLabel[r]}
          </Badge>
        ))}
      </div>
    );
  };

  const handleToggleStatus = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const nextActive = account.status === "Nonaktif";
    try {
      const r = await apiFetch(
        `${API_BASE}/api/users/${encodeURIComponent(account.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextActive }),
        },
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r.status}`);
      }
      void fetchAccounts();
    } catch (err) {
      await alert(
        `Gagal mengubah status: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleAddAccount = () => {
    setFormId("");
    setFormNama("");
    setFormEmail("");
    setFormWa("");
    setFormPeran([]);
    setAddModalOpen(true);
  };

  const toggleFormPeran = (role: BackendRoleName) => {
    setFormPeran((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveNewAccount = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await apiFetch(`${API_BASE}/api/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: formId.trim(),
          email: formEmail.trim(),
          displayName: formNama.trim(),
          ...(formWa.trim() ? { waNumber: formWa.trim() } : {}),
          roles: formPeran,
        }),
      });
      if (!r.ok) {
        const e = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r.status}`);
      }
      await fetchAccounts();
      setAddModalOpen(false);
    } catch (err) {
      await alert(
        `Gagal menambah akun: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setFormId(account.id);
    setFormNama(account.nama);
    setFormEmail(account.email);
    setFormWa(account.waNumber ?? "");
    setFormPeran(account.peran);
    setEditModalOpen(true);
  };

  const handleSaveEditAccount = async () => {
    if (!selectedAccount || submitting) return;
    setSubmitting(true);
    try {
      // PATCH basic fields
      const r1 = await apiFetch(
        `${API_BASE}/api/users/${encodeURIComponent(selectedAccount.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: formNama.trim(),
            email: formEmail.trim(),
            waNumber: formWa.trim() ? formWa.trim() : null,
          }),
        },
      );
      if (!r1.ok) {
        const e = (await r1.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r1.status}`);
      }
      // PUT roles (replace)
      const r2 = await apiFetch(
        `${API_BASE}/api/users/${encodeURIComponent(selectedAccount.backendId)}/roles`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: formPeran }),
        },
      );
      if (!r2.ok) {
        const e = (await r2.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r2.status}`);
      }
      await fetchAccounts();
      setEditModalOpen(false);
      setSelectedAccount(null);
    } catch (err) {
      await alert(
        `Gagal menyimpan perubahan: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Soft delete — set isActive=false. User tidak benar-benar dihapus karena
  // banyak relasi FK Restrict (Loan, Reservation, dll). Akun bisa di-aktifkan
  // lagi via toggle status.
  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    const ok = await confirm(
      `Nonaktifkan akun "${account.nama}"? Akun bisa diaktifkan lagi nanti.`,
      { destructive: true, confirmText: "Nonaktifkan" },
    );
    if (!ok) return;
    try {
      const r = await apiFetch(
        `${API_BASE}/api/users/${encodeURIComponent(account.backendId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r.status}`);
      }
      void fetchAccounts();
    } catch (err) {
      await alert(
        `Gagal menonaktifkan akun: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const renderContent = () => {
    if (activeMenu === "Akun" && accountsLoading) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat daftar akun...</p>
          </div>
        </Card>
      );
    }
    if (activeMenu === "Akun" && accountsError) {
      return (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Gagal memuat akun: {accountsError}
          </AlertDescription>
        </Alert>
      );
    }

    switch (activeMenu) {
      case "Akun":
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

        return (
          <div>
            {/* Toolbar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama, email, atau NIM..."
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
                    variant={statusFilter === "Aktif" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Aktif")}
                  >
                    Aktif
                  </Button>
                  <Button
                    variant={statusFilter === "Nonaktif" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("Nonaktif")}
                  >
                    Nonaktif
                  </Button>
                </div>
                
                <Button onClick={handleAddAccount}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Akun
                </Button>
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM / ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Peran</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal Dibuat</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {accounts.map((account) => (
                      <tr key={account.id} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-500">{account.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{account.nama}</td>
                        <td className="px-4 py-3 text-sm">{account.email}</td>
                        <td className="px-4 py-3 text-sm">{renderPeranList(account.peran)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleToggleStatus(account.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              account.status === "Aktif" ? "bg-green-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                account.status === "Aktif" ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-sm">{account.tanggalDibuat}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditAccount(account)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteAccount(account.id)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                              title="Nonaktifkan akun"
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
              {accounts.length === 0 && !accountsLoading && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada akun yang ditemukan
                </div>
              )}
            </Card>

            {/* Pagination */}
            {total > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Menampilkan{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>
                  –
                  <span className="font-medium">
                    {Math.min(currentPage * PAGE_SIZE, total)}
                  </span>{" "}
                  dari <span className="font-medium">{total}</span> akun
                </div>
                {totalPages > 1 && (
                  <Pagination className="sm:justify-end mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          aria-disabled={currentPage <= 1}
                          className={
                            currentPage <= 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      {buildPageList(currentPage, totalPages).map((p, idx) =>
                        p === "..." ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={p}>
                            <PaginationLink
                              isActive={p === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(p);
                              }}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              setCurrentPage(currentPage + 1);
                          }}
                          aria-disabled={currentPage >= totalPages}
                          className={
                            currentPage >= totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            )}

            {/* Add Account Modal */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Tambah Akun</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk menambahkan akun pengguna baru
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="id">NIM / ID</Label>
                    <Input
                      id="id"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="21611042"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="nama">Nama Lengkap</Label>
                    <Input
                      id="nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Nama Lengkap"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="email@uii.ac.id"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wa">Nomor WhatsApp (opsional)</Label>
                    <Input
                      id="wa"
                      inputMode="tel"
                      value={formWa}
                      onChange={(e) => setFormWa(e.target.value)}
                      placeholder="628xxxxxxxxxx"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Format 62… atau 08…, min 6 digit. Kosongkan jika belum tahu — mahasiswa bisa isi sendiri saat login.
                    </p>
                  </div>

                  <div>
                    <Label>Peran (pilih satu atau lebih)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                      {ROLE_CHOICES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={formPeran.includes(role)}
                            onCheckedChange={() => toggleFormPeran(role)}
                          />
                          {roleLabel[role]}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveNewAccount}
                    disabled={!formId || !formNama || !formEmail || submitting}
                  >
                    {submitting ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Account Modal */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Akun</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk mengedit informasi akun pengguna
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-id">NIM / ID</Label>
                    <Input
                      id="edit-id"
                      value={formId}
                      disabled
                      className="bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-nama">Nama Lengkap</Label>
                    <Input
                      id="edit-nama"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-wa">Nomor WhatsApp</Label>
                    <Input
                      id="edit-wa"
                      inputMode="tel"
                      value={formWa}
                      onChange={(e) => setFormWa(e.target.value)}
                      placeholder="628xxxxxxxxxx"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kosongkan untuk menghapus nomor. Min 6 digit jika diisi.
                    </p>
                  </div>

                  <div>
                    <Label>Peran (pilih satu atau lebih)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                      {ROLE_CHOICES.map((role) => (
                        <label
                          key={role}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={formPeran.includes(role)}
                            onCheckedChange={() => toggleFormPeran(role)}
                          />
                          {roleLabel[role]}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveEditAccount}
                    disabled={!formNama || !formEmail || submitting}
                  >
                    {submitting ? "Menyimpan..." : "Simpan Perubahan"}
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
      title="Akun"
      breadcrumbs={[
        { label: "Akun" },
        ...(activeMenu ? [{ label: activeMenu }] : [])
      ]}
      icon={<Users className="w-8 h-8 text-white" />}
      sidebarItems={['Akun']}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Akun</h2>
          <p className="text-sm text-gray-500 mb-5">Manajemen Akun Pengguna</p>
          
          {/* Button */}
          <button
            onClick={() => setActiveMenu("Akun")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Akun
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}