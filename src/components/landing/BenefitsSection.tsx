import { AlertCircle } from "../icons";
import SectionEyebrow from "./SectionEyebrow";

/**
 * "لماذا ميل خيارك الافضل ؟" — a five-card bento: three even cards on the top
 * row, two wide ones underneath. Each card carries its own illustration, so
 * they are written out rather than driven from a data array.
 */

/** The six app tiles that scroll inside the first card. Every tile is a
 *  gradient plate (`bg`) with a glyph centred on it, both exported. */
const TICKER_TILES = [
  { bg: "/images/landing/tick-1-bg.svg", icon: "/images/landing/tick-1.svg" },
  { bg: "/images/landing/tick-2-bg.svg", icon: "/images/landing/tick-2.svg" },
  { bg: "/images/landing/tick-3-bg.svg", icon: "/images/landing/tick-3.svg" },
  { bg: "/images/landing/tick-4-bg.svg", icon: "/images/landing/tick-4.svg" },
  { bg: "/images/landing/tick-5-bg.svg", icon: "/images/landing/tick-5.svg" },
  { bg: "/images/landing/tick-6-bg.svg", icon: "/images/landing/tick-6.svg" },
];

/** A 52×53 plate with a 32px glyph inset on it, per the Figma geometry. */
function TickerTile({ tile }: { tile: (typeof TICKER_TILES)[number] }) {
  return (
    <span
      className="relative block size-13 shrink-0 overflow-hidden rounded-xl border border-black bg-[#0c0e27]"
    >
      <img src={tile.bg} alt="" aria-hidden className="absolute inset-0 size-full" />
      <img
        src={tile.icon}
        alt=""
        aria-hidden
        className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2"
      />
    </span>
  );
}

/**
 * One rail of tiles, doubled so the -50% translate loops seamlessly.
 *
 * The rail is `dir="ltr"` because the animation translates negatively: under
 * RTL the track is anchored to the container's right edge, and a negative
 * translate would carry it out of view instead of scrolling the next copy in.
 * The tiles are images, so the direction costs nothing.
 */
function TickerRow({ reverse }: { reverse?: boolean }) {
  return (
    <div dir="ltr" className="marquee-mask overflow-hidden">
      <div className={`marquee-track items-center gap-1.75 ${reverse ? "marquee-track-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-1.75">
            {TICKER_TILES.map((tile, i) => (
              <TickerTile key={`${copy}-${i}`} tile={tile} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Shared chrome: the translucent violet card with its own soft bloom.
 *
 * The reveal and the hover lift are part of the chrome rather than repeated
 * at the five call sites; `delay` is what staggers a row.
 */
function Card({
  className = "",
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
      className={`card-hover relative flex flex-col overflow-hidden rounded-[32px] bg-[#190a45]/20 ${className}`}
    >
      {children}
    </div>
  );
}

function CardBody({ title, children }: { title: string; children: string }) {
  return (
    <div className="relative flex flex-col gap-3 text-right">
      <h3 className="text-card-title">{title}</h3>
      <p className="text-card-body">{children}</p>
    </div>
  );
}

/** The notification the third card is illustrated with — a light-themed
 *  card sitting inside the dark one, exactly as the design draws it. */
function NotificationCard() {
  return (
    <div className="relative flex w-full flex-col gap-3 rounded-2xl bg-ink-raised p-4 text-right">
      <div className="flex items-center justify-between">
        <div dir="ltr" className="flex items-center gap-1.5 text-[11px] text-muted">
          <span>03:52 PM</span>
          <span className="size-[3px] rounded-full bg-[#31396e]" />
          <span>14/10/2026</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-amber/10 py-1.5 pe-2 ps-3">
          <span className="text-[13px] font-medium text-amber">تــنبيه</span>
          <AlertCircle size={16} className="text-amber" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-bold text-frost">تنبية بشأن الكمية المتبقية</p>
        <p className="text-[11px] text-muted">معرف الاشعارات: #3eebc29d</p>
      </div>

      <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
        <p className="text-[13px] font-semibold text-brand-primary underline">
          كفر ايفون 16 برو ماكس
        </p>
        <p className="text-xs text-muted/85">اقل من 10 قطع متبقية فقط</p>
      </div>
    </div>
  );
}

function BenefitsSection() {
  return (
    <section id="benefits" className="relative px-4 pb-20 sm:px-6 lg:pb-28">
      <div className="mx-auto flex max-w-[1296px] flex-col items-center gap-8">
        <div className="flex max-w-[1010px] flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>لماذا ميل خيارك الافضل ؟</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            التزامنا بالابتكار ورضا العملاء والتحسين المستمر جعلنا رائدين في
            صناعتنا. كل ما يحتاجه متجرك لينمو من أول منتج إلى أول ألف طلب في
            نظام واحد صُمّم للسوق العراقي.
          </p>
        </div>

        <div className="flex w-full max-w-[1128px] flex-col gap-5">
          {/* Top row — three equal cards, in RTL reading order. The frame
              lays them out left to right as store / assistant / alerts, so
              the rightmost one comes first here. */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card delay={0} className="justify-between gap-10 px-[18px] py-12">
              <div
                aria-hidden
                className="pointer-events-none absolute end-0 top-2 h-20 w-2/5 rounded-full bg-[#b657ff] opacity-50 blur-[108px]"
              />
              <CardBody title="تحسين مستمر">
                طلب جديد، منتج أوشك على النفاد، رسالة من عميل تصلك لحظة حدوثها
                على هاتفك وفي لوحة التحكم.
              </CardBody>
              <NotificationCard />
            </Card>

            <Card delay={110} className="items-center justify-between gap-10 px-[18px] py-12">
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-8 start-1/3 h-24 w-2/5 rounded-full bg-[#b657ff] opacity-50 blur-[108px]"
              />
              <CardBody title="مساعد ذكي يتحدث لغتك">
                اسأل، واطلب، ونفّذ: تقارير المبيعات، إضافة الخصومات، متابعة
                الطلبات كل ذلك بجملة واحدة بالعربية.
              </CardBody>
              {/* Two overlapping panels: a wide dashboard with a narrow donut
                  card riding its leading edge. */}
              <div className="relative h-[195px] w-full max-w-[314px]">
                <img
                  src="/images/landing/bento-assistant-main.svg"
                  alt=""
                  aria-hidden
                  className="absolute bottom-0 start-0 h-[190px] w-[77%]"
                />
                <img
                  src="/images/landing/bento-assistant-side.svg"
                  alt=""
                  aria-hidden
                  className="absolute end-0 top-1/2 h-[80px] w-[104px] -translate-y-1/2"
                />
              </div>
            </Card>

            <Card delay={220} className="items-center justify-between gap-10 px-[18px] py-12 md:col-span-2 lg:col-span-1">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 start-0 h-48 w-[110%] rounded-full bg-[#b657ff]/25 opacity-50 blur-[110px]"
              />
              <CardBody title="متجر إلكتروني احترافي">
                أنشئ متجرك بقوالب جاهزة وهوية خاصة بك، مع صفحات منتجات وسلة
                ودفع مُهيّأة للبيع من اليوم الأول.
              </CardBody>
              <div className="flex w-full flex-col justify-center gap-5">
                <TickerRow />
                <TickerRow reverse />
              </div>
            </Card>
          </div>

          {/* Bottom row — two wide cards, each an image under its copy, again
              right-hand card first. */}
          <div className="grid gap-7 lg:grid-cols-2">
            <Card delay={0} className="justify-center gap-9 px-8 pb-[18px] pt-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -start-16 top-1/2 h-60 w-[115%] rounded-full bg-[#b657ff]/15 opacity-50 blur-[44px]"
              />
              <CardBody title="نقطة بيع ومخزون موحّد">
                بِع في المحل وعلى الإنترنت من نظام واحد. كل عملية بيع تُحدّث
                المخزون تلقائياً، وكل طلب يظهر في قائمة واحدة مهما كان مصدره —
                لا ازدواجية ولا نقص مفاجئ في البضاعة.
              </CardBody>
              <img
                src="/images/landing/bento-pos.png"
                alt=""
                aria-hidden
                width={543}
                height={224}
                className="relative block h-auto w-full"
              />
            </Card>

            <Card delay={120} className="justify-center gap-9 px-8 pb-[18px] pt-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -start-1/3 top-1/2 h-56 w-[120%] rotate-[25deg] rounded-full bg-[#b657ff]/15 opacity-50 blur-[40px]"
              />
              <CardBody title="تقارير تفهم متجرك">
                لوحة تحكم تعرض المبيعات اليومية وأفضل المنتجات وسلوك العملاء
                بأرقام واضحة. اعرف ما يُباع ومتى ولمن، وخذ قراراتك بثقة بدل
                التخمين.
              </CardBody>
              <img
                src="/images/landing/bento-reports.png"
                alt=""
                aria-hidden
                width={549}
                height={277}
                className="relative block h-auto w-full"
              />
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BenefitsSection;
