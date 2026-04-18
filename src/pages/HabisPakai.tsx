import { useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { ShoppingBag, Construction } from "lucide-react";

export default function HabisPakai() {
  const [activeMenu, setActiveMenu] = useState<string>("");

  const placeholder = (
    <div className="max-w-xl mx-auto mt-12 text-center">
      <div className="w-[120px] h-[120px] mx-auto bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center mb-4">
        <Construction className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-bold text-gray-900 text-xl mb-2">
        Fitur Segera Hadir
      </h2>
      <p className="text-sm text-gray-500">
        Modul Habis Pakai belum tersedia. Endpoint{" "}
        <code>/api/consumables</code> sedang dalam pengembangan.
      </p>
    </div>
  );

  return (
    <PageLayout
      title="Habis Pakai"
      breadcrumbs={[
        { label: "Habis Pakai" },
        ...(activeMenu ? [{ label: activeMenu }] : []),
      ]}
      icon={<ShoppingBag className="w-8 h-8 text-white" />}
      sidebarItems={["Daftar Barang"]}
      onSidebarItemClick={setActiveMenu}
      activeItem={activeMenu}
      hideHeader={!activeMenu}
    >
      {activeMenu ? (
        placeholder
      ) : (
        <div className="max-w-md">
          <div className="w-[150px] h-[150px] bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBag className="w-11 h-11 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-xl mb-1">Habis Pakai</h2>
          <p className="text-sm text-gray-500 mb-5">
            Manajemen Barang Habis Pakai
          </p>
          <button
            onClick={() => setActiveMenu("Daftar Barang")}
            className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Masuk ke Habis Pakai
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
