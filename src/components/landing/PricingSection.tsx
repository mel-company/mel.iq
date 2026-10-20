import { ArrowUpLeft } from "../icons";
import { useState } from "react";
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
  /** The undiscounted price, struck through beside `price`. */
  listPrice?: string;
  /** One line stating the intro offer, under the price. */
  offer?: string;
  ctaLabel?: string;
};

/** The intro offer as the plans API reports it under `pricing.monthly.intro`. */
type IntroOffer = {
  enabled: boolean;
  freeMonths: number;
  discountMonths: number;
  discountPercent: number;
};

type Period = "MONTHLY" | "QUARTERLY" | "YEARLY";

const PERIODS: { value: Period; label: string; months: number }[] = [
  { value: "MONTHLY", label: "شهري", months: 1 },
  { value: "QUARTERLY", label: "3 أشهر", months: 3 },
  { value: "YEARLY", label: "سنوي", months: 12 },
];

/**
 * Each plan as it is sold, for a database that does not carry the row yet
 * (the Basic row arrives with the Basic/Grow migration) or a field the row
 * leaves out. A row from `GET /plan` overrides every number here, so a price
 * or cap edited in the owner dashboard reaches the card.
 */
const CATALOGUE = {
  BASIC: {
    monthly: 19_000,
    quarterlyPercent: 10,
    yearlyPercent: 25,
    intro: { enabled: true, freeMonths: 1, discountMonths: 0, discountPercent: 0 },
  },
  PLUS: {
    monthly: 39_000,
    quarterlyPercent: 10,
    yearlyPercent: 25,
    intro: { enabled: true, freeMonths: 0, discountMonths: 3, discountPercent: 50 },
  },
} as const;

const formatIqd = (amount: number) => amount.toLocaleString("en-IQ");

function monthsLabel(n: number) {
  if (n === 1) return "شهر";
  if (n === 2) return "شهرين";
  if (n <= 10) return `${n} أشهر`;
  return `${n} شهراً`;
}

function readIntro(row: any, fallback: IntroOffer): IntroOffer {
  const intro = row?.pricing?.monthly?.intro;
  if (!intro || typeof intro !== "object") return fallback;
  return {
    enabled: intro.enabled !== false,
    freeMonths: Number(intro.freeMonths) || 0,
    discountMonths: Number(intro.discountMonths) || 0,
    discountPercent: Number(intro.discountPercent) || 0,
  };
}

const capLine = (
  limit: unknown,
  fallback: number | null,
  capped: (n: number) => string,
  unlimited: string,
) => {
  const value =
    limit === undefined ? fallback : typeof limit === "number" ? limit : null;
  return value === null ? unlimited : capped(value);
};

/** What a plan includes, from its row's columns when there is one. */
function planFeatures(code: "BASIC" | "PLUS", row: any): string[] {
  const basic = code === "BASIC";
  const lines = [
    capLine(row?.max_products, basic ? 50 : null, (n) => `حتى ${n} منتج`, "منتجات بلا حدود"),
    capLine(
      row?.max_categories,
      basic ? 10 : null,
      (n) =>
        `حتى ${n} أقسام و${row?.max_category_groups ?? 5} مجموعات أقسام`,
      "أقسام ومجموعات أقسام بلا حدود",
    ),
    capLine(row?.max_monthly_orders, basic ? 50 : null, (n) => `${n} طلب شهرياً`, "طلبات بلا حدود"),
    capLine(row?.max_coupons, basic ? 5 : null, (n) => `${n} كوبونات خصم`, "كوبونات بلا حدود"),
  ];
  const storeCredits = Number(row?.ai_store_credits ?? (basic ? 0 : 3));
  lines.push(
    storeCredits > 0
      ? `${storeCredits} متاجر بالذكاء الاصطناعي شهرياً`
      : "تجربة مجانية لإنشاء متجر بالذكاء الاصطناعي",
  );
  const hasAgent = row?.has_ai_editor ?? !basic;
  lines.push(
    hasAgent
      ? `${row?.ai_editor_credits ?? 20} رصيد شهرياً لمساعد المحرر الذكي`
      : `تجربة مساعد المحرر الذكي (${row?.ai_editor_trial ?? 5} رسائل)`,
  );
  if (row?.has_social_pixels ?? !basic) lines.push("بكسلات الإعلانات: ميتا، تيك توك، سناب");
  if (row?.has_custom_domain ?? !basic) lines.push("ربط نطاقك الخاص (yourstore.com)");
  lines.push("محرر المتجر وربط شركات الشحن");
  return lines;
}

/**
 * A plan's card for the chosen billing period.
 *
 * Monthly shows the intro offer (Basic's free month, Grow's 50% for three
 * months). Three months and a year show their own discount on the period's
 * total. The two never stack: checkout charges whichever is cheaper, which for
 * a new customer can be the intro.
 */
function priceCard(
  base: PlanCardModel,
  code: "BASIC" | "PLUS",
  row: any,
  period: Period,
): PlanCardModel {
  const fallback = CATALOGUE[code];
  const monthly =
    Number(row?.monthly_price) > 0 ? Number(row.monthly_price) : fallback.monthly;

  if (period !== "MONTHLY") {
    const months = period === "YEARLY" ? 12 : 3;
    const percent = Number(
      period === "YEARLY"
        ? row?.pricing?.yearly?.discountPercent ?? fallback.yearlyPercent
        : row?.pricing?.quarterly?.discountPercent ?? fallback.quarterlyPercent,
    );
    const list = monthly * months;
    const price =
      period === "YEARLY" && Number(row?.pricing?.yearly?.price) > 0
        ? Number(row.pricing.yearly.price)
        : period === "QUARTERLY" && Number(row?.pricing?.quarterly?.price) > 0
          ? Number(row.pricing.quarterly.price)
          : Math.round((list * (100 - percent)) / 100);
    return {
      ...base,
      price: formatIqd(price),
      priceLabel: period === "YEARLY" ? "/سنوياً" : "/3 أشهر",
      listPrice: percent > 0 ? formatIqd(list) : undefined,
      offer:
        percent > 0
          ? `وفّر ${percent}%: ${formatIqd(Math.round(price / months))} د.ع للشهر.`
          : undefined,
    };
  }

  const intro = readIntro(row, fallback.intro);
  const card = { ...base, price: formatIqd(monthly), priceLabel: "/شهرياً" };
  if (!intro.enabled) return card;
  const hasFree = intro.freeMonths > 0;
  const hasDiscount = intro.discountMonths > 0 && intro.discountPercent > 0;
  const discounted = Math.round((monthly * (100 - intro.discountPercent)) / 100);

  const parts: string[] = [];
  if (hasFree) {
    parts.push(
      intro.freeMonths === 1
        ? "الشهر الأول مجاناً"
        : `أول ${monthsLabel(intro.freeMonths)} مجاناً`,
    );
  }
  if (hasDiscount) {
    parts.push(
      `خصم ${intro.discountPercent}% لأول ${monthsLabel(intro.discountMonths)}`,
    );
  }

  return {
    ...card,
    ...(hasDiscount && !hasFree
      ? { price: formatIqd(discounted), listPrice: formatIqd(monthly) }
      : {}),
    offer: parts.length ? `${parts.join("، ثم ")}.` : undefined,
    ctaLabel: hasFree ? "ابدأ مجاناً" : undefined,
  };
}

const BASIC_PLAN: PlanCardModel = {
  id: "basic",
  name: "أساسي",
  blurb: "لتبدأ البيع: متجرك ومحرره وربط الشحن، مع تجربة مجانية للذكاء الاصطناعي.",
  features: [],
  price: null,
  priceLabel: "/شهرياً",
};

const GROW_PLAN: PlanCardModel = {
  id: "grow",
  name: "نمو",
  blurb: "للمتجر الذي يكبر: بلا حدود، مع الذكاء الاصطناعي والإعلانات ونطاقك الخاص.",
  features: [],
  price: null,
  priceLabel: "/شهرياً",
  featured: true,
};

/** Not on sale: described here, with a contact button. */
const ENTERPRISE_PLAN: PlanCardModel = {
  id: "enterprise",
  name: "مؤسسي",
  blurb: "للمشاريع الكبيرة والسلاسل متعددة الفروع بمتطلبات متقدمة.",
  features: [
    "كل مميزات نمو",
    "كود مخصص",
    "ربط عبر واجهة API",
    "ربط أنظمة ERP",
    "تكاملات مخصصة حسب الطلب",
  ],
  price: null,
  priceLabel: "اتصل بنا",
  contactOnly: true,
};

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
  const ctaLabel =
    plan.ctaLabel ?? (plan.contactOnly ? "تواصل معنا" : "ابدأ الآن");

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
          <div className="flex flex-col items-end gap-3">
            {plan.listPrice && (
              <span className="text-lg leading-6 text-[#73799b] line-through decoration-[#73799b]/70">
                {plan.listPrice} د.ع
              </span>
            )}
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
            {plan.offer && (
              <p className="text-right text-sm leading-6 text-[#9c96e3]">
                {plan.offer}
              </p>
            )}
          </div>

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
 * Landing pricing: Basic and Grow, the two plans on sale, with Enterprise
 * beside them, and a monthly / 3 months / yearly switch. `GET /plan` supplies
 * each plan's id (so checkout opens with it preselected), price, offer and
 * caps; the catalogue above stands in for a row that is not there.
 */
function PricingSection() {
  const { data } = useFetchAllPlans();
  const [period, setPeriod] = useState<Period>("MONTHLY");

  const raw = Array.isArray(data)
    ? data
    : (data as any)?.data || (data as any)?.plans || [];
  const rowFor = (code: string) =>
    Array.isArray(raw)
      ? raw.find(
          (plan: any) =>
            plan?.enabled !== false &&
            String(plan?.code || "").toUpperCase() === code,
        )
      : undefined;
  const basicRow = rowFor("BASIC");
  const growRow = rowFor("PLUS");

  const checkoutHref = (row: any) =>
    row
      ? `/checkout?planId=${encodeURIComponent(String(row.id))}&period=${period}`
      : `/checkout?period=${period}`;

  const basic = priceCard(
    {
      ...BASIC_PLAN,
      name: basicRow?.name || BASIC_PLAN.name,
      features: planFeatures("BASIC", basicRow),
      href: checkoutHref(basicRow),
    },
    "BASIC",
    basicRow,
    period,
  );
  const grow = priceCard(
    {
      ...GROW_PLAN,
      name: growRow?.name || GROW_PLAN.name,
      features: planFeatures("PLUS", growRow),
      href: checkoutHref(growRow),
    },
    "PLUS",
    growRow,
    period,
  );
  // Stacked on phones, Grow, the featured plan, comes first. On desktop it
  // takes the raised centre column, with Basic to its right (the first column
  // in RTL) and Enterprise to its left.
  const ordered: { plan: PlanCardModel; column: string }[] = [
    { plan: grow, column: "lg:col-start-2" },
    { plan: basic, column: "lg:col-start-1" },
    { plan: ENTERPRISE_PLAN, column: "lg:col-start-3" },
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
            ابدأ بالأساسية بشهر مجاني، أو انطلق مع نمو بخصم 50% لأول 3 أشهر.
            وفّر 10% عند الاشتراك لـ 3 أشهر و25% عند الاشتراك السنوي.
          </p>
          <div
            role="tablist"
            aria-label="مدة الاشتراك"
            className="flex rounded-full bg-[#131331] p-1"
          >
            {PERIODS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={period === option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded-full px-5 py-2 text-sm transition-colors ${
                  period === option.value
                    ? "bg-gradient-to-l from-[#4f60f9] to-[#7569ff] text-frost"
                    : "text-[#9c96e3] hover:text-frost"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
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
