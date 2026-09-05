import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Sparkles, Store, PenLine, Check, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useCredits,
  useCreditPackages,
  usePurchaseCredits,
} from "@/api/wrappers/aiStoreGenerator.wrappers";

/**
 * Credit top-up for the AI store generator.
 *
 * Styled as a sibling of AuthModal/SuccessModal — same `#1e1b4b` panel, same
 * `#00c8ff` accent — so the purchase step doesn't read as a different product.
 *
 * Picking a pack and paying are two steps on purpose: the pay action leaves
 * the site for ZainCash, so a single mis-click on a card shouldn't redirect.
 */

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BuyCreditsModal({ open, onClose }: BuyCreditsModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const { data: packages, isLoading } = useCreditPackages(open);
  const { data: credits } = useCredits(open);
  const purchase = usePurchaseCredits();

  useEffect(() => {
    if (open) {
      setSelected(null);
      setRedirecting(false);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !redirecting && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, redirecting]);

  // Lock the page behind the modal so the backdrop doesn't scroll with it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /** Cheapest per store — the pack worth pointing at, preselected on open. */
  const bestValueId = useMemo(() => {
    const priced = (packages ?? []).filter((p) => p.generations > 0 && p.price > 0);
    if (priced.length < 2) return null;
    return priced.reduce((best, p) =>
      p.price / p.generations < best.price / best.generations ? p : best,
    ).id;
  }, [packages]);

  useEffect(() => {
    if (!open || selected || !packages?.length) return;
    setSelected(bestValueId ?? packages[0].id);
  }, [open, selected, packages, bestValueId]);

  const selectedPack = packages?.find((p) => p.id === selected) ?? null;

  const handleBuy = async () => {
    if (!selectedPack) return;
    try {
      const returnBaseUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;
      const data = await purchase.mutateAsync({
        packId: selectedPack.id,
        returnBaseUrl,
      });
      if (data.redirectUrl) {
        setRedirecting(true);
        window.location.href = data.redirectUrl;
      } else {
        toast.error("لم يتم استلام رابط الدفع");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "تعذر بدء عملية الدفع");
    }
  };

  if (!open) return null;

  const remainingGenerations =
    (credits?.generations?.remaining ?? 0) + (credits?.generations?.purchased ?? 0);
  const remainingEditor = credits?.editor?.remaining ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm animate-[modal-fade_160ms_ease-out]"
      onClick={(e) => e.target === e.currentTarget && !redirecting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-credits-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#1e1b4b] shadow-2xl animate-[modal-rise_200ms_ease-out]"
      >
        {/* Brand glow behind the header, same cue as the hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 inset-x-0 mx-auto h-48 w-72 rounded-full bg-[#00c8ff]/20 blur-3xl"
        />

        <button
          type="button"
          onClick={onClose}
          disabled={redirecting}
          aria-label="إغلاق"
          className="absolute start-4 top-4 z-10 text-white/40 transition-colors hover:text-white/80 disabled:opacity-30"
        >
          <X size={20} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00c8ff]/10">
              <Sparkles size={28} className="text-[#00c8ff]" />
            </div>
            <h2 id="buy-credits-title" className="text-xl font-bold text-white">
              اشحن رصيد الذكاء الاصطناعي
            </h2>
            <p className="mt-2 text-sm text-white/50">
              اختر الباقة وادفع عبر زين كاش — يُضاف الرصيد فوراً
            </p>

            {credits && !credits.unlimited && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
                رصيدك الحالي: {remainingGenerations} متجر · {remainingEditor} تعديل
              </p>
            )}
          </div>

          {redirecting ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 size={32} className="animate-spin text-[#00c8ff]" />
              <p className="text-sm text-white/60">جاري توجيهك إلى بوابة زين كاش...</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="جاري تحميل الباقات">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[76px] animate-pulse rounded-xl border border-white/5 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : !packages?.length ? (
            <p className="py-10 text-center text-sm text-white/50">
              لا توجد باقات متاحة حالياً. حاول لاحقاً.
            </p>
          ) : (
            <>
              <div role="radiogroup" aria-labelledby="buy-credits-title" className="space-y-3">
                {packages.map((pack) => {
                  const isSelected = selected === pack.id;
                  return (
                    <button
                      key={pack.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={purchase.isPending}
                      onClick={() => setSelected(pack.id)}
                      className={`group relative flex w-full items-center gap-4 rounded-xl border p-4 text-start transition-all disabled:opacity-50 ${
                        isSelected
                          ? "border-[#00c8ff]/60 bg-[#00c8ff]/[0.07] shadow-[0_0_24px_rgba(0,200,255,0.12)]"
                          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-[#00c8ff] bg-[#00c8ff] text-[#1e1b4b]"
                            : "border-white/25 text-transparent"
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Wraps rather than truncates: pack names are long in
                            Arabic and the badge would eat them on mobile. */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-white">{pack.name}</span>
                          {pack.id === bestValueId && (
                            <span className="shrink-0 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 px-2 py-0.5 text-[10px] text-[#00c8ff]">
                              الأفضل قيمة
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
                          {pack.generations > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Store size={13} />
                              {pack.generations} متجر
                            </span>
                          )}
                          {pack.editor > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <PenLine size={13} />
                              {pack.editor} تعديل
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amounts are latin-digit + latin-code pairs, so they get
                          their own LTR run rather than being reordered by bidi. */}
                      <div dir="ltr" className="shrink-0 text-left">
                        <div
                          className={`text-lg font-bold transition-colors ${
                            isSelected ? "text-[#00c8ff]" : "text-white"
                          }`}
                        >
                          {pack.price.toLocaleString()}{" "}
                          <span className="text-[11px] font-normal text-white/45">
                            {pack.currency}
                          </span>
                        </div>
                        {pack.generations > 0 && pack.price > 0 && (
                          <div className="mt-0.5 text-[11px] text-white/35">
                            {Math.round(pack.price / pack.generations).toLocaleString()}{" "}
                            {pack.currency} / متجر
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleBuy}
                disabled={!selectedPack || purchase.isPending}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#00c8ff] py-3 font-medium text-white shadow-[0_0_30px_rgba(0,200,255,0.35)] transition-colors hover:bg-[#33d4ff] disabled:opacity-40 disabled:shadow-none"
              >
                {purchase.isPending && <Loader2 size={16} className="animate-spin" />}
                {selectedPack ? (
                  <>
                    ادفع عبر زين كاش —
                    <span dir="ltr">
                      {selectedPack.price.toLocaleString()} {selectedPack.currency}
                    </span>
                  </>
                ) : (
                  "اختر باقة للمتابعة"
                )}
              </button>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/35">
                <ShieldCheck size={13} />
                دفع آمن عبر زين كاش — يُضاف الرصيد تلقائياً بعد إتمام الدفع
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
