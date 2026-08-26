import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useCredits } from "@/api/wrappers/aiStoreGenerator.wrappers";
import { useAuth } from "@/contexts/AuthContext";
import BuyCreditsModal from "./BuyCreditsModal";

/** Remaining AI credits. Renders nothing when signed out. */
export default function CreditsBadge() {
  const { user } = useAuth();
  const { data, isLoading } = useCredits(Boolean(user));
  const [buyOpen, setBuyOpen] = useState(false);

  if (!user || isLoading || !data) return null;

  const unlimited = Boolean(data.unlimited);
  const generations = data.generations?.remaining ?? 0;
  const editor = data.editor?.remaining ?? 0;
  const purchased = data.generations?.purchased ?? 0;
  const out = !unlimited && generations <= 0 && editor <= 0 && purchased <= 0;

  return (
    <>
      <button
        onClick={() => out && setBuyOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${out
          ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20"
          : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"
          }`}
      >
        <Sparkles size={12} />
        {unlimited
          ? "رصيد غير محدود"
          : out
            ? "لا يوجد رصيد — اشحن الآن"
            : `${generations + purchased} متجر · ${editor} تعديل`}
      </button>
      <BuyCreditsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </>
  );
}
