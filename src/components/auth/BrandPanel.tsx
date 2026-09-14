/**
 * The pitch beside the sign-in card: wordmark, headline, three proof points
 * and three figures. Hidden below `lg`, where the card takes the full width —
 * on a phone the job is to sign in, not to be sold to again.
 */
const POINTS = [
  {
    title: "إطلاق خلال دقائق",
    detail: "قوالب جاهزة وبدون أي برمجة",
  },
  {
    title: "نقطة بيع ومخزون موحّد",
    detail: "بِع في المحل وأونلاين من نظام واحد",
  },
  {
    title: "دعم بالعربية 24/7",
    detail: "فريق في بغداد يرد خلال أقل من ساعة",
  },
];

const STATS = [
  { figure: "+10K", label: "عميل سعيد" },
  { figure: "99.9%", label: "استمرارية" },
  { figure: "24/7", label: "دعم" },
];

function BrandPanel() {
  return (
    <div className="hidden w-[520px] shrink-0 flex-col gap-7 self-stretch rounded-[32px] p-10 text-right lg:flex">
      <p dir="ltr" className="text-end text-[28px] font-bold leading-[42px] text-white">
        mel.iq
      </p>

      <div className="flex flex-col gap-2">
        <h1 className="text-[34px] font-extrabold leading-[44px] text-frost">
          أدر متجرك بالكامل
          <br />
          بمنصة واحدة فقط
        </h1>
        <p className="max-w-[440px] self-end text-sm leading-[21px] text-muted">
          منصة عراقية تجمع المتجر ونقطة البيع والطلبات والعملاء في لوحة واحدة —
          بمساعد ذكي يتحدث لغتك.
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {POINTS.map((point) => (
          <li key={point.title} className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-brand-primary/30 bg-brand-primary/12 text-[13px] font-bold text-brand-primary"
            >
              ✓
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-bold leading-[21px] text-frost">
                {point.title}
              </span>
              <span className="text-xs leading-[18px] text-muted">{point.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* RTL reading order: the frame lays these out 24/7, 99.9%, +10K left to
          right, so the rightmost figure is listed first. */}
      <dl className="flex items-start gap-6">
        {STATS.map((stat) => (
          <div key={stat.figure} className="flex flex-col items-end">
            <dt dir="ltr" className="text-xl font-bold leading-[30px] text-white">
              {stat.figure}
            </dt>
            <dd className="text-[11px] leading-[17px] text-muted">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default BrandPanel;
