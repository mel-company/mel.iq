import { useQuery } from "@tanstack/react-query";
import { planAPI } from "../endpoints/plan.endpoint";

/**
 * Query key factory for plan
 */
export const planKeys = {
  all: ["plan"] as const,
  lists: () => [...planKeys.all, "list"] as const,
  list: (params?: any) => [...planKeys.lists(), params] as const,
  details: () => [...planKeys.all, "detail"] as const,
  detail: (id: string) => [...planKeys.details(), id] as const,
  storePlans: (storeId?: string) =>
    [...planKeys.all, "store-plans", storeId ?? "current"] as const,
  entitlements: (storeId?: string) =>
    [...planKeys.all, "entitlements", storeId ?? "current"] as const,
};

/**
 * Fetch all plans (public pricing catalogue).
 */
export const useFetchAllPlans = () => {
  return useQuery({
    queryKey: planKeys.lists(),
    queryFn: () => planAPI.fetchAll(),
  });
};

/**
 * Fetch one plan
 */
export const useFetchOnePlan = (id: string) => {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => planAPI.fetchOne(id),
    enabled: Boolean(id),
  });
};

/**
 * Store-scoped plan list + current plan (GO / PLUS + pricing).
 */
export const useFetchStorePlans = (storeId?: string, enabled = true) => {
  return useQuery({
    queryKey: planKeys.storePlans(storeId),
    queryFn: () => planAPI.fetchStorePlans(storeId),
    enabled,
    staleTime: 60_000,
  });
};

/**
 * Feature unlocks for the current store. Prefer this over waiting for a 403.
 */
export const usePlanEntitlements = (storeId?: string, enabled = true) => {
  return useQuery({
    queryKey: planKeys.entitlements(storeId),
    queryFn: () => planAPI.fetchEntitlements(storeId),
    enabled,
    staleTime: 30_000,
  });
};
