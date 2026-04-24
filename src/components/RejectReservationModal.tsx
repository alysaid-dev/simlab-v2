import { useEffect, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  pemohonNama?: string;
  ruanganNama?: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
}

export function RejectReservationModal({
  open,
  pemohonNama,
  ruanganNama,
  submitting = false,
  onCancel,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length === 0) {
      setError("Alasan penolakan wajib diisi");
      return;
    }
    if (trimmed.length > 500) {
      setError("Alasan maksimal 500 karakter");
      return;
    }
    setError(null);
    await onSubmit(trimmed);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold text-gray-900">Tolak Reservasi</h3>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {(pemohonNama || ruanganNama) && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
              {pemohonNama && (
                <div>
                  Pemohon: <span className="font-medium text-gray-900">{pemohonNama}</span>
                </div>
              )}
              {ruanganNama && (
                <div>
                  Ruangan: <span className="font-medium text-gray-900">{ruanganNama}</span>
                </div>
              )}
            </div>
          )}
          <div>
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan <span className="text-red-600">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              disabled={submitting}
              autoFocus
              placeholder="Contoh: Ruangan sudah terpakai untuk agenda lain pada jadwal tersebut."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100"
            />
            <div className="text-xs text-gray-500 mt-1">
              {reason.length} / 500 karakter — alasan akan dikirim ke pemohon via email/WA.
            </div>
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Tolak Reservasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
