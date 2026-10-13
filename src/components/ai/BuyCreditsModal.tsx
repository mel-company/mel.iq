import { useEffect, useMemo, useState } from "react";
import ModalPortal from "./ModalPortal";
import { X, Loader2, Sparkles } from "@/components/icons";
import { toast } from "sonner";
import type { PlatformPaymentProvider } from "@/api/endpoints/platform-payment.endpoint";
import PaymentProviderPicker, {
  paymentProviderLabel,
} from "@/components/PaymentProviderPicker";
import {
  useCredits,
  useCreditPackages,
  usePurchaseCredits,
} from "@/api/wrappers/aiStoreGenerator.wrappers";

/**
 * Credit top-up for the AI store generator.
 *
 * Packs are split into two tabs by what they buy: store builds
 * («انشاء القوالب») and editor credits («رصيد المحرر»). A pack that buys
 * both counts as a store pack. The tab bar is hidden when only one kind is
 * on sale.
 *
 * Picking a pack and paying are two steps on purpose: the pay action leaves
 * the site for the payment gateway, so a single mis-click on a card shouldn't redirect.
 */

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

type Pack = {
  id: string;
  name: string;
  generations: number;
  editor: number;
  price: number;
  currency: string;
};

type Tab = "stores" | "editor";

const kindOf = (pack: Pack): Tab =>
  pack.generations > 0 ? "stores" : "editor";

/**
 * Arabic tier names, by a pack's rank within its tab (cheapest first).
 * The server's English pack names stay the fallback for a tab with more
 * packs than tiers.
 */
const TIERS: Record<number, { title: string; hint: string }[]> = {
  1: [{ title: "باقة أساسية", hint: "مناسبة للاستخدام المنتظم" }],
  2: [
    { title: "باقة صغيرة", hint: "مناسبة للتجربة والاستخدام الخفيف" },
    { title: "باقة كبيرة", hint: "مناسبة للشركات والفرق" },
  ],
  3: [
    { title: "باقة صغيرة", hint: "مناسبة للتجربة والاستخدام الخفيف" },
    { title: "باقة متوسطة", hint: "مناسبة للمحترفين" },
    { title: "باقة كبيرة", hint: "مناسبة للشركات والفرق" },
  ],
  4: [
    { title: "باقة صغيرة", hint: "مناسبة للتجربة والاستخدام الخفيف" },
    { title: "باقة أساسية", hint: "مناسبة للاستخدام المنتظم" },
    { title: "باقة متوسطة", hint: "مناسبة للمحترفين" },
    { title: "باقة كبيرة", hint: "مناسبة للشركات والفرق" },
  ],
};

const currencyLabel = (currency: string) =>
  currency?.toUpperCase() === "IQD" ? "د.ع" : currency;

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString("en-US")} ${currencyLabel(currency)}`;

/** "متجر واحد", "متجران", "3 متاجر", "11 متجر". */
function storesLabel(count: number) {
  if (count === 1) return "متجر واحد";
  if (count === 2) return "متجران";
  if (count >= 3 && count <= 10) return `${count} متاجر`;
  return `${count.toLocaleString("en-US")} متجر`;
}

/** What a pack buys, in one short line. */
function packAmount(pack: Pack) {
  const parts: string[] = [];
  if (pack.generations > 0) parts.push(storesLabel(pack.generations));
  if (pack.editor > 0)
    parts.push(`${pack.editor.toLocaleString("en-US")} رصيد للمحرر`);
  return parts.join(" + ");
}

/** A four-point star, for the small twinkles around the header icon. */
function TwinkleStar({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0Z" />
    </svg>
  );
}

function PadlockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
    >
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  editor: "رصيد المحرر",
  stores: "انشاء القوالب",
};

export default function BuyCreditsModal({ open, onClose }: BuyCreditsModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("stores");
  const [provider, setProvider] = useState<PlatformPaymentProvider | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const { data: packages, isLoading } = useCreditPackages(open);
  const { data: credits } = useCredits(open);
  const purchase = usePurchaseCredits();

  useEffect(() => {
    if (open) {
      setSelected(null);
      setTab("stores");
      setProvider(null);
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

  const byTab = useMemo(() => {
    const sorted = [...((packages ?? []) as Pack[])].sort(
      (a, b) => a.price - b.price,
    );
    return {
      stores: sorted.filter((pack) => kindOf(pack) === "stores"),
      editor: sorted.filter((pack) => kindOf(pack) === "editor"),
    };
  }, [packages]);

  const tabs = (["editor", "stores"] as Tab[]).filter(
    (key) => byTab[key].length > 0,
  );
  // Fall back to whichever tab has packs when the default one is empty.
  const activeTab: Tab = byTab[tab].length ? tab : (tabs[0] ?? tab);
  const visible = byTab[activeTab];

  /** Cheapest per unit in a tab — the pack preselected when it opens. */
  const bestValueId = (list: Pack[]) => {
    const units = (pack: Pack) =>
      kindOf(pack) === "stores" ? pack.generations : pack.editor;
    const priced = list.filter((pack) => units(pack) > 0 && pack.price > 0);
    if (!priced.length) return list[0]?.id ?? null;
    return priced.reduce((best, pack) =>
      pack.price / units(pack) < best.price / units(best) ? pack : best,
    ).id;
  };

  useEffect(() => {
    if (!open || !visible.length) return;
    if (selected && visible.some((pack) => pack.id === selected)) return;
    setSelected(bestValueId(visible));
  }, [open, selected, visible]);

  const selectedPack = visible.find((pack) => pack.id === selected) ?? null;

  const handleBuy = async () => {
    if (!selectedPack || !provider) return;
    try {
      const returnBaseUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;
      const data = await purchase.mutateAsync({
        packId: selectedPack.id,
        returnBaseUrl,
        provider,
      });
      if (data.id) {
        sessionStorage.setItem("mel_last_credit_payment_id", String(data.id));
      }
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

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm animate-[modal-fade_160ms_ease-out]"
        onClick={(e) => e.target === e.currentTarget && !redirecting && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="buy-credits-title"
          className="relative flex max-h-full w-full max-w-[34rem] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0a1029] shadow-[0_30px_80px_rgba(0,0,0,0.6)] animate-[modal-rise_200ms_ease-out]"
        >
          {/* Blue glow behind the header. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgba(0,140,255,0.35),transparent)]"
          />

          <button
            type="button"
            onClick={onClose}
            disabled={redirecting}
            aria-label="إغلاق"
            className="absolute end-4 top-4 z-10 flex size-10 items-center justify-center rounded-xl bg-white/[0.07] text-white/70 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-30 sm:end-5 sm:top-5"
          >
            <X size={20} />
          </button>

          <div className="relative overflow-y-auto px-5 pb-6 pt-8 sm:px-8 sm:pb-8">
            <div className="mb-6 text-center">
              <div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[#0e3a6b]/80 shadow-[0_0_40px_rgba(0,160,255,0.35)]">
                <Sparkles size={30} className="text-[#00c8ff]" />
                <TwinkleStar className="absolute -start-8 top-10 size-3 text-[#00a3ff]" />
                <TwinkleStar className="absolute -end-7 top-0 size-3.5 text-[#00a3ff]" />
                <TwinkleStar className="absolute -end-4 top-9 size-2.5 text-[#00a3ff]/80" />
              </div>
              <h2
                id="buy-credits-title"
                className="text-2xl font-extrabold text-white sm:text-[28px]"
              >
                اشحن رصيد الذكاء الاصطناعي
              </h2>
              <p className="mt-2 text-sm text-white/55 sm:text-[15px]">
                استخدم الرصيد لتوليد التصاميم وتعديلها باستخدام الذكاء الاصطناعي.
              </p>
            </div>

            {redirecting ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <Loader2 size={32} className="animate-spin text-[#00c8ff]" />
                <p className="text-sm text-white/60">جاري توجيهك إلى بوابة الدفع...</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="جاري تحميل الباقات">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[84px] animate-pulse rounded-2xl border border-white/5 bg-white/[0.04]"
                  />
                ))}
              </div>
            ) : !visible.length ? (
              <p className="py-10 text-center text-sm text-white/50">
                لا توجد باقات متاحة حالياً. حاول لاحقاً.
              </p>
            ) : (
              <>
                {tabs.length > 1 && (
                  <div
                    role="tablist"
                    aria-label="نوع الرصيد"
                    className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1"
                  >
                    {tabs.map((key) => {
                      const active = key === activeTab;
                      return (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          disabled={purchase.isPending}
                          onClick={() => setTab(key)}
                          className={`rounded-full py-2.5 text-[15px] font-bold transition-all ${
                            active
                              ? "bg-gradient-to-b from-[#1fd0ff] to-[#00a8f0] text-[#04102a] shadow-[0_0_24px_rgba(0,200,255,0.35)]"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          {TAB_LABELS[key]}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div
                  role="radiogroup"
                  aria-label={TAB_LABELS[activeTab]}
                  className="space-y-3"
                >
                  {visible.map((pack, index) => {
                    const isSelected = selected === pack.id;
                    const tier = TIERS[visible.length]?.[index];
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={purchase.isPending}
                        onClick={() => setSelected(pack.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-start transition-all disabled:opacity-50 sm:gap-4 sm:px-5 ${
                          isSelected
                            ? "border-[#00c8ff] bg-gradient-to-l from-[#0b2a55]/80 to-[#0b1a3d]/80 shadow-[0_0_24px_rgba(0,200,255,0.18)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected
                              ? "border-[#00c8ff] bg-[#00c8ff]"
                              : "border-white/35"
                          }`}
                        >
                          {isSelected && (
                            <span className="size-2.5 rounded-full bg-[#04102a]" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-bold text-white sm:text-[17px]">
                            {tier?.title ?? pack.name}
                          </span>
                          {tier && (
                            <span className="mt-1 block text-xs text-white/55 sm:text-[13px]">
                              {tier.hint}
                            </span>
                          )}
                        </span>

                        <span className="shrink-0 text-left">
                          <span
                            className={`block text-lg font-extrabold sm:text-xl ${
                              isSelected ? "text-[#00c8ff]" : "text-white"
                            }`}
                          >
                            {formatMoney(pack.price, pack.currency)}
                          </span>
                          <span className="mt-1 block text-xs text-white/55 sm:text-[13px]">
                            {packAmount(pack)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <PaymentProviderPicker
                    value={provider}
                    onChange={setProvider}
                    disabled={purchase.isPending}
                    variant="dark"
                    layout="select"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={!selectedPack || !provider || purchase.isPending}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#1fd0ff] to-[#00a8f0] py-4 text-base font-bold text-[#04102a] shadow-[0_0_30px_rgba(0,200,255,0.35)] transition-[filter] hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
                >
                  {purchase.isPending && <Loader2 size={18} className="animate-spin" />}
                  {selectedPack && provider ? (
                    <>
                      ادفع عبر {paymentProviderLabel(provider)} —{" "}
                      {formatMoney(selectedPack.price, selectedPack.currency)}
                    </>
                  ) : selectedPack ? (
                    "اختر طريقة الدفع"
                  ) : (
                    "اختر باقة للمتابعة"
                  )}
                </button>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-white/45 sm:text-sm">
                  <PadlockIcon className="size-4" />
                  دفع آمن وسهل عبر وسائل الدفع المتاحة
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
