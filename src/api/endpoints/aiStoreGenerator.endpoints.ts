import axiosInstance from "@/utils/AxiosInstance";

export interface PlannedStep {
  key: string;
  label: string;
  /** Rough seconds, used to weight the progress bar. */
  weight: number;
}

/** One section's design decisions, as the director settled them. */
export interface SectionDesign {
  order: number;
  role: string;
  intent: string;
  layout: string;
  hierarchy: string;
  colors: string;
  imagery: string;
  /** Named visual treatments. `devices` is the pre-rename key, still present
   *  on proposals generated before it. */
  visualFeatures?: string[];
  devices?: string[];
  copy: { name: string; text: string }[];
}

export interface PageDesign {
  pageType: string;
  notes: string;
  sections: SectionDesign[];
}

export type GenerationEvent =
  | { type: "job"; id: string }
  /** The ordered steps this run will take, sent before any work starts. */
  | { type: "plan"; steps: PlannedStep[] }
  | {
      type: "status";
      message: string;
      step?: string;
      index?: number;
      total?: number;
    }
  | { type: "template"; templateId: string; reason: string }
  | { type: "brand"; storeName: string }
  /** The vertical the creative director settled on. */
  | { type: "brief"; vertical: string }
  /**
   * The design the store was built from, plus how much of it landed.
   * `design` is null when the composer fell back to filling a template.
   */
  | {
      type: "design";
      designedPages?: number;
      totalPages?: number;
      truncatedPages?: string[];
      skippedPages?: string[];
      design?: PageDesign | null;
    }
  /**
   * The design phase's result. Arrives instead of `done`: nothing has been
   * built or charged yet, and the merchant decides whether it should be.
   */
  | {
      type: "proposal";
      generationId: string;
      design: PageDesign | null;
      storeName: string;
    }
  /** Something degraded but the run continued. */
  | { type: "warning"; code: string; message: string }
  | {
      type: "done";
      generationId: string;
      subdomain: string;
      storeName: string;
      redirectUrl: string;
      /** Storefront address; live only after the user publishes. */
      storeUrl?: string;
      templateId?: string;
      /** Repeated here so a client that reconnected still gets it. */
      design?: PageDesign | null;
    }
  | { type: "error"; message: string; refunded?: boolean };

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  templateId: string | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  error: string | null;
  createdAt: string;
  referenceImages: string[];
  figmaUrl: string | null;
  storeName: string | null;
  store: { id: string; name: string | null; domain: string | null } | null;
}

export interface GenerateParams {
  prompt: string;
  referenceImages?: string[];
  figmaUrl?: string;
  figmaToken?: string;
  figmaRefreshToken?: string;
  subdomainHint?: string;
  /** Continues an approved design from `proposeDesign`. */
  generationId?: string;
}

const apiBase = () =>
  import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1";

/**
 * How long an AI route is allowed to take.
 *
 * The shared axios instance times out at 15 seconds, which is right for CRUD
 * and wrong for anything that calls a model: deciding a design runs the whole
 * foundation, and revising one runs the director *and* the encoder. Both
 * routinely pass a minute. Streaming routes avoid axios entirely; the ones
 * that return plain JSON need this.
 */
const AI_TIMEOUT_MS = 180_000;


/**
 * POSTs and reads an SSE stream.
 *
 * Shared by the design and build phases. Both use `fetch` rather than the axios
 * instance on purpose: axios cannot stream a response in the browser, and its
 * 15s timeout aborts work that legitimately takes a minute — which is exactly
 * what happened when the design phase was first written as an ordinary post.
 */
async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: GenerationEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && token !== "undefined" && token !== "null"
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    // Errors before the stream opens arrive as ordinary JSON.
    let message = "تعذر بدء العملية.";
    try {
      const parsed = await response.json();
      // NestJS validation failures return `message` as an array of strings;
      // everything else returns a plain string.
      const raw = parsed?.message;
      if (Array.isArray(raw) && raw.length) message = raw.filter(Boolean).join(" — ");
      else if (typeof raw === "string" && raw.trim()) message = raw;
    } catch {
      /* keep the default */
    }
    if (response.status === 402) {
      onEvent({ type: "error", message: message || "لا يوجد رصيد كافٍ" });
      return;
    }
    throw new Error(message);
  }

  if (!response.body) throw new Error("لا يوجد رد من الخادم");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // The last element may be a partial line; keep it for the next chunk.
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        onEvent(JSON.parse(payload) as GenerationEvent);
      } catch {
        // A malformed frame must not kill the stream.
        console.warn("Unparseable SSE frame:", payload);
      }
    }
  }
}

export const aiStoreGeneratorAPI = {
  /** Uploads reference images and returns their public URLs. */
  uploadReferences: async (files: File[]): Promise<{ urls: string[] }> => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const { data } = await axiosInstance.post(
      "/ai-agent/store-generator/references",
      form,
      // Up to three images at 5MB each; 15 seconds is not a safe upload budget.
      { timeout: AI_TIMEOUT_MS },
    );
    return data;
  },

  getCredits: async (): Promise<{ credits: number; unlimited?: boolean }> => {
    const { data } = await axiosInstance.get("/credits/me");
    return data;
  },

  getGeneration: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get(
      `/ai-agent/store-generator/${id}`,
    );
    return data;
  },

  /** Past generations, newest first. */
  history: async (): Promise<{ data: GenerationHistoryItem[] }> => {
    const { data } = await axiosInstance.get("/ai-agent/store-generator");
    return data;
  },

  /**
   * Proposes a design without building anything.
   *
   * No store is created and no credit is charged, so the merchant can revise
   * the design as often as they like before committing to it.
   */
  proposeDesign: async (
    params: GenerateParams,
    onEvent: (event: GenerationEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> =>
    streamPost("/ai-agent/store-generator/design", params, onEvent, signal),

  /** Fresh handoff link for a past generation. */
  openGeneration: async (id: string): Promise<{ redirectUrl: string }> => {
    const { data } = await axiosInstance.post(
      `/ai-agent/store-generator/${id}/open`,
    );
    return data;
  },

  /** Overwrites the store's editor draft with this generation. */
  restoreGeneration: async (
    id: string,
  ): Promise<{ success: boolean; subdomain: string; redirectUrl: string }> => {
    const { data } = await axiosInstance.post(
      `/ai-agent/store-generator/${id}/restore`,
    );
    return data;
  },

  /**
   * Sends feedback on a generated page.
   *
   * The feedback revises the **design** and the page is rebuilt from it, so
   * repeated rounds compound instead of fighting each other — which is what
   * patching the rendered tree does. The stored draft is refreshed too, so the
   * preview reflects the change.
   */
  reviseDesign: async (
    id: string,
    pageType: string,
    feedback: string,
  ): Promise<{ pageType: string; sections: unknown[]; design: PageDesign }> => {
    const { data } = await axiosInstance.post(
      `/ai-agent/store-generator/${id}/revise`,
      { pageType, feedback },
      { timeout: AI_TIMEOUT_MS },
    );
    return data;
  },

  /**
   * Streams a generation.
   *
   * Uses `fetch` rather than the shared axios instance on purpose: axios
   * cannot stream a response in the browser, and its 15s timeout would abort a
   * run that legitimately takes a minute.
   */
  generate: async (
    params: GenerateParams,
    onEvent: (event: GenerationEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> =>
    streamPost("/ai-agent/store-generator/generate", params, onEvent, signal),
};
