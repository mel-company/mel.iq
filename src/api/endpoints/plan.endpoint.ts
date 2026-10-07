import axiosInstance from "@/utils/AxiosInstance";

/** Plan feature keys the backend gates with PLAN_UPGRADE_REQUIRED. */
export type PlanFeatureKey = "ai_editor" | "team_users" | "mobile_app";

export type PlanCode = "GO" | "PLUS" | string;

/**
 * One locked feature, as the server sends it.
 *
 * `plusLockedFeatures` returns objects — `{ feature, requiredPlan, message }` —
 * and this file used to type `locked` as `PlanFeatureKey[]`, a list of plain
 * strings. So `isFeatureLocked`'s `locked.includes("ai_editor")` compared a
 * string against objects, was always false, and **every PLUS gate in the app
 * stood open**. A declared type that disagrees with the wire is worse than no
 * type: it made the bug invisible at the one place a reader would check.
 */
export type LockedFeature = {
  feature: PlanFeatureKey | string;
  requiredPlan?: PlanCode;
  message?: string;
};

/** `GET /plan/entitlements`, as the server actually answers it. */
export type PlanEntitlements = {
  subscription?: {
    id?: string;
    status?: string;
    start_at?: string;
    end_at?: string;
    /** Whether the term currently covers today. */
    inForce?: boolean;
    promo_free_claimed?: boolean;
    promo_discount_months_used?: number;
  };
  /** The plan on the subscription, with its marketing `pricing` block. */
  plan?: {
    id?: string;
    code?: PlanCode;
    name?: string;
    description?: string;
    monthly_price?: number;
    yearly_price?: number;
  };
  /** What the store may use **now** — the floor once the term lapses. */
  entitlements?: {
    max_users?: number;
    ai_store_credits?: number;
    ai_editor_credits?: number;
    has_mobile_app?: boolean;
    has_ai_editor?: boolean;
  };
  /** Features that need a higher plan — show upgrade UI instead of calling the API. */
  locked?: LockedFeature[];
  upgradeAvailable?: boolean;
  upgradeTo?: {
    /** Resolved from the catalogue; `null` when PLUS is disabled. */
    planId?: string | null;
    planCode?: PlanCode;
    planName?: string;
  } | null;
  /** Loose pass-through for fields the server may add. */
  [key: string]: unknown;
};

/**
 * `GET /plan/store-plans`, as the server actually answers it: the catalogue
 * under `data`, and the store's current plan id beside it.
 *
 * This was typed as `{ current, plans }` and read through an `unwrap` that
 * returned `data.data` whenever the payload had a `data` key — which this one
 * always does. So the envelope was thrown away, the function returned the plans
 * array while claiming to return this object, and every reader of `.plans` and
 * `.current` got `undefined`. The page worked only because a string match on
 * plan names was sitting behind it as a fallback.
 */
export type StorePlansResponse = {
  currentPlan?: { planId?: string } | null;
  data?: Array<{
    id: string;
    code?: PlanCode;
    name: string;
    description?: string;
    monthly_price?: number;
    yearly_price?: number;
    most_popular?: boolean;
    enabled?: boolean;
    is_free?: boolean;
  }>;
  total?: number;
  page?: number;
  limit?: number;
};

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
    // Returned whole. `unwrap` used to strip the envelope this response *is*.
    const { data } = await axiosInstance.get<StorePlansResponse>(
      "/plan/store-plans",
      { params: storeId ? { storeId } : undefined },
    );
    return data;
  },

  /**
   * Which features the store may use, and which are locked behind PLUS.
   * Call before rendering AI Editor / team / mobile-app entry points.
   */
  fetchEntitlements: async (storeId?: string): Promise<PlanEntitlements> => {
    const { data } = await axiosInstance.get<PlanEntitlements>(
      "/plan/entitlements",
      { params: storeId ? { storeId } : undefined },
    );
    return data;
  },
};

export default planAPI;
