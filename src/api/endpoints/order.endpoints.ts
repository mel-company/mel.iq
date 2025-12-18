import axiosInstance from "@/utils/AxiosInstance";

export const orderAPI = {
  /**
   * Get all orders with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/order", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.customerId && { customerId: params.customerId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Search for orders with optional filtering and pagination
   */
  search: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/order/search", {
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
   * Get a single order by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/order/${id}`);
    return data;
  },

  /**
   * Create a new order
   */
  create: async (order: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/order", order);
    return data;
  },

  /**
   * Update an existing order
   */
  update: async (id: string, order: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/order/${id}`, order);
    return data;
  },

  /**
   * Delete an order (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/order/${id}`);
    return data;
  },
};
