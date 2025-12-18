
import axiosInstance from "@/utils/AxiosInstance";

export const authAPI = {
  login: async (params?: any): Promise<any> => {
    const storeName = params?.store?.name ?? params?.name;
    const storeDomain = params?.store?.domain ?? params?.domain;
    const { data } = await axiosInstance.post<any>("/store-user-auth/login", {
      phone: params?.phone,
      store: {
        name: storeName,
        domain: storeDomain,
      },
    });

    console.log("Verification Code: ", data)
    return data;
  },

  verify: async (params?: any): Promise<any> => {
    // Store-user flow: this endpoint sets the `sat` cookie on success
    const { data } = await axiosInstance.post<any>("/store-user-auth/verify", {
      phone: params?.phone,
      code: params?.code,
      store: {
        name: params?.store?.name,
        domain: params?.store?.domain,
      },
    });
    return data;
  },

  me: async (): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/store-user-auth/me");
    return data;
  },

  logout: async (): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/store-user-auth/logout");
    return data;
  },
};