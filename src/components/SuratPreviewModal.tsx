import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  src: string;
  title?: string;
  onClose: () => void;
}

export function SuratPreviewModal({ open, src, title, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {title ?? "Preview Surat"}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              title="Buka di tab baru"
            >
              <ExternalLink className="w-4 h-4" />
              Tab baru
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-hidden">
          <iframe
            src={src}
            title={title ?? "Preview Surat"}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
