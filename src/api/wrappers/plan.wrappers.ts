import {  useQuery } from "@tanstack/react-query";
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
};

/**
 * Fetch all plans
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
    });
};