import axiosInstance from "@/utils/AxiosInstance";

export const authAPI = {
  login: async (params?: any): Promise<any> => {
    const storeName = params?.store?.name ?? params?.name;
    const storeDomain = params?.store?.domain ?? params?.domain;
    const { data } = await axiosInstance.post<any>("/auth/login", {
      phone: params?.phone,
    
    });

    console.log("Verification Code: ", data)
    return data;
  },

  verify: async (params?: any): Promise<any> => {
    // Store-user flow: this endpoint sets the `sat` cookie on success
    const { data } = await axiosInstance.post<any>("/auth/verify", {
      code: params?.code,
     
    });
    return data;
  },

  me: async (): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/auth/me");
    return data;
  },

  logout: async (): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/auth/logout");
    return data;
  },
};