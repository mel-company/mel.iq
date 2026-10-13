import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "@/components/icons";
import { useBillingProviders } from "@/api/wrappers/platform-payment.wrapper";
import type {
  BillingProvider,
  PlatformPaymentProvider,
} from "@/api/endpoints/platform-payment.endpoint";

/**
 * Arabic titles, keyed by gateway — and nothing else.
 *
 * This list used to be the source of *which* gateways exist, which made it a
 * second answer to a question the server already had: the operator's
 * platform-billing switch decides whether a gateway may bill, and nothing
 * here could see it. A gateway switched off was still drawn as a button, and
 * the buyer discovered it by being refused after choosing it. The server
 * sends the list now; this is only how each one reads in Arabic.
 *
 * A gateway with no entry falls back to the brand name the server sent, so
 * adding one to the platform does not need a landing-page release.
 */
const PROVIDER_TITLES: Record<string, string> = {
  ZAIN_CASH: "زين كاش",
  QI_CARD: "كي كارد",
};

/**
 * The same logos the server sends as `logoUrl`, for the fallback list drawn
 * when that list could not be loaded, and for a gateway whose `logoUrl`
 * comes back empty.
 */
export const PROVIDER_LOGOS: Record<string, string> = {
  ZAIN_CASH: "https://cdn.mel.iq/logos/zaincash.png",
  QI_CARD: "https://cdn.mel.iq/logos/qi-card.png",
};

/** A gateway's logo tile. Draws nothing when the image will not load. */
export function PaymentProviderLogo({
  src,
  className = "size-10 rounded-xl",
}: {
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 object-cover ${className}`}
    />
  );
}

export function paymentProviderLabel(
  provider: PlatformPaymentProvider | null | undefined,
) {
  return (provider && PROVIDER_TITLES[provider]) || "الدفع";
}

type PaymentProviderPickerProps = {
  value: PlatformPaymentProvider | null;
  /**
   * Takes `null`, because the picker clears a selection it can no longer
   * honour — a gateway the operator withdrew between this screen opening and
   * the buyer paying.
   */
  onChange: (provider: PlatformPaymentProvider | null) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
  /**
   * `grid` draws every gateway as a card; `select` draws the chosen one as a
   * single row that opens a list of the others, for a dialog that is already
   * tall. `select` is drawn for dark surfaces only.
   */
  layout?: "grid" | "select";
};

export default function PaymentProviderPicker({
  value,
  onChange,
  disabled,
  variant = "light",
  layout = "grid",
}: PaymentProviderPickerProps) {
  const isDark = variant === "dark";
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close the list on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  const { data, isLoading, isError } = useBillingProviders();

  /**
   * What to draw when the list cannot be loaded, and why it is not "nothing".
   *
   * An empty picker tells a buyer holding a card that the platform accepts no
   * payment at all, and there is nothing they can do about it. A network blip
   * must not cost the sale, so a failed load falls back to the gateways this
   * build knows about and lets the server be the judge: it refuses a
   * withdrawn gateway with a readable reason, which is the behaviour this
   * whole change is replacing — but only here, in the one case where the
   * better answer is unavailable rather than merely unfetched.
   */
  const providers = useMemo<BillingProvider[] | undefined>(() => {
    if (data) return data;
    if (!isError) return undefined;
    return Object.entries(PROVIDER_TITLES).map(([provider, name], index) => ({
      provider: provider as PlatformPaymentProvider,
      name,
      logoUrl: PROVIDER_LOGOS[provider] ?? "",
      recommended: index === 0,
    }));
  }, [data, isError]);

  /**
   * Keep the selection inside what the platform will actually accept.
   *
   * Nothing chosen, or something chosen that is no longer offered, becomes
   * the server's own recommendation — the gateway an omitted `provider` would
   * have resolved to — or the first on offer when the recommended one has
   * itself been withdrawn. An empty list clears the selection, which is what
   * disables the pay button upstream rather than letting a buyer submit into
   * a refusal.
   */
  useEffect(() => {
    if (!providers) return;

    if (providers.length === 0) {
      if (value !== null) onChange(null);
      return;
    }

    if (!value || !providers.some((option) => option.provider === value)) {
      const fallback =
        providers.find((option) => option.recommended) ?? providers[0];
      onChange(fallback.provider);
    }
  }, [providers, value, onChange]);

  const heading = (
    <p
      className={`mb-2.5 text-[13px] font-bold ${
        isDark ? "text-white/70" : "text-[#5b6178] dark:text-muted"
      }`}
    >
      طريقة الدفع
    </p>
  );

  if (isLoading) {
    return (
      <div>
        {heading}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((key) => (
            <div
              key={key}
              className={`h-[74px] animate-pulse rounded-2xl ${
                isDark
                  ? "bg-white/[0.06]"
                  : "bg-black/[0.04] dark:bg-white/[0.04]"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Reached only when the server really answered with an empty list — a
  // failed load falls back above. Said plainly rather than left as an empty
  // row: the buyer has done nothing wrong and nothing here is theirs to fix,
  // so it names who can.
  if (!providers || providers.length === 0) {
    return (
      <div>
        {heading}
        <p
          className={`rounded-2xl border border-dashed p-4 text-sm ${
            isDark
              ? "border-white/15 text-white/60"
              : "border-black/10 text-[#5b6178] dark:border-white/10 dark:text-muted"
          }`}
        >
          لا تتوفر حالياً أي بوابة دفع. تواصل معنا لإتمام العملية.
        </p>
      </div>
    );
  }

  if (layout === "select") {
    const current =
      providers.find((option) => option.provider === value) ?? providers[0];
    const others = providers.length > 1;
    const row = (option: BillingProvider) => (
      <>
        <PaymentProviderLogo
          src={option.logoUrl || PROVIDER_LOGOS[option.provider]}
          className="size-11 rounded-xl"
        />
        <span className="min-w-0 flex-1 text-right">
          <span className="block text-[15px] font-bold text-white">
            {PROVIDER_TITLES[option.provider] ?? option.name}
          </span>
          <span className="mt-0.5 block text-xs text-white/50">
            {option.name}
          </span>
        </span>
      </>
    );

    return (
      <div ref={selectRef} className="relative">
        <p className="mb-2.5 text-sm font-bold text-white/85">طريقة الدفع</p>
        <button
          type="button"
          disabled={disabled || !others}
          onClick={() => setOpen((was) => !was)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#00c8ff]/70 bg-white/[0.03] px-4 py-3 shadow-[0_0_18px_rgba(0,200,255,0.12)] transition-colors hover:bg-white/[0.06] disabled:cursor-default disabled:hover:bg-white/[0.03]"
        >
          {row(current)}
          {others && (
            <ChevronDown
              size={20}
              className={`shrink-0 text-white/60 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </button>

        {open && (
          <ul
            role="listbox"
            aria-label="طريقة الدفع"
            className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-[#101a3d] p-1.5 shadow-2xl"
          >
            {providers.map((option) => {
              const selected = option.provider === current.provider;
              return (
                <li key={option.provider}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.provider);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                      selected ? "bg-[#00c8ff]/10" : "hover:bg-white/[0.06]"
                    }`}
                  >
                    {row(option)}
                    {selected && (
                      <Check size={16} className="shrink-0 text-[#00c8ff]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div
        className={`grid gap-3 ${
          providers.length === 1 ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {providers.map((option) => {
          const selected = value === option.provider;
          return (
            <button
              key={option.provider}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.provider)}
              aria-pressed={selected}
              className={`flex items-center gap-3 rounded-2xl p-4 text-right transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isDark ? "border-2" : "border"
              } ${
                selected
                  ? isDark
                    ? "border-[#00c8ff] bg-[#00c8ff]/10"
                    : "border-brand-indigo/55 bg-brand-indigo/8 dark:border-brand-primary/45 dark:bg-brand-primary/8"
                  : isDark
                    ? "border-white/10 bg-white/[0.04] hover:border-white/20"
                    : "border-black/8 bg-black/[0.02] hover:border-brand-indigo/30 dark:border-white/8 dark:bg-white/[0.02] dark:hover:border-white/20"
              }`}
            >
              <PaymentProviderLogo
                src={option.logoUrl || PROVIDER_LOGOS[option.provider]}
              />
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold ${
                    isDark ? "text-white" : "text-[#0b1020] dark:text-frost"
                  }`}
                >
                  {PROVIDER_TITLES[option.provider] ?? option.name}
                </span>
                <span
                  className={`mt-0.5 block text-xs ${
                    isDark ? "text-white/45" : "text-[#8a90a8] dark:text-dim"
                  }`}
                >
                  {option.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
