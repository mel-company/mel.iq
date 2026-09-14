import { ArrowUpLeft } from "../icons";
import { Link } from "react-router-dom";
import SectionEyebrow from "./SectionEyebrow";

type Plan = {
  name: string;
  blurb: string;
  features: string[];
  /** `null` on the enterprise tier, where the price is a conversation. */
  price: string | null;
  priceLabel: string;
  /** The middle tier is raised and carries the gradient border and button. */
  featured?: boolean;
};

/** In RTL reading order. The frame runs أساسي / أحترافي / مؤسسي left to
 *  right, so the cheapest tier is listed last and lands on the left. */
const PLANS: Plan[] = [
  {
    name: "مؤسسي",
    blurb: "للشركات الكبيرة والسلاسل متعددة الفروع بمتطلبات متقدمة.",
    features: [
      "كل مميزات الاحتراف",
      "وصول كامل لواجهة API",
      "فروع ومستخدمون متعددون",
      "تكاملات مخصصة حسب الطلب",
      "مدير حساب مخصص",
      "اتفاقية مستوى خدمة (SLA)",
    ],
    price: null,
    priceLabel: "اتصل بنا",
  },
  {
    name: "أحترافي",
    blurb: "للمشاريع المتنامية التي تحتاج أدوات تسويق وتحليلات كاملة.",
    features: [
      "كل مميزات الأساسي + نطاق مخصص",
      "لوحة تحليلات وإحصائيات متقدمة",
      "إدارة المخزون ونقطة بيع (POS)",
      "تكامل بوابات الدفع ومزودي الشحن",
      "أدوات التسويق: حملات وعروض ترويجية",
      "دعم ذو أولوية على مدار الساعة",
    ],
    price: "96,000 د.ع",
    priceLabel: "/شهرياً",
    featured: true,
  },
  {
    name: "أساسي",
    blurb: "مثالي للمشاريع الصغيرة التي تبدأ البيع عبر الإنترنت.",
    features: [
      "منتجات غير محدودة",
      "متجر إلكتروني + تطبيق للعملاء",
      "دعم متعدد اللغات (عربي | إنجليزي)",
      "إدارة الطلبات والإشعارات",
      "كوبونات وخصومات",
      "دعم فني عبر الدردشة",
    ],
    price: "53,000 د.ع",
    priceLabel: "/شهرياً",
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

function PlanCard({ plan, delay = 0 }: { plan: Plan; delay?: number }) {
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
          <h3 className="text-4xl font-bold text-frost lg:text-5xl">{plan.name}</h3>
          <p className="text-sm leading-7 text-[#cac9d1]">{plan.blurb}</p>
          <div className="h-px w-full bg-gradient-to-l from-[#0c0f26] via-[#3f48d9] to-[#0c0f26]" />
        </div>

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

        {/* Pushed to the card's foot so the three prices line up even though
            the blurbs above them wrap to different heights. */}
        <div className="mt-auto flex flex-col items-end gap-12">
          <p className="flex items-end gap-1">
            <span className="text-4xl font-medium tracking-tight text-frost lg:text-5xl">
              {plan.price ?? plan.priceLabel}
            </span>
            {plan.price && (
              <span className="text-base text-[#73799b]">{plan.priceLabel}</span>
            )}
          </p>

          <Link
            to={plan.price ? "/checkout" : "/contact"}
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
              ابدأ الآن
              <ArrowUpLeft size={16} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-24">
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
            كل الباقات تشمل تجربة مجانية 14 يوماً بدون بطاقة ائتمانية ابدأ اليوم
            وغيّر باقتك في أي وقت.
          </p>
        </div>

        <div className="grid w-full max-w-[1240px] items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
