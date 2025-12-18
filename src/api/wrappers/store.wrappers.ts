import { useQuery } from "@tanstack/react-query";
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
