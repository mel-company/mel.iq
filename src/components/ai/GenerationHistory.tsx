import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ImageIcon,
  Loader2,
  RotateCcw,
  Sparkle,
} from "@/components/icons";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGenerationHistory,
  useOpenGeneration,
  useRestoreGeneration,
} from "@/api/wrappers/aiStoreGenerator.wrappers";
import type { GenerationHistoryItem } from "@/api/endpoints/aiStoreGenerator.endpoints";
import SectionEyebrow from "../landing/SectionEyebrow";
import { requestResume } from "./activeRun";

/**
 * Past generations as a scroll-snapped carousel, in the landing page's card
 * language.
 *
 * A rail rather than a stack because this list grows without bound and used to
 * push the whole page down; a *manual* rail rather than one of the page's
 * auto-scrolling marquees because every card carries buttons, and a moving
 * target you cannot click is worse than no animation.
 *
 * Restore overwrites the current draft including hand edits, so it always
 * confirms first — the destructive half of this list should never fire on a
 * single click.
 */

const STATUS: Record<
  GenerationHistoryItem["status"],
  { label: string; className: string }
> = {
  PENDING: { label: "قيد الانتظار", className: "bg-white/8 text-white/60" },
  RUNNING: { label: "جاري الإنشاء", className: "bg-brand-primary/10 text-brand-primary" },
  SUCCEEDED: { label: "مكتمل", className: "bg-mint/10 text-mint" },
  FAILED: { label: "فشل", className: "bg-red-500/10 text-red-400" },
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

/** The panel ground the cards share with the rest of the landing page. */
const CARD_BACKGROUND =
  "linear-gradient(180deg, rgba(0,255,248,0) 0%, rgba(182,87,255,0.08) 100%), " +
  "radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(143,143,143,0.02) 100%)";

export default function GenerationHistory() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useGenerationHistory(Boolean(user));
  const openMutation = useOpenGeneration();
  const restoreMutation = useRestoreGeneration();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rail = useRef<HTMLUListElement>(null);
  /** Whether either arrow can still move the rail. Recomputed from the DOM
   *  rather than from an index, so it stays right after a resize or a drag. */
  const [reach, setReach] = useState({ overflows: false, atStart: true, atEnd: false });

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    // `scrollLeft` is 0 at the rail's start and runs negative under RTL, so
    // both ends are found from its magnitude and the sign never matters.
    const offset = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setReach({
      overflows: max > 4,
      atStart: offset <= 4,
      atEnd: offset >= max - 4,
    });
  }, []);

  const items = data?.data ?? [];

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-measured when the list length changes, which is what resizes the rail.
  }, [measure, items.length]);

  if (!user || isLoading || items.length === 0) return null;

  /**
   * Steps the rail a full page of 3 cards along.
   *
   * Driven by `scrollIntoView({ inline })` on a card rather than by a signed
   * `scrollBy`: `inline` is a logical axis, so the same call steps the right
   * way under RTL and LTR without the caller knowing which way that is.
   * `block: "nearest"` keeps it from scrolling the page vertically too.
   */
  const step = (direction: "next" | "prev") => {
    const el = rail.current;
    if (!el) return;
    const cards = [...el.children] as HTMLElement[];
    const edge = el.getBoundingClientRect();
    const isRtl = getComputedStyle(el).direction === "rtl";
    // The leading edge of the rail in physical terms.
    const leadOf = (r: DOMRect) => (isRtl ? edge.right - r.right : r.left - edge.left);

    const offsets = cards.map((c) => leadOf(c.getBoundingClientRect()));
    // The card currently flush (or nearest) to the rail's start.
    const currentIndex = Math.max(0, offsets.findIndex((o) => o > -8));
    const PAGE = 3;
    const targetIndex = direction === "next" ? currentIndex + PAGE : currentIndex - PAGE;

    cards[Math.min(Math.max(targetIndex, 0), cards.length - 1)]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  const open = async (item: GenerationHistoryItem) => {
    setBusyId(item.id);
    try {
      // A fresh link each time: the original handoff token is one-time.
      const { redirectUrl } = await openMutation.mutateAsync(item.id);
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذر فتح هذا المتجر");
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (item: GenerationHistoryItem) => {
    setBusyId(item.id);
    try {
      const { redirectUrl } = await restoreMutation.mutateAsync(item.id);
      toast.success("تمت استعادة هذه النسخة");
      setConfirmingId(null);
      refetch();
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذرت استعادة هذه النسخة");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="history" className="relative px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto flex max-w-324 flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6">
          <div data-reveal>
            <SectionEyebrow>سجل الإنشاء</SectionEyebrow>
          </div>
          <p
            data-reveal
            className="text-prose-lg max-w-255 text-center"
            style={{ "--reveal-delay": "100ms" } as React.CSSProperties}
          >
            كل متجر أنشأته بالمساعد الذكي محفوظ هنا — افتحه في المحرر أو استعد
            نسخته في أي وقت.
          </p>
        </div>

        <ul
          ref={rail}
          onScroll={measure}
          // `snap-mandatory` keeps a card edge against the rail's start after
          // every step, including a trackpad flick. `max-w` caps the rail at
          // exactly 3 cards + gaps so a 4th never peeks in on wide screens;
          // it's inert (no smaller than `w-full`) until a viewport is wide
          // enough for that to matter, so mobile/tablet peeking is untouched.
          className="no-scrollbar mx-auto flex w-full max-w-265 snap-x snap-mandatory items-stretch gap-5 overflow-x-auto pb-8 overflow-y-visible"
        >
          {items.map((item, i) => {
            const busy = busyId === item.id;
            const restorable = item.status === "SUCCEEDED" && !!item.store?.domain;
            // A build the server still has in flight. Its card is the way back
            // to the progress modal when the tab that started it is gone.
            const inFlight = item.status === "PENDING" || item.status === "RUNNING";
            const status = STATUS[item.status];

            return (
              <li
                key={item.id}
                data-reveal
                className="card-hover relative flex w-75 shrink-0 snap-start flex-col gap-4 overflow-hidden rounded-[28px] border border-hairline p-6 text-right hover:border-brand-secondary/30 sm:w-85"
                style={{
                  backgroundImage: CARD_BACKGROUND,
                  // Only the first few stagger — a long history would
                  // otherwise leave later cards waiting seconds.
                  "--reveal-delay": `${Math.min(i, 4) * 90}ms`,
                } as React.CSSProperties}
              >
                {/* Name at the card's start, status pill at its end. */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-frost">
                      {item.storeName || "متجر بدون اسم"}
                    </p>
                    {item.store?.domain && (
                      <p dir="ltr" className="truncate text-end text-xs text-muted">
                        {item.store.domain}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-card-body">
                  {item.prompt}
                </p>

                {item.status === "FAILED" && item.error && (
                  <p className="flex items-start gap-1.5 text-xs leading-5 text-red-300/80">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{item.error}</span>
                  </p>
                )}

                {/* Pushed to the card's foot so the meta row and buttons line
                    up across cards whose prompts wrap to different heights. */}
                <div className="mt-auto flex flex-col gap-4">
                  {/* Each icon leads its own label, so under RTL it sits to
                      the right of the value it annotates. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(item.createdAt)}
                    </span>
                    {item.referenceImages?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon size={11} />
                        {item.referenceImages.length}
                      </span>
                    )}
                    {item.figmaUrl && <span>Figma</span>}
                  </div>

                  {inFlight && (
                    <button
                      type="button"
                      onClick={() =>
                        requestResume({
                          id: item.id,
                          storeName: item.storeName ?? item.store?.name ?? undefined,
                          prompt: item.prompt,
                          startedAt: Date.parse(item.createdAt) || Date.now(),
                        })
                      }
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-l from-brand-violet to-brand-indigo px-3 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                    >
                      <Sparkle size={13} />
                      متابعة الإنشاء
                    </button>
                  )}

                  {restorable && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => open(item)}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-linear-to-l from-brand-violet to-brand-indigo px-3 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ExternalLink size={13} />
                        )}
                        فتح
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(item.id)}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2.5 text-xs text-white/70 transition-colors hover:bg-white/5 disabled:opacity-40"
                      >
                        <RotateCcw size={13} />
                        استعادة
                      </button>
                    </div>
                  )}
                </div>

                {/* The confirmation covers its own card instead of expanding
                    it: inline, it grew one card taller than the rest and
                    knocked the whole rail's height about. */}
                {confirmingId === item.id && (
                  <div
                    role="alertdialog"
                    aria-label="تأكيد الاستعادة"
                    className="absolute inset-0 flex flex-col justify-end gap-3 bg-ink/92 p-6 text-right backdrop-blur-sm"
                  >
                    <p className="text-xs leading-5 text-amber">
                      ستحل هذه النسخة محل التصميم الحالي في المحرر، وستفقد أي
                      تعديلات أجريتها بعدها. هل تريد المتابعة؟
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => restore(item)}
                        disabled={busy}
                        className="flex-1 rounded-xl bg-amber px-3 py-2.5 text-xs font-bold text-[#1a1200] transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {busy ? "جاري الاستعادة…" : "نعم، استعد"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-xl border border-white/15 px-3 py-2.5 text-xs text-white/70 transition-colors hover:bg-white/5"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Hidden when every card already fits — arrows that cannot move
            anything are just two dead buttons.
            "Back" is rendered first, so RTL puts it on the right where its
            chevron points, and "forward" on the left where its own does. */}
        {reach.overflows && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => step("prev")}
              disabled={reach.atStart}
              aria-label="السابق"
              className="flex size-11 items-center justify-center rounded-full border border-hairline text-white transition-colors hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              onClick={() => step("next")}
              disabled={reach.atEnd}
              aria-label="التالي"
              className="flex size-11 items-center justify-center rounded-full border border-hairline text-white transition-colors hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
