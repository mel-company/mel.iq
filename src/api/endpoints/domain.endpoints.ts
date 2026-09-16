import axiosInstance from "@/utils/AxiosInstance";

export type CustomDomainResponse = {
  domain: string;
  customDomain: string;
  storeUrl: string;
  platformUrl: string;
};

/** Path 3 only: discover how to connect an already-owned domain. Check only — does not attach. */
export type DomainConnectDiscovery = {
  domain: string;
  connectionMode: "automatic" | "manual";
  automaticAvailable: boolean;
  provider: { displayName: string | null };
  domainConnect?: {
    supported: boolean;
    templateAvailable: boolean;
    reason?: string;
  };
  ui: {
    title: string;
    primaryAction: "connect_automatically" | "connect_manually";
    secondaryAction: "connect_manually" | null;
  };
};

/** Response from POST /domain/connect/start — open applyUrl in the browser. */
export type DomainConnectStartResult = {
  domain: string;
  providerId: string;
  serviceId: string;
  host: string;
  connectionMode: "automatic";
  applyUrl: string;
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

  /**
   * Bring-your-own domain discovery (path 3).
   * Does not store or attach the domain — UI must follow ui.primaryAction, not provider name.
   */
  discoverConnect: async (domain: string): Promise<DomainConnectDiscovery> => {
    const { data } = await axiosInstance.post<DomainConnectDiscovery>(
      "/domain/connect/discover",
      { domain: domain.trim().toLowerCase() },
    );
    return data;
  },

  /**
   * Build signed Domain Connect Apply URL. Does not attach the domain.
   * Do not use next.automatic from discover — applyUrl comes from here.
   */
  startConnect: async (domain: string): Promise<DomainConnectStartResult> => {
    const { data } = await axiosInstance.post<DomainConnectStartResult>(
      "/domain/connect/start",
      { domain: domain.trim().toLowerCase() },
    );
    return data;
  },
};
