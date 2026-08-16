import { Sparkles } from "lucide-react";
import { useCredits } from "@/api/wrappers/aiStoreGenerator.wrappers";
import { useAuth } from "@/contexts/AuthContext";

/** Remaining AI credits. Renders nothing when signed out. */
export default function CreditsBadge() {
  const { user } = useAuth();
  const { data, isLoading } = useCredits(Boolean(user));

  if (!user || isLoading || data?.credits == null) return null;

  // `credits` carries a sentinel maximum for exempt accounts, so branch on the
  // flag rather than printing the number.
  const unlimited = Boolean(data.unlimited);
  const out = !unlimited && data.credits <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
        out
          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
          : "border-white/10 bg-white/[0.04] text-white/60"
      }`}
    >
      <Sparkles size={12} />
      {unlimited
        ? "رصيد غير محدود"
        : out
          ? "لا يوجد رصيد"
          : `${data.credits} رصيد متبقٍ`}
    </span>
  );
}
