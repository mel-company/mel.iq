import axiosInstance from "@/utils/AxiosInstance";


export const planAPI = {
  fetchAll: async (): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/plan");
    return data;
  },

  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/plan/${id}`);
    return data;
  },
};  

export default planAPI;