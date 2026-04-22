import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ScanLine,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/apiFetch";
import { formatDateTime } from "../lib/format";
import { useDialog } from "../lib/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface BackendConsumable {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  stock: number;
  minimumStock: number;
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

interface Item {
  id: string;
  code: string | null;
  nama: string;
  satuan: string;
  stok: number;
}

interface CartLine {
  id: string;
  nama: string;
  satuan: string;
  jumlah: number;
}

export function TerimaBarangPanel({ onChanged }: { onChanged?: () => void }) {
  const { alert } = useDialog();
  const [items, setItems] = useState<Item[]>([]);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeFlash, setBarcodeFlash] = useState<
    | { kind: "success"; message: string }
    | { kind: "unknown"; code: string }
    | null
  >(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successSummary, setSuccessSummary] = useState<
    { total: number; lines: CartLine[]; waktu: string; notes?: string } | null
  >(null);

  const refetchItems = async () => {
    try {
      const r = await apiFetch(`${API_BASE}/api/consumables`, {
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as ListResponse<BackendConsumable>;
      setItems(
        data.items.map((c) => ({
          id: c.id,
          code: c.code,
          nama: c.name,
          satuan: c.unit,
          stok: c.stock,
        })),
      );
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : "Gagal memuat barang");
    }
  };

  useEffect(() => {
    void refetchItems();
  }, []);

  const addToCart = (item: Item, delta = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, jumlah: c.jumlah + delta } : c,
        );
      }
      return [
        ...prev,
        { id: item.id, nama: item.nama, satuan: item.satuan, jumlah: delta },
      ];
    });
  };

  const handleBarcodeSubmit = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    const match = items.find(
      (it) => (it.code ?? "").toLowerCase() === code.toLowerCase(),
    );
    if (match) {
      addToCart(match);
      setBarcodeFlash({ kind: "success", message: `+1 ${match.nama}` });
    } else {
      setBarcodeFlash({ kind: "unknown", code });
    }
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  const incrementCart = (id: string) =>
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, jumlah: c.jumlah + 1 } : c)),
    );

  const decrementCart = (id: string) =>
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, jumlah: Math.max(1, c.jumlah - 1) } : c,
      ),
    );

  const removeCart = (id: string) =>
    setCart((prev) => prev.filter((c) => c.id !== id));

  const setCartQty = (id: string, qty: number) =>
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, jumlah: Math.max(1, qty) } : c,
      ),
    );

  const handleProcess = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(
        `${API_BASE}/api/consumables/transactions/bulk`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "IN",
            notes: notes.trim() || undefined,
            lines: cart.map((line) => ({
              consumableId: line.id,
              quantity: line.jumlah,
            })),
          }),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? `HTTP ${res.status}`);
      }
      const total = cart.reduce((s, c) => s + c.jumlah, 0);
      setSuccessSummary({
        total,
        lines: [...cart],
        waktu: formatDateTime(new Date()),
        notes: notes.trim() || undefined,
      });
      setCart([]);
      setNotes("");
      await refetchItems();
      onChanged?.();
    } catch (err) {
      await alert(
        `Gagal mencatat penerimaan: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (!itemSearchQuery) return true;
    const q = itemSearchQuery.toLowerCase();
    return (
      item.nama.toLowerCase().includes(q) ||
      (item.code ?? "").toLowerCase().includes(q)
    );
  });

  if (successSummary) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            Penerimaan Barang Berhasil
          </h2>
          <p className="text-sm text-gray-500">
            Stok sudah di-update. Total {successSummary.total} item diterima.
          </p>
        </div>

        <Card className="p-6 text-left">
          <div className="mb-3">
            <p className="text-sm text-gray-600">Waktu</p>
            <p className="font-medium">{successSummary.waktu}</p>
          </div>
          {successSummary.notes && (
            <div className="mb-3">
              <p className="text-sm text-gray-600">Catatan / Nota</p>
              <p className="font-medium whitespace-pre-wrap">
                {successSummary.notes}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-2">Rincian</p>
            <div className="space-y-1">
              {successSummary.lines.map((line) => (
                <div key={line.id} className="flex justify-between text-sm">
                  <span>{line.nama}</span>
                  <span className="text-gray-600">
                    +{line.jumlah} {line.satuan}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Button
          onClick={() => setSuccessSummary(null)}
          className="mt-6"
        >
          Penerimaan Baru
        </Button>
      </div>
    );
  }

  const totalCart = cart.reduce((s, c) => s + c.jumlah, 0);

  return (
    <div className="space-y-6">
      {itemsError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          Gagal memuat daftar barang: {itemsError}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Item Catalog */}
        <div className="w-full lg:flex-[3] min-w-0">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">1. Pilih Barang</h3>

            <div className="flex gap-3 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nama barang..."
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-52 relative">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={barcodeRef}
                  placeholder="Scan kode barang..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeSubmit();
                    }
                  }}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Tekan Enter / scan — 1 scan = +1 qty di keranjang
            </p>

            {barcodeFlash?.kind === "success" && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-center justify-between">
                <span>✓ {barcodeFlash.message}</span>
                <button
                  onClick={() => setBarcodeFlash(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {barcodeFlash?.kind === "unknown" && (
              <div className="mb-4 px-3 py-3 rounded-lg bg-yellow-50 border border-yellow-300 text-sm text-yellow-900 flex items-center justify-between gap-3">
                <div>
                  <strong>Barcode tidak dikenal:</strong>{" "}
                  <code className="bg-yellow-100 px-1.5 py-0.5 rounded text-xs">
                    {barcodeFlash.code}
                  </code>
                  <div className="text-xs text-yellow-800 mt-1">
                    Daftarkan barang dulu di tab <strong>Daftar Barang</strong> sebelum menerima stok.
                  </div>
                </div>
                <button
                  onClick={() => setBarcodeFlash(null)}
                  className="text-yellow-700 hover:text-yellow-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="relative border rounded-xl p-4 bg-white hover:shadow-md transition-all"
                >
                  <p className="font-medium text-gray-900 mb-2">{item.nama}</p>
                  {item.code && (
                    <p className="text-xs font-mono text-gray-500 mb-1">
                      {item.code}
                    </p>
                  )}
                  <div className="mb-3">
                    <p className="text-sm text-gray-500">
                      Stok sekarang: {item.stok} {item.satuan}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors shadow-sm"
                    title="Tambah ke penerimaan"
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Tidak ada barang yang cocok.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:flex-[2] min-w-0">
          <Card className="sticky top-6 border-l border-gray-200 h-fit max-h-[700px] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Penerimaan
                </h3>
                <Badge className="bg-green-100 text-green-700 rounded-full text-xs">
                  {cart.length} item
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">
                    Scan atau klik + pada barang untuk menambah.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((line, idx) => (
                    <div key={line.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {line.nama}
                          </p>
                          <p className="text-xs text-gray-500">
                            {line.satuan}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementCart(line.id)}
                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={line.jumlah}
                            onChange={(e) =>
                              setCartQty(line.id, Number(e.target.value))
                            }
                            className="w-14 text-center border border-gray-200 rounded py-1 text-sm"
                          />
                          <button
                            onClick={() => incrementCart(line.id)}
                            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-gray-600" />
                          </button>
                          <button
                            onClick={() => removeCart(line.id)}
                            className="ml-1 p-1.5 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                      {idx < cart.length - 1 && (
                        <div className="border-t border-gray-100 mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 space-y-3">
              <div>
                <Label htmlFor="terima-notes" className="text-xs">
                  Catatan / No. Nota (opsional)
                </Label>
                <Textarea
                  id="terima-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier, nomor nota, dll."
                  rows={2}
                />
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Total Item</span>
                <span className="font-semibold text-gray-900">{totalCart}</span>
              </div>
              <Button
                onClick={() => void handleProcess()}
                disabled={cart.length === 0 || submitting}
                className="w-full bg-green-600 hover:bg-green-700 rounded-lg h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Proses Penerimaan"
                )}
              </Button>
              <p className="text-xs text-gray-400 text-center">
                Stok akan bertambah sesuai jumlah setelah diproses.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
