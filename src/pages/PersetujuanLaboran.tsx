import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { ClipboardCheck, X, Construction } from "lucide-react";

type View = "peminjaman-ruangan" | "bebas-lab";

interface PeminjamanRuanganRecord {
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  email: string;
  ruangan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keperluan: string;
}

interface BebasLabRecord {
  tanggalPengajuan: string;
  namaMahasiswa: string;
  nim: string;
  email: string;
  tanggalSidang: string;
}

export default function PersetujuanLaboran() {
  const [currentView, setCurrentView] = useState<View | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTindakanModal, setShowTindakanModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [tindakanForm, setTindakanForm] = useState({
    tindakan: "",
    keterangan: "",
  });

  // Mock data for Peminjaman Ruangan
  const peminjamanRuanganData: PeminjamanRuanganRecord[] = [
    {
      tanggalPengajuan: "22 Januari 2025",
      namaMahasiswa: "Anggit Wicaksono",
      nim: "201001113",
      email: "201001113@uii.ac.id",
      ruangan: "Lab SD",
      tanggalMulai: "2025-01-25 09:00",
      tanggalSelesai: "2025-01-25 12:00",
      keperluan: "Pelaksanaan praktikum Statistika untuk mahasiswa semester 4",
    },
    {
      tanggalPengajuan: "21 Januari 2025",
      namaMahasiswa: "Aly Rahman",
      nim: "201001114",
      email: "201001114@uii.ac.id",
      ruangan: "Lab MRK",
      tanggalMulai: "2025-01-26 13:00",
      tanggalSelesai: "2025-01-26 16:00",
      keperluan: "Workshop analisis data untuk organisasi mahasiswa",
    },
    {
      tanggalPengajuan: "20 Januari 2025",
      namaMahasiswa: "Rizal Pratama",
      nim: "201001115",
      email: "201001115@uii.ac.id",
      ruangan: "Lab BIS",
      tanggalMulai: "2025-01-27 10:00",
      tanggalSelesai: "2025-01-27 14:00",
      keperluan: "Presentasi hasil penelitian kelompok",
    },
  ];

  // Mock data for Bebas Lab
  const bebasLabData: BebasLabRecord[] = [
    {
      tanggalPengajuan: "22 Januari 2025",
      namaMahasiswa: "Siti Nurhaliza",
      nim: "191001234",
      email: "191001234@uii.ac.id",
      tanggalSidang: "2025-02-15",
    },
    {
      tanggalPengajuan: "21 Januari 2025",
      namaMahasiswa: "Budi Santoso",
      nim: "191001235",
      email: "191001235@uii.ac.id",
      tanggalSidang: "2025-02-20",
    },
    {
      tanggalPengajuan: "20 Januari 2025",
      namaMahasiswa: "Ahmad Fauzi",
      nim: "191001236",
      email: "191001236@uii.ac.id",
      tanggalSidang: "2025-02-25",
    },
  ];

  const handleDetailClick = (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleTindakanClick = (record: any) => {
    setSelectedRecord(record);
    setShowTindakanModal(true);
  };

  const handleTindakanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tindakan submitted:", tindakanForm);
    alert(`Permohonan dari ${selectedRecord?.namaMahasiswa} telah ${tindakanForm.tindakan === "Setujui" ? "disetujui" : "ditolak"}`);
    setShowTindakanModal(false);
    setTindakanForm({ tindakan: "", keterangan: "" });
  };

  const renderContent = () => {
    // Kedua menu (ruangan + bebas lab) belum terintegrasi backend.
    if (
      currentView === "peminjaman-ruangan" ||
      currentView === "bebas-lab"
    ) {
      return (
        <div className="max-w-xl mx-auto mt-12 text-center">
          <div className="w-[120px] h-[120px] mx-auto bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mb-4">
            <Construction className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-2">
            Fitur Segera Hadir
          </h2>
          <p className="text-sm text-gray-500">
            Modul persetujuan Laboran untuk{" "}
            {currentView === "peminjaman-ruangan"
              ? "peminjaman ruangan"
              : "surat bebas lab"}{" "}
            sedang dalam pengembangan backend.
          </p>
        </div>
      );
    }

    if (false && currentView === "peminjaman-ruangan") {
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
                {peminjamanRuanganData.map((record, index) => (
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
                        Aset yang Dipinjam
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.ruangan}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Pinjam
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalMulai}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Kembali
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalSelesai}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alasan Peminjaman
                      </label>
                      <textarea
                        value={selectedRecord.keperluan}
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

    if (currentView === "bebas-lab") {
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
                {bebasLabData.map((record, index) => (
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
                        Tanggal Sidang
                      </label>
                      <input
                        type="text"
                        value={selectedRecord.tanggalSidang}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
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
  };

  return (
    <PageLayout
      title="Persetujuan Laboran"
      breadcrumbs={[{ label: "Persetujuan Laboran" }]}
      icon={<ClipboardCheck className="w-8 h-8 text-white" />}
      sidebarItems={["Peminjaman Ruangan", "Bebas Lab"]}
      onSidebarItemClick={(item) => {
        if (item === "Peminjaman Ruangan") {
          setCurrentView("peminjaman-ruangan");
        } else if (item === "Bebas Lab") {
          setCurrentView("bebas-lab");
        }
      }}
      activeItem={
        currentView === "peminjaman-ruangan"
          ? "Peminjaman Ruangan"
          : currentView === "bebas-lab"
          ? "Bebas Lab"
          : undefined
      }
      hideHeader={!currentView}
    >
      {currentView ? renderContent() : (
        <div className="max-w-md">
          {/* Icon Container */}
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-teal-600 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
            <ClipboardCheck className="w-11 h-11 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="font-bold text-gray-900 text-xl mb-1">Persetujuan Laboran</h2>
          <p className="text-sm text-gray-500 mb-5">Persetujuan oleh Laboran</p>
          
          {/* Button */}
          <button
            onClick={() => setCurrentView("peminjaman-ruangan")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Persetujuan Laboran
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </PageLayout>
  );
}
