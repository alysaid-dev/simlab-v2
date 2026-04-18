import { PageLayout } from "../components/PageLayout";
import { ShoppingBag, Construction } from "lucide-react";

export default function HabisPakai() {
  return (
    <PageLayout
      title="Habis Pakai"
      breadcrumbs={[{ label: "Habis Pakai" }]}
      icon={<ShoppingBag className="w-8 h-8 text-white" />}
      sidebarItems={[]}
      hideHeader
    >
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="w-[120px] h-[120px] mx-auto bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center mb-4">
          <Construction className="w-10 h-10 text-white" />
        </div>
        <h2 className="font-bold text-gray-900 text-xl mb-2">
          Fitur Segera Hadir
        </h2>
        <p className="text-sm text-gray-500">
          Modul Habis Pakai belum tersedia. Endpoint <code>/api/consumables</code>
          sedang dalam pengembangan.
        </p>
      </div>
    </PageLayout>
  );
}
