import { InfinityIcon } from "@/components/icons";

/**
 * Tells an unlimited account that it is one, under the prompt box.
 *
 * Not in the composer's controls row: a badge there crowded the buttons on
 * phones and was removed (CreditsBadge). Only rendered for unlimited accounts,
 * so metered merchants see the page exactly as before.
 *
 * `daily` is missing until the backend that reports the daily cap is deployed;
 * the badge then just says the account is unlimited.
 */
export default function UnlimitedCreditsBadge({
  daily,
}: {
  daily?: { limit: number; used: number; remaining: number };
}) {
  const capped = daily ? daily.remaining <= 0 : false;

  return (
    <div className="mt-4 flex justify-center">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
          capped
            ? "border-red-400/30 bg-red-500/10 text-red-200"
            : "border-white/15 bg-white/5 text-white/90"
        }`}
      >
        <InfinityIcon size={16} className={capped ? "text-red-300" : "text-brand-violet"} />
        <span>رصيد غير محدود</span>
        {daily && (
          <>
            <span className="text-white/30">·</span>
            <span className={capped ? "" : "text-white/70"}>
              {capped
                ? "وصلت إلى حد اليوم، حاول غداً"
                : `متبقٍ اليوم ${daily.remaining} من ${daily.limit}`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
