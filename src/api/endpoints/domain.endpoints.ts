import axiosInstance from "@/utils/AxiosInstance";

export type StoreDomainLink = {
  type: "platform" | "custom";
  label: string;
  url: string;
  primary: boolean;
};

export type CustomDomainResponse = {
  domain: string | null;
  customDomain: string | null;
  storeUrl: string | null;
  platformUrl: string | null;
  links?: StoreDomainLink[];
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
    storeId?: string;
  }): Promise<CustomDomainResponse> => {
    const { data } = await axiosInstance.post<CustomDomainResponse>(
      "/domain/custom-domain",
      {
        domain: params.domain.trim().toLowerCase(),
        ...(params.storeId ? { storeId: params.storeId } : {}),
      },
    );
    return data;
  },

  /**
   * Detach custom domain. Platform users (mel.iq) must pass storeId; store-user
   * JWT scopes itself without a body.
   */
  removeCustomDomain: async (params?: {
    storeId?: string;
  }): Promise<CustomDomainResponse> => {
    const storeId = params?.storeId?.trim();
    const { data } = await axiosInstance.delete<CustomDomainResponse>(
      "/domain/custom-domain",
      {
        params: storeId ? { storeId } : undefined,
        data: storeId ? { storeId } : undefined,
      },
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
  startConnect: async (params: {
    domain: string;
    redirectUri?: string;
  }): Promise<DomainConnectStartResult> => {
    const { data } = await axiosInstance.post<DomainConnectStartResult>(
      "/domain/connect/start",
      {
        domain: params.domain.trim().toLowerCase(),
        ...(params.redirectUri ? { redirectUri: params.redirectUri } : {}),
      },
    );
    return data;
  },
};
