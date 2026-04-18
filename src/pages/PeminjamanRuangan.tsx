import { PageLayout } from "../components/PageLayout";
import { DoorOpen, Construction } from "lucide-react";

export default function PeminjamanRuangan() {
  return (
    <PageLayout
      title="Peminjaman Ruangan"
      breadcrumbs={[{ label: "Peminjaman Ruangan" }]}
      icon={<DoorOpen className="w-8 h-8 text-white" />}
      sidebarItems={[]}
      hideHeader
    >
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="w-[120px] h-[120px] mx-auto bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center mb-4">
          <Construction className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-bold text-gray-900 text-xl mb-2">
          Fitur Segera Hadir
        </h2>
        <p className="text-sm text-gray-500">
          Modul Peminjaman Ruangan belum tersedia. Backend untuk reservasi ruangan
          sedang dalam pengembangan.
        </p>
      </div>
    </PageLayout>
  );
}
