import type {
  LockedFeature,
  PlanFeatureKey,
} from "@/api/endpoints/plan.endpoint";

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

/**
 * The plan upgrades lead to, for when the server has not named it. Its code is
 * still `PLUS`; only the name changed.
 */
export const BASIC_PLAN_NAME = "أساسي";

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

/**
 * Whether `/plan/entitlements` lists this feature as locked.
 *
 * The server sends objects — `plusLockedFeatures` returns
 * `{ feature, requiredPlan, message }` — and this did `locked.includes(feature)`
 * against a declared `string[]`. Comparing a string to an object is always
 * false, so this returned `false` for everything and every PLUS gate in the app
 * stood open: `lockedOrdered` in the store manage screen filtered a list that
 * could never match, and the upgrade panel it drives never rendered.
 *
 * Strings are still accepted. They are not what the server sends today, but this
 * predicate reading one shape and silently answering "not locked" for the other
 * is the entire defect, so it refuses to be narrow about it.
 */
export function isFeatureLocked(
  locked: Array<LockedFeature | string> | undefined | null,
  feature: PlanFeatureKey,
): boolean {
  if (!locked?.length) return false;
  return locked.some((entry) =>
    typeof entry === "string" ? entry === feature : entry?.feature === feature,
  );
}

/** The server's message for a locked feature, when it sent one. */
export function lockedFeatureMessage(
  locked: Array<LockedFeature | string> | undefined | null,
  feature: PlanFeatureKey,
): string | undefined {
  if (!locked?.length) return undefined;
  for (const entry of locked) {
    if (typeof entry !== "string" && entry?.feature === feature) {
      return entry.message;
    }
  }
  return undefined;
}
