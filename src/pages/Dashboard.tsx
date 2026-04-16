import { useMemo, useState } from "react";
import { Search, User, LogOut, SearchX } from "lucide-react";
import { useNavigate } from "react-router";
import logoImage from "@/assets/logo-statistika.png";
import { DashboardCard } from "../components/DashboardCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

interface ModuleTile {
  title: string;
  description: string;
  bgColor: string;
  icon: string;
  link: string;
}

const modules: ModuleTile[] = [
  {
    title: "Peminjaman Laptop",
    description: "Peminjaman Laptop Tugas Akhir",
    bgColor: "bg-gradient-to-br from-blue-500 to-cyan-400",
    icon: "laptop",
    link: "/peminjaman-laptop",
  },
  {
    title: "Peminjaman Ruangan",
    description: "Peminjaman Ruangan Laboratorium",
    bgColor: "bg-gradient-to-br from-purple-600 to-pink-500",
    icon: "dooropen",
    link: "/peminjaman-ruangan",
  },
  {
    title: "Surat Bebas Lab",
    description: "Pengajuan surat keterangan bebas lab",
    bgColor: "bg-gradient-to-br from-green-500 to-emerald-400",
    icon: "file-check",
    link: "/surat-bebas-lab",
  },
  {
    title: "Persetujuan Dosen",
    description: "Persetujuan peminjaman oleh dosen",
    bgColor: "bg-gradient-to-br from-indigo-600 to-blue-500",
    icon: "user-check",
    link: "/persetujuan-dosen",
  },
  {
    title: "Persetujuan Kepala Lab",
    description: "Persetujuan oleh Kepala Laboratorium",
    bgColor: "bg-gradient-to-br from-red-600 to-pink-500",
    icon: "shield",
    link: "/persetujuan-kepala-lab",
  },
  {
    title: "Persetujuan Laboran",
    description: "Persetujuan oleh Laboran",
    bgColor: "bg-gradient-to-br from-teal-600 to-cyan-400",
    icon: "clipboardcheck",
    link: "/persetujuan-laboran",
  },
  {
    title: "Transaksi",
    description: "Proses transasksi peminjaman laptop",
    bgColor: "bg-gradient-to-br from-blue-600 to-indigo-500",
    icon: "creditcard",
    link: "/transaksi",
  },
  {
    title: "Peminjaman Alat",
    description: "Peminjaman Peralatan Laboratorium",
    bgColor: "bg-gradient-to-br from-cyan-600 to-teal-500",
    icon: "wrench",
    link: "/peminjaman-alat",
  },
  {
    title: "Aset",
    description: "Manajemen Aset Laboratorium Statistika",
    bgColor: "bg-gradient-to-br from-amber-600 to-orange-500",
    icon: "package",
    link: "/aset",
  },
  {
    title: "Habis Pakai",
    description: "Manajemen Barang Habis Pakai",
    bgColor: "bg-gradient-to-br from-rose-600 to-red-500",
    icon: "shoppingbag",
    link: "/habis-pakai",
  },
  {
    title: "Transaksi Habis Pakai",
    description: "Transaksi Barang Habis Pakai",
    bgColor: "bg-gradient-to-br from-violet-600 to-purple-500",
    icon: "receipt",
    link: "/transaksi-habis-pakai",
  },
  {
    title: "Akun",
    description: "Manajemen Pengguna",
    bgColor: "bg-gradient-to-br from-emerald-600 to-teal-500",
    icon: "users",
    link: "/akun",
  },
  {
    title: "Pengaturan Aplikasi",
    description: "Pengaturan dan Konfigurasi Aplikasi",
    bgColor: "bg-gradient-to-br from-slate-600 to-gray-500",
    icon: "settings",
    link: "/pengaturan-aplikasi",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    // Mock logout — in production this would clear session/SSO tokens
    navigate("/");
  };

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <img
              src={logoImage}
              alt="Laboratorium Statistika UII"
              className="h-12"
            />
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <User className="w-5 h-5 text-gray-700" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Muhammad Aly Sa`id</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-xl mx-auto">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative"
            role="search"
          >
            <label htmlFor="module-search" className="sr-only">
              Cari modul
            </label>
            <input
              id="module-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari modul (mis. peminjaman, aset, transaksi)"
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-0 top-0 bottom-0 px-4 bg-blue-900 text-white rounded-r-lg hover:bg-blue-800"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Results counter — only shown when filtering */}
          {searchQuery.trim() !== "" && (
            <p className="text-center text-xs text-gray-500 mt-2">
              {filteredModules.length > 0
                ? `Menampilkan ${filteredModules.length} dari ${modules.length} modul`
                : `Tidak ada modul yang cocok dengan "${searchQuery}"`}
            </p>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredModules.map((module) => (
              <DashboardCard
                key={module.link}
                title={module.title}
                description={module.description}
                bgColor={module.bgColor}
                icon={module.icon}
                link={module.link}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Modul tidak ditemukan
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Tidak ada modul yang cocok dengan kata kunci{" "}
              <span className="font-medium text-gray-700">
                &ldquo;{searchQuery}&rdquo;
              </span>
              . Coba kata kunci lain atau hapus pencarian.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Hapus pencarian
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-500 text-sm">
          Copyright: Laboratorium Statistika UII
        </p>
      </footer>
    </div>
  );
}
