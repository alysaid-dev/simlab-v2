import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { PageLayout } from "./PageLayout";
import { apiFetch } from "../lib/apiFetch";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

interface BackendGuide {
  id: string;
  audience: "MAHASISWA" | "DOSEN" | "STAFF";
  slug: string;
  title: string;
  contentMd: string;
  order: number;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: { id: string; displayName: string } | null;
}

type Audience = BackendGuide["audience"];

interface PetunjukReaderProps {
  audience: Audience;
  pageTitle: string;
  breadcrumbLabel: string;
}

export function PetunjukReader({
  audience,
  pageTitle,
  breadcrumbLabel,
}: PetunjukReaderProps) {
  const [guides, setGuides] = useState<BackendGuide[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(
      `${API_BASE}/api/guides/audience/${encodeURIComponent(audience)}`,
      { credentials: "include" },
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { items: BackendGuide[] };
      })
      .then((data) => {
        if (cancelled) return;
        const items = data.items;
        setGuides(items);
        setActiveSlug(items[0]?.slug ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat petunjuk");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const sidebarItems = useMemo(() => guides.map((g) => g.title), [guides]);

  const activeGuide = useMemo(
    () => guides.find((g) => g.slug === activeSlug) ?? null,
    [guides, activeSlug],
  );

  const handleSidebarClick = (item: string) => {
    const found = guides.find((g) => g.title === item);
    if (found) setActiveSlug(found.slug);
  };

  return (
    <PageLayout
      title={pageTitle}
      breadcrumbs={[{ label: breadcrumbLabel }]}
      icon={<BookOpen className="w-6 h-6 text-white" />}
      sidebarItems={sidebarItems}
      activeItem={activeGuide?.title}
      onSidebarItemClick={handleSidebarClick}
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Memuat petunjuk...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Gagal memuat</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {!loading && !error && guides.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Belum ada petunjuk yang dipublikasikan</p>
          <p className="text-sm mt-1">
            Konten akan muncul setelah administrator mengisi dan
            mempublikasikan.
          </p>
        </div>
      )}

      {!loading && !error && activeGuide && (
        <article className="max-w-none">
          <header className="mb-6 pb-4 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeGuide.title}
            </h2>
            {activeGuide.updatedBy && (
              <p className="text-xs text-gray-500 mt-1">
                Diperbarui oleh {activeGuide.updatedBy.displayName} —{" "}
                {new Date(activeGuide.updatedAt).toLocaleString("id-ID")}
              </p>
            )}
          </header>
          {activeGuide.contentMd.trim() === "" ? (
            <div className="text-gray-500 italic">
              Konten petunjuk ini belum diisi.
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
                {activeGuide.contentMd}
              </ReactMarkdown>
            </div>
          )}
        </article>
      )}
    </PageLayout>
  );
}
