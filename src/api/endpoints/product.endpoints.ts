import axiosInstance from "@/utils/AxiosInstance";
import type { ProductListResponse } from "../types/product";

export const productAPI = {
  /**
   * Get all products with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<ProductListResponse> => {
    const { data } = await axiosInstance.get<ProductListResponse>("/product", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.categoryId && { categoryId: params.categoryId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Get all products with optional filtering and pagination
   */
  search: async (params?: any): Promise<ProductListResponse> => {
    const { data } = await axiosInstance.get<ProductListResponse>(
      "/product/search",
      {
        params: {
          ...(params?.query && { query: params.query }),
          ...(params?.storeId && { storeId: params.storeId }),
          ...(params?.categoryId && { categoryId: params.categoryId }),
          ...(params?.page && { page: params.page }),
          ...(params?.limit && { limit: params.limit }),
        },
      }
    );
    return data;
  },

  /**
   * Get a single product by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/product/${id}`);
    return data;
  },

  /**
   * Create a new product
   */
  create: async (product: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/product", product);
    return data;
  },

  /**
   * Update an existing product
   */
  update: async (id: string, product: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/product/${id}`, product);
    return data;
  },

  /**
   * Delete a product (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/product/${id}`);
    return data;
  },
};