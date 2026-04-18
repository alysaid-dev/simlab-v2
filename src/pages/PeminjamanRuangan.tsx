import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { DoorOpen, Construction } from "lucide-react";

export default function PeminjamanRuangan() {
  const [activeMenu, setActiveMenu] = useState<string>("");

  const placeholder = (
    <div className="max-w-xl mx-auto mt-12 text-center">
      <div className="w-[120px] h-[120px] mx-auto bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-4">
        <Construction className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-bold text-gray-900 text-xl mb-2">
        Fitur Segera Hadir
      </h2>
      <p className="text-sm text-gray-500">
        Modul Peminjaman Ruangan belum tersedia. Backend untuk reservasi
        ruangan sedang dalam pengembangan.
      </p>
    </div>
  );

  return (
    <PageLayout
      title="Peminjaman Ruangan"
      breadcrumbs={[
        { label: "Peminjaman Ruangan" },
        ...(activeMenu ? [{ label: activeMenu }] : []),
      ]}
      icon={<DoorOpen className="w-8 h-8 text-white" />}
      sidebarItems={["Pengajuan Baru", "Riwayat Pengajuan"]}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? (
        placeholder
      ) : (
        <div className="max-w-md">
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-3">
            <DoorOpen className="w-11 h-11 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">
            Peminjaman Ruangan
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Peminjaman Ruangan Laboratorium
          </p>
          <button
            onClick={() => setActiveMenu("Pengajuan Baru")}
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
      )}
    </PageLayout>
  );
}
