import { useEffect, useState } from "react";
import { storeAPI } from "@/api/endpoints/store.endpoints";
import { CheckCircle2, Loader2, ShieldCheck } from "@/components/icons";

/** How often, and for how long, the dashboard certificate is checked. */
const POLL_MS = 5_000;
const MAX_POLLS = 36;

type SslState = "checking" | "ready" | "pending";

/**
 * The wizard's last screen: the store exists, and the merchant goes home to
 * build it (AI prompt or editor) from there.
 *
 * Creating the store asks Cloudflare for `dash.<slug>.mel.iq`, and Total TLS
 * then issues its certificate on its own. Polling `dashboard-ready` here shows
 * that happening, and the server repairs the record if it is missing, so the
 * dashboard is reachable by the time the merchant first opens it.
 */
function CheckoutDone({
  slug,
  storeName,
  onHome,
}: {
  slug: string;
  storeName: string;
  onHome: () => void;
}) {
  const [ssl, setSsl] = useState<SslState>("checking");
  const dashboardHost = `dash.${slug}.mel.iq`;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    const poll = async () => {
      polls += 1;
      try {
        const result = await storeAPI.checkDashboardReady({ domain: slug });
        if (cancelled) return;
        if (result?.ready) {
          setSsl("ready");
          return;
        }
      } catch {
        // An older server or a blip: keep trying until the limit.
      }
      if (cancelled) return;
      if (polls >= MAX_POLLS) {
        setSsl("pending");
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [slug]);

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-mint/15 text-mint shadow-[0_0_40px_rgba(0,214,143,0.25)]">
        <CheckCircle2 size={44} />
      </span>

      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
          تم إنشاء متجرك بنجاح
        </h2>
        <p className="text-sm leading-6 text-[#9aa1bd]">
          {storeName ? `«${storeName}» جاهز على ` : "متجرك جاهز على "}
          <span dir="ltr" className="font-semibold text-white">
            {slug}.mel.iq
          </span>
        </p>
      </div>

      <div className="flex w-full max-w-[420px] items-center gap-3 rounded-[18px] border border-white/[0.08] bg-field px-4 py-3.5 text-right">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            ssl === "ready" ? "bg-mint/15 text-mint" : "bg-brand-primary/15 text-brand-primary"
          }`}
        >
          {ssl === "checking" ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ShieldCheck size={18} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[13px] font-bold text-white">
            {ssl === "ready"
              ? "لوحة التحكم جاهزة وآمنة (SSL)"
              : "جاري تجهيز شهادة الأمان (SSL) للوحة التحكم"}
          </span>
          <span dir="ltr" className="truncate text-right text-[12px] text-[#8b92b0]">
            {dashboardHost}
          </span>
          {ssl === "pending" && (
            <span className="mt-0.5 text-[12px] text-[#8b92b0]">
              قد تحتاج بضع دقائق أخرى — ما تحتاج تسوي شي
            </span>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={onHome}
        className="flex h-[52px] w-full max-w-[420px] items-center justify-center rounded-2xl bg-gradient-to-l from-[#4f60f9] to-[#7569ff] px-8 text-[15px] font-bold text-white shadow-[0_0_24px_rgba(79,96,249,0.35)] transition-opacity hover:opacity-90"
      >
        انتقل للرئيسية لتصميم متجرك أو توليده بالذكاء الاصطناعي
      </button>
    </div>
  );
}

export default CheckoutDone;
