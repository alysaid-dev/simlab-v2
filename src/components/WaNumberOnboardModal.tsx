import { useState, type FormEvent } from "react";
import { Phone, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/apiFetch";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

/**
 * Blocking modal — muncul untuk user yang sudah login tapi `dbUser.waNumber`
 * masih kosong. Tidak bisa ditutup kecuali form berhasil di-submit. Setelah
 * sukses, `refetch` auth supaya `waNumber` terbaru ter-load di context.
 */
export function WaNumberOnboardModal() {
  const { user, refetch } = useAuth();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show = !!user && !user.dbUser?.waNumber;
  if (!show) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 6) {
      setError("Nomor WA minimal 6 digit");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/api/users/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waNumber: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-700" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              Lengkapi Nomor WhatsApp
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            Nomor WhatsApp dipakai untuk notifikasi status peminjaman dan
            persetujuan. Silakan isi terlebih dahulu sebelum memakai fitur
            lain.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="wa-onboard"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nomor WhatsApp
              </label>
              <input
                id="wa-onboard"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="08xxxxxxxxxx"
                disabled={submitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
