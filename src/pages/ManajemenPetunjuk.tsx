import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Notebook,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { PageLayout } from "../components/PageLayout";
import { apiFetch } from "../lib/apiFetch";
import { useDialog } from "../lib/dialog";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

type Audience = "MAHASISWA" | "DOSEN" | "STAFF";

const AUDIENCE_LABEL: Record<Audience, string> = {
  MAHASISWA: "Mahasiswa",
  DOSEN: "Dosen",
  STAFF: "Tendik",
};

interface BackendGuide {
  id: string;
  audience: Audience;
  slug: string;
  title: string;
  contentMd: string;
  order: number;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: { id: string; displayName: string } | null;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function ManajemenPetunjuk() {
  const { alert, confirm } = useDialog();
  const [guides, setGuides] = useState<BackendGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAudience, setFilterAudience] = useState<"ALL" | Audience>("ALL");
  const [editing, setEditing] = useState<BackendGuide | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchGuides = () => {
    setLoading(true);
    setError(null);
    apiFetch(`${API_BASE}/api/guides`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { items: BackendGuide[] };
      })
      .then((data) => setGuides(data.items))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Gagal memuat"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(fetchGuides, []);

  const filtered = useMemo(() => {
    if (filterAudience === "ALL") return guides;
    return guides.filter((g) => g.audience === filterAudience);
  }, [guides, filterAudience]);

  const handleDelete = async (g: BackendGuide) => {
    const ok = await confirm(
      `Hapus permanen section "${g.title}" beserta semua revisinya?`,
      { destructive: true, confirmText: "Hapus" },
    );
    if (!ok) return;
    try {
      const res = await apiFetch(
        `${API_BASE}/api/guides/${encodeURIComponent(g.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchGuides();
    } catch (err) {
      await alert(`Gagal menghapus: ${err instanceof Error ? err.message : err}`);
    }
  };

  if (editing) {
    return (
      <EditorView
        guide={editing}
        onClose={() => {
          setEditing(null);
          fetchGuides();
        }}
      />
    );
  }

  return (
    <PageLayout
      title="Manajemen Petunjuk"
      breadcrumbs={[{ label: "Manajemen Petunjuk" }]}
      icon={<Notebook className="w-6 h-6 text-white" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Audience:</label>
            <select
              value={filterAudience}
              onChange={(e) =>
                setFilterAudience(e.target.value as typeof filterAudience)
              }
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="ALL">Semua</option>
              <option value="MAHASISWA">Mahasiswa</option>
              <option value="DOSEN">Dosen</option>
              <option value="STAFF">Tendik</option>
            </select>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Section
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Memuat...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Judul</th>
                  <th className="px-4 py-2 text-left">Audience</th>
                  <th className="px-4 py-2 text-left">Slug</th>
                  <th className="px-4 py-2 text-left">Urutan</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Diperbarui</th>
                  <th className="px-4 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {g.title}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {AUDIENCE_LABEL[g.audience]}
                    </td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">
                      {g.slug}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{g.order}</td>
                    <td className="px-4 py-2">
                      {g.isPublished ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs">
                          <Eye className="w-3 h-3" /> Tayang
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          <EyeOff className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(g.updatedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {g.updatedBy && (
                        <div className="text-[10px] text-gray-400">
                          oleh {g.updatedBy.displayName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setEditing(g)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Belum ada section. Klik "Tambah Section" untuk membuat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={(g) => {
            setCreating(false);
            fetchGuides();
            setEditing(g);
          }}
        />
      )}
    </PageLayout>
  );
}

// ---------------------------------------------------------------------------
// Create modal — bikin section baru, lalu langsung lanjut ke editor.
// ---------------------------------------------------------------------------

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (g: BackendGuide) => void;
}) {
  const { alert } = useDialog();
  const [audience, setAudience] = useState<Audience>("MAHASISWA");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [order, setOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE}/api/guides`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          slug: slug || slugify(title),
          title,
          order,
          isPublished: false,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as BackendGuide;
      onCreated(created);
    } catch (err) {
      await alert(`Gagal: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Tambah Section Petunjuk</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="MAHASISWA">Mahasiswa</option>
              <option value="DOSEN">Dosen</option>
              <option value="STAFF">Tendik</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              className="w-full border rounded-md px-3 py-2 text-sm"
              placeholder="contoh: Peminjaman Laptop TA"
              required
              maxLength={150}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Slug
              <span className="text-gray-400 font-normal text-xs ml-1">
                (huruf kecil, angka, tanda hubung)
              </span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm font-mono"
              pattern="^[a-z0-9-]+$"
              required
              maxLength={80}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Urutan
              <span className="text-gray-400 font-normal text-xs ml-1">
                (semakin kecil, semakin atas)
              </span>
            </label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              min={0}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan & Buka Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor view — split markdown editor + preview, with image upload toolbar.
// ---------------------------------------------------------------------------

function EditorView({
  guide,
  onClose,
}: {
  guide: BackendGuide;
  onClose: () => void;
}) {
  const { alert } = useDialog();
  const [title, setTitle] = useState(guide.title);
  const [slug, setSlug] = useState(guide.slug);
  const [order, setOrder] = useState(guide.order);
  const [content, setContent] = useState(guide.contentMd);
  const [isPublished, setIsPublished] = useState(guide.isPublished);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDirty =
    title !== guide.title ||
    slug !== guide.slug ||
    order !== guide.order ||
    content !== guide.contentMd ||
    isPublished !== guide.isPublished;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(
        `${API_BASE}/api/guides/${encodeURIComponent(guide.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug,
            order,
            contentMd: content,
            isPublished,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      setSavedAt(new Date());
    } catch (err) {
      await alert(`Gagal simpan: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent(content + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const handleImagePick = async (file: File) => {
    if (file.size > MAX_IMAGE_BYTES) {
      await alert(
        `Ukuran gambar maksimal 2 MB. File yang dipilih ${(
          file.size /
          1024 /
          1024
        ).toFixed(2)} MB.`,
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API_BASE}/api/guides/image`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { url: string; filename: string };
      const altText = file.name.replace(/\.[^.]+$/, "");
      insertAtCursor(`\n\n![${altText}](${data.url})\n\n`);
    } catch (err) {
      await alert(
        `Gagal upload gambar: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <PageLayout
      title="Edit Petunjuk"
      breadcrumbs={[
        { label: "Manajemen Petunjuk" },
        { label: title || "(Section)" },
      ]}
      icon={<Pencil className="w-6 h-6 text-white" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
          </button>
          <div className="flex items-center gap-2">
            {savedAt && !isDirty && (
              <span className="text-xs text-green-600 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan{" "}
                {savedAt.toLocaleTimeString("id-ID")}
              </span>
            )}
            {isDirty && (
              <span className="text-xs text-amber-600">Belum disimpan</span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
              maxLength={150}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 80),
                )
              }
              className="w-full border rounded-md px-3 py-2 text-sm font-mono"
              pattern="^[a-z0-9-]+$"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Urutan</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <label className="inline-flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md border w-full cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <span>
                {isPublished
                  ? "Tayang (bisa dilihat user)"
                  : "Draft (tersembunyi dari user)"}
              </span>
            </label>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Konten (Markdown)</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImagePick(file);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload Gambar
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Editor</div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[480px] border rounded-md p-3 text-sm font-mono"
                placeholder="Tulis konten dalam format Markdown.&#10;&#10;Contoh:&#10;# Judul&#10;## Sub Judul&#10;- Daftar 1&#10;- Daftar 2&#10;&#10;**Tebal**, *miring*, [tautan](https://...)&#10;&#10;Klik tombol Upload Gambar untuk menyisipkan gambar."
              />
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Gambar di-upload dulu, lalu
                URL otomatis disisipkan ke kursor.
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Preview</div>
              <div className="w-full h-[480px] border rounded-md p-4 overflow-y-auto bg-gray-50">
                {content.trim() === "" ? (
                  <div className="text-gray-400 text-sm italic">
                    Preview akan muncul di sini.
                  </div>
                ) : (
                  <div className="petunjuk-prose">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{
                        img: ({ src, ...rest }) => (
                          <img
                            src={
                              typeof src === "string" && src.startsWith("/api/")
                                ? `${API_BASE}${src}`
                                : src
                            }
                            {...rest}
                          />
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
