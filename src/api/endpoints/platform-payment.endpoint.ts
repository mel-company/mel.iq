import axiosInstance from "@/utils/AxiosInstance";

export type PlatformPaymentProvider = "QI_CARD" | "ZAIN_CASH";

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
  init: async (
    payload: PlatformPaymentInitPayload,
  ): Promise<PlatformPayment> => {
    const { data } = await axiosInstance.post<PlatformPayment>(
      "/platform-payments/init",
      { provider: "QI_CARD", ...payload },
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
