import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Users, Search, Plus, Pencil, Trash2, Download, Upload, CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";

type Peran =
  | "Super Admin"
  | "Admin"
  | "Laboran"
  | "Dosen"
  | "Kepala Laboratorium"
  | "Staff";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type BackendRoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "KEPALA_LAB"
  | "DOSEN"
  | "LABORAN"
  | "STAFF";

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
  ADMIN: "Admin",
  KEPALA_LAB: "Kepala Laboratorium",
  DOSEN: "Dosen",
  LABORAN: "Laboran",
  STAFF: "Staff",
};

// Order untuk dropdown/checkbox — highest authority first.
const ROLE_CHOICES: BackendRoleName[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "KEPALA_LAB",
  "DOSEN",
  "LABORAN",
  "STAFF",
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

interface Account {
  id: string;           // display NIM/UID
  backendId: string;    // UUID untuk API calls
  nama: string;
  email: string;
  peran: BackendRoleName[];
  status: "Aktif" | "Nonaktif";
  tanggalDibuat: string;
}

interface ImportRow {
  no: number;
  nim: string;
  email: string;
  peran: string;
  valid: boolean;
  error?: string;
}

interface RolePermissions {
  [module: string]: {
    lihat: boolean;
    tambah: boolean;
    edit: boolean;
    hapus: boolean;
  };
}

interface Role {
  name: Peran;
  userCount: number;
  permissions: RolePermissions;
  isBuiltIn: boolean;
}

const mockImportData: ImportRow[] = [
  { no: 1, nim: "21611050", email: "user1@students.uii.ac.id", peran: "Admin", valid: true },
  { no: 2, nim: "21611051", email: "user2@students.uii.ac.id", peran: "Laboran", valid: true },
  { no: 3, nim: "21611042", email: "duplicate@students.uii.ac.id", peran: "Admin", valid: false, error: "NIM duplikat" },
  { no: 4, nim: "21611052", email: "user3@students.uii.ac.id", peran: "Dosen", valid: true },
  { no: 5, nim: "21611053", email: "user4@students.uii.ac.id", peran: "SuperUser", valid: false, error: "Peran tidak dikenal" }
];

const defaultRoles: Role[] = [
  {
    name: "Super Admin",
    userCount: 1,
    isBuiltIn: true,
    permissions: {
      Dashboard: { lihat: true, tambah: true, edit: true, hapus: true },
      Transaksi: { lihat: true, tambah: true, edit: true, hapus: true },
      Aset: { lihat: true, tambah: true, edit: true, hapus: true },
      "Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      "Transaksi Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      Akun: { lihat: true, tambah: true, edit: true, hapus: true },
      "Pengaturan Aplikasi": { lihat: true, tambah: true, edit: true, hapus: true }
    }
  },
  {
    name: "Admin",
    userCount: 2,
    isBuiltIn: true,
    permissions: {
      Dashboard: { lihat: true, tambah: true, edit: true, hapus: true },
      Transaksi: { lihat: true, tambah: true, edit: true, hapus: true },
      Aset: { lihat: true, tambah: true, edit: true, hapus: true },
      "Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      "Transaksi Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      Akun: { lihat: true, tambah: true, edit: true, hapus: false },
      "Pengaturan Aplikasi": { lihat: true, tambah: true, edit: true, hapus: true }
    }
  },
  {
    name: "Laboran",
    userCount: 1,
    isBuiltIn: true,
    permissions: {
      Dashboard: { lihat: false, tambah: false, edit: false, hapus: false },
      Transaksi: { lihat: true, tambah: true, edit: true, hapus: true },
      Aset: { lihat: true, tambah: false, edit: true, hapus: false },
      "Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      "Transaksi Habis Pakai": { lihat: true, tambah: true, edit: true, hapus: true },
      Akun: { lihat: false, tambah: false, edit: false, hapus: false },
      "Pengaturan Aplikasi": { lihat: false, tambah: false, edit: false, hapus: false }
    }
  },
  {
    name: "Dosen",
    userCount: 1,
    isBuiltIn: true,
    permissions: {
      Dashboard: { lihat: true, tambah: false, edit: false, hapus: false },
      Transaksi: { lihat: true, tambah: false, edit: false, hapus: false },
      Aset: { lihat: false, tambah: false, edit: false, hapus: false },
      "Habis Pakai": { lihat: false, tambah: false, edit: false, hapus: false },
      "Transaksi Habis Pakai": { lihat: false, tambah: false, edit: false, hapus: false },
      Akun: { lihat: false, tambah: false, edit: false, hapus: false },
      "Pengaturan Aplikasi": { lihat: false, tambah: false, edit: false, hapus: false }
    }
  },
  {
    name: "Kepala Laboratorium",
    userCount: 1,
    isBuiltIn: true,
    permissions: {
      Dashboard: { lihat: true, tambah: false, edit: false, hapus: false },
      Transaksi: { lihat: true, tambah: false, edit: true, hapus: false },
      Aset: { lihat: true, tambah: false, edit: false, hapus: false },
      "Habis Pakai": { lihat: false, tambah: false, edit: false, hapus: false },
      "Transaksi Habis Pakai": { lihat: false, tambah: false, edit: false, hapus: false },
      Akun: { lihat: false, tambah: false, edit: false, hapus: false },
      "Pengaturan Aplikasi": { lihat: false, tambah: false, edit: false, hapus: false }
    }
  }
];

export default function Akun() {
  const [activeMenu, setActiveMenu] = useState<string>("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);

  const mapBackendUser = (u: BackendUser): Account => ({
    id: u.uid,
    backendId: u.id,
    nama: u.displayName,
    email: u.email,
    peran: u.roles.map((r) => r.role.name),
    status: u.isActive ? "Aktif" : "Nonaktif",
    tanggalDibuat: formatDateShort(u.createdAt),
  });

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const r = await fetch(`${API_BASE}/api/users`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as UserListResponse;
      setAccounts(data.items.map(mapBackendUser));
    } catch (err) {
      setAccountsError(
        err instanceof Error ? err.message : "Gagal memuat daftar akun",
      );
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAccounts();
  }, []);
  
  // Akun screen state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // Form fields
  const [formId, setFormId] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPeran, setFormPeran] = useState<BackendRoleName[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Import Akun state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importStats, setImportStats] = useState({ valid: 0, error: 0 });
  
  // Peran state
  const [expandedRoles, setExpandedRoles] = useState<string[]>(["Super Admin"]);
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState<RolePermissions>({});
  
  // Ubah Peran state
  const [searchUserId, setSearchUserId] = useState("");
  const [searchedAccount, setSearchedAccount] = useState<Account | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [newPeran, setNewPeran] = useState<BackendRoleName[]>([]);
  const [showChangeSuccess, setShowChangeSuccess] = useState(false);
  const [oldPeran, setOldPeran] = useState<BackendRoleName[]>([]);

  const peranColors: Record<Peran, string> = {
    "Super Admin": "bg-red-100 text-red-700",
    Admin: "bg-orange-100 text-orange-700",
    Laboran: "bg-blue-100 text-blue-700",
    Dosen: "bg-indigo-100 text-indigo-700",
    "Kepala Laboratorium": "bg-purple-100 text-purple-700",
    Staff: "bg-gray-100 text-gray-700",
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
      const r = await fetch(
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
      alert(
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
      const r = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: formId.trim(),
          email: formEmail.trim(),
          displayName: formNama.trim(),
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
      alert(
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
    setFormPeran(account.peran);
    setEditModalOpen(true);
  };

  const handleSaveEditAccount = async () => {
    if (!selectedAccount || submitting) return;
    setSubmitting(true);
    try {
      // PATCH basic fields
      const r1 = await fetch(
        `${API_BASE}/api/users/${encodeURIComponent(selectedAccount.backendId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: formNama.trim(),
            email: formEmail.trim(),
          }),
        },
      );
      if (!r1.ok) {
        const e = (await r1.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r1.status}`);
      }
      // PUT roles (replace)
      const r2 = await fetch(
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
      alert(
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
    if (
      !confirm(
        `Nonaktifkan akun "${account.nama}"? Akun bisa diaktifkan lagi nanti.`,
      )
    ) {
      return;
    }
    try {
      const r = await fetch(
        `${API_BASE}/api/users/${encodeURIComponent(account.backendId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r.status}`);
      }
      void fetchAccounts();
    } catch (err) {
      alert(
        `Gagal menonaktifkan akun: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate file processing
      setImportData(mockImportData);
      setShowImportPreview(true);
      const validCount = mockImportData.filter(row => row.valid).length;
      const errorCount = mockImportData.filter(row => !row.valid).length;
      setImportStats({ valid: validCount, error: errorCount });
    }
  };

  const handleImportAccounts = () => {
    setShowImportPreview(false);
    setShowImportSuccess(true);
  };

  const handleImportAgain = () => {
    setUploadedFile(null);
    setImportData([]);
    setShowImportPreview(false);
    setShowImportSuccess(false);
  };

  const toggleRoleExpansion = (roleName: string) => {
    if (expandedRoles.includes(roleName)) {
      setExpandedRoles(expandedRoles.filter(r => r !== roleName));
    } else {
      setExpandedRoles([...expandedRoles, roleName]);
    }
  };

  const handleSearchUser = () => {
    setIsSearching(true);
    setSearchError(false);
    setSearchedAccount(null);
    
    // Simulate API call
    setTimeout(() => {
      const found = accounts.find(acc => 
        acc.id === searchUserId || acc.nama.toLowerCase().includes(searchUserId.toLowerCase())
      );
      
      if (found) {
        setSearchedAccount(found);
        setNewPeran(found.peran);
        setOldPeran(found.peran);
      } else {
        setSearchError(true);
      }
      setIsSearching(false);
    }, 800);
  };

  const handleChangeRole = async () => {
    if (!searchedAccount) return;
    try {
      const r = await fetch(
        `${API_BASE}/api/users/${encodeURIComponent(searchedAccount.backendId)}/roles`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: newPeran }),
        },
      );
      if (!r.ok) {
        const e = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(e?.message ?? `HTTP ${r.status}`);
      }
      await fetchAccounts();
      setShowChangeSuccess(true);
    } catch (err) {
      alert(
        `Gagal mengubah peran: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  const handleChangeAnother = () => {
    setSearchUserId("");
    setSearchedAccount(null);
    setSearchError(false);
    setShowChangeSuccess(false);
  };

  const getFilteredAccounts = () => {
    let filtered = accounts;
    
    if (searchQuery) {
      filtered = filtered.filter(acc =>
        acc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== "Semua") {
      filtered = filtered.filter(acc => acc.status === statusFilter);
    }
    
    return filtered;
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
        const filteredAccounts = getFilteredAccounts();

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
                    {filteredAccounts.map((account) => (
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
              {filteredAccounts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada akun yang ditemukan
                </div>
              )}
            </Card>

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

      case "Import Akun":
        if (showImportSuccess) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Import Berhasil!</h2>
                <p className="text-gray-600">
                  {importStats.valid} akun berhasil diimpor. {importStats.error} akun dilewati karena error.
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={handleImportAgain}>
                  Import Lagi
                </Button>
                <Button variant="outline" onClick={() => setActiveMenu("Akun")}>
                  Lihat Daftar Akun
                </Button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="max-w-4xl">
            {/* Info Box */}
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <p className="font-medium mb-2">Format CSV yang diterima: NIM/ID · Email · Peran</p>
                <p className="mb-2">Pastikan kolom header CSV sesuai: nim, email, peran</p>
                <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                  <Download className="w-4 h-4" />
                  Unduh Template CSV
                </button>
              </AlertDescription>
            </Alert>

            {/* Upload Area */}
            {!showImportPreview && (
              <Card className="p-12 border-2 border-dashed">
                <div className="text-center">
                  <div className="mb-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-700 mb-2">
                      Seret file CSV ke sini atau klik untuk memilih file
                    </p>
                    <p className="text-sm text-gray-500 mb-4">Maksimal ukuran file: 2MB</p>
                  </div>
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>Pilih File</span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </Card>
            )}

            {/* Preview Data */}
            {showImportPreview && (
              <div>
                <Alert className="mb-6 border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">
                    File berhasil dibaca. Periksa data sebelum mengimpor.
                  </AlertDescription>
                </Alert>

                <Card className="overflow-hidden mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM / ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Peran</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importData.map((row) => (
                          <tr key={row.no} className="bg-white hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">{row.no}</td>
                            <td className="px-4 py-3 text-sm font-mono">{row.nim}</td>
                            <td className="px-4 py-3 text-sm">{row.email}</td>
                            <td className="px-4 py-3 text-sm">{row.peran}</td>
                            <td className="px-4 py-3 text-sm">
                              {row.valid ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Valid
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  {row.error}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {importStats.valid} akun valid · {importStats.error} akun error
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleImportAgain}>
                      Batal
                    </Button>
                    <Button onClick={handleImportAccounts}>
                      Impor Akun Valid
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "Peran":
        const modules = ["Dashboard", "Transaksi", "Aset", "Habis Pakai", "Transaksi Habis Pakai", "Akun", "Pengaturan Aplikasi"];
        const actions = ["lihat", "tambah", "edit", "hapus"];
        
        return (
          <div>
            <div className="mb-6 flex justify-end">
              <Button onClick={() => setAddRoleModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Peran
              </Button>
            </div>

            <div className="space-y-4">
              {roles.map((role) => (
                <Card key={role.name} className="overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleRoleExpansion(role.name)}
                  >
                    <div className="flex items-center gap-3">
                      {getPeranBadge(role.name)}
                      <span className="text-sm text-gray-600">
                        {role.userCount} pengguna
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`p-1.5 rounded ${
                          role.isBuiltIn
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-600 hover:text-red-600 hover:bg-gray-100"
                        }`}
                        title={role.isBuiltIn ? "Peran bawaan tidak dapat dihapus" : "Hapus Peran"}
                        disabled={role.isBuiltIn}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!role.isBuiltIn) {
                            // Handle delete
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedRoles.includes(role.name) ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>

                  {expandedRoles.includes(role.name) && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-semibold">Modul</th>
                              <th className="text-center py-2 px-3 font-semibold">Lihat</th>
                              <th className="text-center py-2 px-3 font-semibold">Tambah</th>
                              <th className="text-center py-2 px-3 font-semibold">Edit</th>
                              <th className="text-center py-2 px-3 font-semibold">Hapus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modules.map((module) => (
                              <tr key={module} className="border-b">
                                <td className="py-2 px-3">{module}</td>
                                {actions.map((action) => (
                                  <td key={action} className="py-2 px-3 text-center">
                                    <Checkbox
                                      checked={role.permissions[module]?.[action as keyof typeof role.permissions[typeof module]]}
                                      disabled
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Add Role Modal */}
            <Dialog open={addRoleModalOpen} onOpenChange={setAddRoleModalOpen}>
              <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Tambah Peran Baru</DialogTitle>
                  <DialogDescription className="sr-only">
                    Form untuk menambahkan peran baru dengan pengaturan izin akses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role-name">Nama Peran</Label>
                    <Input
                      id="role-name"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Nama Peran Baru"
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-3 block">Izin Akses</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-2 px-3 font-semibold">Modul</th>
                              <th className="text-center py-2 px-3 font-semibold">Lihat</th>
                              <th className="text-center py-2 px-3 font-semibold">Tambah</th>
                              <th className="text-center py-2 px-3 font-semibold">Edit</th>
                              <th className="text-center py-2 px-3 font-semibold">Hapus</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {modules.map((module) => (
                              <tr key={module}>
                                <td className="py-2 px-3">{module}</td>
                                {actions.map((action) => (
                                  <td key={action} className="py-2 px-3 text-center">
                                    <Checkbox />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddRoleModalOpen(false)}>
                    Batal
                  </Button>
                  <Button disabled={!newRoleName}>
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );

      case "Ubah Peran":
        return (
          <div className="max-w-2xl">
            {/* Step 1: Search */}
            <Card className="p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Cari Akun</h3>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Masukkan NIM / ID atau nama pengguna"
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                  />
                </div>
                <Button onClick={handleSearchUser} disabled={!searchUserId}>
                  Cari
                </Button>
              </div>
            </Card>

            {/* Loading State */}
            {isSearching && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600">Mencari akun...</p>
              </div>
            )}

            {/* Error State */}
            {searchError && !isSearching && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  Akun tidak ditemukan.
                </AlertDescription>
              </Alert>
            )}

            {/* Found State */}
            {searchedAccount && !isSearching && !showChangeSuccess && (
              <div>
                <Card className="p-6 mb-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Akun Ditemukan</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Nama:</span>
                      <span className="font-medium">{searchedAccount.nama}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">NIM/ID:</span>
                      <span className="font-medium font-mono">{searchedAccount.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="font-medium">{searchedAccount.email}</span>
                    </div>
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-sm text-gray-600 pt-1">Peran Saat Ini:</span>
                      <div className="flex-1 text-right">
                        {renderPeranList(searchedAccount.peran)}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Step 2: Change Role */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Ubah Peran</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Peran Baru (pilih satu atau lebih)</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                        {ROLE_CHOICES.map((role) => (
                          <label
                            key={role}
                            className="flex items-center gap-2 cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={newPeran.includes(role)}
                              onCheckedChange={(chk) => {
                                setNewPeran((prev) =>
                                  chk
                                    ? [...prev, role]
                                    : prev.filter((x) => x !== role),
                                );
                              }}
                            />
                            {roleLabel[role]}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Perubahan peran akan langsung berlaku setelah disimpan.
                      </p>
                    </div>

                    {JSON.stringify([...newPeran].sort()) !==
                      JSON.stringify([...oldPeran].sort()) && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800">
                          Mengubah peran ini akan mengubah akses pengguna ke beberapa modul.
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button onClick={handleChangeRole} className="w-full">
                      Simpan Perubahan
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Success State */}
            {showChangeSuccess && searchedAccount && (
              <Card className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-gray-700">
                      Peran <strong>{searchedAccount.nama}</strong> berhasil diubah dari{" "}
                      <strong>
                        {oldPeran.length > 0
                          ? oldPeran.map((r) => roleLabel[r]).join(", ")
                          : "—"}
                      </strong>{" "}
                      menjadi{" "}
                      <strong>
                        {newPeran.length > 0
                          ? newPeran.map((r) => roleLabel[r]).join(", ")
                          : "—"}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
                <Button variant="link" onClick={handleChangeAnother} className="p-0">
                  Ubah Peran Akun Lain
                </Button>
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
      title="Akun"
      breadcrumbs={[
        { label: "Akun" },
        ...(activeMenu ? [{ label: activeMenu }] : [])
      ]}
      icon={<Users className="w-8 h-8 text-white" />}
      sidebarItems={['Akun', 'Import Akun', 'Peran', 'Ubah Peran']}
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