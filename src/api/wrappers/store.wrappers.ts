import { useMutation, useQuery } from "@tanstack/react-query";
import { storeAPI } from "../endpoints/store.endpoints";

/**
 * Query key factory for stores
 */
export const storeKeys = {
  all: ["stores"] as const,
  lists: () => [...storeKeys.all, "list"] as const,
  list: (params?: any) => [...storeKeys.lists(), params] as const,
  details: () => [...storeKeys.all, "detail"] as const,
  detail: (id: string) => [...storeKeys.details(), id] as const,
};

/**
 * Fetch all stores with optional filtering and pagination
 */
export const useFetchStores = (params?: any) => {
  return useQuery<any>({
    queryKey: storeKeys.list(params),
    queryFn: () => storeAPI.fetchAll(params),
  });
};

/**
 * Check if a store name is available
 */
export const useCheckStoreNameAvailability = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => storeAPI.checkAvailability(params),
  });
};


/**
 * Check if a store domain is available
 */
export const useCheckStoreDomainAvailability = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => storeAPI.checkDomainAvailability(params),
  });
};

/**
 * Add a new store
 */
export const useAddStore = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => storeAPI.add(params),
  });
};

/**
 * Update a store
 */
export const useUpdateStore = () => {
  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => storeAPI.update(id, data),
  });
};