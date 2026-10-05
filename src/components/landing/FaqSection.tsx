import { useState } from "react";
import { Minus, Plus } from "../icons";
import SectionEyebrow from "./SectionEyebrow";
import { LANDING_FAQS } from "../../seo/landingFaqs";

const QUESTIONS = LANDING_FAQS;

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
                key={item.question}
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
                        {item.question}
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
                        {item.answer}
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
