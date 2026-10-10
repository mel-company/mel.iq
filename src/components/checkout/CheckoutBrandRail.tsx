type CheckoutBrandRailProps = {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
};

/**
 * The offer, as the catalogue actually defines it: one free month, then six at
 * half price (`MONTHLY_PROMO` in `plan-catalog.ts`). Eight places across this app
 * advertised a 14-day trial that does not exist — including the FAQ published as
 * JSON-LD, so it was indexed — and the half-price ladder, the larger half of the
 * offer, was advertised nowhere.
 */
const TRUST = [
  {
    title: "شهر أول مجاناً",
    detail: "ثم 6 أشهر بنصف السعر — وألِغ في أي وقت",
  },
  {
    title: "دفع محلي",
    detail: "زين كاش وكي كارد داخل مسار الاشتراك",
  },
  {
    title: "دعم عربي",
    detail: "فريق في العراق يساعدك على الإطلاق",
  },
];

/**
 * Right-hand brand rail from the Mel checkout mockup: mark, pitch,
 * current-step chip, and trust checklist.
 */
function CheckoutBrandRail({
  currentStep,
  totalSteps,
  stepTitle,
}: CheckoutBrandRailProps) {
  return (
    <aside className="hidden w-[380px] shrink-0 self-stretch lg:block xl:w-[420px]">
      <div className="sticky top-8 flex flex-col gap-10 rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-8 text-right shadow-[0_0_60px_rgba(79,96,249,0.12)] backdrop-blur-md xl:p-10">
        {/* Logo row: mark then wordmark (reads toward the outer edge under RTL). */}
        <div className="flex items-center justify-end gap-3.5">
          <div className="flex flex-col text-right">
            <span dir="ltr" className="text-[24px] font-extrabold leading-none tracking-tight text-white">
              mel.iq
            </span>
            <span className="mt-1 text-[13px] text-[#8b92b0]">نظام إدارة المتاجر</span>
          </div>
          <span className="flex size-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)] shadow-[0_0_24px_rgba(0,191,255,0.35)]">
            <img
              src="/images/landing/mel-mark.svg"
              alt=""
              aria-hidden
              width={58}
              height={58}
              className="size-[58px]"
            />
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[34px] font-extrabold leading-[1.2] text-white">
            أطلق متجرك
            <br />
            مع ميل
          </h1>
          <p className="text-[14px] leading-6 text-[#9aa1bd]">
            حساب وتحقق برقم هاتفك، بدون بطاقة دفع — ثم متجرك جاهز للإدارة من لوحة عربية
            ومساعد ذكي.
          </p>
        </div>

        <div className="rounded-2xl border border-[#4f60f9]/45 bg-[#12162c] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(79,96,249,0.15)]">
          <p className="text-[12px] font-semibold text-[#7b8cff]">
            الخطوة {currentStep} من {totalSteps}
          </p>
          <p className="mt-1 text-[15px] font-bold text-white">{stepTitle}</p>
        </div>

        <ul className="flex flex-col gap-4">
          {TRUST.map((item) => (
            <li key={item.title} className="flex items-start justify-end gap-3">
              <span className="flex flex-col text-right">
                <span className="text-[14px] font-bold text-white">{item.title}</span>
                <span className="mt-0.5 text-[12px] leading-5 text-[#8b92b0]">
                  {item.detail}
                </span>
              </span>
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f60f9] to-[#00bfff] text-[11px] font-bold text-white shadow-[0_0_12px_rgba(79,96,249,0.5)]"
              >
                ✓
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default CheckoutBrandRail;
