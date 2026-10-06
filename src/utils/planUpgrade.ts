import type { PlanFeatureKey } from "@/api/endpoints/plan.endpoint";

export type PlanUpgradeRequiredError = {
  statusCode: 403;
  code: "PLAN_UPGRADE_REQUIRED";
  feature?: PlanFeatureKey | string;
  requiredPlan?: string;
  requiredPlanName?: string;
  message?: string;
  upgrade?: {
    planCode?: string;
    planName?: string;
    reason?: string;
  };
};

const FEATURE_LABELS: Record<string, string> = {
  ai_editor: "محرر الذكاء الاصطناعي",
  team_users: "إضافة موظفين",
  mobile_app: "تطبيق الجوال",
};

export function featureLabel(feature?: string | null): string {
  if (!feature) return "هذه الميزة";
  return FEATURE_LABELS[feature] || feature;
}

/** Pull the structured body off an Axios (or fetch-like) error. */
export function getApiErrorBody(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") return null;
  const response = (error as { response?: { data?: unknown } }).response;
  const data = response?.data;
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

export function isPlanUpgradeRequired(
  error: unknown,
): error is { response: { data: PlanUpgradeRequiredError } } {
  const body = getApiErrorBody(error);
  return body?.code === "PLAN_UPGRADE_REQUIRED";
}

export function parsePlanUpgradeRequired(
  error: unknown,
): PlanUpgradeRequiredError | null {
  if (!isPlanUpgradeRequired(error)) return null;
  return getApiErrorBody(error) as unknown as PlanUpgradeRequiredError;
}

export function isFeatureLocked(
  locked: Array<PlanFeatureKey | string> | undefined | null,
  feature: PlanFeatureKey,
): boolean {
  if (!locked?.length) return false;
  return locked.includes(feature);
}
