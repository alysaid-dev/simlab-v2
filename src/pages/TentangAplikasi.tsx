import { Info, Mail, MessageCircle } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import logoImage from "@/assets/logo-statistika.png";

const APP_VERSION = "2.0.1";
const CONTACT_EMAIL = "labstatistika@uii.ac.id";
const CONTACT_WA_DISPLAY = "0822 2719 9581";
// Format e164 untuk wa.me — angka saja, tanpa spasi, prefix 62 (Indonesia).
const CONTACT_WA_E164 = "6282227199581";

export default function TentangAplikasi() {
  return (
    <PageLayout
      title="Tentang Aplikasi"
      breadcrumbs={[{ label: "Tentang Aplikasi" }]}
      icon={<Info className="w-8 h-8 text-white" />}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <img
              src={logoImage}
              alt="Laboratorium Statistika UII"
              className="h-16 w-auto flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">
                  SIMLAB Statistika
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Sistem Informasi Manajemen Laboratorium
              </p>
            </div>
          </div>
        </div>

        {/* Deskripsi */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
            Deskripsi
          </h3>
          <p className="text-gray-700 leading-relaxed">
            Sistem Informasi Manajemen Laboratorium (SIMLAB) Statistika versi{" "}
            <span className="font-semibold">{APP_VERSION}</span> dikembangkan
            oleh Laboratorium Statistika Fakultas Matematika dan Ilmu
            Pengetahuan Alam Universitas Islam Indonesia.
          </p>
        </div>

        {/* Kontak */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
            Kontak
          </h3>
          <p className="text-gray-700 mb-4">
            Untuk informasi lebih lanjut, silakan hubungi kami melalui:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm font-medium text-gray-900 truncate">
                  {CONTACT_EMAIL}
                </div>
              </div>
            </a>
            <a
              href={`https://wa.me/${CONTACT_WA_E164}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <div className="text-xs text-gray-500">WhatsApp</div>
                <div className="text-sm font-medium text-gray-900">
                  {CONTACT_WA_DISPLAY}
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Credit footer */}
        <div className="text-center text-xs text-gray-500 pt-2">
          © Laboratorium Statistika · FMIPA · Universitas Islam Indonesia
        </div>
      </div>
    </PageLayout>
  );
}
