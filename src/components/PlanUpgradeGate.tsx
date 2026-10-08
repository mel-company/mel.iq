import { Link } from "react-router-dom";
import { Rocket } from "./icons";
import {
  BASIC_PLAN_NAME,
  featureLabel,
  type PlanUpgradeRequiredError,
} from "@/utils/planUpgrade";
import type { PlanFeatureKey } from "@/api/endpoints/plan.endpoint";

type PlanUpgradeGateProps = {
  feature: PlanFeatureKey | string;
  /** From entitlements.upgradeTo or the 403 body. */
  requiredPlanName?: string;
  message?: string;
  /** Deep-link into store manage → subscription tab. */
  manageHref?: string;
  onUpgradeClick?: () => void;
  className?: string;
};

/**
 * Shown instead of a Basic-only surface when `/plan/entitlements` lists the
 * feature in `locked`, or after a `PLAN_UPGRADE_REQUIRED` 403.
 */
export function PlanUpgradeGate({
  feature,
  requiredPlanName = BASIC_PLAN_NAME,
  message,
  manageHref,
  onUpgradeClick,
  className = "",
}: PlanUpgradeGateProps) {
  const title = featureLabel(feature);
  const body =
    message ||
    `${title} متاح في باقة ${requiredPlanName} فقط. رقِّ خطتك لفتح هذه الميزة.`;

  return (
    <div
      className={`rounded-2xl border border-brand-violet/25 bg-gradient-to-l from-brand-violet/10 to-brand-indigo/10 p-5 ${className}`}
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-right">
          <p className="text-sm font-bold text-frost">{title}</p>
          <p className="mt-1.5 text-sm leading-6 text-muted">{body}</p>
          <p className="mt-2 text-xs text-dim">
            الخطة المطلوبة:{" "}
            <span className="font-bold text-brand-secondary">
              {requiredPlanName}
            </span>
          </p>
        </div>
        {onUpgradeClick ? (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Rocket size={16} />
            ترقية الخطة
          </button>
        ) : manageHref ? (
          <Link
            to={manageHref}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Rocket size={16} />
            ترقية الخطة
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Map a 403 body onto the gate props. */
export function upgradeGateFromError(
  error: PlanUpgradeRequiredError,
): Pick<
  PlanUpgradeGateProps,
  "feature" | "requiredPlanName" | "message"
> {
  return {
    feature: error.feature || error.upgrade?.reason || "ai_editor",
    requiredPlanName:
      error.requiredPlanName || error.upgrade?.planName || BASIC_PLAN_NAME,
    message: error.message,
  };
}

export default PlanUpgradeGate;
