import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  PackageMinus,
  History,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/apiFetch";
import { formatDateTime } from "../lib/format";
import { useDialog } from "../lib/dialog";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface BackendConsumable {
  id: string;
  code: string | null;
  name: string;
  unit: string;
  stock: number;
  minimumStock: number;
  createdAt: string;
  updatedAt: string;
}

type TxType = "IN" | "OUT";

interface BackendTransaction {
  id: string;
  consumableId: string;
  userId: string;
  quantity: number;
  type: TxType;
  notes: string | null;
  createdAt: string;
  user?: { id: string; displayName: string; uid: string };
}

interface ListResponse<T> {
  items: T[];
  total: number;
}

export function DaftarBarangPanel({ onChanged }: { onChanged?: () => void }) {
  const { alert, confirm } = useDialog();
  const [items, setItems] = useState<BackendConsumable[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selected, setSelected] = useState<BackendConsumable | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    unit: "",
    stock: 0,
    minimumStock: 0,
  });

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({ quantity: 1, notes: "" });

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<BackendTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchItems = () => {
    setItemsLoading(true);
    setItemsError(null);
    return apiFetch(`${API_BASE}/api/consumables`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ListResponse<BackendConsumable>;
      })
      .then((data) => setItems(data.items))
      .catch((err) => {
        setItemsError(
          err instanceof Error ? err.message : "Gagal memuat daftar",
        );
      })
      .finally(() => setItemsLoading(false));
  };

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((c) => {
    if (lowOnly && c.stock >= c.minimumStock) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetForm = () =>
    setForm({ code: "", name: "", unit: "", stock: 0, minimumStock: 0 });

  const handleAdd = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const handleEdit = (c: BackendConsumable) => {
    setSelected(c);
    setForm({
      code: c.code ?? "",
      name: c.name,
      unit: c.unit,
      stock: c.stock,
      minimumStock: c.minimumStock,
    });
    setEditModalOpen(true);
  };

  const handleSaveAdd = async () => {
    try {
      const payload = {
        ...form,
        code: form.code.trim() ? form.code.trim() : null,
      };
      const res = await apiFetch(`${API_BASE}/api/consumables`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAddModalOpen(false);
      await fetchItems();
      onChanged?.();
    } catch (err) {
      await alert(`Gagal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!selected) return;
    try {
      const payload = {
        ...form,
        code: form.code.trim() ? form.code.trim() : null,
      };
      const res = await apiFetch(
        `${API_BASE}/api/consumables/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditModalOpen(false);
      setSelected(null);
      await fetchItems();
      onChanged?.();
    } catch (err) {
      await alert(`Gagal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = async (c: BackendConsumable) => {
    if (!(await confirm(`Hapus "${c.name}"?`, { destructive: true, confirmText: "Hapus" }))) return;
    try {
      const res = await apiFetch(
        `${API_BASE}/api/consumables/${encodeURIComponent(c.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchItems();
      onChanged?.();
    } catch (err) {
      await alert(`Gagal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleOpenTx = (c: BackendConsumable) => {
    setSelected(c);
    setTxForm({ quantity: 1, notes: "" });
    setTxModalOpen(true);
  };

  const handleSubmitTx = async () => {
    if (!selected) return;
    try {
      const res = await apiFetch(
        `${API_BASE}/api/consumables/${encodeURIComponent(selected.id)}/transactions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "OUT",
            quantity: txForm.quantity,
            notes: txForm.notes || undefined,
          }),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? `HTTP ${res.status}`);
      }
      setTxModalOpen(false);
      setSelected(null);
      await fetchItems();
      onChanged?.();
    } catch (err) {
      await alert(`Gagal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleOpenHistory = async (c: BackendConsumable) => {
    setSelected(c);
    setHistoryItems([]);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await apiFetch(
        `${API_BASE}/api/consumables/${encodeURIComponent(c.id)}/transactions`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ListResponse<BackendTransaction>;
      setHistoryItems(data.items);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Gagal memuat riwayat",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  if (itemsLoading) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Memuat daftar barang…</span>
      </div>
    );
  }
  if (itemsError) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Gagal memuat</p>
          <p className="text-sm">{itemsError}</p>
        </div>
      </div>
    );
  }

  const itemForm = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kode Barcode <span className="text-gray-400 font-normal">(opsional)</span>
        </label>
        <input
          type="text"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          placeholder="Scan atau ketik kode..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          Dipakai untuk scan barcode di Transaksi Keluar.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nama Barang
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Satuan (contoh: lembar, botol)
        </label>
        <input
          type="text"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stok Saat Ini
          </label>
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) =>
              setForm((f) => ({ ...f, stock: Number(e.target.value) }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Stok
          </label>
          <input
            type="number"
            min={0}
            value={form.minimumStock}
            onChange={(e) =>
              setForm((f) => ({ ...f, minimumStock: Number(e.target.value) }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  );

  const modalWrap = (
    content: React.ReactNode,
    onClose: () => void,
    title: string,
  ) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{content}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari nama barang..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          Hanya stok rendah
        </label>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tambah Barang
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Kode</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Nama</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Stok</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Min. Stok</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Satuan</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-500">
                  {items.length === 0
                    ? "Belum ada barang habis pakai."
                    : "Tidak ada barang yang cocok."}
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const low = c.stock < c.minimumStock;
              return (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">
                    {c.code ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-sm font-medium ${
                        low
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {c.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{c.minimumStock}</td>
                  <td className="py-3 px-4 text-gray-700">{c.unit}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenTx(c)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-orange-600"
                        title="Catat Pengeluaran"
                      >
                        <PackageMinus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenHistory(c)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                        title="Riwayat Transaksi"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {addModalOpen &&
        modalWrap(
          <>
            {itemForm}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAddModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAdd}
                disabled={!form.name || !form.unit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                Simpan
              </button>
            </div>
          </>,
          () => setAddModalOpen(false),
          "Tambah Barang",
        )}

      {editModalOpen &&
        modalWrap(
          <>
            {itemForm}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setSelected(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Simpan Perubahan
              </button>
            </div>
          </>,
          () => {
            setEditModalOpen(false);
            setSelected(null);
          },
          `Edit: ${selected?.name ?? ""}`,
        )}

      {txModalOpen &&
        selected &&
        modalWrap(
          <>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Stok saat ini:{" "}
                <span className="font-semibold text-gray-900">
                  {selected.stock} {selected.unit}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Keluar ({selected.unit})
                </label>
                <input
                  type="number"
                  min={1}
                  max={selected.stock}
                  value={txForm.quantity}
                  onChange={(e) =>
                    setTxForm((f) => ({
                      ...f,
                      quantity: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (opsional)
                </label>
                <textarea
                  rows={3}
                  value={txForm.notes}
                  onChange={(e) =>
                    setTxForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setTxModalOpen(false);
                  setSelected(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitTx}
                disabled={
                  txForm.quantity < 1 || txForm.quantity > selected.stock
                }
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
              >
                Catat Pengeluaran
              </button>
            </div>
          </>,
          () => {
            setTxModalOpen(false);
            setSelected(null);
          },
          `Pengeluaran: ${selected.name}`,
        )}

      {historyModalOpen &&
        selected &&
        modalWrap(
          <div>
            {historyLoading ? (
              <div className="flex items-center gap-3 p-4 text-gray-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                Memuat...
              </div>
            ) : historyError ? (
              <div className="text-sm text-red-700">{historyError}</div>
            ) : historyItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Belum ada transaksi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-2 font-semibold">Tanggal</th>
                      <th className="text-left py-2 px-2 font-semibold">Tipe</th>
                      <th className="text-left py-2 px-2 font-semibold">Jumlah</th>
                      <th className="text-left py-2 px-2 font-semibold">Oleh</th>
                      <th className="text-left py-2 px-2 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 px-2">{formatDateTime(t.createdAt)}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.type === "IN"
                                ? "bg-green-100 text-green-800"
                                : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {t.type === "IN" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className="py-2 px-2">{t.quantity}</td>
                        <td className="py-2 px-2">{t.user?.displayName ?? "-"}</td>
                        <td className="py-2 px-2 text-gray-600">{t.notes ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>,
          () => {
            setHistoryModalOpen(false);
            setSelected(null);
          },
          `Riwayat: ${selected.name}`,
        )}
    </div>
  );
}
