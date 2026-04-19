import { createBrowserRouter } from "react-router";
import { createElement, type ComponentType } from "react";
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
import MonitorTransaksi from "./pages/MonitorTransaksi";
import VerifyQR from "./pages/VerifyQR";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";

const guarded = (C: ComponentType) => () =>
  createElement(ProtectedRoute, null, createElement(C));

const publicOnly = (C: ComponentType) => () =>
  createElement(PublicOnlyRoute, null, createElement(C));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: publicOnly(Login),
  },
  {
    path: "/login",
    Component: publicOnly(Login),
  },
  {
    path: "/dashboard",
    Component: guarded(Dashboard),
  },
  {
    path: "/peminjaman-laptop",
    Component: guarded(PeminjamanLaptop),
  },
  {
    path: "/peminjaman-ruangan",
    Component: guarded(PeminjamanRuangan),
  },
  {
    path: "/surat-bebas-lab",
    Component: guarded(SuratBebasLab),
  },
  {
    path: "/persetujuan-dosen",
    Component: guarded(PersetujuanDosen),
  },
  {
    path: "/persetujuan-kepala-lab",
    Component: guarded(PersetujuanKepalaLab),
  },
  {
    path: "/persetujuan-laboran",
    Component: guarded(PersetujuanLaboran),
  },
  {
    path: "/transaksi",
    Component: guarded(Transaksi),
  },
  {
    path: "/peminjaman-alat",
    Component: guarded(PeminjamanAlat),
  },
  {
    path: "/aset",
    Component: guarded(Aset),
  },
  {
    path: "/habis-pakai",
    Component: guarded(HabisPakai),
  },
  {
    path: "/transaksi-habis-pakai",
    Component: guarded(TransaksiHabisPakai),
  },
  {
    path: "/akun",
    Component: guarded(Akun),
  },
  {
    path: "/pengaturan-aplikasi",
    Component: guarded(PengaturanAplikasi),
  },
  {
    path: "/monitor-transaksi",
    Component: guarded(MonitorTransaksi),
  },
  {
    path: "/verify/:hash",
    Component: VerifyQR,
  },
], {
  basename: "/simlab",
});
