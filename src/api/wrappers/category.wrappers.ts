import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryAPI } from "../endpoints/category.endpoints";

/**
 * Query key factory for categories
 */
export const categoryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoryKeys.all, "list"] as const,
  list: (params?: any) => [...categoryKeys.lists(), params] as const,
  details: () => [...categoryKeys.all, "detail"] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  search: (params?: any) => [...categoryKeys.all, "search", params] as const,
};

/**
 * Fetch all categories with optional filtering and pagination
 */
export const useFetchCategories = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoryAPI.fetchAll(params),
    enabled,
  });
};

/**
 * Search for categories with optional filtering and pagination
 */
export const useSearchCategories = (params?: any, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: categoryKeys.search(params),
    queryFn: () => categoryAPI.search(params),
    enabled: enabled && !!params?.query,
  });
};

/**
 * Fetch a single category by ID
 */
export const useFetchCategory = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: categoryKeys.detail(id),
    queryFn: () => categoryAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new category mutation
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (category: any) => categoryAPI.create(category),
    onSuccess: () => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
};

/**
 * Update an existing category mutation
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => categoryAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      // Update the specific category cache
      queryClient.setQueryData(categoryKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete a category mutation
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => categoryAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch categories list
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      // Remove the deleted category from cache
      queryClient.removeQueries({ queryKey: categoryKeys.detail(deletedId) });
    },
  });
};
