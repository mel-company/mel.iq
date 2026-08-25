import axiosInstance from "@/utils/AxiosInstance";

export type PlatformPaymentInitPayload = {
  type: "INITIAL_SUBSCRIPTION" | "RENEWAL" | "CHANGE_PLAN";
  planId: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  durationMonths?: number;
  storeId?: string;
  returnBaseUrl?: string;
};

export const platformPaymentAPI = {
  init: async (payload: PlatformPaymentInitPayload): Promise<any> => {
    const { data } = await axiosInstance.post<any>(
      "/platform-payments/init",
      payload,
    );
    return data;
  },

  getStatus: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/platform-payments/${id}`);
    return data;
  },
};
