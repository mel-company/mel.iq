import { ArrowUpLeft } from "../icons";
import { Link } from "react-router-dom";
import SectionEyebrow from "./SectionEyebrow";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";

type PlanCardModel = {
  id: string;
  name: string;
  blurb: string;
  features: string[];
  /** `null` when the tier is contact-sales or free with no listed price. */
  price: string | null;
  priceLabel: string;
  featured?: boolean;
  contactOnly?: boolean;
  /** Announced, not on sale: no price and no way to buy it yet. */
  comingSoon?: boolean;
  /** Where the button goes, when it is not the default for the card. */
  href?: string;
};

/**
 * Basic, the plan on sale. Stated here rather than read from `GET /plan` so
 * the section always shows its three tiers, whatever plan rows a database
 * holds; the API only supplies the id checkout should preselect.
 */
const BASIC_PLAN: PlanCardModel = {
  id: "basic",
  name: "أساسي",
  blurb: "كل ما تحتاجه لتبدأ البيع: المحرر والذكاء الاصطناعي والشحن.",
  features: [
    "محرر المتجر",
    "رصيد الذكاء الاصطناعي",
    "منتجات غير محدودة",
    "طلبات غير محدودة",
    "ربط شركات الشحن",
    "تطبيق التاجر للجوال",
  ],
  price: (39_000).toLocaleString("en-IQ"),
  priceLabel: "د.ع /شهرياً",
  featured: true,
};

/**
 * The tiers after Basic. They have no plan rows — there is nothing to charge
 * for yet — so they are described here rather than fetched.
 */
const UPCOMING_PLANS: PlanCardModel[] = [
  {
    id: "professional",
    name: "احترافي",
    blurb: "للمتاجر المتنامية التي تحتاج هوية وأدوات أوسع.",
    features: [
      "كل مميزات الأساسي",
      "ربط نطاق مخصص (yourstore.com)",
      "ربط تصاميم Figma",
      "الدفع الإلكتروني",
    ],
    price: null,
    priceLabel: "قريباً",
    comingSoon: true,
  },
  {
    id: "enterprise",
    name: "مؤسسي",
    blurb: "للمشاريع الكبيرة والسلاسل متعددة الفروع بمتطلبات متقدمة.",
    features: [
      "كل مميزات الاحترافي",
      "كود مخصص",
      "ربط عبر واجهة API",
      "ربط أنظمة ERP",
      "تكاملات مخصصة حسب الطلب",
    ],
    price: null,
    priceLabel: "اتصل بنا",
    contactOnly: true,
  },
];

/** The bullet marker: a dark plate with a small brand dot centred on it. */
function FeatureMarker() {
  return (
    <span
      aria-hidden
      className="flex size-[29px] shrink-0 items-center justify-center rounded-[10px] bg-[#131331]"
    >
      <span className="size-[7px] rounded-full bg-brand-primary" />
    </span>
  );
}

function PlanCard({
  plan,
  delay = 0,
}: {
  plan: PlanCardModel;
  delay?: number;
}) {
  const href = plan.href ?? (plan.contactOnly ? "/contact" : "/checkout");
  const ctaLabel = plan.contactOnly ? "تواصل معنا" : "ابدأ الآن";

  return (
    <div
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={
        plan.featured
          ? // A gradient 1px frame: the wash is the element's own background
            // and the near-black ground is inset a pixel over it.
            "card-hover relative rounded-3xl bg-gradient-to-b from-[#463bbf] via-[#9c96e3] to-[#463bbf] p-px lg:-mt-6"
          : "card-hover relative rounded-3xl border border-hairline hover:border-brand-secondary/30"
      }
    >
      <div
        className={`flex h-full flex-col gap-12 rounded-3xl px-8 pb-10 pt-8 ${
          plan.featured ? "bg-[#06051e]" : "bg-ink-panel"
        }`}
      >
        <div className="flex flex-col gap-6 text-right">
          <h3 className="text-4xl font-bold text-frost lg:text-5xl">
            {plan.name}
          </h3>
          {plan.blurb ? (
            <p className="text-sm leading-7 text-[#cac9d1]">{plan.blurb}</p>
          ) : null}
          <div className="h-px w-full bg-gradient-to-l from-[#0c0f26] via-[#3f48d9] to-[#0c0f26]" />
        </div>

        {plan.features.length > 0 && (
          <ul className="flex flex-col gap-5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-4">
                <span className="flex-1 text-right text-[15px] leading-[1.43] text-frost">
                  {feature}
                </span>
                <FeatureMarker />
              </li>
            ))}
          </ul>
        )}

        {/* Pushed to the card's foot so the three prices line up even though
            the blurbs above them wrap to different heights. */}
        <div className="mt-auto flex flex-col items-end gap-12">
          <p className="flex items-end gap-1">
            <span className="text-4xl font-medium tracking-tight text-frost lg:text-5xl">
              {plan.price ?? plan.priceLabel}
            </span>
            {plan.price && (
              <span className="text-base text-[#73799b]">
                {plan.priceLabel}
              </span>
            )}
          </p>

          {plan.comingSoon ? (
            // Nothing to buy yet. The spacer keeps its price level with the
            // cards beside it, whose buttons sit where this one would.
            <span aria-hidden className="hidden h-[46px] lg:block" />
          ) : (
            <Link
              to={href}
              className={
                plan.featured
                  ? "relative inline-flex items-center gap-3 rounded-full bg-gradient-to-b from-[#343754]/60 via-[#aab1ec]/60 to-[#343754]/60 p-px shadow-[0_0_16px_rgba(52,92,232,0.6)] transition-shadow hover:shadow-[0_0_24px_rgba(52,92,232,0.85)]"
                  : "relative inline-flex items-center gap-3 rounded-full bg-gradient-to-b from-[#4d4d4d]/25 via-white/25 to-transparent p-px transition-opacity hover:opacity-90"
              }
            >
              <span
                className={`flex items-center gap-3 rounded-full px-7 py-2.5 text-base text-frost ${
                  plan.featured
                    ? "bg-gradient-to-l from-brand-violet to-brand-indigo"
                    : "bg-[#00031c]"
                }`}
              >
                {ctaLabel}
                <ArrowUpLeft size={16} />
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Landing pricing: Basic, then the announced Professional and Enterprise
 * tiers. All three are always shown. `GET /plan` is read only for Basic's id
 * (code PLUS), so its button opens checkout with the plan preselected.
 */
function PricingSection() {
  const { data } = useFetchAllPlans();

  const raw = Array.isArray(data)
    ? data
    : (data as any)?.data || (data as any)?.plans || [];
  const basicRow = Array.isArray(raw)
    ? raw.find(
        (plan: any) =>
          plan?.enabled !== false &&
          String(plan?.code || "").toUpperCase() === "PLUS",
      )
    : undefined;

  const ordered: PlanCardModel[] = [
    basicRow
      ? {
          ...BASIC_PLAN,
          href: `/checkout?planId=${encodeURIComponent(String(basicRow.id))}`,
        }
      : BASIC_PLAN,
    ...UPCOMING_PLANS,
  ];

  return (
    <section
      id="pricing"
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute start-1/2 top-40 h-44 w-[338px] -translate-x-1/2 rounded-full bg-[#5834e9]/30 blur-[120px]"
      />

      <div className="relative mx-auto flex max-w-[1296px] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>باقات تناسب حجم متجرك</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg max-w-[1181px] text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            ابدأ بالباقة الأساسية: شهر مجاني ثم 6 أشهر بنصف السعر. الباقة
            الاحترافية قادمة قريباً، وللمؤسسات تواصل معنا.
          </p>
        </div>

        <div className="grid w-full max-w-[1240px] items-stretch gap-6 lg:grid-cols-3">
          {ordered.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
