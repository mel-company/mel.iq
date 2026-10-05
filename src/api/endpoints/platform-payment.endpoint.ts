import axiosInstance from "@/utils/AxiosInstance";

export type PlatformPaymentProvider = "QI_CARD" | "ZAIN_CASH";

/**
 * A gateway the platform will actually accept a payment through right now.
 *
 * The server decides the list: it applies the operator's platform-billing
 * switch and drops any gateway whose credentials are unset. Two components
 * here used to hold the two codes in an array — `Checkout` even wrote
 * `available: true` beside each by hand — so a gateway the operator had
 * withdrawn was still a button, and the buyer found out by being refused
 * after choosing it, after the price was computed and a payment row existed.
 */
export type BillingProvider = {
  provider: PlatformPaymentProvider;
  /** The gateway's own brand name, so no client keeps a code → name table. */
  name: string;
  logoUrl: string;
  /** What an omitted `provider` would resolve to on the server. */
  recommended: boolean;
};

export type PlatformPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED";

export type PlatformPaymentInitPayload = {
  type:
    | "INITIAL_SUBSCRIPTION"
    | "RENEWAL"
    | "CHANGE_PLAN"
    | "DOMAIN_REGISTRATION";
  planId?: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  durationMonths?: number;
  storeId?: string;
  domain?: string;
  returnBaseUrl?: string;
  provider?: PlatformPaymentProvider;
};

export type PlatformPayment = {
  id: string;
  status: PlatformPaymentStatus;
  amount: number;
  currency: string;
  type: PlatformPaymentInitPayload["type"];
  provider?: PlatformPaymentProvider;
  planId?: string | null;
  packData?: unknown;
  storeId?: string | null;
  transactionId?: string;
  redirectUrl?: string;
  orderId?: string;
};

export const platformPaymentAPI = {
  /** The gateways this buyer may pay the platform with. */
  listProviders: async (): Promise<BillingProvider[]> => {
    const { data } = await axiosInstance.get<{ data: BillingProvider[] }>(
      "/platform-payments/providers",
    );
    return data?.data ?? [];
  },

  init: async (
    payload: PlatformPaymentInitPayload,
  ): Promise<PlatformPayment> => {
    const { data } = await axiosInstance.post<PlatformPayment>(
      "/platform-payments/init",
      payload,
    );
    return data;
  },

  getStatus: async (id: string): Promise<PlatformPayment> => {
    const { data } = await axiosInstance.get<PlatformPayment>(
      `/platform-payments/${id}`,
    );
    return data;
  },
};
