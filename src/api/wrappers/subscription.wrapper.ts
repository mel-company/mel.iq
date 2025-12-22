import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionAPI } from "../endpoints/subscription.endpoint";

/**
 * Query key factory for subscriptions
 */
export const subscriptionKeys = {
  all: ["subscriptions"] as const,
  lists: () => [...subscriptionKeys.all, "list"] as const,
  list: (params?: any) => [...subscriptionKeys.lists(), params] as const,
  details: () => [...subscriptionKeys.all, "detail"] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
};

/**
 * Fetch all subscriptions with optional filtering and pagination
 */
export const useFetchSubscriptions = (params?: any) => {
  return useQuery<any>({
    queryKey: subscriptionKeys.list(params),
    queryFn: () => subscriptionAPI.fetchAll(params),
  });
};

/**
 * Fetch a single subscription by ID
 */
export const useFetchSubscription = (id: string, enabled: boolean = true) => {
  return useQuery<any>({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => subscriptionAPI.fetchOne(id),
    enabled: enabled && !!id,
  });
};

/**
 * Create a new subscription mutation
 */
export const useCreateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, any>({
    mutationFn: (subscription: any) => subscriptionAPI.create(subscription),
    onSuccess: () => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
};

/**
 * Update an existing subscription mutation
 */
export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => subscriptionAPI.update(id, data),
    onSuccess: (data) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Update the specific subscription cache
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
};

/**
 * Delete a subscription mutation
 */
export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => subscriptionAPI.delete(id),
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Remove the deleted subscription from cache
      queryClient.removeQueries({ queryKey: subscriptionKeys.detail(deletedId) });
    },
  });
};

/**
 * Pause a subscription mutation
 */
export const usePauseSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => subscriptionAPI.pause(id),
    onSuccess: (data) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Update the specific subscription cache
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
};

/**
 * Resume a subscription mutation
 */
export const useResumeSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => subscriptionAPI.resume(id),
    onSuccess: (data) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Update the specific subscription cache
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
};

/**
 * Cancel a subscription mutation
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, string>({
    mutationFn: (id: string) => subscriptionAPI.cancel(id),
    onSuccess: (data) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Update the specific subscription cache
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
};

/**
 * Renew a subscription mutation
 */
export const useRenewSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; durationMonths?: number }>({
    mutationFn: ({ id, durationMonths }) => subscriptionAPI.renew(id, durationMonths),
    onSuccess: (data) => {
      // Invalidate and refetch subscriptions list
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      // Update the specific subscription cache
      queryClient.setQueryData(subscriptionKeys.detail(data.id), data);
    },
  });
};
