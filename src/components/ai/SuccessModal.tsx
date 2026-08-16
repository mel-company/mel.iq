import { useEffect } from "react";
import { CheckCircle2, ExternalLink, Copy, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Shown when a generation finishes.
 *
 * Deliberately replaces the old hard redirect: the user has just watched a
 * minute of progress and should see what was built and choose where to go,
 * rather than being thrown into the editor mid-thought. Opening in a new tab
 * also keeps the landing page (and its history list) available.
 */

interface SuccessModalProps {
  open: boolean;
  storeName?: string;
  subdomain?: string;
  /** Editor handoff link — one-time token, so it is used, not shared. */
  editorUrl?: string;
  /** The storefront address, live only after the user publishes. */
  storeUrl?: string;
  onClose: () => void;
}

export default function SuccessModal({
  open,
  storeName,
  subdomain,
  editorUrl,
  storeUrl,
  onClose,
}: SuccessModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const openEditor = (newTab: boolean) => {
    if (!editorUrl) return;
    if (newTab) window.open(editorUrl, "_blank", "noopener,noreferrer");
    else window.location.href = editorUrl;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-success-title"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1b4b] p-6 text-center shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-4 top-4 text-white/40 transition-colors hover:text-white/80"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00c8ff]/10">
          <CheckCircle2 size={30} className="text-[#00c8ff]" />
        </div>

        <h2 id="gen-success-title" className="mb-2 text-xl font-bold text-white">
          تم إنشاء متجرك
        </h2>
        {storeName && (
          <p className="mb-1 text-lg text-white/90">{storeName}</p>
        )}

        {storeUrl && (
          <div className="mb-6 mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="flex items-center justify-between gap-2" dir="ltr">
              <span className="truncate text-sm text-white/60">{storeUrl}</span>
              <button
                type="button"
                aria-label="نسخ العنوان"
                onClick={() => {
                  navigator.clipboard?.writeText(storeUrl);
                  toast.success("تم نسخ العنوان");
                }}
                className="shrink-0 text-white/40 transition-colors hover:text-white"
              >
                <Copy size={14} />
              </button>
            </div>
            <p className="mt-1 text-right text-[11px] text-white/35">
              يصبح العنوان فعّالاً بعد النشر من المحرر
            </p>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => openEditor(true)}
            disabled={!editorUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00c8ff] py-3 font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-40"
          >
            <ExternalLink size={16} />
            افتح المتجر في تبويب جديد
          </button>

          <button
            type="button"
            onClick={() => openEditor(false)}
            disabled={!editorUrl}
            className="w-full rounded-full border border-white/15 py-3 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
          >
            افتح هنا
          </button>

          {subdomain && (
            <p className="pt-1 text-xs text-white/30">
              المتجر محفوظ باسم {subdomain} — تجده لاحقاً في سجل الإنشاء
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
