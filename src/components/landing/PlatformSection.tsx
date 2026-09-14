import SectionEyebrow from "./SectionEyebrow";

/** In RTL reading order: the frame's grid runs
 *  تطبيق / دعم across the first row and مجموعات / قوائم across the second,
 *  left to right, so each pair is listed here right-hand card first. */
const CARDS = [
  {
    title: "دعم مباشر مع العميل",
    body: "دردشة فورية بين صاحب المتجر والعميل داخل المنصة، بلا وسيط.",
  },
  {
    title: "تطبيق لعملائك",
    body: "متجرك على هواتف عملائك مع إشعارات فورية بالعروض وحالة الطلبات.",
  },
  {
    title: "قوائم ديناميكية",
    body: "قوائم وتصنيفات تتحدّث تلقائياً حسب المخزون والعروض الجارية.",
  },
  {
    title: "مجموعات العملاء",
    body: "صنّف عملاءك في مجموعات ووجّه لكل مجموعة عروضاً وإشعارات مخصصة.",
  },
];

/**
 * The panel gradient every card in this section and the next one shares: a
 * hairline box over a faint cyan→violet vertical wash and a white radial
 * sheen. Kept as one constant so the two sections cannot drift apart.
 */
export const PANEL_BACKGROUND =
  "linear-gradient(180deg, rgba(0,255,248,0) 0%, rgba(182,87,255,0.06) 100%), " +
  "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(143,143,143,0.02) 100%)";

/**
 * "منصة ميل لا تقدم تطبيق فقط ؟" — the copy and a 2×2 card grid on the right,
 * a trio of phones on the left.
 */
function PlatformSection() {
  return (
    <section
      id="platform"
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-24"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -start-40 top-1/4 h-[520px] w-[70%] rounded-full bg-[#2a1163]/40 blur-[150px]" />
        <div className="absolute end-0 top-0 h-[480px] w-1/2 rounded-full bg-[#1d1052]/50 blur-[140px]" />
      </div>

      {/* The frame puts the copy on the left and the phones on the right, so
          the copy — first in the DOM — is reversed out of the RTL flow. */}
      <div className="relative mx-auto flex max-w-[1600px] flex-col items-center gap-12 lg:flex-row-reverse lg:items-center">
        <div className="flex w-full flex-col gap-7 lg:w-[46%]">
          <div className="flex flex-col gap-6">
            <div data-reveal>
              <SectionEyebrow align="start">منصة ميل لا تقدم تطبيق فقط ؟</SectionEyebrow>
            </div>
            <p
              data-reveal
              className="text-prose-lg text-right"
              style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
            >
              مع كل متجر تحصل على تطبيق لعملائك، ولوحة إدارة، ونقطة بيع، وقنوات
              تواصل مباشرة منظومة كاملة تعمل معاً لخدمة متجرك.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CARDS.map((card, i) => (
              <div
                key={card.title}
                data-reveal
                className="card-hover relative flex flex-col justify-center gap-7 overflow-hidden rounded-[32px] border border-hairline p-[30px] text-right hover:border-brand-secondary/30"
                style={{
                  backgroundImage: PANEL_BACKGROUND,
                  "--reveal-delay": `${i * 90}ms`,
                } as React.CSSProperties}
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-card-title">{card.title}</h3>
                  <p className="text-card-body">{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-reveal="zoom" className="w-full shrink-0 lg:w-[50%]">
          <img
            src="/images/landing/platform-phones.png"
            alt=""
            aria-hidden
            width={844}
            height={657}
            draggable={false}
            className="pointer-events-none block h-auto w-full select-none"
          />
        </div>
      </div>
    </section>
  );
}

export default PlatformSection;
