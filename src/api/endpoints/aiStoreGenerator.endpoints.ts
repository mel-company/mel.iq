import axiosInstance from "@/utils/AxiosInstance";

export interface PlannedStep {
  key: string;
  label: string;
  /** Rough seconds, used to weight the progress bar. */
  weight: number;
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
  | {
      type: "done";
      generationId: string;
      subdomain: string;
      storeName: string;
      redirectUrl: string;
      /** Storefront address; live only after the user publishes. */
      storeUrl?: string;
      templateId?: string;
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
}

const apiBase = () =>
  import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1";

export const aiStoreGeneratorAPI = {
  /** Uploads reference images and returns their public URLs. */
  uploadReferences: async (files: File[]): Promise<{ urls: string[] }> => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const { data } = await axiosInstance.post(
      "/ai-agent/store-generator/references",
      form,
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
  ): Promise<void> => {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `${apiBase()}/ai-agent/store-generator/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "undefined" && token !== "null"
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        credentials: "include",
        body: JSON.stringify(params),
        signal,
      },
    );

    if (!response.ok) {
      // Errors before the stream opens arrive as ordinary JSON.
      let message = "تعذر بدء إنشاء المتجر.";
      try {
        const body = await response.json();
        message = body?.message || message;
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
  },
};
