import { useEffect, useRef, useState } from "react";
import { Check, Loader2, AlertCircle, Sparkles } from "lucide-react";
import type { FailureCode } from "../../api/endpoints/aiStoreGenerator.endpoints";

/**
 * Live view of a generation run, as a modal.
 *
 * A run is 30-90 seconds, most of it inside a single model call. Without a
 * visible clock and a step plan that silence reads as a crash and people
 * reload — which costs them the run. So this shows three things at once: which
 * stage is active, how many remain, and that time is still passing.
 *
 * The bar is driven by the server's step weights rather than a fake timer, and
 * it never reaches 100% until the run actually finishes.
 */

export interface ProgressEntry {
  message: string;
  done: boolean;
}

export interface PlannedStep {
  key: string;
  label: string;
  weight: number;
}

/**
 * Which mascot belongs to which half of the run.
 *
 * The two phases are genuinely different work and take different lengths of
 * time — deciding the design, then building the store — and a single spinner
 * said neither. Keyed off the phase the composer is already tracking rather
 * than off status text, which is Arabic prose and would break on any rewording.
 */
const MASCOTS = {
  design: {
    src: "/images/bird-design.gif",
    alt: "جاري تصميم المتجر",
  },
  code: {
    src: "/images/bird-code.gif",
    alt: "جاري بناء المتجر",
  },
} as const;

export type GenerationPhase = keyof typeof MASCOTS;

/** Preloads a mascot so it is decoded before the modal that shows it opens. */
export function preloadMascot(phase: GenerationPhase): void {
  const img = new Image();
  img.src = MASCOTS[phase].src;
}

interface GenerationProgressProps {
  open: boolean;
  entries: ProgressEntry[];
  steps: PlannedStep[];
  /** Index of the running step within `steps`. */
  activeStep: number;
  storeName?: string;
  /** Which half of the run is on screen; picks the mascot. */
  phase?: GenerationPhase;
  error?: string | null;
  /** Which kind of failure, so the panel can say what to do about it. */
  errorCode?: FailureCode | null;
  refunded?: boolean;
  onRetry?: () => void;
  onClose?: () => void;
}

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * What the merchant should do about each kind of failure.
 *
 * The panel used to render the raw error and offer "retry" regardless. When
 * the provider had cut us off, that produced a modal quoting our own API key's
 * management url and inviting the merchant to retry into the same wall.
 */
const FAILURE_ADVICE: Record<FailureCode, { title: string; advice?: string; retry: boolean }> = {
  "ai-unavailable": {
    title: "الخدمة غير متاحة مؤقتاً",
    advice: "المشكلة من طرفنا وقد وصلنا إشعار بها. أعد المحاولة بعد قليل.",
    // Retrying into a provider that has cut us off fails identically, and
    // instantly. Offering the button implies it might not.
    retry: false,
  },
  "ai-busy": {
    title: "الخدمة مزدحمة",
    advice: "انتظر لحظات ثم أعد المحاولة.",
    retry: true,
  },
  timeout: {
    title: "انتهت المهلة",
    advice: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: true,
  },
  unknown: { title: "تعذر إنشاء المتجر", retry: true },
};

/** Reassurance that scales with how long they have been waiting. */
function waitingHint(seconds: number): string {
  if (seconds < 20) return "عادةً يستغرق الأمر من 30 إلى 90 ثانية";
  if (seconds < 60) return "ما زلنا نعمل — التصميم هو أطول خطوة";
  if (seconds < 120) return "أوشكنا على الانتهاء، لا تغلق الصفحة";
  return "الأمر يستغرق وقتاً أطول من المعتاد، لكننا ما زلنا نعمل";
}

export default function GenerationProgress({
  open,
  entries,
  steps,
  activeStep,
  storeName,
  phase = "design",
  error,
  errorCode,
  refunded,
  onRetry,
  onClose,
}: GenerationProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      startedAt.current = null;
      setElapsed(0);
      return;
    }
    startedAt.current ??= Date.now();
    const tick = setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [open]);

  if (!open) return null;

  const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0) || 1;
  const completedWeight = steps
    .slice(0, Math.max(0, activeStep))
    .reduce((sum, s) => sum + s.weight, 0);
  // Credit half of the running step, and cap below 100 — the run is not done
  // until the server says so.
  const runningWeight = steps[activeStep]?.weight ?? 0;
  const percent = error
    ? 100
    : Math.min(95, ((completedWeight + runningWeight / 2) / totalWeight) * 100);

  const latest = entries.filter((e) => !e.done).slice(-1)[0] ?? entries.slice(-1)[0];
  const advice = FAILURE_ADVICE[errorCode ?? "unknown"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-progress-title"
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1b4b] p-6 text-right shadow-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <span
            className="font-mono text-sm tabular-nums text-white/40"
            aria-label="الوقت المنقضي"
          >
            {formatElapsed(elapsed)}
          </span>
          <h2
            id="gen-progress-title"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            {error ? "تعذر إنشاء المتجر" : "جاري إنشاء متجرك"}
            {!error && <Sparkles size={16} className="text-[#00c8ff]" />}
          </h2>
        </div>

        {!error && (
          <div className="mb-3 flex justify-center">
            <img
              // Keyed so React swaps the element rather than reusing it: an
              // unkeyed src change leaves the old GIF's last frame on screen
              // until the new one has decoded.
              key={phase}
              src={MASCOTS[phase].src}
              alt={MASCOTS[phase].alt}
              width={150}
              height={150}
              className="h-28 w-auto select-none sm:h-32"
              draggable={false}
            />
          </div>
        )}

        {storeName && !error && (
          <p className="mb-4 text-center text-lg text-white/90">{storeName}</p>
        )}

        {!error && (
          <>
            <div
              className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={Math.round(percent)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[#00c8ff] transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            <ol className="mb-5 space-y-2.5">
              {steps.map((step, index) => {
                const done = index < activeStep;
                const active = index === activeStep;
                return (
                  <li
                    key={step.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {done ? (
                        <Check size={15} className="text-[#00c8ff]" />
                      ) : active ? (
                        <Loader2 size={15} className="animate-spin text-white" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                      )}
                    </span>
                    <span
                      className={
                        done
                          ? "text-white/40"
                          : active
                            ? "font-medium text-white"
                            : "text-white/25"
                      }
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {latest && (
              <p className="mb-2 truncate text-xs text-white/45">
                {latest.message}
              </p>
            )}
            <p className="text-xs text-white/30">{waitingHint(elapsed)}</p>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-right">
            <div className="flex items-start gap-2 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{advice.title}</p>
                <p className="mt-1 text-red-300/85">{error}</p>
                {advice.advice && (
                  <p className="mt-1 text-xs text-red-300/60">{advice.advice}</p>
                )}
                {refunded && (
                  <p className="mt-2 text-xs text-red-300/70">
                    تمت إعادة الرصيد إلى حسابك.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {onRetry && advice.retry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 rounded-full bg-[#00c8ff] py-2 text-sm font-medium text-white transition-colors hover:bg-[#33d4ff]"
                >
                  إعادة المحاولة
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-white/15 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
                >
                  إغلاق
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
