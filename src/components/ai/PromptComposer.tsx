import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, Sparkle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCredits,
  aiGeneratorKeys,
} from "@/api/wrappers/aiStoreGenerator.wrappers";
import {
  aiStoreGeneratorAPI,
  type DesignAnswers,
  type DesignQuestion,
  type FailureCode,
  type GenerationEvent,
} from "@/api/endpoints/aiStoreGenerator.endpoints";
import AuthModal from "./AuthModal";
import GenerationProgress, {
  preloadMascot,
  type GenerationPhase,
  type ProgressEntry,
} from "./GenerationProgress";
import type {
  PageDesign,
  PlannedStep,
} from "@/api/endpoints/aiStoreGenerator.endpoints";
import SuccessModal from "./SuccessModal";
import CreditsBadge from "./CreditsBadge";
import BuyCreditsModal from "./BuyCreditsModal";

/**
 * The landing page's primary call to action: describe a store, get one.
 *
 * The draft is mirrored to sessionStorage because signing in can involve an
 * OTP round trip, and losing a carefully typed prompt to a stray reload is the
 * fastest way to lose the user.
 */

const DRAFT_KEY = "ai-store-prompt-draft";
/** Mirrors PROMPT_MAX_LENGTH on the server, so the limit is visible while
 *  typing rather than arriving as a 400 after a submit. */
const PROMPT_MAX_LENGTH = 8000;
const PROMPT_MIN_LENGTH = 10;
const MAX_IMAGES = 3;
/** Downscaled before upload — a phone photo is megabytes of no extra signal. */
const MAX_IMAGE_EDGE = 1600;

/** Same pattern the server uses to spot a Figma link in free text. */
const FIGMA_URL =
  /@?(https?:\/\/(?:www\.)?figma\.com\/(?:design|file|board)\/[^\s]+)/;

type Phase =
  | "idle"
  | "uploading"
  /**
   * Deciding the design, and asking the merchant the open questions while it
   * happens. Nothing has been built and nothing charged yet.
   *
   * There is no separate review phase any more. The design was being finished
   * and then put on screen for approval, which turned a wait into a wait plus
   * a reading task — and buried the questions underneath it. The design is now
   * kept under the hood and the questions own the wait.
   */
  | "designing"
  | "generating"
  | "polling"
  | "done";

/** Re-encodes an image to at most MAX_IMAGE_EDGE on its long side. */
async function downscale(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export default function PromptComposer() {
  const { user } = useAuth();
  const { data: credits } = useCredits(Boolean(user));
  const queryClient = useQueryClient();

  // Handle a ZainCash credit purchase return (success or failure).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    const result = params.get("result");
    if (!paymentId) return;

    aiStoreGeneratorAPI
      .getCreditPurchaseStatus(paymentId)
      .then((data) => {
        if (data.status === "PAID") {
          toast.success("تم شحن الرصيد بنجاح");
          queryClient.invalidateQueries({ queryKey: aiGeneratorKeys.credits() });
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          toast.error("فشلت عملية الدفع أو انتهت صلاحيتها");
        } else if (result === "failure") {
          toast.error("لم تكتمل عملية الدفع");
        }
      })
      .catch(() => toast.error("تعذر التحقق من حالة الدفع"))
      .finally(() => {
        params.delete("paymentId");
        params.delete("result");
        params.delete("status");
        const clean =
          params.toString().length > 0
            ? `?${params.toString()}`
            : window.location.pathname;
        window.history.replaceState({}, "", clean);
      });
  }, [queryClient]);

  const [prompt, setPrompt] = useState(
    () => sessionStorage.getItem(DRAFT_KEY) || "",
  );
  const [images, setImages] = useState<File[]>([]);
  /**
   * The merchant's own logo.
   *
   * Kept apart from the design references on purpose: it is a brand asset to
   * put *in* the store, not an image to design *from*. Mixed into
   * `referenceImages` it would be transcribed as a page and reproduced as a
   * layout, which is the failure mode this whole flow is being fixed for.
   */
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [steps, setSteps] = useState<PlannedStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [storeName, setStoreName] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<FailureCode | null>(null);
  const [refunded, setRefunded] = useState(false);
  const [success, setSuccess] = useState<{
    editorUrl: string;
    storeUrl?: string;
    storeName: string;
    subdomain?: string;
  } | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  /** Uploaded reference urls, carried from the design phase into the build. */
  const [pendingRefs, setPendingRefs] = useState<string[] | undefined>();
  const [pendingLogo, setPendingLogo] = useState<string | undefined>();
  const [questions, setQuestions] = useState<DesignQuestion[]>([]);
  /**
   * Pre-filled with every recommendation the moment the questions arrive.
   *
   * That is what makes the step skippable without losing anything: a merchant
   * who never touches it still builds on the model's own best answers, which
   * is exactly what they would have got before the questions existed.
   */
  const [answers, setAnswers] = useState<DesignAnswers>({});
  /**
   * The same answers, readable synchronously.
   *
   * When the design phase returns no design to review, `run` calls `runBuild`
   * in the same turn that just seeded the answers — and the `answers` binding
   * that closure captured is still the empty object from the previous render.
   * The merchant's recommendations were silently dropped on exactly the path
   * where they are the only answers there will ever be.
   */
  const answersRef = useRef<DesignAnswers>({});
  /**
   * Which question is on screen. `questions.length` means "all answered".
   *
   * Starts past the end so nothing shows until questions actually arrive.
   */
  const [questionIndex, setQuestionIndex] = useState(0);
  /**
   * The build, waiting for the merchant to finish answering.
   *
   * The design and the questions finish in whichever order they finish — the
   * questions are emitted the moment they exist, and the director usually
   * takes longer. Parking the build here lets either one arrive first.
   */
  const [pendingBuild, setPendingBuild] = useState<{
    id: string;
    referenceImages?: string[];
    logoUrl?: string;
  } | null>(null);
  const buildStartedRef = useRef(false);
  const [buyOpen, setBuyOpen] = useState(false);

  // `?credits=1` opens the top-up modal on arrival.
  //
  // The editor is a separate app with no billing UI of its own, so when the
  // AI assistant there reports "لا يوجد رصيد كافٍ" the only thing it can offer
  // is a link here. Without this the link dropped the merchant on the landing
  // page with no indication of what to do next.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credits") !== "1") return;

    setBuyOpen(true);

    params.delete("credits");
    const clean =
      params.toString().length > 0
        ? `?${params.toString()}`
        : window.location.pathname;
    window.history.replaceState({}, "", clean);
  }, []);


  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  // Survives the auth modal without being a render dependency.
  const pendingSubmit = useRef(false);
  // The SSE callback closes over state from when the run started, so the step
  // plan is read through a ref rather than the stale `steps` value.
  const stepsRef = useRef<PlannedStep[]>([]);
  // Set to true when the stream emits its terminal event (proposal/done/error).
  const designTerminalRef = useRef(false);
  const buildTerminalRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, prompt);
  }, [prompt]);

  // If the SSE connection drops before the server finishes, fall back to
  // polling the generation status so the modal stays open until the run is
  // actually complete.
  useEffect(() => {
    if (phase !== "polling" || !generationId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const data = await aiStoreGeneratorAPI.getGeneration(generationId);
        if (cancelled) return;

        if (data.status === "SUCCEEDED") {
          const { redirectUrl } = await aiStoreGeneratorAPI.openGeneration(
            generationId,
          );
          if (cancelled) return;
          const url = new URL(redirectUrl);
          const subdomain = url.searchParams.get("store") ?? undefined;
          setSuccess({
            editorUrl: redirectUrl,
            storeName: storeName ?? "",
            subdomain,
          });
          sessionStorage.removeItem(DRAFT_KEY);
          setPhase("done");
        } else if (data.status === "FAILED") {
          setError(data.error || "فشل إنشاء المتجر.");
          setPhase("idle");
        }
      } catch (e) {
        // Polling errors are transient — the next tick will retry.
      }
    };

    void tick();
    const interval = setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, generationId, storeName]);

  // Lift a pasted Figma link out of the text into its own chip.
  useEffect(() => {
    const match = prompt.match(FIGMA_URL);
    setFigmaUrl(match ? match[1] : null);
  }, [prompt]);

  const addStatus = (message: string) =>
    setEntries((prev) => [
      ...prev.map((e) => ({ ...e, done: true })),
      { message, done: false },
    ]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`يمكنك إرفاق ${MAX_IMAGES} صور كحد أقصى`);
      return;
    }
    const accepted = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    const processed = await Promise.all(accepted.map(downscale));
    setImages((prev) => [...prev, ...processed]);
  };

  const handleLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("الشعار يجب أن يكون صورة");
      return;
    }
    // Downscaled like every other upload: a 4000px logo costs the merchant
    // upload time for pixels the navbar renders at 48.
    const processed = await downscale(file);
    setLogo(processed);
    setLogoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(processed);
    });
  };

  const clearLogo = () => {
    setLogo(null);
    setLogoPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  };

  const hasStoreCredits = () =>
    Boolean(
      credits?.unlimited ||
      (credits &&
        ((credits.generations?.remaining ?? 0) +
          (credits.generations?.purchased ?? 0)) > 0),
    );

  const run = async () => {
    setError(null);
    setErrorCode(null);
    setRefunded(false);
    setEntries([]);
    setSteps([]);
    stepsRef.current = [];
    setActiveStep(0);
    setStoreName(undefined);

    if (user && !hasStoreCredits()) {
      setBuyOpen(true);
      setError("لا يوجد رصيد كافٍ. اشحن رصيدك أولاً.");
      return;
    }

    try {
      let referenceImages: string[] = [];
      let logoUrl: string | undefined;

      if (images.length || logo) {
        setPhase("uploading");
        addStatus(
          images.length ? "جاري رفع الصور المرجعية..." : "جاري رفع الشعار...",
        );
        // Two calls rather than one batch: the endpoint accepts three files,
        // and three references plus a logo is four — batching them would drop
        // whichever went last.
        const [refs, logoUrls] = await Promise.all([
          images.length
            ? aiStoreGeneratorAPI.uploadReferences(images)
            : Promise.resolve({ urls: [] as string[] }),
          logo
            ? aiStoreGeneratorAPI.uploadReferences([logo])
            : Promise.resolve({ urls: [] as string[] }),
        ]);
        referenceImages = refs.urls;
        logoUrl = logoUrls.urls[0];
        setPendingRefs(refs.urls);
        setPendingLogo(logoUrl);
      }

      // A second run must not show the previous run's design — or its
      // questions, which belong to a store that is no longer being built.
      setQuestions([]);
      setAnswers({});
      answersRef.current = {};
      designTerminalRef.current = false;
      buildTerminalRef.current = false;

      // Phase one: decide the design and show it. No store is created and no
      // credit is charged until the merchant accepts it.
      setPhase("designing");
      addStatus("جاري تصميم المتجر...");

      // A holder rather than a bare `let`: TypeScript cannot see the
      // assignment inside the stream callback and narrows the variable to
      // `never` after the null check.
      const proposal: {
        value: {
          generationId: string;
          design: PageDesign | null;
          storeName: string;
        } | null;
      } = { value: null };

      await aiStoreGeneratorAPI.proposeDesign(
        {
          prompt: prompt.trim(),
          referenceImages,
          figmaUrl: figmaUrl ?? undefined,
          figmaToken: localStorage.getItem("figma_token") ?? undefined,
        },
        (event: GenerationEvent) => {
          switch (event.type) {
            case "plan":
              stepsRef.current = event.steps;
              setSteps(event.steps);
              break;
            case "status":
              addStatus(event.message);
              if (typeof event.index === "number") setActiveStep(event.index);
              break;
            case "template":
              if (event.reason) addStatus(event.reason);
              break;
            case "brand":
              setStoreName(event.storeName);
              break;
            case "questions": {
              setQuestions(event.questions);
              // Seeded with the recommendations so the step is genuinely
              // optional: build now and you get the model's own answers.
              const seeded = Object.fromEntries(
                event.questions.map((question) => [
                  question.id,
                  question.options
                    .filter((option) => option.recommended)
                    .map((option) => option.value),
                ]),
              );
              answersRef.current = seeded;
              setAnswers(seeded);
              setQuestionIndex(0);
              break;
            }
            case "proposal":
              proposal.value = event;
              designTerminalRef.current = true;
              break;
            case "error":
              setError(event.message);
              setErrorCode(event.code ?? null);
              designTerminalRef.current = true;
              break;
          }
        },
      );

      const decided = proposal.value;
      if (!decided) {
        // If the stream ended without a proposal or an error, the connection
        // was dropped before the design phase finished. Surface that rather
        // than silently returning to the composer.
        if (!designTerminalRef.current) {
          setError(
            "انقطع الاتصال قبل اكتمال تصميم المتجر. تحقق من الشبكة وحاول مرة أخرى.",
          );
        }
        setPhase("idle");
        return;
      }

      setGenerationId(decided.generationId);
      setStoreName(decided.storeName);
      setPendingRefs(referenceImages);

      // The design itself stays server-side — it is persisted on the
      // generation row and the build reads it from there. Nothing on the
      // client needs a copy, and holding one only invites showing it.
      preloadMascot("code");

      // Parked rather than started: the merchant may still be answering. The
      // effect below builds as soon as both halves are ready, in whichever
      // order they land.
      setPendingBuild({
        id: decided.generationId,
        referenceImages,
        logoUrl,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر إنشاء المتجر. حاول مرة أخرى.",
      );
      setPhase("idle");
    }
  };

  /**
   * Phase two: build the store from the approved design.
   *
   * The credit is charged here, so revising a design costs nothing.
   */
  const runBuild = async (
    id: string,
    referenceImages?: string[],
    uploadedLogo?: string,
  ) => {
    if (user && !hasStoreCredits()) {
      setBuyOpen(true);
      setError("لا يوجد رصيد كافٍ. اشحن رصيدك أولاً.");
      return;
    }

    setPhase("generating");
    setEntries([]);
    addStatus("جاري بناء المتجر...");

    try {
      let result: {
        editorUrl: string;
        storeUrl?: string;
        storeName: string;
        subdomain: string;
      } | null = null;

      await aiStoreGeneratorAPI.generate(
        {
          prompt: prompt.trim(),
          referenceImages: referenceImages ?? pendingRefs,
          logoUrl: uploadedLogo ?? pendingLogo,
          answers: Object.keys(answersRef.current).length
            ? answersRef.current
            : undefined,
          figmaUrl: figmaUrl ?? undefined,
          figmaToken: localStorage.getItem("figma_token") ?? undefined,
          // Continues the approved design instead of deciding it again.
          generationId: id,
        },
        (event: GenerationEvent) => {
          switch (event.type) {
            case "job":
              setGenerationId(event.id);
              break;
            case "design":
              // The design is not shown, so there is nothing to hold. The
              // event still carries how much of it landed, which the status
              // line below already reports.
              break;
            case "warning":
              addStatus(event.message);
              break;
            case "plan":
              stepsRef.current = event.steps;
              setSteps(event.steps);
              break;
            case "status":
              addStatus(event.message);
              // The server names the running step, so the tracker follows the
              // real pipeline rather than guessing from message text.
              if (typeof event.index === "number") setActiveStep(event.index);
              break;
            case "template":
              if (event.reason) addStatus(event.reason);
              break;
            case "brand":
              setStoreName(event.storeName);
              break;
            case "done":
              setEntries((prev) => prev.map((e) => ({ ...e, done: true })));
              setActiveStep(stepsRef.current.length);
              setStoreName(event.storeName);
              result = {
                editorUrl: event.redirectUrl,
                storeUrl: event.storeUrl,
                storeName: event.storeName,
                subdomain: event.subdomain,
              };
              buildTerminalRef.current = true;
              break;
            case "error":
              setError(event.message);
              setErrorCode(event.code ?? null);
              setRefunded(Boolean(event.refunded));
              buildTerminalRef.current = true;
              break;
          }
        },
      );

      if (result) {
        setPhase("done");
        sessionStorage.removeItem(DRAFT_KEY);
        setSuccess(result);
        return;
      }

      // If the stream ended without a terminal event, the connection was
      // likely dropped by a proxy/timeout before the server finished. Keep
      // the modal open and poll the job status instead of closing silently.
      if (!buildTerminalRef.current && generationId) {
        addStatus("انقطع الاتصال بالخادم. جاري التحقق من حالة الإنشاء…");
        setPhase("polling");
        return;
      }

      if (!buildTerminalRef.current) {
        setError(
          "انقطع الاتصال قبل إكمال الإنشاء. تحقق من الشبكة وحاول مرة أخرى.",
        );
      }
      setPhase("idle");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر إنشاء المتجر. حاول مرة أخرى.",
      );
      setPhase("idle");
    }
  };

  /**
   * Accepting the design builds the store from it.
   *
   * This is the point the credit is charged: everything before it — the
   * design and any number of revisions — is free.
   */
  /**
   * Records one answer and moves on.
   *
   * A single-answer question advances on tap — asking someone to choose and
   * then confirm is a step for nothing. A `multi` one stays put, because
   * "finished choosing" is not something a tap can tell us.
   */
  const answerQuestion = (question: DesignQuestion, value: string) => {
    const current = answersRef.current[question.id] ?? [];
    const next =
      question.kind === "multi"
        ? current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        : [value];

    const merged = { ...answersRef.current, [question.id]: next };
    answersRef.current = merged;
    setAnswers(merged);

    if (question.kind !== "multi") setQuestionIndex((i) => i + 1);
  };

  /**
   * Starts the build once the design and the answers are both in.
   *
   * They finish in whichever order they finish: the questions are emitted as
   * soon as they exist, and the director usually runs longer — but a merchant
   * who reads slowly can easily still be answering when the design lands.
   * Whichever is last triggers this.
   */
  useEffect(() => {
    if (!pendingBuild || buildStartedRef.current) return;
    if (questionIndex < questions.length) return;

    buildStartedRef.current = true;
    void runBuild(
      pendingBuild.id,
      pendingBuild.referenceImages,
      pendingBuild.logoUrl,
    );
    // `runBuild` is redefined every render and is not a dependency worth
    // chasing; the ref above is what guarantees one call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBuild, questionIndex, questions.length]);

  const handleGenerate = () => {
    if (prompt.trim().length < PROMPT_MIN_LENGTH) {
      toast.error("يرجى كتابة وصف أوضح لمتجرك");
      return;
    }
    if (prompt.length > PROMPT_MAX_LENGTH) {
      toast.error(`الوصف طويل جداً — الحد الأقصى ${PROMPT_MAX_LENGTH} حرف`);
      return;
    }
    if (!user) {
      // Hold the request and resume it once the modal reports success.
      pendingSubmit.current = true;
      setAuthOpen(true);
      return;
    }
    run();
  };

  const busy =
    phase === "uploading" ||
    phase === "designing" ||
    phase === "generating" ||
    phase === "polling";

  // Designing and reviewing are the design half; everything after the merchant
  // approves is the build.
  const mascotPhase: GenerationPhase =
    phase === "generating" || phase === "polling" || phase === "done"
      ? "code"
      : "design";

  if (busy || phase === "done" || error) {
    return (
      <div className="w-full">
        <GenerationProgress
          open={!success}
          entries={entries}
          steps={steps}
          activeStep={activeStep}
          storeName={storeName}
          phase={mascotPhase}
          error={error}
          errorCode={errorCode}
          refunded={refunded}
          questions={questions}
          answers={answers}
          questionIndex={questionIndex}
          onAnswer={answerQuestion}
          onNextQuestion={() => setQuestionIndex((i) => i + 1)}
          onSkipQuestions={() => setQuestionIndex(questions.length)}
          designReady={Boolean(pendingBuild)}
          onRetry={
            error
              ? () => {
                setError(null);
                setErrorCode(null);
                setPhase("idle");
                setEntries([]);
                setActiveStep(0);
              }
              : undefined
          }
          onClose={
            error
              ? () => {
                setError(null);
                setErrorCode(null);
                setPhase("idle");
                setEntries([]);
                setActiveStep(0);
              }
              : undefined
          }
        />
        <SuccessModal
          open={Boolean(success)}
          storeName={success?.storeName}
          subdomain={success?.subdomain}
          editorUrl={success?.editorUrl}
          storeUrl={success?.storeUrl}
          onClose={() => {
            // Back to a fresh composer; the store is safe in history.
            setSuccess(null);
            setPhase("idle");
            setEntries([]);
            setPrompt("");
            setImages([]);
            setGenerationId(null);
          }}
        />
        <BuyCreditsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-right backdrop-blur-sm focus-within:border-[#00c8ff]/40 transition-colors">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          // Focus is the earliest reliable signal that a run is coming, and it
          // buys the seconds the mascot needs to decode. Fetched once — the
          // browser caches it, and a repeat call is a cache hit.
          onFocus={() => preloadMascot("design")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
          rows={3}
          placeholder="اوصف متجرك… مثال: متجر لبيع الأجهزة الإلكترونية والهواتف الذكية في بغداد، بألوان زرقاء عصرية"
          className="w-full resize-none bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:outline-none"
        />

        {/* Only shown as the limit gets close — a counter on every short
            prompt is noise. */}
        {prompt.length > PROMPT_MAX_LENGTH * 0.75 && (
          <p
            className={`px-3 pb-1 text-left text-xs ${prompt.length > PROMPT_MAX_LENGTH ? "text-red-400" : "text-white/35"
              }`}
            dir="ltr"
          >
            {prompt.length.toLocaleString()} / {PROMPT_MAX_LENGTH.toLocaleString()}
          </p>
        )}

        {(images.length > 0 || figmaUrl) && (
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            {images.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                {file.name.slice(0, 22)}
                <button
                  type="button"
                  aria-label={`إزالة ${file.name}`}
                  onClick={() =>
                    setImages((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {figmaUrl && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 px-3 py-1 text-xs text-[#00c8ff]">
                Figma
                <button
                  type="button"
                  aria-label="إزالة رابط Figma"
                  onClick={() => setPrompt((p) => p.replace(FIGMA_URL, "").trim())}
                  className="opacity-60 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {logoPreview && (
          <div className="mb-2 flex flex-wrap gap-2 px-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00c8ff]/30 bg-[#00c8ff]/10 py-1 pe-2 ps-1 text-xs text-white/80">
              <img
                src={logoPreview}
                alt=""
                className="h-6 w-6 rounded-full object-contain"
              />
              شعار المتجر
              <button
                type="button"
                onClick={clearLogo}
                aria-label="إزالة الشعار"
                className="rounded-full p-0.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              title="أرفق صورة مرجعية للتصميم"
              aria-label="أرفق صورة مرجعية"
              className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/5 hover:text-white/80 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => logoInput.current?.click()}
              title="أرفق شعار متجرك ليُستخدم مباشرة"
              aria-label="أرفق شعار المتجر"
              className={`rounded-full p-2 transition-colors hover:bg-white/5 ${logo ? "text-[#00c8ff]" : "text-white/40 hover:text-white/80"
                }`}
            >
              <Sparkle size={18} />
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                handleLogo(e.target.files);
                e.target.value = "";
              }}
            />
            <CreditsBadge />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={
              prompt.trim().length < PROMPT_MIN_LENGTH ||
              prompt.length > PROMPT_MAX_LENGTH
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#00c8ff] px-6 py-2.5 font-medium text-white shadow-[0_0_30px_rgba(0,200,255,0.35)] transition-colors hover:bg-[#33d4ff] disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUp size={16} />
            )}
            أنشئ متجري
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/30">
        أرفق صورة تصميم أو رابط Figma ليحاكيها المتجر
      </p>

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          pendingSubmit.current = false;
        }}
        onAuthenticated={() => {
          setAuthOpen(false);
          if (pendingSubmit.current) {
            pendingSubmit.current = false;
            run();
          }
        }}
      />

      {/* Also mounted here, not only in the post-generation branch above.
          `setBuyOpen(true)` is reachable from this branch — the `?credits=1`
          arrival from the editor lands on exactly this screen — and without the
          modal rendered here that call set state nothing was reading, so the
          merchant arrived at the landing page with no way to top up. */}
      <BuyCreditsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </div>
  );
}
