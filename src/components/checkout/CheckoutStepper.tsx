/**
 * The five-step progress card that heads every checkout step.
 *
 * The frames all label this "الخطوة 1 من 5 / المعلومات" regardless of which
 * step they show — a copy-paste artefact — so the header is driven from the
 * live step instead, which is what a stepper is for.
 */
export type CheckoutStep = { number: number; title: string };

function CheckoutStepper({
  steps,
  currentStep,
}: {
  steps: CheckoutStep[];
  currentStep: number;
}) {
  const active = steps.find((s) => s.number === currentStep);

  return (
    <div className="w-full rounded-3xl bg-ink-raised p-6">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-frost">{active?.title}</h2>
          <p className="text-[13px] font-medium text-muted">
            الخطوة {currentStep} من {steps.length}
          </p>
        </div>

        {/* One bar per step. Rendered in RTL reading order so the first bar to
            fill is the rightmost, next to the step-1 label below it. */}
        <div className="flex items-start gap-1.5" aria-hidden>
          {steps.map((step) => (
            <span
              key={step.number}
              className={`h-1.5 min-w-px flex-1 rounded-full transition-colors ${
                step.number <= currentStep ? "bg-violet" : "bg-white/8"
              }`}
            />
          ))}
        </div>

        <ol className="flex items-start justify-between">
          {steps.map((step) => {
            const done = step.number <= currentStep;
            return (
              <li
                key={step.number}
                className="flex flex-1 items-center justify-end gap-1.5"
                aria-current={step.number === currentStep ? "step" : undefined}
              >
                <span
                  className={`hidden truncate text-xs leading-[18px] sm:inline ${
                    step.number === currentStep
                      ? "font-bold text-frost"
                      : "font-medium text-dim"
                  }`}
                >
                  {step.title}
                </span>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    done
                      ? "bg-violet text-white"
                      : "border border-line text-dim"
                  }`}
                >
                  {step.number}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export default CheckoutStepper;
