import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAPI } from "../endpoints/customer.endpoints";

/**
 * Query key factory for customers
 */
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params?: any) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  search: (params?: any) => [...customerKeys.all, "search", params] as const,
};

/**
 * Fetch all customers with optional filtering and pagination
 */
export const useFetchCustomers = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: customerKeys.list(params),
    queryFn: () => customerAPI.fetchAll(params),
    enabled,
  });
};

/**
 * Search for customers with optional filtering and pagination
 */
export const useSearchCustomers = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: customerKeys.search(params),
    queryFn: () => customerAPI.search(params),
    enabled: enabled && !!params?.query,
  });
};

/**
 * Fetch a single customer by ID
 */
export const useFetchCustomer = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new customer mutation
 */
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (customer: any) => customerAPI.create(customer),
    onSuccess: () => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
};

/**
 * Update an existing customer mutation
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => customerAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      // Update the specific customer cache
      queryClient.setQueryData(customerKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete a customer mutation
 */
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => customerAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      // Remove the deleted customer from cache
      queryClient.removeQueries({ queryKey: customerKeys.detail(deletedId) });
    },
  });
};

