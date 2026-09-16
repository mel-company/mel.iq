import { useMutation, useQuery } from "@tanstack/react-query";
import {
  platformPaymentAPI,
  PlatformPayment,
  PlatformPaymentInitPayload,
} from "../endpoints/platform-payment.endpoint";

export const platformPaymentKeys = {
  all: ["platform-payments"] as const,
  detail: (id: string) => [...platformPaymentKeys.all, id] as const,
};

export const useInitPlatformPayment = () => {
  return useMutation({
    mutationFn: (payload: PlatformPaymentInitPayload) =>
      platformPaymentAPI.init(payload),
  });
};

export const usePlatformPaymentStatus = (
  id: string | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: platformPaymentKeys.detail(id || ""),
    queryFn: () => platformPaymentAPI.getStatus(id!),
    enabled: enabled && !!id,
    refetchInterval: (query) => {
      const status = (query.state.data as PlatformPayment | undefined)?.status;
      if (status === "PENDING") return 2500;
      return false;
    },
  });
};
