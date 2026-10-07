import { useMutation, useQuery } from "@tanstack/react-query";
import {
  platformPaymentAPI,
  PlatformPayment,
  PlatformPaymentInitPayload,
  SubscriptionQuoteQuery,
} from "../endpoints/platform-payment.endpoint";

export const platformPaymentKeys = {
  all: ["platform-payments"] as const,
  detail: (id: string) => [...platformPaymentKeys.all, id] as const,
  providers: () => [...platformPaymentKeys.all, "providers"] as const,
  quote: (query: SubscriptionQuoteQuery) =>
    [...platformPaymentKeys.all, "quote", query] as const,
};

/**
 * What this period costs this buyer, asked of the server rather than worked out
 * from a plan's monthly price — which cannot see the intro ladder and so was
 * wrong for everybody still inside the offer.
 */
export const useSubscriptionQuote = (
  query: SubscriptionQuoteQuery | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: platformPaymentKeys.quote(query ?? ({} as SubscriptionQuoteQuery)),
    queryFn: () => platformPaymentAPI.quote(query!),
    enabled: enabled && !!query?.planId,
    // A price on a button the buyer is about to press: re-asked, not remembered,
    // because the ladder moves when they pay.
    staleTime: 0,
  });
};

/**
 * Which gateways the platform is accepting for billing right now.
 *
 * Cached for the session rather than per mount: it changes only when an
 * operator moves a switch in the admin dashboard, and three screens here draw
 * a picker from it.
 */
export const useBillingProviders = () => {
  return useQuery({
    queryKey: platformPaymentKeys.providers(),
    queryFn: () => platformPaymentAPI.listProviders(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useInitPlatformPayment = () => {
  return useMutation({
    mutationFn: (payload: PlatformPaymentInitPayload) =>
      platformPaymentAPI.init(payload),
  });
};

/** Prefer when the session already carries a Store JWT. */
export const useInitStorePlatformPayment = () => {
  return useMutation({
    mutationFn: (payload: PlatformPaymentInitPayload) =>
      platformPaymentAPI.storeInit(payload),
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
