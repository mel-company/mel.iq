
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
}