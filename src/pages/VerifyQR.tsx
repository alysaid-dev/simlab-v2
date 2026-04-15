import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";

type VerificationState = "loading" | "valid-laboran" | "valid-kalab" | "invalid";

interface VerificationData {
  nama: string;
  jabatan: string;
  laboratorium: string;
  waktu: string;
  jenisDokumen: string;
  namaMahasiswa: string;
  nim: string;
}

export default function VerifyQR() {
  const { hash } = useParams<{ hash: string }>();
  const [state, setState] = useState<VerificationState>("loading");
  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // Demo routing for Figma Make preview
      if (hash === "demo-loading") {
        setState("loading");
      } else if (hash === "demo-valid-laboran") {
        setState("valid-laboran");
        setData({
          nama: "Ridhani Anggit Safitri, A.Md",
          jabatan: "Laboran",
          laboratorium: "Laboratorium Statistika Manajemen Risiko dan Kebencanaan",
          waktu: "27 Maret 2026, 14:32:05 WIB",
          jenisDokumen: "Surat Keterangan Bebas Pinjaman Laboratorium",
          namaMahasiswa: "Putriana Dwi Agustin",
          nim: "22611147"
        });
      } else if (hash === "demo-valid-kalab") {
        setState("valid-kalab");
        setData({
          nama: "Ghiffari Ahnaf Danarwindu, M.Sc.",
          jabatan: "Kepala Laboratorium",
          laboratorium: "Laboratorium Statistika Sains Data",
          waktu: "27 Maret 2026, 15:10:22 WIB",
          jenisDokumen: "Surat Keterangan Bebas Pinjaman Laboratorium",
          namaMahasiswa: "Putriana Dwi Agustin",
          nim: "22611147"
        });
      } else if (hash === "demo-invalid") {
        setState("invalid");
      } else {
        // For any other hash, show invalid state
        setState("invalid");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [hash]);

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Memverifikasi dokumen...
      </h2>
      <p className="text-sm text-gray-600">
        Harap tunggu sebentar
      </p>
    </div>
  );

  const renderValid = () => {
    if (!data) return null;

    const isKalab = state === "valid-kalab";
    const badgeColor = isKalab ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

    return (
      <div className="px-6 py-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tanda Tangan Digital Terverifikasi
          </h1>
          <p className="text-sm text-gray-600">
            Dokumen ini telah ditandatangani secara digital dan tercatat dalam sistem SIMLAB.
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-6 mb-6 shadow-sm">
          {/* Section: Penandatangan */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Penandatangan
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p className="text-base font-medium text-gray-900">{data.nama}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Jabatan</p>
                <Badge className={`${badgeColor} hover:${badgeColor}`}>
                  {data.jabatan}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Laboratorium</p>
                <p className="text-base text-gray-900">{data.laboratorium}</p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Section: Waktu Penandatanganan */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Waktu Penandatanganan
            </h3>
            <p className="text-base text-gray-900">{data.waktu}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Section: Informasi Dokumen */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Informasi Dokumen
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Jenis</p>
                <p className="text-base text-gray-900">{data.jenisDokumen}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nama Mahasiswa</p>
                <p className="text-base text-gray-900">{data.namaMahasiswa}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">NIM</p>
                <p className="text-base text-gray-900">{data.nim}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Verifikasi dilakukan secara otomatis oleh sistem SIMLAB. Halaman ini dapat diakses oleh siapapun yang menerima dokumen ini.
        </p>
      </div>
    );
  };

  const renderInvalid = () => (
    <div className="px-6 py-8">
      {/* Error Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dokumen Tidak Dapat Diverifikasi
        </h1>
        <p className="text-sm text-gray-600">
          QR code ini tidak ditemukan dalam sistem SIMLAB atau dokumen telah dimanipulasi.
        </p>
      </div>

      {/* Warning Card */}
      <Alert className="mb-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <AlertDescription className="text-red-900">
              <p className="font-medium mb-2">Kemungkinan penyebab:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>QR code telah dimodifikasi atau dipalsukan</li>
                <li>Dokumen tidak diterbitkan oleh sistem SIMLAB</li>
                <li>QR code rusak atau tidak terbaca dengan benar</li>
              </ul>
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Contact Info */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-900 mb-1">
          Hubungi Laboratorium Statistika FMIPA UII
        </p>
        <a
          href="mailto:lab.statistika@uii.ac.id"
          className="text-sm text-blue-600 hover:underline"
        >
          lab.statistika@uii.ac.id
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-sm font-medium text-gray-900">SIMLAB</span>
          </div>
          <h1 className="text-base font-semibold text-gray-900">
            Verifikasi Dokumen
          </h1>
          <div className="w-8"></div> {/* Spacer for balance */}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-md mx-auto">
        {state === "loading" && renderLoading()}
        {(state === "valid-laboran" || state === "valid-kalab") && renderValid()}
        {state === "invalid" && renderInvalid()}
      </main>
    </div>
  );
}