/**
 * Mobile-only progress. Desktop progress lives in CheckoutBrandRail.
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
    <div className="w-full lg:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">{active?.title}</h2>
        <p className="shrink-0 text-[13px] font-medium text-[#7b8cff]">
          الخطوة {currentStep} من {steps.length}
        </p>
      </div>
      <div className="flex items-center gap-1.5" aria-hidden>
        {steps.map((step) => (
          <span
            key={step.number}
            className={`h-1.5 min-w-px flex-1 rounded-full transition-colors ${
              step.number <= currentStep
                ? "bg-gradient-to-l from-[#4f60f9] to-[#00bfff]"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default CheckoutStepper;
