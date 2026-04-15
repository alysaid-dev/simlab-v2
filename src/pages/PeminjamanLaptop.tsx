import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Laptop } from "lucide-react";

type View = "peminjaman-baru" | "riwayat";

interface LoanRecord {
  tanggalPengajuan: string;
  item: string;
  persetujuanDosen: string;
  persetujuanKalab: string;
  status: string;
  keterangan: string;
}

interface LaptopSpec {
  prosesor: string;
  ram: string;
  penyimpanan: string;
  layar: string;
  os: string;
  kondisi: "Baik" | "Cukup" | "Rusak";
}

const laptopSpecs: Record<string, LaptopSpec> = {
  "Laptop 1": {
    prosesor: "Intel Core i5-1035G1 @ 1.00GHz",
    ram: "8 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 10 Pro",
    kondisi: "Baik",
  },
  "Laptop 2": {
    prosesor: "Intel Core i5-8265U @ 1.60GHz",
    ram: "8 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 3": {
    prosesor: "AMD Ryzen 5 4500U @ 2.30GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 4": {
    prosesor: "Intel Core i7-1165G7 @ 2.80GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 5": {
    prosesor: "Intel Core i5-10210U @ 1.60GHz",
    ram: "8 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Pro",
    kondisi: "Cukup",
  },
  "Laptop 6": {
    prosesor: "AMD Ryzen 7 5700U @ 1.80GHz",
    ram: "16 GB DDR4",
    penyimpanan: "1 TB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 7": {
    prosesor: "Intel Core i3-10110U @ 2.10GHz",
    ram: "4 GB DDR4",
    penyimpanan: "256 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Home",
    kondisi: "Cukup",
  },
  "Laptop 8": {
    prosesor: "Intel Core i7-10750H @ 2.60GHz",
    ram: "16 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "15.6 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 9": {
    prosesor: "Intel Core i5-1135G7 @ 2.40GHz",
    ram: "8 GB DDR4",
    penyimpanan: "512 GB SSD",
    layar: "14 inci FHD (1920×1080)",
    os: "Windows 11 Pro",
    kondisi: "Baik",
  },
  "Laptop 10": {
    prosesor: "AMD Ryzen 3 3250U @ 2.60GHz",
    ram: "4 GB DDR4",
    penyimpanan: "128 GB SSD",
    layar: "14 inci HD (1366×768)",
    os: "Windows 10 Home",
    kondisi: "Rusak",
  },
};

export default function PeminjamanLaptop() {
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [formData, setFormData] = useState({
    itemDipilih: "Laptop 4",
    nama: "Putriana Dwi Agustin",
    nim: "22611147",
    email: "22611147@students.uii.ac.id",
    noWhatsapp: "",
    dosenPembimbing: "Ghiffari Ahnaf Danarwindu, M.Sc.",
    judulSkripsi: "",
    abstrak: "",
    alasanPeminjaman: "",
  });

  const laptopOptions = Array.from({ length: 10 }, (_, i) => `Laptop ${i + 1}`);
  const dosenOptions = [
    "Achmad Fauzan, S.Pd., M.Si.",
    "Akhmad Fauzy, Prof., S.Si., M.Si., Ph.D.",
    "Arum Handini Primandari, S.Pd.Si., M.Sc.",
    "Dr. Asyharul Mu'ala, S.H.I., M.H.I.",
    "Atina Ahdika, Dr. S.Si., M.Si.",
    "Ayundyah Kesumawati, S.Si., M.Si.",
    "Dina Tri Utari, S.Si., M.Sc.",
    "Edy Widodo, Dr., S.Si., M.Si.",
    "Jaka Nugraha, Prof., Dr., S.Si., M.Si.",
    "Kariyam, Dr., S.Si., M.Si.",
    "Muhammad Hasan Sidiq Kurniawan, S.Si., M.Sc.",
    "Muhammad Muhajir, S.Si., M.Sc.",
    "Mujiati Dwi Kartikasari., S.Si., M.Sc.",
    "Raden Bagus Fajriya Hakim, Dr., S.Si., M.Si.",
    "Rahmadi Yotenka, S.Si., M.Sc.",
    "Rohmatul Fajriyah, Dr.techn., S.Si., M.Si.",
    "Sekti Kartika Dini, S.Si., M.Si.",
    "Tuti Purwaningsih, S.Stat., M.Si.",
    "Purnama Akbar, S.Stat., M.Si.",
    "Abdullah Ahmad Dzikrullah, S.Si., M.Sc.",
    "Ghiffari Ahnaf Danarwindu, M.Sc.",
  ];

  // Mock data for history
  const riwayatData: LoanRecord[] = [
    {
      tanggalPengajuan: "15 Januari 2025",
      item: "Laptop 3",
      persetujuanDosen: "Disetujui",
      persetujuanKalab: "Disetujui",
      status: "Aktif",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "10 Januari 2025",
      item: "Laptop 7",
      persetujuanDosen: "Disetujui",
      persetujuanKalab: "Menunggu",
      status: "Menunggu",
      keterangan: "-",
    },
    {
      tanggalPengajuan: "5 Januari 2025",
      item: "Laptop 2",
      persetujuanDosen: "Ditolak",
      persetujuanKalab: "-",
      status: "Ditolak",
      keterangan: "Judul skripsi belum sesuai dengan kebutuhan laptop",
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Pengajuan peminjaman berhasil dikirim!");
    // Reset form (keep prefilled data)
    setFormData({
      itemDipilih: "",
      nama: "Putriana Dwi Agustin",
      nim: "22611147",
      email: "22611147@students.uii.ac.id",
      noWhatsapp: "",
      dosenPembimbing: "",
      judulSkripsi: "",
      abstrak: "",
      alasanPeminjaman: "",
    });
  };

  const renderContent = () => {
    if (currentView === "peminjaman-baru") {
      const selectedLaptop = formData.itemDipilih ? laptopSpecs[formData.itemDipilih] : null;
      
      return (
        <form onSubmit={handleSubmit} className="max-w-3xl">
          <div className="space-y-6">
            {/* Item Dipilih - Two Column Layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Dipilih <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {/* Left: Dropdown */}
                <div className="w-[180px] flex-shrink-0">
                  <select
                    name="itemDipilih"
                    value={formData.itemDipilih}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pilih Laptop</option>
                    {laptopOptions.map((laptop) => (
                      <option key={laptop} value={laptop}>
                        {laptop}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Right: Specification Card */}
                <div className="flex-1">
                  {!selectedLaptop ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center text-gray-400 text-sm h-full min-h-[120px]">
                      Pilih laptop untuk melihat spesifikasi
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-4">
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-blue-800">
                          {formData.itemDipilih}
                        </span>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            selectedLaptop.kondisi === "Baik"
                              ? "bg-green-100 text-green-800"
                              : selectedLaptop.kondisi === "Cukup"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedLaptop.kondisi}
                        </span>
                      </div>

                      {/* Spec Rows */}
                      <div className="space-y-1.5 text-sm">
                        <div className="flex">
                          <span className="text-blue-500 w-24 flex-shrink-0">Prosesor</span>
                          <span className="text-blue-900">· {selectedLaptop.prosesor}</span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-500 w-24 flex-shrink-0">RAM</span>
                          <span className="text-blue-900">· {selectedLaptop.ram}</span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-500 w-24 flex-shrink-0">Penyimpanan</span>
                          <span className="text-blue-900">· {selectedLaptop.penyimpanan}</span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-500 w-24 flex-shrink-0">Layar</span>
                          <span className="text-blue-900">· {selectedLaptop.layar}</span>
                        </div>
                        <div className="flex">
                          <span className="text-blue-500 w-24 flex-shrink-0">OS</span>
                          <span className="text-blue-900">· {selectedLaptop.os}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DATA PEMINJAM - Read-only Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-4">
                DATA PEMINJAM
              </div>
              <div className="space-y-4">
                {/* Nama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* NIM */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nim"
                    value={formData.nim}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Helper Text */}
              <p className="text-xs text-gray-400 mt-4 flex items-start gap-1">
                <span>ℹ</span>
                <span>Data diisi otomatis berdasarkan akun yang sedang login.</span>
              </p>
            </div>

            {/* No Whatsapp */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No Whatsapp <span className="text-red-500">*</span>
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

            {/* Dosen Pembimbing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dosen Pembimbing <span className="text-red-500">*</span>
              </label>
              <select
                name="dosenPembimbing"
                value={formData.dosenPembimbing}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pilih Dosen Pembimbing</option>
                {dosenOptions.map((dosen) => (
                  <option key={dosen} value={dosen}>
                    {dosen}
                  </option>
                ))}
              </select>
            </div>

            {/* Judul Skripsi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Skripsi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="judulSkripsi"
                value={formData.judulSkripsi}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan judul skripsi"
              />
            </div>

            {/* Abstrak */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Abstrak <span className="text-red-500">*</span>
              </label>
              <textarea
                name="abstrak"
                value={formData.abstrak}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Masukkan abstrak skripsi"
              />
            </div>

            {/* Alasan Peminjaman */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Peminjaman <span className="text-red-500">*</span>
              </label>
              <textarea
                name="alasanPeminjaman"
                value={formData.alasanPeminjaman}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Jelaskan alasan peminjaman laptop"
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
                  Item
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Persetujuan Dosen
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
                  <td className="py-3 px-4 text-gray-700">{record.item}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.persetujuanDosen === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : record.persetujuanDosen === "Ditolak"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {record.persetujuanDosen}
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

    // Default landing page with centered button
    return (
      <div className="max-w-md">
        {/* Icon Container */}
        <div className="w-[150px] h-[150px] bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
          <Laptop className="w-11 h-11 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="font-bold text-gray-900 text-xl mb-1">Peminjaman Laptop</h2>
        <p className="text-sm text-gray-500 mb-5">Peminjaman Laptop Tugas Akhir</p>
        
        {/* Button */}
        <button
          onClick={() => setCurrentView("peminjaman-baru")}
          className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
        >
          Masuk ke Peminjaman Laptop
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <PageLayout
      title="Peminjaman Laptop"
      breadcrumbs={[{ label: "Peminjaman Laptop" }]}
      icon={<Laptop className="w-8 h-8 text-white" />}
      sidebarItems={['Peminjaman Baru', 'Riwayat Pengajuan']}
      onSidebarItemClick={(item) => {
        if (item === "Peminjaman Baru") setCurrentView("peminjaman-baru");
        else if (item === "Riwayat Pengajuan") setCurrentView("riwayat");
      }}
      activeItem={
        currentView === "peminjaman-baru" ? "Peminjaman Baru" :
        currentView === "riwayat" ? "Riwayat Pengajuan" :
        undefined
      }
      hideHeader={!currentView}
    >
      {renderContent()}
    </PageLayout>
  );
}