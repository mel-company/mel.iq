import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  aiStoreGeneratorAPI,
  type GenerationEvent,
} from "@/api/endpoints/aiStoreGenerator.endpoints";
import AuthModal from "./AuthModal";
import GenerationProgress, { type ProgressEntry } from "./GenerationProgress";
import type { PlannedStep } from "@/api/endpoints/aiStoreGenerator.endpoints";
import SuccessModal from "./SuccessModal";
import CreditsBadge from "./CreditsBadge";

/**
 * The landing page's primary call to action: describe a store, get one.
 *
 * The draft is mirrored to sessionStorage because signing in can involve an
 * OTP round trip, and losing a carefully typed prompt to a stray reload is the
 * fastest way to lose the user.
 */

const DRAFT_KEY = "ai-store-prompt-draft";
const MAX_IMAGES = 3;
/** Downscaled before upload — a phone photo is megabytes of no extra signal. */
const MAX_IMAGE_EDGE = 1600;

/** Same pattern the server uses to spot a Figma link in free text. */
const FIGMA_URL =
  /@?(https?:\/\/(?:www\.)?figma\.com\/(?:design|file|board)\/[^\s]+)/;

type Phase = "idle" | "uploading" | "generating" | "done";

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

  const [prompt, setPrompt] = useState(
    () => sessionStorage.getItem(DRAFT_KEY) || "",
  );
  const [images, setImages] = useState<File[]>([]);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [steps, setSteps] = useState<PlannedStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [storeName, setStoreName] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [refunded, setRefunded] = useState(false);
  const [success, setSuccess] = useState<{
    editorUrl: string;
    storeUrl?: string;
    storeName: string;
    subdomain: string;
  } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  // Survives the auth modal without being a render dependency.
  const pendingSubmit = useRef(false);
  // The SSE callback closes over state from when the run started, so the step
  // plan is read through a ref rather than the stale `steps` value.
  const stepsRef = useRef<PlannedStep[]>([]);

  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, prompt);
  }, [prompt]);

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

  const run = async () => {
    setError(null);
    setRefunded(false);
    setEntries([]);
    setSteps([]);
    stepsRef.current = [];
    setActiveStep(0);
    setStoreName(undefined);

    try {
      let referenceImages: string[] = [];

      if (images.length) {
        setPhase("uploading");
        addStatus("جاري رفع الصور المرجعية...");
        const { urls } = await aiStoreGeneratorAPI.uploadReferences(images);
        referenceImages = urls;
      }

      setPhase("generating");
      addStatus("جاري تجهيز الطلب...");

      let result: {
        editorUrl: string;
        storeUrl?: string;
        storeName: string;
        subdomain: string;
      } | null = null;

      await aiStoreGeneratorAPI.generate(
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
              break;
            case "error":
              setError(event.message);
              setRefunded(Boolean(event.refunded));
              break;
          }
        },
      );

      if (result) {
        setPhase("done");
        sessionStorage.removeItem(DRAFT_KEY);
        // The modal decides where to go — the user has just watched a minute
        // of progress and should see what was built first.
        setSuccess(result);
        return;
      }

      setPhase("idle");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "تعذر إنشاء المتجر. حاول مرة أخرى.",
      );
      setPhase("idle");
    }
  };

  const handleGenerate = () => {
    if (prompt.trim().length < 10) {
      toast.error("يرجى كتابة وصف أوضح لمتجرك");
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

  const busy = phase === "uploading" || phase === "generating";

  if (busy || phase === "done" || error) {
    return (
      <div className="w-full">
        <GenerationProgress
          open={!success}
          entries={entries}
          steps={steps}
          activeStep={activeStep}
          storeName={storeName}
          error={error}
          refunded={refunded}
          onRetry={
            error
              ? () => {
                  setError(null);
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
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-right backdrop-blur-sm focus-within:border-[#00c8ff]/40 transition-colors">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
          rows={3}
          placeholder="اوصف متجرك… مثال: متجر لبيع الأجهزة الإلكترونية والهواتف الذكية في بغداد، بألوان زرقاء عصرية"
          className="w-full resize-none bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:outline-none"
        />

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
            <CreditsBadge />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={prompt.trim().length < 10}
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
    </div>
  );
}
