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

/**
 * What a subscription period actually costs this buyer right now.
 *
 * The intro ladder — one free month, then six at half price — is state only the
 * server can see, so a client that multiplies a plan's monthly price is right for
 * somebody past the offer and wrong for everybody inside it. Checkout's summary
 * panel hardcoded «تجربة مجانية 14 يوماً» and dated the first charge 14 days out,
 * on a promo that is a month long and then six half-price ones.
 */
export type SubscriptionQuote = {
  planId: string;
  planName: string;
  planCode: string | null;
  billingPeriod: "MONTHLY" | "YEARLY";
  durationMonths: number;
  currency: string;
  /** Due now. `0` means the intro covers it and no gateway is involved. */
  amount: number;
  /** The same months with no promo applied. */
  listAmount: number;
  savings: number;
  breakdown: {
    freeMonths: number;
    discountMonths: number;
    fullMonths: number;
    monthlyPrice: number;
    discountedMonthlyPrice: number;
  };
  /** When this period runs out — i.e. when the next charge lands. */
  periodEndsAt: string;
  promo: {
    freeMonths: number;
    discountMonths: number;
    discountPercent: number;
  };
};

export type SubscriptionQuoteQuery = {
  type: "INITIAL_SUBSCRIPTION" | "RENEWAL" | "CHANGE_PLAN";
  planId: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  durationMonths?: number;
  /** Required for RENEWAL and CHANGE_PLAN. */
  storeId?: string;
};

export const platformPaymentAPI = {
  /** Price a period without creating anything. */
  quote: async (
    query: SubscriptionQuoteQuery,
  ): Promise<SubscriptionQuote> => {
    const { data } = await axiosInstance.get<SubscriptionQuote>(
      "/platform-payments/quote",
      { params: query },
    );
    return data;
  },

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

  /**
   * Store-scoped init (Store JWT). Same payload shape as `init`, including
   * `CHANGE_PLAN` for GO → PLUS upgrades.
   */
  storeInit: async (
    payload: PlatformPaymentInitPayload,
  ): Promise<PlatformPayment> => {
    const { data } = await axiosInstance.post<PlatformPayment>(
      "/platform-payments/store/init",
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
