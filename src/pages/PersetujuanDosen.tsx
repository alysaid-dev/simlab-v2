import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { UserCheck, X } from "lucide-react";

type View = "permohonan-persetujuan" | "riwayat-persetujuan";

interface PermohonanRecord {
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  judulTA: string;
  abstrak: string;
  alasan: string;
}

interface RiwayatRecord {
  nama: string;
  nim: string;
  tindakan: string;
  tanggalDisetujui: string;
  keterangan: string;
}

export default function PersetujuanDosen() {
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTindakanModal, setShowTindakanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PermohonanRecord | null>(null);
  const [tindakanForm, setTindakanForm] = useState({
    tindakan: "",
    keterangan: "",
  });

  // Mock data for permohonan
  const permohonanData: PermohonanRecord[] = [
    {
      tanggalPengajuan: "22 Januari 2025",
      namaMahasiswa: "Anggit",
      nim: "201001111",
      judulTA: "Analisis Sentimen Media Sosial Menggunakan Machine Learning",
      abstrak: "Penelitian ini bertujuan untuk menganalisis sentimen pada media sosial menggunakan teknik machine learning...",
      alasan: "Memerlukan laptop dengan spesifikasi tinggi untuk menjalankan model machine learning",
    },
    {
      tanggalPengajuan: "21 Januari 2025",
      namaMahasiswa: "Aly",
      nim: "201001112",
      judulTA: "Prediksi Harga Saham Menggunakan LSTM",
      abstrak: "Penelitian ini menggunakan Long Short-Term Memory (LSTM) untuk memprediksi harga saham...",
      alasan: "Membutuhkan laptop untuk proses training model deep learning",
    },
    {
      tanggalPengajuan: "20 Januari 2025",
      namaMahasiswa: "Rizal",
      nim: "201001113",
      judulTA: "Sistem Rekomendasi Produk E-Commerce",
      abstrak: "Penelitian ini mengembangkan sistem rekomendasi untuk platform e-commerce...",
      alasan: "Diperlukan untuk pengolahan data besar dan implementasi algoritma rekomendasi",
    },
  ];

  // Mock data for riwayat
  const riwayatData: RiwayatRecord[] = [
    {
      nama: "Budi Santoso",
      nim: "201001100",
      tindakan: "Disetujui",
      tanggalDisetujui: "19 Januari 2025",
      keterangan: "-",
    },
    {
      nama: "Siti Aminah",
      nim: "201001101",
      tindakan: "Ditolak",
      tanggalDisetujui: "18 Januari 2025",
      keterangan: "Judul tidak sesuai dengan kebutuhan laptop",
    },
    {
      nama: "Ahmad Fauzi",
      nim: "201001102",
      tindakan: "Disetujui",
      tanggalDisetujui: "17 Januari 2025",
      keterangan: "-",
    },
  ];

  const handleDetailClick = (record: PermohonanRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleTindakanClick = (record: PermohonanRecord) => {
    setSelectedRecord(record);
    setShowTindakanModal(true);
  };

  const handleTindakanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tindakan submitted:", tindakanForm);
    alert(`Permohonan ${selectedRecord?.namaMahasiswa} telah ${tindakanForm.tindakan === "Setujui" ? "disetujui" : "ditolak"}`);
    setShowTindakanModal(false);
    setTindakanForm({ tindakan: "", keterangan: "" });
  };

  const renderContent = () => {
    if (currentView === "permohonan-persetujuan") {
      return (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Tanggal Pengajuan
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Nama Mahasiswa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Detail
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    Persetujuan
                  </th>
                </tr>
              </thead>
              <tbody>
                {permohonanData.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">
                      {record.tanggalPengajuan}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {record.namaMahasiswa}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDetailClick(record)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Lihat Detail
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTindakanClick(record)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Tindakan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail Modal */}
          {showDetailModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Detail Permohonan
                    </h3>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.namaMahasiswa}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIM
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.nim}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Judul TA
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.judulTA}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Abstrak
                      </label>
                      <textarea
                        value={selectedRecord.abstrak}
                        readOnly
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan
                      </label>
                      <textarea
                        value={selectedRecord.alasan}
                        readOnly
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tindakan Modal */}
          {showTindakanModal && selectedRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      Tindakan Persetujuan
                    </h3>
                    <button
                      onClick={() => {
                        setShowTindakanModal(false);
                        setTindakanForm({ tindakan: "", keterangan: "" });
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleTindakanSubmit} className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Permohonan dari: <span className="font-semibold">{selectedRecord.namaMahasiswa}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tindakan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={tindakanForm.tindakan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, tindakan: e.target.value })
                        }
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pilih Tindakan</option>
                        <option value="Setujui">Setujui</option>
                        <option value="Tolak">Tolak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keterangan
                      </label>
                      <textarea
                        value={tindakanForm.keterangan}
                        onChange={(e) =>
                          setTindakanForm({ ...tindakanForm, keterangan: e.target.value })
                        }
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tambahkan keterangan (opsional)"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => {
                          setShowTindakanModal(false);
                          setTindakanForm({ tindakan: "", keterangan: "" });
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (currentView === "riwayat-persetujuan") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Nama
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  NIM
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tindakan
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Tanggal Disetujui
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {riwayatData.map((record, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700">{record.nama}</td>
                  <td className="py-3 px-4 text-gray-700">{record.nim}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.tindakan === "Disetujui"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.tindakan}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {record.tanggalDisetujui}
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
  };

  return (
    <PageLayout
      title="Persetujuan Dosen"
      breadcrumbs={[{ label: "Persetujuan Dosen" }]}
      icon={<UserCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Permohonan Persetujuan", "Riwayat Persetujuan"]}
      onSidebarItemClick={(item) => {
        if (item === "Permohonan Persetujuan") {
          setCurrentView("permohonan-persetujuan");
        } else if (item === "Riwayat Persetujuan") {
          setCurrentView("riwayat-persetujuan");
        }
      }}
      activeItem={
        currentView === "permohonan-persetujuan"
          ? "Permohonan Persetujuan"
          : currentView === "riwayat-persetujuan"
          ? "Riwayat Persetujuan"
          : undefined
      }
      hideHeader={!currentView}
    >
      {currentView ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center mb-3">
            <UserCheck className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Persetujuan Dosen</h2>
          <p className="text-sm text-gray-500 mb-5">Persetujuan peminjaman oleh dosen</p>
          
          {/* Button */}
          <button
            onClick={() => setCurrentView("permohonan-persetujuan")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Persetujuan Dosen
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}