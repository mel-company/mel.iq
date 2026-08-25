
import axiosInstance from "@/utils/AxiosInstance";

export const storeAPI = {
  /**
   * Get all stores with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/store", {
      params: {
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Check if a store name is available
   */
  checkAvailability: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/store/check-availability", params);
  },

  /**
   * Add a new store
   */
  add: async (params?: any): Promise<any> => {
    // FormData will be handled automatically by axios interceptor
    // which removes Content-Type header to let browser set it with boundary
    const { data } = await axiosInstance.post<any>("/store", params);
    return data;
  },

  /**
   * Check if a store domain is available
   */
  checkDomainAvailability: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/domain/check-availability/", params);
    return data;
  },

  /**
   * Check whether dash.{domain}.mel.iq DNS + SSL are ready for redirect
   */
  checkDashboardReady: async (params: {
    domain: string;
  }): Promise<{
    ready: boolean;
    host: string;
    dnsOk?: boolean;
    tlsOk?: boolean;
    domain?: string;
  }> => {
    const { data } = await axiosInstance.post<{
      ready: boolean;
      host: string;
      dnsOk?: boolean;
      tlsOk?: boolean;
      domain?: string;
    }>("/domain/dashboard-ready", params);
    return data;
  },

  /**
   * Update a store
   */
  update: async (id: string, params?: any): Promise<any> => {
    // Check if params is FormData (for file upload)
    const { data } = await axiosInstance.put<any>(`/store/${id}`, params);
    return data;
  },
};