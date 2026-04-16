import { Search, User, LogOut } from "lucide-react";
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

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Mock logout — in production this would clear session/SSO tokens
    navigate("/");
  };

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
          <div className="relative">
            <input
              type="text"
              placeholder="Cari aplikasi"
              className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="absolute right-0 top-0 bottom-0 px-4 bg-blue-900 text-white rounded-r-lg hover:bg-blue-800">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Peminjaman Laptop"
            description="Peminjaman Laptop Tugas Akhir"
            bgColor="bg-gradient-to-br from-blue-500 to-cyan-400"
            icon="laptop"
            link="/peminjaman-laptop"
          />
          <DashboardCard
            title="Peminjaman Ruangan"
            description="Peminjaman Ruangan Laboratorium"
            bgColor="bg-gradient-to-br from-purple-600 to-pink-500"
            icon="dooropen"
            link="/peminjaman-ruangan"
          />
          <DashboardCard
            title="Surat Bebas Lab"
            description="Pengajuan surat keterangan bebas lab"
            bgColor="bg-gradient-to-br from-green-500 to-emerald-400"
            icon="file-check"
            link="/surat-bebas-lab"
          />
          <DashboardCard
            title="Persetujuan Dosen"
            description="Persetujuan peminjaman oleh dosen"
            bgColor="bg-gradient-to-br from-indigo-600 to-blue-500"
            icon="user-check"
            link="/persetujuan-dosen"
          />
          <DashboardCard
            title="Persetujuan Kepala Lab"
            description="Persetujuan oleh Kepala Laboratorium"
            bgColor="bg-gradient-to-br from-red-600 to-pink-500"
            icon="shield"
            link="/persetujuan-kepala-lab"
          />
          <DashboardCard
            title="Persetujuan Laboran"
            description="Persetujuan oleh Laboran"
            bgColor="bg-gradient-to-br from-teal-600 to-cyan-400"
            icon="clipboardcheck"
            link="/persetujuan-laboran"
          />
          <DashboardCard
            title="Transaksi"
            description="Proses transasksi peminjaman laptop"
            bgColor="bg-gradient-to-br from-blue-600 to-indigo-500"
            icon="creditcard"
            link="/transaksi"
          />
          <DashboardCard
            title="Peminjaman Alat"
            description="Peminjaman Peralatan Laboratorium"
            bgColor="bg-gradient-to-br from-cyan-600 to-teal-500"
            icon="wrench"
            link="/peminjaman-alat"
          />
          <DashboardCard
            title="Aset"
            description="Manajemen Aset Laboratorium Statistika"
            bgColor="bg-gradient-to-br from-amber-600 to-orange-500"
            icon="package"
            link="/aset"
          />
          <DashboardCard
            title="Habis Pakai"
            description="Manajemen Barang Habis Pakai"
            bgColor="bg-gradient-to-br from-rose-600 to-red-500"
            icon="shoppingbag"
            link="/habis-pakai"
          />
          <DashboardCard
            title="Transaksi Habis Pakai"
            description="Transaksi Barang Habis Pakai"
            bgColor="bg-gradient-to-br from-violet-600 to-purple-500"
            icon="receipt"
            link="/transaksi-habis-pakai"
          />
          <DashboardCard
            title="Akun"
            description="Manajemen Pengguna"
            bgColor="bg-gradient-to-br from-emerald-600 to-teal-500"
            icon="users"
            link="/akun"
          />
          <DashboardCard
            title="Pengaturan Aplikasi"
            description="Pengaturan dan Konfigurasi Aplikasi"
            bgColor="bg-gradient-to-br from-slate-600 to-gray-500"
            icon="settings"
            link="/pengaturan-aplikasi"
          />
        </div>
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