import axiosInstance from "@/utils/AxiosInstance";

export const employeeAPI = {
  /**
   * Get all employees with optional filtering and pagination
   */
  fetchAll: async (params?: any): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/employee", {
      params: {
        ...(params?.storeId && { storeId: params.storeId }),
        ...(params?.page && { page: params.page }),
        ...(params?.limit && { limit: params.limit }),
      },
    });
    return data;
  },

  /**
   * Get a single employee by ID
   */
  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/employee/${id}`);
    return data;
  },

  /**
   * Create a new employee
   */
  create: async (employee: any): Promise<any> => {
    const { data } = await axiosInstance.post<any>("/employee", employee);
    return data;
  },

  /**
   * Update an existing employee
   */
  update: async (id: string, employee: any): Promise<any> => {
    const { data } = await axiosInstance.put<any>(`/employee/${id}`, employee);
    return data;
  },

  /**
   * Delete an employee (soft delete)
   */
  delete: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.delete<any>(`/employee/${id}`);
    return data;
  },
};
