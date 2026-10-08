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
  priceLabel: "/شهرياً",
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
  className = "",
}: {
  plan: PlanCardModel;
  delay?: number;
  className?: string;
}) {
  const href = plan.href ?? (plan.contactOnly ? "/contact" : "/checkout");
  const ctaLabel = plan.contactOnly ? "تواصل معنا" : "ابدأ الآن";

  return (
    <div
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={`${className} ${
        plan.featured
          ? // A thick gradient frame: the wash is the element's own background
            // and the near-black ground is inset over it. Taller than its
            // neighbours, which sit level with its foot.
            "card-hover relative flex flex-col rounded-3xl bg-gradient-to-b from-[#463bbf] via-[#9c96e3] to-[#463bbf] p-1 lg:min-h-[810px]"
          : // The side cards' 1px frame runs dark at the edges and lilac at
            // the middle.
            "card-hover relative flex flex-col rounded-3xl bg-gradient-to-r from-[#1b1841] via-[#a68cf0] to-[#1b1841] p-px lg:min-h-[713px]"
      }`}
    >
      <div
        className={`flex flex-1 flex-col gap-12 rounded-[20px] bg-[#06051e] px-8 pt-8 ${
          plan.featured ? "pb-10" : "pb-8"
        }`}
      >
        <div className="flex flex-col gap-6 text-right">
          <h3 className="text-4xl font-bold text-frost lg:text-5xl">
            {plan.name}
          </h3>
          {plan.blurb ? (
            <p className="text-sm leading-7 text-[#cac9d1]">{plan.blurb}</p>
          ) : null}
          <div
            className={`h-px w-full bg-gradient-to-l from-[#0c0f26] to-[#0c0f26] ${
              plan.featured ? "via-[#3f48d9]" : "via-[#9262ad]"
            }`}
          />
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

        {/* Pushed to the card's foot so the prices line up even though the
            blurbs and lists above them run to different heights. */}
        <div className="mt-auto flex flex-col items-end gap-12">
          <p className="flex items-end gap-1 whitespace-nowrap">
            <span className="text-4xl font-medium tracking-[-0.03em] text-frost lg:text-5xl lg:leading-[56px]">
              {plan.price ? `${plan.price} د.ع` : plan.priceLabel}
            </span>
            {plan.price && (
              <span className="text-base leading-6 text-[#73799b]">
                {plan.priceLabel}
              </span>
            )}
          </p>

          {plan.comingSoon ? (
            // Nothing to buy yet. The spacer keeps its price level with the
            // cards beside it, whose buttons sit where this one would.
            <span aria-hidden className="hidden h-[44px] lg:block" />
          ) : (
            <Link
              to={href}
              className={
                plan.featured
                  ? "relative inline-flex items-center rounded-full bg-gradient-to-b from-[#343754]/60 via-[#aab1ec]/60 to-[#343754]/60 p-px shadow-[0_0_16px_rgba(52,92,232,0.6)] transition-shadow hover:shadow-[0_0_24px_rgba(52,92,232,0.85)]"
                  : "relative inline-flex items-center rounded-full bg-gradient-to-b from-[#4d4d4d] via-white to-transparent p-px shadow-[0_0_16px_rgba(57,115,233,0.25)] transition-opacity hover:opacity-90"
              }
            >
              <span
                className={`flex items-center gap-[13px] rounded-full px-7 py-2.5 text-base leading-6 text-frost ${
                  plan.featured
                    ? "bg-gradient-to-l from-[#4f60f9] to-[#7569ff]"
                    : "bg-[#00031c]"
                }`}
              >
                {ctaLabel}
                <ArrowUpLeft size={13} />
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

  const basic: PlanCardModel = basicRow
    ? {
        ...BASIC_PLAN,
        href: `/checkout?planId=${encodeURIComponent(String(basicRow.id))}`,
      }
    : BASIC_PLAN;
  const [professional, enterprise] = UPCOMING_PLANS;
  // Stacked on phones, Basic, the plan on sale, comes first. On desktop it
  // takes the raised centre column, with Enterprise to its right (the first
  // column in RTL) and Professional to its left.
  const ordered: { plan: PlanCardModel; column: string }[] = [
    { plan: basic, column: "lg:col-start-2" },
    { plan: enterprise, column: "lg:col-start-1" },
    { plan: professional, column: "lg:col-start-3" },
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

        <div className="grid w-full max-w-[1240px] gap-6 lg:grid-cols-3 lg:items-end lg:gap-3">
          {ordered.map(({ plan, column }, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              delay={i * 120}
              className={`${column} lg:row-start-1`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
