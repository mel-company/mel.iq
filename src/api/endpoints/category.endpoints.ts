import axiosInstance from "@/utils/AxiosInstance";

export const categoryAPI = {
  /**
   * Get all categories with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/category", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Search for categories with optional filtering and pagination
   */
  search: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/category/search", {
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
   * Get a single category by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/category/${id}`);
    return data;
  },

  /**
   * Create a new category
   */
  create: async (category: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/category", category);
    return data;
  },

  /**
   * Update an existing category
   */
  update: async (id: string, category: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/category/${id}`, category);
    return data;
  },

  /**
   * Delete a category (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/category/${id}`);
    return data;
  },
};
