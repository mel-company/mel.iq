import { useState } from "react";
import {
  Clock,
  ExternalLink,
  History,
  Loader2,
  RotateCcw,
  AlertCircle,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGenerationHistory,
  useOpenGeneration,
  useRestoreGeneration,
} from "@/api/wrappers/aiStoreGenerator.wrappers";
import type { GenerationHistoryItem } from "@/api/endpoints/aiStoreGenerator.endpoints";

/**
 * Past generations, with the two actions that make history useful: open one in
 * the editor, or roll the store's draft back to it.
 *
 * Restore overwrites the current draft including hand edits, so it always
 * confirms first — the destructive half of this list should never fire on a
 * single click.
 */

const STATUS_LABEL: Record<string, string> = {
  PENDING: "قيد الانتظار",
  RUNNING: "جاري الإنشاء",
  SUCCEEDED: "مكتمل",
  FAILED: "فشل",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export default function GenerationHistory() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useGenerationHistory(Boolean(user));
  const openMutation = useOpenGeneration();
  const restoreMutation = useRestoreGeneration();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = data?.data ?? [];

  if (!user || isLoading || items.length === 0) return null;

  const open = async (item: GenerationHistoryItem) => {
    setBusyId(item.id);
    try {
      // A fresh link each time: the original handoff token is one-time.
      const { redirectUrl } = await openMutation.mutateAsync(item.id);
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذر فتح هذا المتجر");
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (item: GenerationHistoryItem) => {
    setBusyId(item.id);
    try {
      const { redirectUrl } = await restoreMutation.mutateAsync(item.id);
      toast.success("تمت استعادة هذه النسخة");
      setConfirmingId(null);
      refetch();
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذرت استعادة هذه النسخة");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 text-right">
      <div className="mb-6 flex items-center justify-center gap-2 text-white/70">
        <History size={18} />
        <h2 className="text-lg font-bold">سجل الإنشاء</h2>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const busy = busyId === item.id;
          const restorable = item.status === "SUCCEEDED" && !!item.store?.domain;

          return (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-white">
                      {item.storeName || "متجر بدون اسم"}
                    </span>
                    {item.store?.domain && (
                      <span className="text-xs text-white/35" dir="ltr">
                        {item.store.domain}
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-white/50">
                    {item.prompt}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/30">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(item.createdAt)}
                    </span>
                    {item.templateId && <span>{item.templateId}</span>}
                    {item.referenceImages?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon size={11} />
                        {item.referenceImages.length}
                      </span>
                    )}
                    {item.figmaUrl && <span>Figma</span>}
                    <span
                      className={
                        item.status === "FAILED"
                          ? "text-red-400/70"
                          : item.status === "SUCCEEDED"
                            ? "text-[#00c8ff]/70"
                            : ""
                      }
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>

                  {item.status === "FAILED" && item.error && (
                    <p className="mt-2 inline-flex items-start gap-1 text-xs text-red-300/70">
                      <AlertCircle size={11} className="mt-0.5 shrink-0" />
                      {item.error}
                    </p>
                  )}
                </div>

                {restorable && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => open(item)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <ExternalLink size={12} />
                      )}
                      فتح
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(item.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/5 disabled:opacity-40"
                    >
                      <RotateCcw size={12} />
                      استعادة
                    </button>
                  </div>
                )}
              </div>

              {confirmingId === item.id && (
                <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
                  <p className="mb-3 text-xs text-amber-200/90">
                    ستحل هذه النسخة محل التصميم الحالي في المحرر، وستفقد أي
                    تعديلات أجريتها بعدها. هل تريد المتابعة؟
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => restore(item)}
                      disabled={busy}
                      className="rounded-full bg-amber-400/90 px-4 py-1.5 text-xs font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-40"
                    >
                      {busy ? "جاري الاستعادة..." : "نعم، استعد هذه النسخة"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/5"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
