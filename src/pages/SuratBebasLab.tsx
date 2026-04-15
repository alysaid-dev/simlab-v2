import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { FileCheck, Download } from "lucide-react";

type View = "pengajuan" | "riwayat";

interface SuratRecord {
  tanggalPengajuan: string;
  persetujuanLaboran: string;
  persetujuanKalab: string;
  status: string;
  keterangan: string;
}

export default function SuratBebasLab() {
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [formData, setFormData] = useState({
    nama: "Rizal Pratama Putra, S.T.",
    nim: "151002233",
    email: "151002233@uii.ac.id",
    tanggalSidang: "",
  });

  // Mock data for history
  const riwayatData: SuratRecord[] = [
    {
      tanggalPengajuan: "20 Januari 2025",
      persetujuanLaboran: "Disetujui",
      persetujuanKalab: "Disetujui",
      status: "Selesai",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "18 Januari 2025",
      persetujuanLaboran: "Disetujui",
      persetujuanKalab: "Menunggu",
      status: "Menunggu",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "15 Januari 2025",
      persetujuanLaboran: "Ditolak",
      persetujuanKalab: "-",
      status: "Ditolak",
      keterangan: "Masih ada peminjaman laptop yang belum dikembalikan",
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Pengajuan Surat Bebas Lab berhasil dikirim!");
    // Reset form (except prefilled fields)
    setFormData({
      nama: "Rizal Pratama Putra, S.T.",
      nim: "151002233",
      email: "151002233@uii.ac.id",
      tanggalSidang: "",
    });
  };

  const handleDownload = () => {
    // Mock download function
    alert("Mengunduh surat...");
  };

  const renderContent = () => {
    if (currentView === "pengajuan") {
      return (
        <form onSubmit={handleSubmit} className="max-w-3xl">
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

            {/* Tanggal Sidang */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal Sidang <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="tanggalSidang"
                value={formData.tanggalSidang}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                  Persetujuan Laboran
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
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Unduh Surat
                </th>
              </tr>
            </thead>
            <tbody>
              {riwayatData.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalPengajuan}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.persetujuanLaboran === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : record.persetujuanLaboran === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.persetujuanLaboran}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {record.persetujuanKalab !== "-" ? (
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
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === "Selesai"
                          ? "bg-green-100 text-green-800"
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
                  <td className="py-3 px-4">
                    {record.status === "Selesai" ? (
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Unduh
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
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
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center mb-3">
          <FileCheck className="w-11 h-11 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-gray-900 text-xl mb-1">Surat Bebas Lab</h2>
        <p className="text-sm text-gray-500 mb-5">Pengajuan surat keterangan bebas lab</p>
        
        {/* Button */}
        <button
          onClick={() => setCurrentView("pengajuan")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Surat Bebas Lab
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Surat Bebas Lab"
      breadcrumbs={[{ label: "Surat Bebas Lab" }]}
      icon={<FileCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Pengajuan", "Riwayat Pengajuan"]}
      onSidebarItemClick={(item) => {
        if (item === "Pengajuan") setCurrentView("pengajuan");
        else if (item === "Riwayat Pengajuan") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "pengajuan" ? "Pengajuan" :
        currentView === "riwayat" ? "Riwayat Pengajuan" :
        undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}