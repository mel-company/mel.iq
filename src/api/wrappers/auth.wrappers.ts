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
    // نستخدمه لإرسال / إعادة إرسال رمز الـ OTP
    mutationFn: (params: any) => authAPI.sendOtp(params),
  });
};

/**
 * Register
 */
export const useRegister = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => authAPI.register(params),
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
 * Send OTP
 */
export const useSendOtp = () => {
  return useMutation<any, Error, any>({
    mutationFn: (params: any) => authAPI.sendOtp(params),
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

/**
 * Validate User
 */
export const useValidateUser = () => {
  return useMutation<any, Error, { store: string }>({
    mutationFn: ({ store }) => authAPI.validateUser(store),
  });
};