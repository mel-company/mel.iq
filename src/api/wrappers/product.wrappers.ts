import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productAPI } from "../endpoints/product.endpoints";
import type { ProductListResponse } from "../types/product";

/**
 * Query key factory for products
 */
export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (params?: any) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  search: (params?: any) => [...productKeys.all, "search", params] as const,
};

/**
 * Fetch all products with optional filtering and pagination
 */
export const useFetchProducts = (params?: any, enabled: boolean = true) => {
  return useQuery<ProductListResponse>({
    queryKey: productKeys.list(params),
    queryFn: () => productAPI.fetchAll(params),
    enabled,
  });
};

/**
 * Search for products with optional filtering and pagination
 */
export const useSearchProducts = (params?: any, enabled: boolean = true) => {
  return useQuery<ProductListResponse>({
    queryKey: productKeys.search(params),
    queryFn: () => productAPI.search(params),
    enabled: enabled && !!params?.query,
  });
};

/**
 * Fetch a single product by ID
 */
export const useFetchProduct = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: productKeys.detail(id),
    queryFn: () => productAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new product mutation
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (product: any) => productAPI.create(product),
    onSuccess: () => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

/**
 * Update an existing product mutation
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => productAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      // Update the specific product cache
      queryClient.setQueryData(productKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete a product mutation
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => productAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch products list
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      // Remove the deleted product from cache
      queryClient.removeQueries({ queryKey: productKeys.detail(deletedId) });
    },
  });
};
