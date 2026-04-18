import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PeminjamanLaptop from "./pages/PeminjamanLaptop";
import PeminjamanRuangan from "./pages/PeminjamanRuangan";
import SuratBebasLab from "./pages/SuratBebasLab";
import PersetujuanDosen from "./pages/PersetujuanDosen";
import PersetujuanKepalaLab from "./pages/PersetujuanKepalaLab";
import PersetujuanLaboran from "./pages/PersetujuanLaboran";
import Transaksi from "./pages/Transaksi";
import PeminjamanAlat from "./pages/PeminjamanAlat";
import Aset from "./pages/Aset";
import HabisPakai from "./pages/HabisPakai";
import TransaksiHabisPakai from "./pages/TransaksiHabisPakai";
import Akun from "./pages/Akun";
import PengaturanAplikasi from "./pages/PengaturanAplikasi";
import VerifyQR from "./pages/VerifyQR";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/dashboard",
    Component: Dashboard,
  },
  {
    path: "/peminjaman-laptop",
    Component: PeminjamanLaptop,
  },
  {
    path: "/peminjaman-ruangan",
    Component: PeminjamanRuangan,
  },
  {
    path: "/surat-bebas-lab",
    Component: SuratBebasLab,
  },
  {
    path: "/persetujuan-dosen",
    Component: PersetujuanDosen,
  },
  {
    path: "/persetujuan-kepala-lab",
    Component: PersetujuanKepalaLab,
  },
  {
    path: "/persetujuan-laboran",
    Component: PersetujuanLaboran,
  },
  {
    path: "/transaksi",
    Component: Transaksi,
  },
  {
    path: "/peminjaman-alat",
    Component: PeminjamanAlat,
  },
  {
    path: "/aset",
    Component: Aset,
  },
  {
    path: "/habis-pakai",
    Component: HabisPakai,
  },
  {
    path: "/transaksi-habis-pakai",
    Component: TransaksiHabisPakai,
  },
  {
    path: "/akun",
    Component: Akun,
  },
  {
    path: "/pengaturan-aplikasi",
    Component: PengaturanAplikasi,
  },
  {
    path: "/verify/:hash",
    Component: VerifyQR,
  },
], {
  basename: "/simlab",
});