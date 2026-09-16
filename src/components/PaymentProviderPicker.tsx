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
        className={`mb-2 text-sm font-medium ${
          isDark ? "text-white/70" : "text-gray-700 dark:text-gray-400"
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
              className={`rounded-xl border-2 p-3 text-right transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? isDark
                    ? "border-[#00c8ff] bg-[#00c8ff]/10"
                    : "border-black bg-gray-50 dark:border-white dark:bg-gray-900"
                  : isDark
                    ? "border-white/10 bg-white/[0.04] hover:border-white/20"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  isDark ? "text-white" : "text-black dark:text-white"
                }`}
              >
                {option.title}
              </span>
              <span
                className={`mt-0.5 block text-xs ${
                  isDark ? "text-white/45" : "text-gray-500 dark:text-gray-400"
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
