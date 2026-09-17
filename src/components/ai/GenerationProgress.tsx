import { Fragment, useEffect, useRef, useState } from "react";
import ModalPortal from "./ModalPortal";
import {
  AlertCircle,
  Check,
  Clock,
  Coffee,
  FileText,
  LayoutGrid,
  Loader2,
  Rocket,
  Sparkles,
  X,
} from "../icons";
import {
  aiStoreGeneratorAPI,
  type DesignAnswers,
  type DesignQuestion,
  type FailureCode,
  type QuestionOption,
} from "../../api/endpoints/aiStoreGenerator.endpoints";

/**
 * Live view of a generation run, as a modal.
 *
 * A run is minutes, not seconds — a common template lands around eight — and
 * most of that is inside model calls that report nothing. Without a visible
 * clock and a step plan that silence reads as a crash and people reload, which
 * costs them the run. So this shows three things at once: which stage is
 * running, how much of the whole is left, and that time is still passing.
 *
 * Two deliberate choices about the progress it draws:
 *
 * - The run is shown as a numbered stepper of phases rather than as one bar.
 *   A single bar that is 40% full says nothing about *what* is happening; a
 *   finished cyan node next to a lit blue one says the design is settled and
 *   the store is being built.
 * - Each phase advances against a time budget rather than against the server's
 *   step weights. Steps land minutes apart, so a weight-driven ring sits frozen
 *   for the entire length of the step it is describing — which is exactly the
 *   silence it exists to break. The server still owns which phase is running;
 *   time only decides how far into it the fill has crept, and the fill never
 *   reaches 100% until the phase actually ends.
 */

export interface ProgressEntry {
  message: string;
  done: boolean;
}

export interface PlannedStep {
  key: string;
  label: string;
  weight: number;
}

/**
 * Which mascot belongs to which half of the run.
 *
 * The two phases are genuinely different work and take different lengths of
 * time — deciding the design, then building the store — and a single spinner
 * said neither. Keyed off the phase the composer is already tracking rather
 * than off status text, which is Arabic prose and would break on any rewording.
 */
const MASCOTS = {
  design: {
    src: "/images/bird-design.gif",
    alt: "جاري تصميم المتجر",
  },
  code: {
    src: "/images/bird-code.gif",
    alt: "جاري بناء المتجر",
  },
} as const;

export type GenerationPhase = keyof typeof MASCOTS;

/** Preloads a mascot so it is decoded before the modal that shows it opens. */
export function preloadMascot(phase: GenerationPhase): void {
  const img = new Image();
  img.src = MASCOTS[phase].src;
}

interface GenerationProgressProps {
  open: boolean;
  entries: ProgressEntry[];
  steps: PlannedStep[];
  /** Index of the running step within `steps`. */
  activeStep: number;
  storeName?: string;
  /**
   * Seconds the run had already been going when this modal opened.
   *
   * Non-zero only for a run resumed after a reload: the work started before
   * the page did, and a clock beginning at zero would promise the full
   * eight-minute estimate to someone already twenty minutes in. Feeding the
   * real figure in lets the existing overrun handling do its job — the bar
   * creeps asymptotically instead of claiming completion, and the countdown
   * takes itself off screen once it has nothing useful left to say.
   */
  initialElapsedSeconds?: number;
  /**
   * False when there is no basis for a remaining-time estimate.
   *
   * The countdown is derived from which phase is running, and a run picked
   * back up after a reload has no phase: the status endpoint reports only that
   * it is still going, so every segment past the first reads as untouched and
   * the arithmetic would quote most of the original estimate no matter how
   * long the merchant has actually been waiting. The panel already has the
   * right thing to say when it cannot put a number on the wait.
   */
  etaKnown?: boolean;
  /**
   * The run is a finished design that was never approved for building.
   *
   * Reached by resuming: the server parks a completed proposal and waits, so
   * there is nothing in flight to report. The panel drops the language of work
   * underway and puts the decision in front of the merchant instead.
   */
  awaitingApproval?: boolean;
  /**
   * The run being resumed had already died — `RUNNING` with nothing behind it.
   *
   * Continuing it is a fresh build and a fresh charge, since the credit the
   * abandoned run took is not refunded, so the panel says both plainly instead
   * of presenting it as picking up where things left off.
   */
  stalled?: boolean;
  /** Which half of the run is on screen; picks the mascot. */
  phase?: GenerationPhase;
  error?: string | null;
  /** Which kind of failure, so the panel can say what to do about it. */
  errorCode?: FailureCode | null;
  refunded?: boolean;
  /**
   * The decisions still open, asked one at a time while the store is designed.
   *
   * They live here rather than in a panel of their own because the wait is the
   * whole opportunity: a minute of watching a progress bar becomes a minute of
   * the merchant telling us what they actually want.
   */
  questions?: DesignQuestion[];
  questionsReady?: boolean;
  answers?: DesignAnswers;
  /** Index of the question on screen; equal to `questions.length` when done. */
  questionIndex?: number;
  revisitedQuestion?: boolean;
  buildConfirmed?: boolean;
  onAnswer?: (question: DesignQuestion, value: string) => void;
  onNextQuestion?: () => void;
  onPreviousQuestion?: () => void;
  onSkipQuestions?: () => void;
  onConfirmBuild?: () => void;
  /**
   * True once the design has landed and only the answers are outstanding.
   *
   * The two finish in either order, so the line under the question has to say
   * which — telling someone we are still designing when the build is already
   * waiting on them is both wrong and a reason not to hurry.
   */
  designReady?: boolean;
  onRetry?: () => void;
  /**
   * Dismisses the panel.
   *
   * Offered at every point in a run, not only after a failure. A merchant who
   * changed their mind — or who just wants their page back while the build
   * works — was otherwise held here for the length of the run, with the tab
   * itself the only way out. What closing *means* is the caller's business;
   * all this component guarantees is that nothing in flight is dropped without
   * saying so first, which is what the confirmation step below is for.
   */
  onClose?: () => void;
}

const formatClock = (seconds: number) => {
  // Floored at zero here as well as at the call site: a countdown that renders
  // "-1:24" tells the merchant the run is overdue, which is both alarming and
  // useless — they cannot do anything with the number either way.
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * The run as three phases, with a rough seconds budget each.
 *
 * The budgets are what the countdown counts down and what the bars fill
 * against; they are measured from common-template runs, which come in around
 * eight minutes end to end. They are estimates on purpose — nothing breaks
 * when a run overruns one, the bar just slows down as it approaches full.
 */
const SEGMENTS = [
  {
    key: "plan",
    label: "تحليل الطلب وهوية المتجر",
    /** Shown in the stage card under the label, when nothing live has arrived. */
    hint: "نحلل المعلومات ونستخرج هوية متجرك…",
    icon: FileText,
    seconds: 150,
    fill: "bg-[#00c8ff]",
    text: "text-[#00c8ff]",
    // Hex rather than a class: the ring is an SVG stroke, and Tailwind's
    // arbitrary-value classes do not reach `stroke` on a raw <circle>.
    stroke: "#00c8ff",
    glow: "shadow-[0_0_0_4px_rgba(0,200,255,0.10),0_0_22px_-4px_rgba(0,200,255,0.7)]",
  },
  {
    key: "code",
    label: "الهيكلة والتصميم",
    hint: "نبني صفحات متجرك ونرتّب أقسامه…",
    icon: LayoutGrid,
    seconds: 210,
    fill: "bg-[#3b82f6]",
    text: "text-[#3b82f6]",
    stroke: "#3b82f6",
    glow: "shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_0_22px_-4px_rgba(59,130,246,0.7)]",
  },
  {
    key: "publish",
    label: "المراجعة والنشر",
    hint: "نراجع كل صفحة ثم ننشر متجرك…",
    icon: Rocket,
    seconds: 120,
    fill: "bg-[#a855f7]",
    text: "text-[#a855f7]",
    stroke: "#a855f7",
    glow: "shadow-[0_0_0_4px_rgba(168,85,247,0.10),0_0_22px_-4px_rgba(168,85,247,0.7)]",
  },
] as const;

const TOTAL_SECONDS = SEGMENTS.reduce((sum, s) => sum + s.seconds, 0);

/**
 * Which of the three phases the server's current step belongs to.
 *
 * The design half is all planning by definition. Inside the build the server
 * names its steps, so the mapping follows those keys rather than message text.
 */
function segmentOf(
  phase: GenerationPhase,
  steps: PlannedStep[],
  activeStep: number,
): number {
  if (phase === "design" || !steps.length) return 0;
  if (activeStep >= steps.length) return SEGMENTS.length - 1;
  switch (steps[activeStep]?.key) {
    case "foundation":
      return 0;
    case "store":
    case "publish":
      return SEGMENTS.length - 1;
    default:
      return 1;
  }
}

/**
 * How full the running phase's bar is after `t` seconds of a `budget`-second
 * phase.
 *
 * Linear up to the budget, then asymptotic: a phase that overruns keeps
 * creeping instead of either stalling dead or claiming to be finished.
 */
function fillPercent(t: number, budget: number): number {
  const ratio = Math.max(0, t) / budget;
  return ratio <= 1
    ? 4 + 91 * ratio
    : 95 + 4.5 * (1 - Math.exp(-(ratio - 1) * 1.5));
}

/**
 * What the merchant should do about each kind of failure.
 *
 * The panel used to render the raw error and offer "retry" regardless. When
 * the provider had cut us off, that produced a modal quoting our own API key's
 * management url and inviting the merchant to retry into the same wall.
 */
const FAILURE_ADVICE: Record<FailureCode, { title: string; advice?: string; retry: boolean }> = {
  "ai-unavailable": {
    title: "الخدمة غير متاحة مؤقتاً",
    advice: "المشكلة من طرفنا وقد وصلنا إشعار بها. أعد المحاولة بعد قليل.",
    // Retrying into a provider that has cut us off fails identically, and
    // instantly. Offering the button implies it might not.
    retry: false,
  },
  "ai-busy": {
    title: "الخدمة مزدحمة",
    advice: "انتظر لحظات ثم أعد المحاولة.",
    retry: true,
  },
  timeout: {
    title: "انتهت المهلة",
    advice: "تحقق من اتصالك ثم أعد المحاولة.",
    retry: true,
  },
  "qa-gate": {
    title: "لم يجتز التصميم فحص الجودة",
    // No advice line: the server's own message for this code already says both
    // halves — that nothing was charged, and to retry or reword — and the two
    // were rendering one under the other, word for word. The panel showed the
    // same sentence three times over, which reads as a glitch and buries the
    // one line that differs.
    retry: true,
  },
  "rate-limited": {
    title: "طلبات كثيرة",
    advice: "انتظر قليلاً ثم أعد المحاولة.",
    retry: true,
  },
  unknown: { title: "تعذر إنشاء المتجر", retry: true },
};

/**
 * What to say while a phase runs, from its start to its end.
 *
 * Eight minutes is long enough that "جاري الإنشاء…" stops being information
 * and starts being wallpaper. These say what is actually happening right now,
 * which is the only honest way to make a wait feel shorter — and they move
 * with the bar, so a merchant who looks away and back can tell time passed.
 */
const PHASE_MESSAGES: readonly (readonly string[])[] = [
  [
    "نقرأ وصفك بالتفصيل ونفهم ما الذي يميّز متجرك.",
    "اشرب قهوتك بينما نُعِدّ متجرك ☕",
    "نختار الألوان والخطوط التي تناسب علامتك.",
    "نرسم شكل الصفحة الرئيسية وترتيب أقسامها.",
    "لمسات أخيرة على التصميم قبل أن نبدأ البناء.",
  ],
  [
    "بدأنا البناء — نكتب صفحات متجرك واحدة تلو الأخرى.",
    "استرخِ قليلاً، أقسام متجرك تتشكل الآن.",
    "نصوّر منتجاتك ونجهّز صور الأقسام.",
    "نرتّب المنتجات والأقسام في أماكنها.",
    "نراجع كل صفحة ونصلح ما يحتاج تعديلاً.",
    "البناء في مراحله الأخيرة — لا تغلق الصفحة.",
  ],
  [
    "نراجع متجرك صفحة صفحة قبل النشر.",
    "ننشر متجرك على شبكة Cloudflare العالمية.",
    "نجهّز رابط متجرك ونتأكد أنه يعمل.",
    "لحظات ويكون متجرك جاهزاً — لا تغلق الصفحة.",
  ],
];

/**
 * The line under the bars.
 *
 * Anything the merchant has to act on wins over the flavour: being told to
 * enjoy a coffee while the modal is silently waiting on an answer from them is
 * how a run sits idle for ten minutes.
 */
function waitingHint(
  segment: number,
  percent: number,
  answering: boolean,
  designReady: boolean,
  buildConfirmed: boolean,
): string {
  if (answering && designReady) return "التصميم جاهز وينتظر تأكيدك قبل بدء البناء.";
  if (answering) return "نصمم المتجر الآن، ويمكنك إكمال اختياراتك أثناء ذلك.";
  if (segment === 0 && buildConfirmed && !designReady)
    return "تم حفظ اختياراتك، وسنبدأ البناء فور اكتمال التصميم.";

  const messages = PHASE_MESSAGES[segment] ?? PHASE_MESSAGES[0];
  const index = Math.min(
    messages.length - 1,
    Math.floor((percent / 100) * messages.length),
  );
  return messages[index];
}

export default function GenerationProgress({
  open,
  entries,
  steps,
  activeStep,
  storeName,
  initialElapsedSeconds = 0,
  etaKnown = true,
  awaitingApproval = false,
  stalled = false,
  phase = "design",
  error,
  errorCode,
  refunded,
  questions = [],
  questionsReady = false,
  answers = {},
  questionIndex = 0,
  revisitedQuestion = false,
  buildConfirmed = false,
  onAnswer,
  onNextQuestion,
  onPreviousQuestion,
  onSkipQuestions,
  onConfirmBuild,
  designReady = false,
  onRetry,
  onClose,
}: GenerationProgressProps) {
  /** Seconds the run has actually been working — question time excluded. */
  const [elapsed, setElapsed] = useState(initialElapsedSeconds);
  const [segment, setSegment] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const lastTick = useRef<number | null>(null);
  const elapsedRef = useRef(initialElapsedSeconds);
  // Read through a ref so the offset is applied at the moment the modal opens
  // and never mid-run, whether the parent recomputes it every render or not.
  const initialElapsedRef = useRef(initialElapsedSeconds);
  initialElapsedRef.current = initialElapsedSeconds;
  const segmentRef = useRef(0);
  /** `elapsed` at the moment the running phase started. */
  const segmentStart = useRef(0);
  const pausedRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  /**
   * When each planned step first started, in run-seconds.
   *
   * The log reads as a log only if its rows are stamped; without a time beside
   * them four Arabic sentences look like a static list and say nothing about
   * whether anything has moved in the last two minutes. Stamped on arrival
   * rather than derived, because a step's start is not recoverable afterwards.
   *
   * Keyed by phase and position as well as by the server's key: the build
   * re-announces a `foundation` step of its own, and a key-only map would stamp
   * it with the design half's time.
   */
  const stepStartedAt = useRef<Record<string, number>>({});

  // One question at a time. A list of six would be a form, and a form during a
  // wait is worse than the wait.
  const current = error ? undefined : questions[questionIndex];
  // `!current` is the shared condition: while a question is on screen it owns
  // the panel, and the approval comes after the last one either way.
  const showingConfirmation =
    !error &&
    !current &&
    (awaitingApproval ||
      (phase === "design" && questionsReady && questions.length > 0));

  /**
   * The clock stops while we are waiting on the merchant.
   *
   * A countdown that keeps running through a question blames them for the time
   * they spent answering it — and by the time they are done the estimate is
   * wrong by exactly the length of their own deliberation.
   */
  const paused = Boolean(current) || (showingConfirmation && !buildConfirmed);
  const rawSegment = segmentOf(phase, steps, activeStep);

  /**
   * Whether closing needs to be asked about first.
   *
   * A failed run and a design parked for approval both have nothing in flight
   * — closing them costs the merchant nothing, and an "are you sure" over a
   * decision with no consequence is just a second click. Everything else is
   * work in progress, and what happens to it differs enough between the two
   * halves of the run that the panel has to say which.
   */
  const closeNeedsConfirming = !error && !awaitingApproval;
  const [confirmingClose, setConfirmingClose] = useState(false);
  const stayButton = useRef<HTMLButtonElement>(null);

  const requestClose = () => {
    if (!onClose) return;
    if (closeNeedsConfirming) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  // A run that ends while the confirmation is up takes the question with it:
  // by then it is asking about work that is no longer running.
  useEffect(() => {
    if (!closeNeedsConfirming) setConfirmingClose(false);
  }, [closeNeedsConfirming]);

  // Enter on a confirmation nobody read should put the merchant back in the
  // run, not out of it, so the safe choice takes the focus.
  useEffect(() => {
    if (confirmingClose) stayButton.current?.focus({ preventScroll: true });
  }, [confirmingClose]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!open) {
      lastTick.current = null;
      elapsedRef.current = 0;
      segmentRef.current = 0;
      segmentStart.current = 0;
      setElapsed(0);
      setSegment(0);
      return;
    }
    lastTick.current = Date.now();
    elapsedRef.current = initialElapsedRef.current;
    setElapsed(elapsedRef.current);
    // Wall-clock deltas rather than a tick count: a backgrounded tab throttles
    // the interval, and a counted clock would drift slow by however long the
    // merchant spent on another tab.
    const tick = setInterval(() => {
      const now = Date.now();
      const delta = (now - (lastTick.current ?? now)) / 1000;
      lastTick.current = now;
      // Read through a ref so a question appearing pauses the clock without
      // tearing the interval down and restarting it.
      if (pausedRef.current) return;
      elapsedRef.current += delta;
      setElapsed(elapsedRef.current);
    }, 500);
    return () => clearInterval(tick);
  }, [open]);

  // Phases only ever move forward. The build re-runs a `foundation` step of
  // its own after the design half has already covered planning, and without
  // this the bars would rewind to it.
  useEffect(() => {
    if (!open || rawSegment <= segmentRef.current) return;
    segmentRef.current = rawSegment;
    segmentStart.current = elapsedRef.current;
    setSegment(rawSegment);
  }, [open, rawSegment]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const preferred = dialogRef.current?.querySelector<HTMLElement>(
        '[data-modal-autofocus="true"]',
      );
      (preferred ?? dialogRef.current)?.focus();
    });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const root =
        dialogRef.current.querySelector<HTMLElement>('[data-close-confirm="true"]') ??
        dialogRef.current;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!root.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trapFocus);
      previousFocus.current?.focus();
    };
  }, [open]);

  // Escape backs out of the confirmation before it backs out of the run —
  // otherwise the key that asks "close?" also answers it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmingClose) {
        setConfirmingClose(false);
        return;
      }
      requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // `requestClose` is redefined every render; the values it closes over are
    // the dependencies that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, confirmingClose, closeNeedsConfirming, onClose]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('[data-question-heading="true"]')
        ?.focus();
    });
  }, [open, questionIndex, questionsReady]);

  // Stamp every step up to the running one: a plan can jump forward by more
  // than a step between polls, and an unstamped completed row would read as
  // never having run.
  useEffect(() => {
    if (!open) {
      stepStartedAt.current = {};
      return;
    }
    for (let i = 0; i <= Math.min(activeStep, steps.length - 1); i += 1) {
      const id = `${phase}-${i}-${steps[i]?.key}`;
      if (stepStartedAt.current[id] === undefined) {
        stepStartedAt.current[id] = elapsedRef.current;
      }
    }
  }, [open, phase, steps, activeStep]);

  if (!open) return null;

  // Finished phases are full, later ones empty, and the running one fills
  // against its own budget from the moment it started.
  const percents = SEGMENTS.map((seg, index) =>
    index < segment
      ? 100
      : index > segment
        ? 0
        : fillPercent(elapsed - segmentStart.current, seg.seconds),
  );
  // Derived from the bars rather than from a second timer, so the number and
  // the fills can never tell two different stories. A phase that overruns its
  // budget stalls the countdown near its own residual instead of hitting zero
  // while the run is still going.
  const consumed = SEGMENTS.reduce(
    (sum, seg, index) => sum + (seg.seconds * percents[index]) / 100,
    0,
  );
  const remaining = Math.max(0, Math.ceil(TOTAL_SECONDS - consumed));
  /**
   * Below this the clock stops being useful and starts being a liability.
   *
   * The last phase creeps toward — but never reaches — full while it overruns,
   * so the countdown bottoms out a few seconds above zero and sits there. A
   * clock frozen on `0:01` for two minutes reads as a hang; a sentence does
   * not, and it is the more honest thing to say anyway.
   */
  const clockIsUseful = etaKnown && remaining > 5;

  const latest = entries.filter((e) => !e.done).slice(-1)[0] ?? entries.slice(-1)[0];
  const advice = FAILURE_ADVICE[errorCode ?? "unknown"];

  const chosen = current ? (answers[current.id] ?? []) : [];

  const stage = SEGMENTS[segment];
  const StageIcon = stage.icon;
  const stagePercent = Math.round(percents[segment]);
  const hint = waitingHint(
    segment,
    percents[segment],
    Boolean(current),
    designReady,
    buildConfirmed,
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070f]/85 p-0 backdrop-blur-sm animate-[modal-fade_160ms_ease-out] sm:p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gen-progress-title"
          tabIndex={-1}
          dir="rtl"
          className="relative flex h-dvh max-h-dvh w-full max-w-2xl flex-col overflow-hidden border border-[#00c8ff]/15 bg-gradient-to-b from-[#161c46] via-[#111637] to-[#0b0f2b] text-start shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] outline-none animate-[modal-rise_200ms_ease-out] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]"
        >
          {/* Ambient glow. Purely decorative, and behind everything that reads.
              Kept inside its own clipped box: both circles are wider than a
              phone, and an overflowing child leaves the dialog with a scroll
              region that `overflow-hidden` hides but does not remove — enough
              for the browser to scroll the panel sideways the first time
              anything in it takes focus, dragging its headings off screen. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute -top-32 start-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-[#00c8ff]/15 blur-3xl" />
            <div className="absolute -bottom-40 end-0 h-64 w-72 rounded-full bg-[#a855f7]/10 blur-3xl" />
          </div>

          <div className="relative flex shrink-0 items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
            {!error ? (
              <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2">
                {awaitingApproval ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <Clock size={13} />
                    {stalled ? "توقف" : "بانتظار تأكيدك"}
                  </span>
                ) : clockIsUseful ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-white/40" />
                      <span
                        className="font-mono text-sm tabular-nums text-white/70"
                        aria-label="الوقت المتبقي التقريبي"
                        dir="ltr"
                      >
                        ~{formatClock(remaining)}
                      </span>
                    </span>
                    <span className="text-[10px] text-white/35">
                      {paused ? "متوقف بانتظارك" : "متبقٍ تقريباً"}
                    </span>
                  </>
                ) : (
                  // The estimate is spent but the run is not done.
                  <span className="flex items-center gap-1.5 text-[11px] text-white/40">
                    <Clock size={13} />
                    نكمل بعد قليل
                  </span>
                )}
              </div>
            ) : (
              <span />
            )}
            {onClose && (
              <button
                type="button"
                onClick={requestClose}
                aria-label="إغلاق"
                title={closeNeedsConfirming ? "إيقاف وإغلاق" : "إغلاق"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="relative min-h-0 flex-1 no-scrollbar overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
            {!error && (
              <div className="relative mb-1 flex justify-center">
                {/* Wave and spark field behind the mascot, as in the design. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 120"
                  className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-24 w-full max-w-md opacity-60"
                >
                  <path
                    d="M0 70 C 60 40, 110 92, 170 62"
                    fill="none"
                    stroke="url(#gp-wave)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M230 62 C 290 92, 340 40, 400 70"
                    fill="none"
                    stroke="url(#gp-wave)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="118" cy="34" r="2.5" fill="#00c8ff" opacity="0.8" />
                  <circle cx="292" cy="42" r="2" fill="#22d3ee" opacity="0.7" />
                  <circle cx="64" cy="86" r="1.6" fill="#a855f7" opacity="0.6" />
                  <circle cx="344" cy="88" r="1.6" fill="#00c8ff" opacity="0.5" />
                  <defs>
                    <linearGradient id="gp-wave" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#00c8ff" stopOpacity="0" />
                      <stop offset="50%" stopColor="#00c8ff" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                {reducedMotion ? (
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#00c8ff]/25 bg-[#00c8ff]/10"
                    role="img"
                    aria-label={MASCOTS[phase].alt}
                  >
                    <Sparkles size={30} className="text-[#00c8ff]" />
                  </div>
                ) : (
                  <img
                    // Keyed so React swaps the element rather than reusing it: an
                    // unkeyed src change leaves the old GIF's last frame on screen
                    // until the new one has decoded.
                    key={phase}
                    src={MASCOTS[phase].src}
                    alt={MASCOTS[phase].alt}
                    width={150}
                    height={150}
                    className="relative h-24 w-auto select-none sm:h-32"
                    draggable={false}
                  />
                )}
              </div>
            )}

            <h2
              id="gen-progress-title"
              data-modal-autofocus="true"
              tabIndex={-1}
              className="flex items-center justify-center gap-2 text-center text-xl font-bold text-white outline-none sm:text-2xl"
            >
              {error
                ? "تعذر إنشاء متجرك"
                : awaitingApproval
                  ? current
                    ? "أكمل خيارات تصميمك"
                    : stalled
                      ? "توقف بناء متجرك"
                      : "تصميم متجرك جاهز"
                  : "جاري إنشاء متجرك"}
              {!error && <Sparkles size={18} className="text-[#00c8ff]" />}
            </h2>

            {!error && (
              <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-white/45">
                {storeName ? (
                  <>
                    <span className="font-medium text-white/85">{storeName}</span>
                    {" — "}
                  </>
                ) : null}
                نحلل طلبك ونصمم متجرك بالذكاء الاصطناعي، وتستغرق العملية بضع دقائق
                فقط.
              </p>
            )}

            {!error && (
              <>
                {/* The run as numbered phases: which are behind us, which is lit. */}
                <ol className="mt-5 mb-4 flex items-start" aria-label="مراحل الإنشاء">
                  {SEGMENTS.map((seg, index) => {
                    const value = Math.round(percents[index]);
                    const done = index < segment;
                    const running = index === segment;
                    return (
                      <Fragment key={seg.key}>
                        {index > 0 && (
                          <li
                            aria-hidden="true"
                            className="mt-[2.35rem] h-0.5 min-w-4 flex-1 overflow-hidden rounded-full bg-white/10"
                          >
                            <div
                              className={`h-full rounded-full ${SEGMENTS[index - 1].fill} transition-[width] duration-500 ease-linear motion-reduce:transition-none`}
                              style={{ width: done || running ? "100%" : "0%" }}
                            />
                          </li>
                        )}
                        <li
                          className="flex w-[5.5rem] shrink-0 flex-col items-center gap-1.5 sm:w-36"
                          aria-current={running ? "step" : undefined}
                        >
                          <span
                            className={`font-mono text-[11px] tabular-nums ${running ? seg.text : done ? "text-white/40" : "text-white/20"
                              }`}
                            dir="ltr"
                          >
                            {value}%
                          </span>
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors motion-reduce:transition-none ${running
                              ? `border-transparent ${seg.fill} text-[#0b0f2b] ${seg.glow}`
                              : done
                                ? "border-[#00c8ff]/40 bg-[#00c8ff]/10 text-[#00c8ff]"
                                : "border-white/12 bg-white/[0.03] text-white/30"
                              }`}
                          >
                            {done ? <Check size={16} /> : <span dir="ltr">{index + 1}</span>}
                          </span>
                          <span
                            className={`text-center text-[10px] leading-tight sm:text-[11px] ${running
                              ? "font-medium text-white"
                              : done
                                ? "text-white/45"
                                : "text-white/25"
                              }`}
                          >
                            {seg.label}
                          </span>
                        </li>
                      </Fragment>
                    );
                  })}
                </ol>

                {/* The running phase, spelled out: what it is and how far in. */}
                <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:gap-4 sm:p-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#00c8ff]/25 bg-[#00c8ff]/10 sm:h-12 sm:w-12"
                    aria-hidden="true"
                  >
                    <StageIcon size={20} className={stage.text} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white sm:text-base">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-white/45">
                      {latest?.message ?? stage.hint}
                    </p>
                  </div>
                  <ProgressRing
                    percent={percents[segment]}
                    color={stage.stroke}
                    label={stage.label}
                  />
                </div>

                {current && (
                  <QuestionStep
                    question={current}
                    chosen={chosen}
                    index={questionIndex}
                    total={questions.length}
                    revisited={revisitedQuestion}
                    onAnswer={(value) => onAnswer?.(current, value)}
                    onNext={onNextQuestion}
                    onPrevious={onPreviousQuestion}
                    onSkip={onSkipQuestions}
                    designReady={designReady}
                  />
                )}

                {showingConfirmation && (
                  <ConfirmationStep
                    questions={questions}
                    answers={answers}
                    designReady={designReady}
                    stalled={stalled}
                    confirmed={buildConfirmed}
                    onEdit={questions.length ? onPreviousQuestion : undefined}
                    onConfirm={onConfirmBuild}
                  />
                )}

                {steps.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 px-1 text-[11px] text-white/35">سجل العمليات</p>
                    <ul className="max-h-40 space-y-1 no-scrollbar overflow-y-auto">
                      {steps.map((step, index) => {
                        const done = index < activeStep;
                        const active = index === activeStep;
                        const startedAt =
                          stepStartedAt.current[`${phase}-${index}-${step.key}`];
                        return (
                          <li
                            key={step.key}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${active ? "bg-white/5" : ""
                              }`}
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                              {done ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : active && stalled ? (
                                <AlertCircle size={13} className="text-amber-400" />
                              ) : active ? (
                                <Loader2
                                  size={13}
                                  className="animate-spin text-[#00c8ff] motion-reduce:animate-none"
                                />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                              )}
                            </span>
                            <span
                              className={`min-w-0 flex-1 truncate text-xs ${done
                                ? "text-white/45"
                                : active
                                  ? "font-medium text-white"
                                  : "text-white/25"
                                }`}
                            >
                              {step.label}
                            </span>
                            <span
                              className="shrink-0 font-mono text-[10px] tabular-nums text-white/30"
                              dir="ltr"
                            >
                              {startedAt === undefined
                                ? "…"
                                : formatClock(startedAt).padStart(5, "0")}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Nothing is running while we wait on the merchant, so the
                    card that promises to tell them when it finishes has
                    nothing to promise. */}
                {!awaitingApproval && (
                  <div className="mt-3 flex items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/2 px-4 py-3">
                    <Coffee size={20} className="shrink-0 text-[#00c8ff]/70" aria-hidden="true" />
                    <div className="min-w-0 text-center">
                      <p className="text-sm text-white/75">{hint}</p>
                      <p className="mt-0.5 text-[11px] text-white/35">
                        سنعلمك فور الانتهاء
                      </p>
                    </div>
                  </div>
                )}
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                  {latest?.message}
                </div>
              </>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-start">
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{advice.title}</p>
                    <p className="mt-1 text-red-300/85">{error}</p>
                    {advice.advice && (
                      <p className="mt-1 text-xs text-red-300/60">{advice.advice}</p>
                    )}
                    {refunded && (
                      <p className="mt-2 text-xs text-red-300/70">
                        تمت إعادة الرصيد إلى حسابك.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {onRetry && advice.retry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="min-h-11 flex-1 rounded-full bg-[#00c8ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#33d4ff]"
                    >
                      إعادة المحاولة
                    </button>
                  )}
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
                    >
                      إغلاق
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {confirmingClose && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05070f]/80 p-4 backdrop-blur-sm animate-[modal-fade_140ms_ease-out]">
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="gen-close-title"
                aria-describedby="gen-close-body"
                data-close-confirm="true"
                className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#161c46] to-[#0b0f2b] p-5 text-start shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#00c8ff]" />
                  <div className="min-w-0">
                    <p id="gen-close-title" className="text-sm font-medium text-white">
                      {phase === "code" ? "إغلاق نافذة الإنشاء؟" : "إيقاف تصميم متجرك؟"}
                    </p>
                    <p
                      id="gen-close-body"
                      className="mt-1.5 text-[13px] leading-relaxed text-white/60"
                    >
                      {phase === "code"
                        ? // The credit is already spent and the server does not
                          // stop when the tab does, so offering to "cancel" here
                          // would be a promise we cannot keep. What closing
                          // actually does is stop watching.
                          "سيستمر بناء متجرك على الخادم بعد الإغلاق، ولن يُخصم رصيد إضافي. يمكنك متابعته من سجل متاجرك أو بإعادة فتح الصفحة."
                        : "لم يُخصم أي رصيد بعد، وسيتوقف العمل على التصميم. وصف متجرك يبقى كما هو لتبدأ من جديد متى شئت."}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    ref={stayButton}
                    onClick={() => setConfirmingClose(false)}
                    className="min-h-11 flex-1 rounded-full bg-[#00c8ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#33d4ff]"
                  >
                    {phase === "code" ? "البقاء هنا" : "متابعة التصميم"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingClose(false);
                      onClose?.();
                    }}
                    className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
                  >
                    {phase === "code" ? "إغلاق" : "إيقاف"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

/**
 * The running phase's fill, as a ring.
 *
 * A ring rather than a fourth bar: the stepper above already carries the shape
 * of the run, and repeating it as a bar beside the stage name would say the
 * same thing twice. The number sits in the middle so the ring never has to be
 * read for precision.
 */
function ProgressRing({
  percent,
  color,
  label,
}: {
  percent: number;
  color: string;
  label: string;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const value = Math.round(percent);
  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          // Linear over the tick interval, so consecutive updates read as one
          // continuous crawl rather than a series of eased hops.
          strokeDashoffset={circumference * (1 - Math.min(1, percent / 100))}
          className="transition-[stroke-dashoffset] duration-500 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <span
        className="absolute font-mono text-xs tabular-nums text-white"
        dir="ltr"
      >
        {value}%
      </span>
    </div>
  );
}

/**
 * The colour question, as colours.
 *
 * Three things went wrong here in order, and the third is the one worth
 * recording. It began as a list of radio rows with three 20px chips on each —
 * the same shape as every other question and the wrong shape for this one,
 * because a colour is not a label to read. The correction overshot into cards
 * big enough to show a miniature of the store, which took more of the panel
 * than the question they answered.
 *
 * Both of those were size problems. The third was not: hard-edged stripes
 * inside an 8px-radius box with a hairline border is a colour picker from
 * fifteen years ago, and it sat inside a product built out of 28px radii,
 * gradient fills, translucent surfaces and soft glows. It matched nothing
 * around it.
 *
 * So the swatch is built from the platform's own vocabulary — `index.css`:
 *
 *  - the primary and the accent as **two triangles split on one diagonal**,
 *    rather than stripes. A blend between them would be a third colour the
 *    store never paints; a hard edge shows two colours and says they are two.
 *    The same angle on every swatch, so a row of four reads as one set.
 *  - `rounded-2xl`, in the family of the `[32px]` composer and the `[28px]`
 *    modal it lives in, rather than the `rounded-lg` of a generic dark theme.
 *  - selection as a **ring plus outer glow** in `--color-brand-primary`, which
 *    is the treatment this modal already gives its own active step node — and
 *    the brand's real cyan, not the `#00c8ff` that had been hand-typed near it.
 *  - a hover lift, matching `.card-hover`.
 *
 * The ground the store is painted on is deliberately **not** shown, though it
 * was for a while. `derivePalette` mixes 2% of the primary into a light ground
 * and 12% into a dark one, so across a whole row of palettes it produced
 * `#FDFBFB`, `#FAFBFC`, `#FEFCFB`, `#FBFCFC` — five whites nobody can tell
 * apart. And light-versus-dark is its own question, so every tile in the row
 * shares one mode by construction and the dot was identical on all of them. It
 * distinguished nothing between the options it sat on, while reading like a
 * status badge, and its halo existed only to rescue it from a dark swatch —
 * effort spent making a non-signal visible. The `surfaceColor` still travels
 * on the option; nothing here draws it.
 */
function PaletteRow({
  options,
  chosen,
  onAnswer,
  labelledBy,
}: {
  options: QuestionOption[];
  chosen: string[];
  onAnswer: (value: string) => void;
  labelledBy: string;
}) {
  const customOption = options.find((option) => option.custom);
  const answer = chosen[0] ?? "";
  const isCustom = answer.startsWith("custom:");

  /**
   * The colours in the picker.
   *
   * Read out of the answer when there is one, so returning to this question
   * shows what was chosen rather than resetting; seeded from the recommended
   * palette otherwise, so the wheel opens on the store's current colours
   * instead of an arbitrary hex.
   */
  const [customPrimary, customSecondary] = isCustom
    ? answer.split(":").slice(1)
    : [
      customOption?.palette?.primaryColor ?? "#4272FF",
      customOption?.palette?.secondaryColor ?? "#4272FF",
    ];

  const setCustom = (primary: string, secondary: string) =>
    onAnswer(`custom:${primary}:${secondary}`);

  // A row of fixed-size swatches, not a four-column grid.
  //
  // The grid stretched each one to a quarter of whatever it was given, which on
  // the modal's own 672px is a 150px square — the colour question taking more
  // room than every other question put together, and taking it because of the
  // container rather than because it needed it. A swatch has a size at which it
  // can be judged, and past that the extra pixels say nothing.
  return (
    <>
      <div
        className="flex flex-wrap gap-3"
        role="radiogroup"
        aria-labelledby={labelledBy}
      >
        {options.map((option) => {
          const active = option.custom ? isCustom : answer === option.value;
          // The custom tile shows what the merchant picked once they have
          // picked; until then it shows the wheel, not a colour it does not have.
          const palette = option.custom
            ? isCustom
              ? { ...option.palette!, primaryColor: customPrimary, secondaryColor: customSecondary }
              : undefined
            : option.palette;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              // The swatch is decoration to a screen reader; the name below is
              // the accessible label, and a gradient cannot be read aloud.
              aria-label={option.label}
              onClick={() =>
                option.custom
                  ? setCustom(customPrimary, customSecondary)
                  : onAnswer(option.value)
              }
              className="group w-20 text-center outline-none"
            >
              <span
                className={`relative aspect-8/6 block w-full rounded-xl transition-all duration-300 motion-reduce:transition-none ${active
                  ? "ring-2 ring-brand-primary shadow-[0_0_0_4px_rgba(51,197,255,0.10),0_0_24px_-6px_rgba(51,197,255,0.75)]"
                  : "ring-1 ring-white/10 group-hover:-translate-y-0.5 group-hover:ring-white/30 group-focus-visible:ring-white/40"
                  }`}
                style={{
                  // The unpicked custom tile wears a colour wheel — the one
                  // universally understood sign for "choose your own" — rather
                  // than a made-up pair of colours the merchant never chose.
                  ...(palette
                    ? {}
                    : {
                      backgroundImage:
                        "conic-gradient(#ff4d4d, #ffd24d, #4dff88, #4dd2ff, #7d4dff, #ff4dd2, #ff4d4d)",
                    }),
                  // `to bottom left` rather than an angle in degrees. On the
                  // square the two coincide at 45°, but the keyword is the one
                  // that stays correct: it puts the 50% line through the other
                  // two corners whatever the box turns out to be, so these are
                  // triangles by construction rather than by the grid happening
                  // to divide evenly. A fixed `135deg` cuts trapezoids the
                  // moment a swatch is not square.
                  //
                  // The primary takes the top-right half, which is where the eye
                  // enters in Arabic.
                  ...(palette
                    ? {
                      backgroundImage:
                        `linear-gradient(to bottom left, ${palette.primaryColor} 0%, ${palette.primaryColor} 50%, ` +
                        `${palette.secondaryColor} 50%, ${palette.secondaryColor} 100%)`,
                    }
                    : {}),
                }}
                aria-hidden="true"
              >
              </span>
              {/* Wrapped rather than truncated: the swatch is now narrower than
                the names it carries, and "ألوان المرج…" identifies nothing. */}
              <span
                className={`mt-2 line-clamp-2 block text-[10px] leading-tight transition-colors motion-reduce:transition-none ${active ? "text-white" : "text-white/45 group-hover:text-white/75"
                  }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Only once the tile is chosen. Two wheels permanently under the row
          would make a question four people in five answer with one tap look
          like a form. */}
      {isCustom && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ColorField
            label="اللون الأساسي"
            value={customPrimary}
            onChange={(next) => setCustom(next, customSecondary)}
          />
          <ColorField
            label="اللون الثانوي"
            value={customSecondary}
            onChange={(next) => setCustom(customPrimary, next)}
          />
        </div>
      )}
    </>
  );
}

/**
 * One colour, picked with the platform's own picker.
 *
 * `input[type=color]` rather than a hand-built wheel: it is the control every
 * merchant already knows, it is the one their phone opens full-screen with a
 * dropper and recent colours, and a bespoke one would be a worse version of it
 * in every respect except looking like ours. The native chrome is hidden and
 * the swatch is drawn in the product's own vocabulary.
 */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex min-h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-[14px] bg-white/5 px-3 py-2 ring-1 ring-white/10 transition-colors hover:bg-white/[0.07] hover:ring-white/25 focus-within:ring-brand-primary/50">
      <span
        className="h-6 w-6 shrink-0 rounded-lg ring-1 ring-white/25"
        style={{ backgroundColor: value }}
      />
      <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">
        {label}
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase text-white/35" dir="ltr">
        {value}
      </span>
      {/* Covering the field rather than `sr-only`: the browser anchors its
          picker to the input's own box, so a 1px one in the corner opens the
          wheel somewhere the merchant did not click. Transparent, full size,
          and still the real control — so the keyboard and the phone's
          full-screen picker both behave exactly as they would anywhere else. */}
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={label}
      />
    </label>
  );
}

/**
 * One decision, asked while the store is being designed.
 *
 * Single-answer questions advance on tap: there is no value in making someone
 * choose and then confirm. Multi-answer ones need an explicit next, because
 * "done choosing" is not observable from a tap.
 */
function QuestionStep({
  question,
  chosen,
  index,
  total,
  revisited,
  onAnswer,
  onNext,
  onPrevious,
  onSkip,
  designReady,
}: {
  question: DesignQuestion;
  chosen: string[];
  index: number;
  total: number;
  revisited: boolean;
  onAnswer: (value: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  designReady: boolean;
}) {
  const multi = question.kind === "multi";
  // A colour question is answered by looking, not by reading. Detected off the
  // options rather than off the question's id, so the server stays free to
  // ask a second one without the client having to learn its name.
  const palette =
    question.options.length > 0 &&
    question.options.every((option) => option.palette);

  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-white/40">
          سؤال {index + 1} من {total}
        </span>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all motion-reduce:transition-none ${i < index
                ? "w-4 bg-[#00c8ff]"
                : i === index
                  ? "w-6 bg-white/70"
                  : "w-4 bg-white/15"
                }`}
            />
          ))}
        </div>
      </div>

      <p
        id={`question-heading-${index}`}
        data-question-heading="true"
        tabIndex={-1}
        className="mb-2 text-base font-medium leading-relaxed text-white outline-none"
      >
        {question.question}
      </p>
      {multi && (
        <p className="mb-3 text-xs text-white/45">يمكنك اختيار أكثر من إجابة، ثم اضغط التالي. اتركها فارغة لاستخدام توصيتنا.</p>
      )}

      {palette ? (
        <PaletteRow
          options={question.options}
          chosen={chosen}
          onAnswer={onAnswer}
          labelledBy={`question-heading-${index}`}
        />
      ) : (
        <div
          className="space-y-2"
          role={multi ? "group" : "radiogroup"}
          aria-labelledby={`question-heading-${index}`}
        >
          {question.options.map((option) => {
            const active = chosen.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role={multi ? "checkbox" : "radio"}
                onClick={() => onAnswer(option.value)}
                aria-checked={active}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-start text-sm transition motion-reduce:transition-none ${active
                  ? "border-[#00c8ff] bg-[#00c8ff]/15 text-white"
                  : "border-white/12 text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-white"
                  }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border transition motion-reduce:transition-none ${multi ? "rounded" : "rounded-full"
                    } ${active ? "border-[#00c8ff] bg-[#00c8ff]" : "border-white/25"}`}
                >
                  {active && <Check size={11} className="text-[#0b0f19]" />}
                </span>
                <span className="min-w-0 flex-1">{option.label}</span>
                {option.recommended && (
                  <span className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/45">
                    موصى به
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(multi || revisited) && (
          <button
            type="button"
            onClick={onNext}
            className="min-h-11 flex-1 rounded-full bg-[#00c8ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#33d4ff]"
          >
            التالي
          </button>
        )}
        {index > 0 && (
          <button
            type="button"
            onClick={onPrevious}
            className="min-h-11 flex-1 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            السابق
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="min-h-11 w-full rounded-full px-4 py-2 text-xs text-white/45 transition-colors hover:text-white/70"
        >
          استخدام التوصيات والمتابعة
        </button>
      </div>

      <p className="mt-2 text-center text-xs text-white/30">
        {designReady
          ? "التصميم جاهز وينتظر مراجعة اختياراتك."
          : "نحن نصمم متجرك الآن، وسنحفظ اختياراتك."}
      </p>
    </div>
  );
}

function ConfirmationStep({
  questions,
  answers,
  designReady,
  stalled = false,
  confirmed,
  onEdit,
  onConfirm,
}: {
  questions: DesignQuestion[];
  answers: DesignAnswers;
  designReady: boolean;
  stalled?: boolean;
  confirmed: boolean;
  onEdit?: () => void;
  onConfirm?: () => void;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-[#00c8ff]/25 bg-[#00c8ff]/[0.06] p-4">
      <h3
        data-question-heading="true"
        tabIndex={-1}
        className="text-base font-semibold text-white outline-none"
      >
        {stalled ? "أكمل بناء متجرك" : "راجع اختياراتك قبل البناء"}
      </h3>
      {questions.length > 0 ? (
        <ul className="mt-3 max-h-28 space-y-2 no-scrollbar overflow-y-auto">
          {questions.map((question) => {
            const selected = question.options
              .filter((option) => (answers[question.id] ?? []).includes(option.value))
              .map((option) => option.label);
            return (
              <li key={question.id} className="text-xs text-white/55">
                <span className="text-white/80">{question.question}</span>
                <span className="mt-0.5 block">
                  {selected.length ? selected.join("، ") : "حسب توصيتنا"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/60">سنستخدم توصيات التصميم المناسبة لوصف متجرك.</p>
      )}
      <p className="mt-3 text-xs text-white/40">
        {stalled
          ? "توقفت المحاولة السابقة قبل أن تكتمل، وستُستأنف من تصميمك المحفوظ دون خصم رصيد إضافي."
          : designReady
            ? "التصميم جاهز، وسيبدأ البناء بعد التأكيد."
            : "يمكنك التأكيد الآن، وسيبدأ البناء فور اكتمال التصميم."}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmed}
          className="min-h-11 flex-1 rounded-full bg-[#00c8ff] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-60"
        >
          {confirmed ? "تم التأكيد" : stalled ? "متابعة البناء" : "تأكيد وبدء البناء"}
        </button>
        {onEdit && !confirmed && (
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/5"
          >
            تعديل
          </button>
        )}
      </div>
    </div>
  );
}
