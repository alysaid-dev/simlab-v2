import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { DoorOpen } from "lucide-react";

type View = "pengajuan-baru" | "riwayat";

interface RoomRecord {
  tanggalPengajuan: string;
  ruang: string;
  mulai: string;
  selesai: string;
  persetujuanKalab: string;
  status: string;
  keterangan: string;
}

export default function PeminjamanRuangan() {
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [formData, setFormData] = useState({
    nama: "Abdullah Kafabih",
    nim: "23611114",
    email: "23611114@students.uii.ac.id",
    noWhatsapp: "",
    ruangan: "",
    mulai: "",
    selesai: "",
    keperluan: "",
    file: null as File | null,
  });

  const ruanganOptions = ["Lab MRK", "Lab SD", "Lab BIS"];

  // Mock data for history
  const riwayatData: RoomRecord[] = [
    {
      tanggalPengajuan: "20 Januari 2025",
      ruang: "Lab MRK",
      mulai: "2025-01-25 09:00",
      selesai: "2025-01-25 12:00",
      persetujuanKalab: "Disetujui",
      status: "Aktif",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "18 Januari 2025",
      ruang: "Lab SD",
      mulai: "2025-01-22 13:00",
      selesai: "2025-01-22 16:00",
      persetujuanKalab: "Menunggu",
      status: "Menunggu",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "15 Januari 2025",
      ruang: "Lab BIS",
      mulai: "2025-01-20 10:00",
      selesai: "2025-01-20 14:00",
      persetujuanKalab: "Ditolak",
      status: "Ditolak",
      keterangan: "Ruangan sudah dibooking untuk kegiatan praktikum",
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Pengajuan peminjaman ruangan berhasil dikirim!");
    // Reset form (except prefilled fields)
    setFormData({
      nama: "Abdullah Kafabih",
      nim: "23611114",
      email: "23611114@students.uii.ac.id",
      noWhatsapp: "",
      ruangan: "",
      mulai: "",
      selesai: "",
      keperluan: "",
      file: null,
    });
  };

  const renderContent = () => {
    if (currentView === "pengajuan-baru") {
      return (
        <form onSubmit={handleSubmit} className="max-w-3xl">
          {/* Information Text */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              Pastikan anda sudah melihat ketersediaan jadwal pada laman{" "}
              <a
                href="https://statistics.uii.ac.id/practicum-schedule/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                berikut
              </a>
            </p>
            <p className="text-sm text-gray-700">
              Unduh template surat peminjaman pada laman{" "}
              <a
                href="https://uiiacid-my.sharepoint.com/:f:/g/personal/241003314_uii_ac_id/IgBkAJISfQHSS7IvHNRymjCdAbHGg2-Kmf7qfcxe6nEsoOA?e=OUvcgl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                berikut
              </a>
            </p>
          </div>

          <div className="space-y-6">
            {/* Nama (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* NIM (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nim"
                value={formData.nim}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* Email (Prefilled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                readOnly
              />
            </div>

            {/* No WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="noWhatsapp"
                value={formData.noWhatsapp}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Ruangan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ruangan <span className="text-red-500">*</span>
              </label>
              <select
                name="ruangan"
                value={formData.ruangan}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih Ruangan</option>
                {ruanganOptions.map((ruangan) => (
                  <option key={ruangan} value={ruangan}>
                    {ruangan}
                  </option>
                ))}
              </select>
            </div>

            {/* Mulai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mulai <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="mulai"
                value={formData.mulai}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Selesai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selesai <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                name="selesai"
                value={formData.selesai}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Keperluan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keperluan <span className="text-red-500">*</span>
              </label>
              <textarea
                name="keperluan"
                value={formData.keperluan}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Jelaskan keperluan peminjaman ruangan"
              />
            </div>

            {/* Unggah Surat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unggah Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                required
                accept=".pdf,.doc,.docx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: PDF, DOC, atau DOCX
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Submit Pengajuan
              </button>
            </div>
          </div>
        </form>
      );
    }

    if (currentView === "riwayat") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tanggal Pengajuan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ruang
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Mulai
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Selesai
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Persetujuan Kalab
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {riwayatData.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalPengajuan}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{record.ruang}</td>
                  <td className="py-3 px-4 text-gray-700">{record.mulai}</td>
                  <td className="py-3 px-4 text-gray-700">{record.selesai}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.persetujuanKalab === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : record.persetujuanKalab === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.persetujuanKalab}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === "Aktif"
                          ? "bg-blue-100 text-blue-800"
                          : record.status === "Selesai"
                          ? "bg-gray-100 text-gray-800"
                          : record.status === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700 max-w-xs">
                    {record.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default landing page
    return (
      <div className="max-w-md">
        {/* Icon Container */}
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-3">
          <DoorOpen className="w-11 h-11 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-gray-900 text-xl mb-1">Peminjaman Ruangan</h2>
        <p className="text-sm text-gray-500 mb-5">Peminjaman Ruangan Laboratorium</p>
        
        {/* Button */}
        <button
          onClick={() => setCurrentView("pengajuan-baru")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Peminjaman Ruangan
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Peminjaman Ruangan"
      breadcrumbs={[{ label: "Peminjaman Ruangan" }]}
      icon={<DoorOpen className="w-8 h-8 text-white" />}
      sidebarItems={["Pengajuan Baru", "Riwayat Pengajuan"]}
      onSidebarItemClick={(item) => {
        if (item === "Pengajuan Baru") setCurrentView("pengajuan-baru");
        else if (item === "Riwayat Pengajuan") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "pengajuan-baru" ? "Pengajuan Baru" :
        currentView === "riwayat" ? "Riwayat Pengajuan" :
        undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}