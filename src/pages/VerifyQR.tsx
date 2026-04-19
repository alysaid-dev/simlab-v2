import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import logoImage from "@/assets/logo-statistika.png";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type VerificationState = "loading" | "valid" | "invalid";

type BackendDocumentType =
  | "CLEARANCE_LETTER"
  | "LOAN_AGREEMENT"
  | "EQUIPMENT_LOAN"
  | "OTHER";

interface VerifyResponse {
  valid: boolean;
  documentType?: BackendDocumentType;
  documentId?: string;
  signerName?: string;
  signerRole?: string;
  laboratoryName?: string | null;
  signedAt?: string;
  studentName?: string | null;
  studentNim?: string | null;
}

const documentTypeLabel: Record<BackendDocumentType, string> = {
  CLEARANCE_LETTER: "Surat Keterangan Bebas Pinjaman Laboratorium",
  LOAN_AGREEMENT: "Berita Acara Peminjaman Laptop",
  EQUIPMENT_LOAN: "Berita Acara Peminjaman Alat",
  OTHER: "Dokumen SIMLAB",
};

function formatSignedAt(iso: string | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${datePart}, ${timePart} WIB`;
  } catch {
    return iso;
  }
}

export default function VerifyQR() {
  const { hash } = useParams<{ hash: string }>();
  const [state, setState] = useState<VerificationState>("loading");
  const [data, setData] = useState<VerifyResponse | null>(null);

  useEffect(() => {
    if (!hash) {
      setState("invalid");
      return;
    }
    let cancelled = false;
    setState("loading");
    fetch(`${API_BASE}/api/verify/${encodeURIComponent(hash)}`, {
      // Publik — tidak kirim cookie, tidak perlu SSO.
      credentials: "omit",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as VerifyResponse;
      })
      .then((res) => {
        if (cancelled) return;
        if (res.valid) {
          setData(res);
          setState("valid");
        } else {
          setData(null);
          setState("invalid");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setState("invalid");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Memverifikasi dokumen...
      </h2>
      <p className="text-sm text-gray-600">Harap tunggu sebentar</p>
    </div>
  );

  const renderValid = () => {
    if (!data) return null;
    const isKalab = data.signerRole === "Kepala Laboratorium";
    const badgeColor = isKalab
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";
    const jenisDokumen = data.documentType
      ? documentTypeLabel[data.documentType]
      : "Dokumen SIMLAB";

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
            Dokumen ini telah ditandatangani secara digital dan tercatat dalam
            sistem SIMLAB.
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-6 mb-6 shadow-sm">
          {/* Penandatangan */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Penandatangan
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Nama</p>
                <p className="text-base font-medium text-gray-900">
                  {data.signerName ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Jabatan</p>
                <Badge className={`${badgeColor} hover:${badgeColor}`}>
                  {data.signerRole ?? "Penandatangan"}
                </Badge>
              </div>
              {data.laboratoryName && (
                <div>
                  <p className="text-sm text-gray-600">Laboratorium</p>
                  <p className="text-base text-gray-900">
                    {data.laboratoryName}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Waktu Penandatanganan */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Waktu Penandatanganan
            </h3>
            <p className="text-base text-gray-900">
              {formatSignedAt(data.signedAt)}
            </p>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          {/* Informasi Dokumen */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Informasi Dokumen
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">Jenis</p>
                <p className="text-base text-gray-900">{jenisDokumen}</p>
              </div>
              {data.studentName && (
                <div>
                  <p className="text-sm text-gray-600">Nama Mahasiswa</p>
                  <p className="text-base text-gray-900">{data.studentName}</p>
                </div>
              )}
              {data.studentNim && (
                <div>
                  <p className="text-sm text-gray-600">NIM</p>
                  <p className="text-base text-gray-900">{data.studentNim}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Verifikasi dilakukan secara otomatis oleh sistem SIMLAB. Halaman ini
          dapat diakses oleh siapapun yang menerima dokumen ini.
        </p>
      </div>
    );
  };

  const renderInvalid = () => (
    <div className="px-6 py-8">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dokumen Tidak Dapat Diverifikasi
        </h1>
        <p className="text-sm text-gray-600">
          QR code ini tidak ditemukan dalam sistem SIMLAB atau dokumen telah
          dimanipulasi.
        </p>
      </div>

      <Alert className="mb-6 border-red-200 bg-red-50">
        <ShieldAlert className="text-red-600" />
        <AlertDescription className="text-red-900">
          <p className="font-medium mb-2">Kemungkinan penyebab:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>QR code telah dimodifikasi atau dipalsukan</li>
            <li>Dokumen tidak diterbitkan oleh sistem SIMLAB</li>
            <li>QR code rusak atau tidak terbaca dengan benar</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-900 mb-1">
          Hubungi Laboratorium Statistika FMIPA UII
        </p>
        <a
          href="mailto:labstatistika@uii.ac.id"
          className="text-sm text-blue-600 hover:underline"
        >
          labstatistika@uii.ac.id
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="Lab Statistika UII"
              className="h-8 w-auto"
            />
            <span className="text-sm font-medium text-gray-900">SIMLAB</span>
          </div>
          <h1 className="text-base font-semibold text-gray-900">
            Verifikasi Dokumen
          </h1>
          <div className="w-8"></div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {state === "loading" && renderLoading()}
        {state === "valid" && renderValid()}
        {state === "invalid" && renderInvalid()}
      </main>
    </div>
  );
}
