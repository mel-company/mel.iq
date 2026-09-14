import { useState } from "react";
import { Minus, Plus } from "../icons";
import SectionEyebrow from "./SectionEyebrow";

/**
 * The Figma frame only draws the closed state of these rows — the questions
 * are the design's, the answers are not in the file. They are written here
 * from what the rest of the page already commits to (the 14-day trial, the
 * plan tiers, the ZainCash checkout, the Arabic assistant) so that opening a
 * row shows something true rather than a placeholder.
 */
const QUESTIONS = [
  {
    q: "هل هناك فترة تجريبية مجانية؟",
    a: "جميع الباقات تشمل فترة تجريبية مجانية لمدة 14 يوماً. لا حاجة لبطاقة ائتمانية للبدء.",
  },
  {
    q: "هل يمكنني تغيير الباقة لاحقاً؟",
    a: "نعم، يمكنك ترقية باقتك أو خفضها في أي وقت، والتغييرات سارية فوراً.",
  },
  {
    q: "ما طرق الدفع المقبولة؟",
    a: "نقبل الدفع عبر زين كاش والبطاقات الائتمانية الرئيسية، والتحويلات المصرفية للباقات المؤسسية.",
  },
  {
    q: "هل يمكنني الإلغاء في أي وقت؟",
    a: "نعم، يمكنك إلغاء اشتراكك في أي وقت. لا توجد رسوم إلغاء أو غرامات.",
  },
  {
    q: "كيف أنشئ متجري على ميل؟",
    a: "اكتب وصفاً لمتجرك في مربع الأعلى، وسيقوم المساعد الذكي بتوليد المتجر بمنتجاته وصفحاته وهويته، ثم تحرّره كما تشاء قبل النشر.",
  },
  {
    q: "هل أحتاج خبرة برمجية لإدارة المتجر؟",
    a: "لا. كل شيء يُدار من لوحة تحكم عربية: المنتجات، الطلبات، المخزون، والعروض — بدون كتابة سطر واحد من الكود.",
  },
  {
    q: "كيف يعمل المساعد الذكي؟",
    a: "تطلب منه ما تريد بالعربية — تقرير مبيعات، إضافة خصم، متابعة طلب — وينفّذه داخل متجرك مباشرة بدل أن تبحث عن الإعداد بنفسك.",
  },
];

function FaqSection() {
  /** Index of the open row, or `null` when all are closed — which is the
   *  state the design draws. One at a time keeps the list scannable. */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="relative px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto flex max-w-[1296px] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>الأسئلة الأكثر شيوعاً</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg max-w-[1181px] text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            إجابات سريعة عن أكثر ما يسأله أصحاب المتاجر قبل الانطلاق مع ميل.
          </p>
        </div>

        <div className="flex w-full max-w-[795px] flex-col gap-6">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                data-reveal
                style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}
                className="overflow-hidden rounded-[14px] bg-ink-panel transition-colors hover:bg-[#0a0524]"
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    // The toggle sits at the row's right edge with the question
                    // to its left, both packed to the right.
                    className="flex w-full items-center justify-start gap-[18px] px-6 py-4 text-right sm:px-[30px]"
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-hairline text-white transition-colors duration-300"
                    >
                      {isOpen ? <Minus size={24} /> : <Plus size={24} />}
                    </span>
                    <span className="text-lg font-medium leading-[1.5] text-white sm:text-xl">
                      {item.q}
                    </span>
                  </button>
                </h3>

                {/* Always rendered, so the answer can transition between zero
                    and its own height — mounting it on open can only ever pop.
                    `.disclosure` does that with grid-template-rows; the inner
                    wrapper carries the clip. */}
                <div className="disclosure" data-open={isOpen || undefined}>
                  <div>
                    <p
                      id={`faq-answer-${i}`}
                      // Indented past the toggle so the answer lines up under
                      // the question rather than under the icon.
                      className="pb-5 pe-6 ps-[82px] text-right text-base leading-7 text-prose sm:pe-[30px] sm:ps-[88px]"
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FaqSection;
