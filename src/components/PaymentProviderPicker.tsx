import type { PlatformPaymentProvider } from "@/api/endpoints/platform-payment.endpoint";

export const PAYMENT_PROVIDERS: {
  id: PlatformPaymentProvider;
  title: string;
  detail: string;
}[] = [
  { id: "ZAIN_CASH", title: "زين كاش", detail: "ZainCash" },
  { id: "QI_CARD", title: "كي كارد", detail: "Qi Card" },
];

export function paymentProviderLabel(
  provider: PlatformPaymentProvider | null | undefined,
) {
  return (
    PAYMENT_PROVIDERS.find((option) => option.id === provider)?.title || "الدفع"
  );
}

type PaymentProviderPickerProps = {
  value: PlatformPaymentProvider | null;
  onChange: (provider: PlatformPaymentProvider) => void;
  disabled?: boolean;
  variant?: "light" | "dark";
};

export default function PaymentProviderPicker({
  value,
  onChange,
  disabled,
  variant = "light",
}: PaymentProviderPickerProps) {
  const isDark = variant === "dark";

  return (
    <div>
      <p
        className={`mb-2.5 text-[13px] font-bold ${
          isDark ? "text-white/70" : "text-[#5b6178] dark:text-muted"
        }`}
      >
        طريقة الدفع
      </p>
      <div className="grid grid-cols-2 gap-3">
        {PAYMENT_PROVIDERS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`rounded-2xl p-4 text-right transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
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
              <span
                className={`block text-sm font-semibold ${
                  isDark ? "text-white" : "text-[#0b1020] dark:text-frost"
                }`}
              >
                {option.title}
              </span>
              <span
                className={`mt-0.5 block text-xs ${
                  isDark ? "text-white/45" : "text-[#8a90a8] dark:text-dim"
                }`}
              >
                {option.detail}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
