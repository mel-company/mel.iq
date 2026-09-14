import { ArrowUpLeft } from "../icons";
import { Link } from "react-router-dom";
import SectionEyebrow from "./SectionEyebrow";

/**
 * In RTL reading order, which is the reverse of how the Figma frame lays the
 * three columns out left to right (24/7, +313, +78).
 */
const STATS = [
  {
    figure: "+78",
    lead: "متجر",
    mid: "وثق",
    tail: "بالخدمات",
    emphasis: "التي نقدمها",
  },
  {
    figure: "+313",
    lead: "عميل",
    mid: "قام بشراء",
    tail: "من",
    emphasis: "المتاجر",
  },
  {
    figure: "24/7",
    lead: "دعم",
    mid: "متواصل",
    tail: "على مدار",
    emphasis: "الساعة",
  },
];

/**
 * "تعرف عن ميل" — the manifesto paragraph, a link out to the about page, and
 * the three-figure stat bar.
 *
 * The stat captions alternate white and muted words mid-sentence in the
 * design, so each is stored as its parts rather than one string.
 */
function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-28">
      {/* Concentric rings and a violet bloom, both painted behind the copy. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {[1725, 1562, 1398, 1210, 1007].map((size) => (
          <div
            key={size}
            className="absolute rounded-full border border-white/[0.03]"
            style={{ width: size, height: size }}
          />
        ))}
        <div className="animate-bloom absolute size-[680px] rounded-full bg-[#5834e9]/15 blur-[200px]" />
      </div>

      <div className="relative mx-auto flex max-w-[1296px] flex-col items-center gap-13">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>تعرف عن ميل</SectionEyebrow>
          </div>

          <div
            data-reveal
            className="max-w-[1181px] text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            <p className="text-prose-lg">
              <span className="text-[1.35em] font-bold text-white">
                تأسست ميل.IQ برؤية بسيطة,
              </span>{" "}
              جعل أدوات الأعمال القوية في متناول الجميع، بغض النظر عن حجمهم أو
              ميزانيتهم.
            </p>
            <p className="text-prose-lg mt-2">
              بدأنا كفريق صغير من المطورين والمصممين المتحمسين الذين كانوا
              محبطين من تعقيد وتكلفة الحلول الموجودة. اليوم، نمونا لتصبح منصة
              موثوقة تخدم آلاف العملاء في جميع أنحاء العالم. التزامنا بالابتكار
              ورضا العملاء والتحسين المستمر جعلنا رائدين في صناعتنا. نتطور
              باستمرار، نضيف ميزات جديدة، ونحسن خدماتنا بناءً على ملاحظات
              مجتمعنا الرائع. انضم إلينا في هذه الرحلة واختبر الفرق الذي يمكن أن
              تحدثه mel.iq لعملك.
            </p>
          </div>
        </div>

        <Link
          data-reveal
          to="/about"
          // The border is a gradient, so it is a 1px padding box with the
          // ground inset over it rather than a `border-color`.
          className="relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-b from-[#4d4d4d]/25 via-white/25 to-transparent p-px shadow-[0_0_25px_rgba(178,130,255,0.15)] transition-shadow hover:shadow-[0_0_32px_rgba(178,130,255,0.3)]"
        >
          <span className="flex items-center gap-3 rounded-full bg-[#00031c] px-6 py-3 text-lg font-light text-frost">
            أكتشف المزيد عن ميل
            <ArrowUpLeft size={16} className="text-brand-primary" />
          </span>
        </Link>

        <dl className="grid w-full max-w-[1212px] grid-cols-1 gap-y-10 rounded-[32px] bg-white/[0.03] py-6 sm:grid-cols-3 sm:gap-y-0">
          {STATS.map((stat, i) => (
            <div
              key={stat.figure}
              data-reveal
              style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
              className={`flex flex-col items-center gap-3.5 px-6 ${
                // A hairline between the columns, never before the first.
                i > 0 ? "sm:border-e sm:border-hairline" : ""
              }`}
            >
              <dt dir="ltr" className="text-5xl font-bold text-white lg:text-[3.6rem]">
                {stat.figure}
              </dt>
              <dd className="max-w-[337px] text-center text-lg font-light leading-relaxed text-[#4f4e56] lg:text-2xl">
                <span className="font-bold text-white">{stat.lead}</span>{" "}
                <span className="font-normal">{stat.mid}</span> {stat.tail}{" "}
                <span className="text-white">{stat.emphasis}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default AboutSection;
