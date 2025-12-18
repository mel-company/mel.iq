import axiosInstance from "@/utils/AxiosInstance";

export const subscriptionAPI = {
  /**
   * Get all subscriptions with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/subscription", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Get a single subscription by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/subscription/${id}`);
    return data;
  },

  /**
   * Create a new subscription
   */
  create: async (subscription: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/subscription", subscription);
    return data;
  },

  /**
   * Update an existing subscription
   */
  update: async (id: string, subscription: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/subscription/${id}`, subscription);
    return data;
  },

  /**
   * Delete a subscription (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/subscription/${id}`);
    return data;
  },

  /**
   * Pause a subscription (set status to INACTIVE)
   */
  pause: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.patch<any>(`/subscription/${id}/pause`);
    return data;
  },

  /**
   * Resume a subscription (set status to ACTIVE)
   */
  resume: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.patch<any>(`/subscription/${id}/resume`);
    return data;
  },

  /**
   * Cancel a subscription (set status to CANCELLED)
   */
  cancel: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.patch<any>(`/subscription/${id}/cancel`);
    return data;
  },

  /**
   * Renew a subscription (extend end date)
   */
  renew: async (id: string, durationMonths?: number): Promise<any> => {
    const { data } = await axiosInstance.patch<any>(`/subscription/${id}/renew`, {
      ...(durationMonths && { durationMonths }),
    });
    return data;
  },
};
