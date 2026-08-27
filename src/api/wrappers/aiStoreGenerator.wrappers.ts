import { useMutation, useQuery } from "@tanstack/react-query";
import { aiStoreGeneratorAPI } from "../endpoints/aiStoreGenerator.endpoints";

export const aiGeneratorKeys = {
  all: ["ai-store-generator"] as const,
  credits: () => ["credits", "me"] as const,
  generation: (id: string) => [...aiGeneratorKeys.all, id] as const,
};

/** Current AI credit balance. Only runs when there is a session. */
export const useCredits = (enabled = true) => {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
  const hasToken = Boolean(token && token !== "undefined" && token !== "null");

  return useQuery({
    queryKey: aiGeneratorKeys.credits(),
    queryFn: () => aiStoreGeneratorAPI.getCredits(),
    enabled: enabled && hasToken,
    retry: false,
    staleTime: 30_000,
  });
};

export const useUploadReferences = () =>
  useMutation({
    mutationFn: (files: File[]) => aiStoreGeneratorAPI.uploadReferences(files),
  });

/** Past generations. Only runs when signed in. */
export const useGenerationHistory = (enabled = true) => {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
  const hasToken = Boolean(token && token !== "undefined" && token !== "null");

  return useQuery({
    queryKey: [...aiGeneratorKeys.all, "history"],
    queryFn: () => aiStoreGeneratorAPI.history(),
    enabled: enabled && hasToken,
    retry: false,
  });
};

export const useOpenGeneration = () =>
  useMutation({
    mutationFn: (id: string) => aiStoreGeneratorAPI.openGeneration(id),
  });

export const useRestoreGeneration = () =>
  useMutation({
    mutationFn: (id: string) => aiStoreGeneratorAPI.restoreGeneration(id),
  });

/**
 * Polls a generation.
 *
 * The stream is the primary channel; this exists so a closed or reloaded tab
 * can pick a run back up rather than losing it — and the credit with it.
 */
export const useGenerationStatus = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: aiGeneratorKeys.generation(id ?? ""),
    queryFn: () => aiStoreGeneratorAPI.getGeneration(id!),
    enabled: enabled && Boolean(id),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status === "SUCCEEDED" || status === "FAILED" ? false : 5_000;
    },
  });

export const useCreditPackages = (enabled = true) =>
  useQuery({
    queryKey: [...aiGeneratorKeys.credits(), "packages"],
    queryFn: () => aiStoreGeneratorAPI.getCreditPackages(),
    enabled,
  });

export const usePurchaseCredits = () =>
  useMutation({
    mutationFn: ({ packId, returnBaseUrl }: { packId: string; returnBaseUrl?: string }) =>
      aiStoreGeneratorAPI.purchaseCredits(packId, returnBaseUrl),
  });
