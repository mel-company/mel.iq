import axiosInstance from "@/utils/AxiosInstance";

export const discountAPI = {
  /**
   * Get all discounts with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/discount", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Search for discounts with optional filtering and pagination
   */
  search: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/discount/search", {
      params: {
        ...(params?.query && { query: params.query }),
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Get a single discount by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/discount/${id}`);
    return data;
  },

  /**
   * Create a new discount
   */
  create: async (discount: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/discount", discount);
    return data;
  },

  /**
   * Update an existing discount
   */
  update: async (id: string, discount: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/discount/${id}`, discount);
    return data;
  },

  /**
   * Delete a discount (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/discount/${id}`);
    return data;
  },
};
