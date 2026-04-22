import { useEffect, useMemo, useState } from "react";
import { formatDate, formatRupiah } from "../lib/format";
import { AlertCircle, Loader2, Receipt } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { apiFetch } from "../lib/apiFetch";
import { useDialog } from "../lib/dialog";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type FinePaidStatus = "UNPAID" | "PAID" | "WAIVED";

interface FineLoan {
  id: string;
  dayLate: number;
  fine: string | number;
  finePaid: FinePaidStatus;
  finePaidAt: string | null;
  fineNote: string | null;
  returnDate: string | null;
  endDate: string;
  borrower?: { uid: string; displayName: string; waNumber?: string | null };
  asset?: { name: string; code: string };
}

type FilterTab = "ALL" | "UNPAID" | "PAID" | "WAIVED";

const TAB_LABEL: Record<FilterTab, string> = {
  ALL: "Semua",
  UNPAID: "Belum Lunas",
  PAID: "Lunas",
  WAIVED: "Dibebaskan",
};

const STATUS_BADGE: Record<FinePaidStatus, { label: string; cls: string }> = {
  UNPAID: { label: "Belum Lunas", cls: "bg-red-100 text-red-700 border-red-200" },
  PAID: { label: "Lunas", cls: "bg-green-100 text-green-700 border-green-200" },
  WAIVED: { label: "Dibebaskan", cls: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function RiwayatDendaPanel() {
  const { alert } = useDialog();
  const [tab, setTab] = useState<FilterTab>("UNPAID");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<FineLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog state
  const [target, setTarget] = useState<FineLoan | null>(null);
  const [nextStatus, setNextStatus] = useState<FinePaidStatus>("PAID");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchFines = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ take: "200" });
      if (tab !== "ALL") params.set("finePaid", tab);
      if (search.trim()) params.set("search", search.trim());
      const r = await apiFetch(
        `${API_BASE}/api/loans/fines?${params.toString()}`,
        { credentials: "include" },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { items: FineLoan[] };
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat denda");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openAction = (loan: FineLoan, status: FinePaidStatus) => {
    setTarget(loan);
    setNextStatus(status);
    setNote(loan.fineNote ?? "");
  };

  const closeAction = () => {
    setTarget(null);
    setNote("");
    setSubmitting(false);
  };

  const submitAction = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const r = await apiFetch(
        `${API_BASE}/api/loans/${encodeURIComponent(target.id)}/fine`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finePaid: nextStatus,
            fineNote: note.trim() ? note.trim() : undefined,
          }),
        },
      );
      if (!r.ok) {
        const err = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(err?.message ?? `HTTP ${r.status}`);
      }
      closeAction();
      void fetchFines();
    } catch (err) {
      await alert(
        `Gagal memperbarui status denda: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      setSubmitting(false);
    }
  };

  const totalDendaBelum = useMemo(
    () =>
      items
        .filter((l) => l.finePaid === "UNPAID")
        .reduce((sum, l) => sum + Number(l.fine), 0),
    [items],
  );

  return (
    <div>
      <Alert className="mb-6 border-amber-200 bg-amber-50">
        <Receipt className="h-4 w-4 text-amber-700" />
        <AlertDescription className="text-amber-900">
          Daftar peminjaman yang dikenakan denda keterlambatan. Tandai{" "}
          <strong>Lunas</strong> saat mahasiswa membayar, atau{" "}
          <strong>Dibebaskan</strong> bila denda diputihkan.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(Object.keys(TAB_LABEL) as FilterTab[]).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            variant={tab === t ? "default" : "outline"}
            size="sm"
          >
            {TAB_LABEL[t]}
          </Button>
        ))}
        <div className="flex-1" />
        <div className="flex gap-2 min-w-[280px]">
          <Input
            placeholder="Cari NIM atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void fetchFines();
            }}
          />
          <Button onClick={() => void fetchFines()} variant="secondary">
            Cari
          </Button>
        </div>
      </div>

      {tab === "UNPAID" && items.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900">
          Total denda belum lunas: <strong>{formatRupiah(totalDendaBelum)}</strong>{" "}
          ({items.filter((l) => l.finePaid === "UNPAID").length} peminjaman)
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Memuat data denda...</p>
          </div>
        ) : error ? (
          <Alert className="border-red-200 bg-red-50 m-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Gagal memuat riwayat denda: {error}
            </AlertDescription>
          </Alert>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data denda pada filter ini
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">NIM</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nama</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Laptop</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tgl Kembali</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Hari Telat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Denda</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((loan) => {
                  const status = STATUS_BADGE[loan.finePaid];
                  return (
                    <tr key={loan.id} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {loan.borrower?.uid ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {loan.borrower?.displayName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{loan.asset?.code ?? "-"}</div>
                        <div className="text-xs text-gray-500">
                          {loan.asset?.name ?? ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(loan.returnDate)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold text-red-600">
                          {loan.dayLate} hari
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-red-700">
                        {formatRupiah(Number(loan.fine))}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant="outline"
                          className={`${status.cls} border`}
                        >
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {loan.finePaid !== "PAID" && (
                            <Button
                              onClick={() => openAction(loan, "PAID")}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Tandai Lunas
                            </Button>
                          )}
                          {loan.finePaid !== "WAIVED" && (
                            <Button
                              onClick={() => openAction(loan, "WAIVED")}
                              size="sm"
                              variant="outline"
                            >
                              Dibebaskan
                            </Button>
                          )}
                          {loan.finePaid !== "UNPAID" && (
                            <Button
                              onClick={() => openAction(loan, "UNPAID")}
                              size="sm"
                              variant="ghost"
                            >
                              Batalkan
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nextStatus === "PAID" && "Tandai Denda Lunas"}
              {nextStatus === "WAIVED" && "Bebaskan Denda"}
              {nextStatus === "UNPAID" && "Kembalikan ke Belum Lunas"}
            </DialogTitle>
            <DialogDescription>
              {target && (
                <>
                  {target.borrower?.displayName} ({target.borrower?.uid}) —{" "}
                  {formatRupiah(Number(target.fine))} ({target.dayLate} hari)
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="fineNote">Catatan (opsional)</Label>
            <Textarea
              id="fineNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                nextStatus === "WAIVED"
                  ? "Alasan pembebasan denda..."
                  : nextStatus === "PAID"
                    ? "Catatan pembayaran (mis. tanggal bayar, metode)"
                    : "Catatan..."
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAction} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={() => void submitAction()} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
