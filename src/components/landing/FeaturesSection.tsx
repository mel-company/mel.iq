import SectionEyebrow from "./SectionEyebrow";
import { PANEL_BACKGROUND } from "./PlatformSection";

/**
 * Four feature cards flanking a phone.
 *
 * `tint` is the icon plate's wash — the design alternates a violet and a cyan
 * one, which is what tells the four cards apart at a glance.
 *
 * The two groups are kept as separate arrays because the design assigns them
 * to physical sides of the phone, which no ordering of one list expresses:
 * under RTL the first-rendered column is the right-hand one.
 */
type Feature = {
  title: string;
  body: string;
  icon: string;
  tint: string;
};

const RIGHT_COLUMN: Feature[] = [
  {
    title: "كوبونات وخصومات",
    body: "أنشئ كوبونات وخصومات موقّتة أو لمجموعة عملاء محددة خلال ثوانٍ.",
    icon: "/images/landing/feat-coupons.svg",
    tint: "bg-[rgba(0,183,255,0.1)]",
  },
  {
    title: "نقطة بيع (POS)",
    body: "بِع في متجرك الفعلي من الجهاز نفسه، والمخزون يتحدّث لحظياً.",
    icon: "/images/landing/feat-pos.svg",
    tint: "bg-[rgba(125,38,247,0.1)]",
  },
];

const LEFT_COLUMN: Feature[] = [
  {
    title: "إدارة المنتجات",
    body: "أضف المنتجات والصور والخيارات والأسعار، فرادى أو بالجملة، بسهولة.",
    icon: "/images/landing/feat-products.svg",
    tint: "bg-[rgba(125,38,247,0.1)]",
  },
  {
    title: "إدارة الطلبات",
    body: "تابع كل طلب من الاستلام حتى التوصيل مع حالة واضحة وإشعار تلقائي للعميل.",
    icon: "/images/landing/feat-orders.svg",
    tint: "bg-[rgba(0,183,255,0.15)]",
  },
];

function FeatureCard({ feature, delay = 0 }: { feature: Feature; delay?: number }) {
  return (
    <div
      data-reveal
      // `items-start` puts the icon plate on the right under RTL, which is
      // where the frame has it on all four cards.
      className="card-hover relative flex flex-col items-start gap-7 overflow-hidden rounded-[32px] border border-hairline p-[30px] text-right hover:border-brand-secondary/30"
      style={{
        backgroundImage: PANEL_BACKGROUND,
        "--reveal-delay": `${delay}ms`,
      } as React.CSSProperties}
    >
      <div className={`flex items-center justify-center rounded-[18px] p-3.5 ${feature.tint}`}>
        <img
          src={feature.icon}
          alt=""
          aria-hidden
          width={30}
          height={30}
          className="size-[30px]"
        />
      </div>
      <div className="flex w-full flex-col gap-1.5">
        <h3 className="text-card-title">{feature.title}</h3>
        <p className="text-card-body">{feature.body}</p>
      </div>
    </div>
  );
}

/** "مميزاتنا" — two cards, the phone, two more cards. */
function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute start-1/2 top-1/3 size-[700px] -translate-x-1/2 rounded-full bg-[#2b1566]/35 blur-[170px]"
      />

      <div className="relative mx-auto flex max-w-[1320px] flex-col gap-10">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>مميزاتنا</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg max-w-[1181px] text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            أدوات بيع كاملة صُممت لتوفّر وقتك وتزيد مبيعاتك، وتتطور مع نمو
            متجرك.
          </p>
        </div>

        {/* On narrow viewports the four cards stack and the phone drops to the
            end, where it stops splitting the list in half. */}
        <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-end lg:gap-5">
          <div className="flex w-full flex-col gap-5 lg:flex-1">
            {RIGHT_COLUMN.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} delay={i * 110} />
            ))}
          </div>

          <div
            data-reveal="zoom"
            className="order-last w-full max-w-[420px] shrink-0 lg:order-none lg:w-[38%] lg:max-w-[500px]"
          >
            {/* Only the top 650px of a 919px-tall phone is shown — the bottom
                runs off the section, as in the design — so the window is a
                500×650 box that clips it. */}
            <div className="relative aspect-[500/650] w-full overflow-hidden">
              <div className="absolute inset-x-[3.6%] top-0 aspect-[465/919]">
                <img
                  src="/images/landing/features-phone-frame.png"
                  alt=""
                  aria-hidden
                  className="absolute inset-0 size-full"
                />
                {/* The exported frame carries a placeholder screen, so the real
                    one is laid over it, inset by the bezel (21/465 and 15/919
                    in the frame's own units).
                    The insets go on a wrapper, not on the <img>: an image is a
                    replaced element, so insets alone do not stretch it — it
                    keeps its intrinsic aspect and slides out past the bezel. */}
                <div className="absolute inset-[1.64%_4.53%] overflow-hidden rounded-[9%_/_4.5%]">
                  <img
                    src="/images/landing/features-phone-screen.png"
                    alt=""
                    aria-hidden
                    className="size-full object-cover object-top"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-5 lg:flex-1">
            {LEFT_COLUMN.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} delay={220 + i * 110} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
