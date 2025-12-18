import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderAPI } from "../endpoints/order.endpoints";

/**
 * Query key factory for orders
 */
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (params?: any) => [...orderKeys.lists(), params] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  search: (params?: any) => [...orderKeys.all, "search", params] as const,
};

/**
 * Fetch all orders with optional filtering and pagination
 */
export const useFetchOrders = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: orderKeys.list(params),
    queryFn: () => orderAPI.fetchAll(params),
    enabled,
  });
};

/**
 * Search for orders with optional filtering and pagination
 */
export const useSearchOrders = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: orderKeys.search(params),
    queryFn: () => orderAPI.search(params),
    enabled: enabled && !!params?.query,
  });
};

/**
 * Fetch a single order by ID
 */
export const useFetchOrder = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new order mutation
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (order: any) => orderAPI.create(order),
    onSuccess: () => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

/**
 * Update an existing order mutation
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => orderAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      // Update the specific order cache
      queryClient.setQueryData(orderKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete an order mutation
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => orderAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      // Remove the deleted order from cache
      queryClient.removeQueries({ queryKey: orderKeys.detail(deletedId) });
    },
  });
};
