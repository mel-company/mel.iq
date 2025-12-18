import { useMutation, useQuery } from "@tanstack/react-query";
import { authAPI } from "../endpoints/auth.endpoints";

/**
 * Query key factory for auth
 */
export const authKeys = {
  all: ["auth"] as const,
  lists: () => [...authKeys.all, "list"] as const,
  list: (params?: any) => [...authKeys.lists(), params] as const,
  details: () => [...authKeys.all, "detail"] as const,
  detail: (id: string) => [...authKeys.details(), id] as const,
};

/**
 * Login
 */
export const useLogin = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => authAPI.login(params),
  });
};

/**
 * Verify
 */
export const useVerify = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => authAPI.verify(params),
  });
};

/**
 * Me
 */
export const useMe = () => {
  return useQuery<any, Error, any>({
    queryKey: authKeys.all,
    queryFn: () => authAPI.me(),
  });
};

/**
 * Logout
 */
export const useLogout = () => {
  return useMutation<any, Error, any>({
    mutationFn: () => authAPI.logout(),
  });
};