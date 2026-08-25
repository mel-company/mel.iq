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
    mutationFn: (params: any) => authAPI.login(params),
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
 * Me — يعتمد على كوكي `mat` أو Bearer في localStorage (JwtAuthGuard يقبل الاثنين).
 * ما نعطّل الطلب إذا localStorage فاضي؛ مسح التوكن المحلي ما يلغي الجلسة بالكوكي.
 */
export const useMe = () => {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("token") : null;

  return useQuery<any, Error, any>({
    queryKey: [...authKeys.all, token ?? "cookie"],
    queryFn: () => authAPI.me(),
    retry: false,
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
  return useMutation<any, Error, { store: string; token?: string }>({
    mutationFn: (params) => authAPI.validateUser(params),
  });
};

export const useValidateToStorefront = () => {
  return useMutation<any, Error, { store: string }>({
    mutationFn: (params) => authAPI.validateToStorefront(params),
  });
};
