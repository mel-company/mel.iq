import axiosInstance from "@/utils/AxiosInstance";

export type CustomDomainResponse = {
  domain: string;
  customDomain: string;
  storeUrl: string;
  platformUrl: string;
};

export const domainAPI = {
  setCustomDomain: async (params: {
    domain: string;
  }): Promise<CustomDomainResponse> => {
    const { data } = await axiosInstance.post<CustomDomainResponse>(
      "/domain/custom-domain",
      { domain: params.domain.trim().toLowerCase() },
    );
    return data;
  },
};
