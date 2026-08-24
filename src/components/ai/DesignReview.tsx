import { useState } from "react";
import type { PageDesign } from "../../api/endpoints/aiStoreGenerator.endpoints";

/**
 * Shows the merchant what was designed, and lets them change it.
 *
 * The generator decides a page — layout, hierarchy, colour placement, imagery
 * and the finished Arabic copy — before anything is encoded. That decision used
 * to be invisible: the merchant watched a progress bar and was handed a
 * finished store with no idea what had been chosen or how to influence it.
 *
 * Feedback here revises the *design* and the page is rebuilt from it, rather
 * than patching the rendered tree. That is why repeated rounds compound instead
 * of fighting each other.
 */

/** Arabic labels for the visual features the director names. */
const FEATURE_LABELS: Record<string, string> = {
  "two-tone-headline": "عنوان بلونين",
  "decorative-shape": "شكل زخرفي",
  "overlap-card": "بطاقة متداخلة",
  "section-lift": "قسم مرفوع",
  "floating-stats": "إحصائيات طافية",
  "badge-on-image": "شارة على الصورة",
  "asymmetric-grid": "شبكة غير متناظرة",
  "side-swap": "تبديل الجهة",
  "directed-crop": "قصّ موجَّه",
  "image-treatment": "معالجة الصور",
  "glass-bar": "شريط زجاجي",
  "scrim-caption": "اسم فوق تدرّج",
};

/**
 * The section's visual features, whichever key they arrived under.
 *
 * Proposals generated before the rename carry `devices`, and an old proposal
 * is still openable and revisable from the history list.
 */
const features = (section: { visualFeatures?: string[]; devices?: string[] }) =>
  section.visualFeatures ?? section.devices ?? [];

const ROLE_LABELS: Record<string, string> = {
  hero: "القسم الرئيسي",
  "trust-bar": "شريط الثقة",
  categories: "التصنيفات",
  "featured-products": "المنتجات المميزة",
  editorial: "قسم تحريري",
  promo: "عرض ترويجي",
  testimonials: "آراء العملاء",
  newsletter: "دعوة للتواصل",
  "contact-info": "معلومات التواصل",
  values: "قيم العلامة",
};

interface Props {
  design: PageDesign;
  /** Called with the merchant's feedback; resolves with the revised design. */
  onRevise: (feedback: string) => Promise<void>;
  onApprove: () => void;
  /** Set while a revision is in flight. */
  busy?: boolean;
  error?: string | null;
}

export default function DesignReview({
  design,
  onRevise,
  onApprove,
  busy = false,
  error = null,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);

  const submit = async () => {
    const note = feedback.trim();
    if (note.length < 3 || busy) return;
    await onRevise(note);
    setFeedback("");
  };

  return (
    <div dir="rtl" className="w-full text-right">
      <header className="mb-5">
        <h3 className="text-lg font-bold text-white">التصميم المقترح</h3>
        <p className="mt-1 text-sm text-white/50">
          {design.sections.length} أقسام. راجعها، وإن أعجبتك افتح المحرر — وإلا
          اكتب ملاحظتك وسنعيد التصميم.
        </p>
        {design.notes && (
          <p className="mt-2 text-sm text-white/70">{design.notes}</p>
        )}
      </header>

      <ol className="space-y-2">
        {design.sections.map((section, index) => {
          const open = expanded === index;
          return (
            <li
              key={`${section.role}-${section.order}`}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : index)}
                className="flex w-full items-center gap-3 px-4 py-3 text-right transition hover:bg-white/5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-white/60">
                  {section.order}
                </span>
                <span className="flex-1 text-sm font-medium text-white">
                  {ROLE_LABELS[section.role] ?? section.role}
                </span>
                <span className="text-xs text-white/40">
                  {open ? "إخفاء" : "تفاصيل"}
                </span>
              </button>

              {open && (
                <div className="space-y-3 border-t border-white/10 px-4 py-3 text-sm">
                  <Row label="الغرض" value={section.intent} />
                  <Row label="التخطيط" value={section.layout} />
                  <Row label="التسلسل البصري" value={section.hierarchy} />
                  <Row label="الألوان" value={section.colors} />
                  <Row label="الصور" value={section.imagery} />

                  {features(section).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {features(section).map((device) => (
                        <span
                          key={device}
                          className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70"
                        >
                          {FEATURE_LABELS[device] ?? device}
                        </span>
                      ))}
                    </div>
                  )}

                  {section.copy.length > 0 && (
                    <div className="rounded-lg bg-black/20 p-3">
                      <p className="mb-2 text-xs text-white/40">النصوص</p>
                      <ul className="space-y-1">
                        {section.copy.map((slot) => (
                          <li key={slot.name} className="text-sm text-white/80">
                            {slot.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={busy}
          rows={3}
          placeholder="ما الذي تريد تغييره؟ مثال: قسم البطل ضعيف، أريد صورة أكبر وعنواناً أوضح."
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none disabled:opacity-50"
        />

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={submit}
            disabled={busy || feedback.trim().length < 3}
            className="flex-1 rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            {busy ? "جاري إعادة التصميم…" : "أعد التصميم بهذه الملاحظة"}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            className="flex-1 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-40"
          >
            التصميم مناسب — افتح المحرر
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-xs text-white/40">{label}</span>
      <span className="flex-1 text-white/75">{value}</span>
    </div>
  );
}
