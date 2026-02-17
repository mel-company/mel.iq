import axiosInstance from "@/utils/AxiosInstance";

export const authAPI = {
  login: async (params?: any): Promise<any> => {
    console.log("LOGIN PARAMS: ", params);
    const { data } = await axiosInstance.post<any>("/auth/login", {
      phone: params?.phone,
    });

    console.log("LOGIN DATA: ", data);

    return data;
  },

  register: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/auth/register", {
      phone: params?.phone,
      name: params?.name,
      email: params?.email,
      password: params?.password,
    });
    return data;
  },

  verify: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/auth/verify", {
      phone: params?.phone,
      code: parseInt(params?.code),
    });
    return data;
  },

  sendOtp: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/auth/send-otp", {
      phone: params?.phone,
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

  validateUser: async (store: string): Promise<any> => {
    const { data } = await axiosInstance.post<any>(
      "/store-user-auth/validate-user",
      {
        store,
      },
    );
    return data;
  },
};
