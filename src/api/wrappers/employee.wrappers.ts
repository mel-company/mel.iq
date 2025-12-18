import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeAPI } from "../endpoints/employee.endpoints";

/**
 * Query key factory for employees
 */
export const employeeKeys = {
  all: ["employees"] as const,
  lists: () => [...employeeKeys.all, "list"] as const,
  list: (params?: any) => [...employeeKeys.lists(), params] as const,
  details: () => [...employeeKeys.all, "detail"] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
};

/**
 * Fetch all employees with optional filtering and pagination
 */
export const useFetchEmployees = (params?: any) => {
  return useQuery<any>({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeeAPI.fetchAll(params),
  });
};

/**
 * Fetch a single employee by ID
 */
export const useFetchEmployee = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new employee mutation
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (employee: any) => employeeAPI.create(employee),
    onSuccess: () => {
      // Invalidate and refetch employees list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
  });
};

/**
 * Update an existing employee mutation
 */
export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => employeeAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch employees list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // Update the specific employee cache
      queryClient.setQueryData(employeeKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete an employee mutation
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => employeeAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch employees list
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      // Remove the deleted employee from cache
      queryClient.removeQueries({ queryKey: employeeKeys.detail(deletedId) });
    },
  });
};
