import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import {
  DoorOpen,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "../lib/format";
import { useDialog } from "../lib/dialog";

type View = "pengajuan-baru" | "aktif" | "riwayat";

const ACTIVE_RESERVATION_STATUSES = new Set(["PENDING", "CHECKED", "APPROVED"]);

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface BackendRoom {
  id: string;
  name: string;
  code: string;
  capacity: number;
  location: string | null;
  isActive: boolean;
}

type BackendReservationStatus =
  | "PENDING"
  | "CHECKED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

interface BackendReservation {
  id: string;
  userId: string;
  roomId: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BackendReservationStatus;
  notes: string | null;
  createdAt: string;
  user?: { id: string; displayName: string; uid: string; email: string };
  room?: { id: string; name: string; code: string };
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

const MAX_SURAT_BYTES = 200 * 1024;

const statusLabel: Record<BackendReservationStatus, string> = {
  PENDING: "Menunggu Laboran",
  CHECKED: "Menunggu Kepala Lab",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
  COMPLETED: "Selesai",
};

const statusColor: Record<BackendReservationStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CHECKED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
  COMPLETED: "bg-gray-100 text-gray-800",
};

export default function PeminjamanRuangan() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const [currentView, setCurrentView] = useState<View | null>(null);

  const [rooms, setRooms] = useState<BackendRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [reservations, setReservations] = useState<BackendReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(
    null,
  );

  const [form, setForm] = useState({
    noWhatsapp: "",
    roomId: "",
    purpose: "",
    startTime: "",
    endTime: "",
    notes: "",
  });
  const [suratFile, setSuratFile] = useState<File | null>(null);
  const [suratError, setSuratError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);

  const handleSuratChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSuratError(null);
    if (!file) {
      setSuratFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setSuratError("File harus berformat PDF.");
      setSuratFile(null);
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SURAT_BYTES) {
      setSuratError(
        `Ukuran file melebihi 200KB (file saat ini ${(file.size / 1024).toFixed(1)} KB).`,
      );
      setSuratFile(null);
      e.target.value = "";
      return;
    }
    setSuratFile(file);
  };

  // Prefill WA dari profil user begitu auth resolved.
  useEffect(() => {
    if (user?.dbUser?.waNumber) {
      setForm((f) =>
        f.noWhatsapp ? f : { ...f, noWhatsapp: user.dbUser!.waNumber! },
      );
    }
  }, [user?.dbUser?.waNumber]);

  // Load rooms once for the dropdown.
  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    fetch(`${API_BASE}/api/rooms`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendRoom>;
      })
      .then((data) => {
        if (!cancelled) setRooms(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setRoomsError(
            err instanceof Error ? err.message : "Gagal memuat ruangan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load user's own reservations for both Aktif & Riwayat tabs.
  useEffect(() => {
    if (currentView !== "riwayat" && currentView !== "aktif") return;
    if (!user?.dbUser?.id) return;
    let cancelled = false;
    setReservationsLoading(true);
    setReservationsError(null);
    fetch(
      `${API_BASE}/api/reservations?userId=${encodeURIComponent(user.dbUser.id)}`,
      { credentials: "include" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendReservation>;
      })
      .then((data) => {
        if (!cancelled) setReservations(data.items);
      })
      .catch((err) => {
        if (!cancelled) {
          setReservationsError(
            err instanceof Error ? err.message : "Gagal memuat riwayat",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReservationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentView, user?.dbUser?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitOk(false);
    try {
      const data = new FormData();
      data.append("roomId", form.roomId);
      data.append("purpose", form.purpose);
      data.append("startTime", new Date(form.startTime).toISOString());
      data.append("endTime", new Date(form.endTime).toISOString());
      if (form.notes) data.append("notes", form.notes);
      if (form.noWhatsapp) data.append("waNumber", form.noWhatsapp);
      if (suratFile) data.append("surat", suratFile);

      const res = await fetch(`${API_BASE}/api/reservations`, {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      setSubmitOk(true);
      setForm((f) => ({
        ...f,
        roomId: "",
        purpose: "",
        startTime: "",
        endTime: "",
        notes: "",
      }));
      setSuratFile(null);
      setSuratError(null);
    } catch (err) {
      await alert(
        `Gagal mengajukan reservasi: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormView = () => (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
        <div className="space-y-1.5 text-sm">
          <div>
            Pastikan anda sudah melihat ketersediaan jadwal pada laman berikut:{" "}
            <a
              href="https://statistics.uii.ac.id/practicum-schedule/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              Jadwal Praktikum
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div>
            Unduh template surat peminjaman pada laman berikut:{" "}
            <a
              href="https://uiiacid-my.sharepoint.com/:f:/g/personal/241003314_uii_ac_id/IgBkAJISfQHSS7IvHNRymjCdAbHGg2-Kmf7qfcxe6nEsoOA?e=OUvcgl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
            >
              Template Surat
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {submitOk && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Pengajuan berhasil dikirim</p>
            <p className="text-sm">
              Reservasi Anda akan diperiksa laboran lalu disetujui kepala lab.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
        <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-4">
          DATA PEMOHON
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama
            </label>
            <input
              type="text"
              value={user?.displayName ?? ""}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NIM
            </label>
            <input
              type="text"
              value={user?.uid ?? ""}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          No WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          required
          value={form.noWhatsapp}
          onChange={(e) =>
            setForm((f) => ({ ...f, noWhatsapp: e.target.value }))
          }
          placeholder="08xxxxxxxxxx"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Digunakan laboran/kepala lab untuk menghubungi jika ada konfirmasi.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ruangan <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.roomId}
          onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">
            {roomsLoading
              ? "Memuat..."
              : roomsError
              ? "Gagal memuat"
              : "Pilih ruangan"}
          </option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {roomsError && (
          <p className="text-xs text-red-600 mt-1">{roomsError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Waktu Mulai <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, startTime: e.target.value }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Waktu Selesai <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={form.endTime}
            onChange={(e) =>
              setForm((f) => ({ ...f, endTime: e.target.value }))
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Keperluan <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.purpose}
          onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Misal: Kuliah tamu, rapat, presentasi"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Catatan Tambahan
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Informasi tambahan untuk laboran (opsional)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Unggah Surat Permohonan
        </label>
        <label
          className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
            suratError ? "border-red-300" : "border-gray-300"
          }`}
        >
          <Upload className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 text-sm">
            {suratFile ? (
              <>
                <span className="font-medium text-gray-900">
                  {suratFile.name}
                </span>
                <span className="text-gray-500 ml-2">
                  ({(suratFile.size / 1024).toFixed(1)} KB)
                </span>
              </>
            ) : (
              <span className="text-gray-600">
                Pilih file PDF (maksimal 200KB)
              </span>
            )}
          </div>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleSuratChange}
            className="hidden"
          />
        </label>
        {suratError ? (
          <p className="text-xs text-red-600 mt-1">{suratError}</p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Format PDF, ukuran maksimal 200KB.
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={
            submitting ||
            !form.roomId ||
            !form.purpose ||
            !form.noWhatsapp
          }
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitting ? "Mengirim..." : "Submit Pengajuan"}
        </button>
      </div>
    </form>
  );

  const renderList = (mode: "aktif" | "riwayat") => {
    const filtered = reservations.filter((r) =>
      mode === "aktif"
        ? ACTIVE_RESERVATION_STATUSES.has(r.status)
        : !ACTIVE_RESERVATION_STATUSES.has(r.status),
    );
    const emptyLabel =
      mode === "aktif"
        ? "Tidak ada reservasi yang sedang berjalan."
        : "Belum ada riwayat reservasi ruangan.";
    if (reservationsLoading) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data…</span>
        </div>
      );
    }
    if (reservationsError) {
      return (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memuat data</p>
            <p className="text-sm">{reservationsError}</p>
          </div>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">{emptyLabel}</div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Tanggal Pengajuan
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Ruangan
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Mulai
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Selesai
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">
                Keperluan
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-700">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {r.room?.name ?? "-"}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {formatDateTime(r.startTime)}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {formatDateTime(r.endTime)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColor[r.status]}`}
                  >
                    {statusLabel[r.status]}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700 max-w-xs truncate">
                  {r.purpose}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (currentView === "pengajuan-baru") return renderFormView();
    if (currentView === "aktif") return renderList("aktif");
    if (currentView === "riwayat") return renderList("riwayat");
    return (
      <div className="max-w-md">
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-3">
          <DoorOpen className="w-11 h-11 text-white" />
        </div>
        <h2 className="font-bold text-gray-900 text-xl mb-1">
          Peminjaman Ruangan
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Reservasi ruangan laboratorium
        </p>
        <button
          onClick={() => setCurrentView("pengajuan-baru")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Peminjaman Ruangan
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Peminjaman Ruangan"
      breadcrumbs={[
        { label: "Peminjaman Ruangan" },
        ...(currentView === "pengajuan-baru" ? [{ label: "Pengajuan Baru" }] : []),
        ...(currentView === "aktif" ? [{ label: "Reservasi Aktif" }] : []),
        ...(currentView === "riwayat" ? [{ label: "Riwayat" }] : []),
      ]}
      icon={<DoorOpen className="w-8 h-8 text-white" />}
      sidebarItems={["Pengajuan Baru", "Reservasi Aktif", "Riwayat"]}
      onSidebarItemClick={(item) => {
        if (item === "Pengajuan Baru") setCurrentView("pengajuan-baru");
        else if (item === "Reservasi Aktif") setCurrentView("aktif");
        else if (item === "Riwayat") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "pengajuan-baru"
          ? "Pengajuan Baru"
          : currentView === "aktif"
          ? "Reservasi Aktif"
          : currentView === "riwayat"
          ? "Riwayat"
          : undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}
