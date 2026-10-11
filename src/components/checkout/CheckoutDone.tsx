import { useEffect, useState, type ReactNode } from "react";
import { storeAPI } from "@/api/endpoints/store.endpoints";
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, Store } from "@/components/icons";

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
  planName,
  planNote,
  onHome,
}: {
  slug: string;
  storeName: string;
  planName?: string;
  /** e.g. «الشهر الأول ببلاش»; omitted when there is nothing to say. */
  planNote?: string;
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
    <div className="flex flex-col items-center gap-7 py-2 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-mint/15 text-mint shadow-[0_0_40px_rgba(0,214,143,0.25)]">
          <CheckCircle2 size={34} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[26px] font-extrabold leading-tight text-white sm:text-[30px]">
            تم إنشاء حسابك
          </h2>
          <p className="text-sm leading-6 text-[#9aa1bd]">
            باقي خطوة وحدة: صمّم واجهة متجرك
          </p>
        </div>
      </div>

      {/* What now exists, one row each. */}
      <ul className="flex w-full max-w-[440px] flex-col divide-y divide-white/[0.06] rounded-[20px] border border-white/[0.08] bg-field text-right">
        <Row icon={<Store size={18} />} label={storeName || "متجرك"}>
          <span dir="ltr">{slug}.mel.iq</span>
        </Row>
        <Row
          icon={
            ssl === "checking" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )
          }
          tone={ssl === "ready" ? "mint" : "brand"}
          label="لوحة التحكم"
          badge={
            ssl === "ready" ? (
              <Badge tone="mint">SSL جاهز</Badge>
            ) : (
              <Badge tone="brand">{ssl === "pending" ? "SSL خلال دقائق" : "تجهيز SSL…"}</Badge>
            )
          }
        >
          <span dir="ltr">{dashboardHost}</span>
        </Row>
        {planName && (
          <Row icon={<Sparkles size={18} />} label={`باقة ${planName}`}>
            {planNote || "مفعّلة"}
          </Row>
        )}
      </ul>

      <div className="flex w-full max-w-[440px] flex-col items-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-[#4f60f9] to-[#7569ff] px-8 text-[15px] font-bold text-white shadow-[0_0_24px_rgba(79,96,249,0.35)] transition-opacity hover:opacity-90"
        >
          <Sparkles size={18} />
          ابدأ بناء متجرك
        </button>
        <p className="text-[12px] leading-5 text-[#8b92b0]">
          من الرئيسية: ولّده بالذكاء الاصطناعي أو صمّمه بنفسك
        </p>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  badge,
  tone = "brand",
  children,
}: {
  icon: ReactNode;
  label: string;
  badge?: ReactNode;
  tone?: "brand" | "mint";
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
          tone === "mint" ? "bg-mint/15 text-mint" : "bg-brand-primary/15 text-brand-primary"
        }`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-bold text-white">{label}</span>
        <span className="truncate text-[12px] text-[#8b92b0]">{children}</span>
      </span>
      {badge}
    </li>
  );
}

function Badge({ tone, children }: { tone: "brand" | "mint"; children: ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        tone === "mint" ? "bg-mint/15 text-mint" : "bg-brand-primary/15 text-[#9eb0ff]"
      }`}
    >
      {children}
    </span>
  );
}

export default CheckoutDone;
