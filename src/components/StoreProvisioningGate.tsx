import { Loader2, ShieldCheck, Globe, CheckCircle2 } from "lucide-react";
import type { DashboardReadyStatus } from "@/hooks/useWaitForDashboardReady";

type Props = {
  open: boolean;
  domain?: string | null;
  lastStatus?: DashboardReadyStatus | null;
  timedOut?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onContinueAnyway?: () => void;
};

/**
 * Full-screen gate while Cloudflare DNS + Total TLS finish for a new store.
 */
export default function StoreProvisioningGate({
  open,
  domain,
  lastStatus,
  timedOut = false,
  error = null,
  onRetry,
  onContinueAnyway,
}: Props) {
  if (!open) return null;

  const dnsDone = Boolean(lastStatus?.dnsOk);
  const tlsDone = Boolean(lastStatus?.tlsOk);
  const ready = Boolean(lastStatus?.ready);

  const steps = [
    {
      key: "dns",
      label: "إعداد النطاق",
      done: dnsDone || ready,
      icon: Globe,
    },
    {
      key: "tls",
      label: "إنشاء شهادة الأمان",
      done: tlsDone || ready,
      icon: ShieldCheck,
    },
    {
      key: "ready",
      label: "المتجر جاهز",
      done: ready,
      icon: CheckCircle2,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-provisioning-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 text-center shadow-2xl dark:bg-gray-900">
        {!timedOut ? (
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-violet-600 dark:text-violet-400" />
          </div>
        ) : (
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <ShieldCheck className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        <h2
          id="store-provisioning-title"
          className="mb-2 text-xl font-bold text-gray-900 dark:text-white"
        >
          {timedOut ? "التجهيز يأخذ وقتاً أطول من المعتاد" : "جاري تجهيز متجرك"}
        </h2>

        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {timedOut
            ? "شهادة الأمان أو النطاق لم يصبحا جاهزين بعد. يمكنك المحاولة مرة أخرى أو المتابعة على أي حال."
            : "ننشئ شهادة الأمان والنطاق… قد يستغرق دقيقة أو دقيقتين. يُفضّل الانتظار حتى اكتمال التجهيز."}
        </p>

        {domain && (
          <p
            dir="ltr"
            className="mb-6 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          >
            dash.{domain}.mel.iq
          </p>
        )}

        <ul className="mb-6 space-y-3 text-right">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-800"
              >
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Icon
                    className={`h-4 w-4 ${
                      step.done
                        ? "text-emerald-500"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  />
                  {step.label}
                </span>
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                )}
              </li>
            );
          })}
        </ul>

        {error && !timedOut && (
          <p className="mb-4 text-xs text-amber-600 dark:text-amber-400">
            {error} — نعيد المحاولة تلقائياً
          </p>
        )}

        {timedOut && (
          <div className="flex flex-col gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                المحاولة مرة أخرى
              </button>
            )}
            {onContinueAnyway && (
              <button
                type="button"
                onClick={onContinueAnyway}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                المتابعة على أي حال
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
