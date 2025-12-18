import axiosInstance from "@/utils/AxiosInstance";

export const customerAPI = {
  /**
   * Get all customers with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/customer", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Search for customers with optional filtering and pagination
   */
  search: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/customer/search", {
      params: {
        ...(params?.query && { query: params.query }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Get a single customer by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/customer/${id}`);
    return data;
  },

  /**
   * Create a new customer
   */
  create: async (customer: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/customer", customer);
    return data;
  },

  /**
   * Update an existing customer
   */
  update: async (id: string, customer: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/customer/${id}`, customer);
    return data;
  },

  /**
   * Delete a customer (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/customer/${id}`);
    return data;
  },
};

