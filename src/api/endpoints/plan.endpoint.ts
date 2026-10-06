import axiosInstance from "@/utils/AxiosInstance";

/** Plan feature keys the backend gates with PLAN_UPGRADE_REQUIRED. */
export type PlanFeatureKey = "ai_editor" | "team_users" | "mobile_app";

export type PlanCode = "GO" | "PLUS" | string;

export type PlanEntitlements = {
  /** Features the current store plan may use. */
  allowed?: PlanFeatureKey[];
  /** Features that need a higher plan — show upgrade UI instead of calling the API. */
  locked?: PlanFeatureKey[];
  currentPlan?: {
    id?: string;
    code?: PlanCode;
    name?: string;
  };
  upgradeTo?: {
    planId?: string;
    planCode?: PlanCode;
    planName?: string;
  };
  /** Loose pass-through for fields the server may add. */
  [key: string]: unknown;
};

export type StorePlansResponse = {
  current?: {
    id?: string;
    code?: PlanCode;
    name?: string;
  };
  plans?: Array<{
    id: string;
    code?: PlanCode;
    name: string;
    description?: string;
    monthly_price?: number;
    yearly_price?: number;
    most_popular?: boolean;
    enabled?: boolean;
  }>;
  [key: string]: unknown;
};

function unwrap<T>(data: T | { data: T }): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data ?? (data as T);
  }
  return data as T;
}

export const planAPI = {
  fetchAll: async (): Promise<any> => {
    const { data } = await axiosInstance.get<any>("/plan");
    return data;
  },

  fetchOne: async (id: string): Promise<any> => {
    const { data } = await axiosInstance.get<any>(`/plan/${id}`);
    return data;
  },

  /**
   * Plans available to the authenticated store context, plus the current plan.
   * Prefer this over bare `/plan` when deciding GO → PLUS upgrades.
   */
  fetchStorePlans: async (storeId?: string): Promise<StorePlansResponse> => {
    const { data } = await axiosInstance.get<StorePlansResponse | { data: StorePlansResponse }>(
      "/plan/store-plans",
      { params: storeId ? { storeId } : undefined },
    );
    return unwrap(data);
  },

  /**
   * Which features the store may use, and which are locked behind PLUS.
   * Call before rendering AI Editor / team / mobile-app entry points.
   */
  fetchEntitlements: async (storeId?: string): Promise<PlanEntitlements> => {
    const { data } = await axiosInstance.get<PlanEntitlements | { data: PlanEntitlements }>(
      "/plan/entitlements",
      { params: storeId ? { storeId } : undefined },
    );
    return unwrap(data);
  },
};

export default planAPI;
