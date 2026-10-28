import { useState } from "react";
import { toast } from "sonner";
import type { DomainConnectDiscovery } from "@/api/endpoints/domain.endpoints";
import { domainAPI } from "@/api/endpoints/domain.endpoints";
import {
  useDiscoverDomainConnect,
  useStartDomainConnect,
} from "@/api/wrappers/domain.wrappers";
import { saveDomainConnectPending } from "@/utils/domainConnectPending";

type BringYourOwnDomainProps = {
  storeId: string;
};

/**
 * Path 3: merchant already owns a domain.
 * Automatic → Domain Connect at Cloudflare → /domain-connect/done attaches.
 * Manual → attach Custom Hostnames immediately and show DNS guidance later.
 */
export default function BringYourOwnDomain({ storeId }: BringYourOwnDomainProps) {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DomainConnectDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const discoverMutation = useDiscoverDomainConnect();
  const startMutation = useStartDomainConnect();

  const onCheck = () => {
    const trimmed = domain.trim().toLowerCase();
    if (!trimmed) {
      toast.error("أدخل الدومين أولاً");
      return;
    }

    setError(null);
    setResult(null);

    discoverMutation.mutate(
      { domain: trimmed },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          setError("ما قدرنا نفحص هذا الدومين. جرّب مرة ثانية.");
        },
      },
    );
  };

  const onConnectAutomatically = () => {
    const target = (result?.domain || domain).trim().toLowerCase();
    if (!target) {
      toast.error("أدخل الدومين أولاً");
      return;
    }
    if (!storeId) {
      toast.error("معرف المتجر مفقود");
      return;
    }

    const redirectUri = `${window.location.origin}/domain-connect/done`;
    saveDomainConnectPending({
      domain: target,
      storeId,
      returnTo: "/dashboard",
    });

    startMutation.mutate(
      { domain: target, redirectUri },
      {
        onSuccess: (data) => {
          if (!data?.applyUrl) {
            toast.error("ما استلمنا رابط الربط التلقائي. جرّب مرة ثانية.");
            return;
          }
          window.location.href = data.applyUrl;
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message ||
              "تعذر بدء الربط التلقائي. جرّب مرة ثانية.",
          );
        },
      },
    );
  };

  const onConnectManually = async () => {
    const target = (result?.domain || domain).trim().toLowerCase();
    if (!target) {
      toast.error("أدخل الدومين أولاً");
      return;
    }
    if (!storeId) {
      toast.error("معرف المتجر مفقود");
      return;
    }

    setAttaching(true);
    try {
      await domainAPI.setCustomDomain({ domain: target, storeId });
      toast.success("تم ربط الدومين بالمتجر. أكمل سجلات DNS إن طُلبت.");
      window.location.assign(`/store/${storeId}/manage`);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(" — ")
          : message || "تعذر ربط الدومين. جرّب مرة ثانية.",
      );
    } finally {
      setAttaching(false);
    }
  };

  const loading = discoverMutation.isPending;
  const starting = startMutation.isPending;
  const busy = loading || starting || attaching;

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-2 block text-[13px] font-bold text-[#5b6178] dark:text-muted">
          عندي دومين جاهز
        </label>
        <p className="mb-4 text-sm leading-6 text-[#5b6178] dark:text-muted">
          أدخل دوميناً تملكه مسبقاً — نفحص إن كان الربط التلقائي متاحاً أو يدوياً.
          بعد تفويض Cloudflare نرجع ونربط الدومين بالمتجر تلقائياً.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setResult(null);
              setError(null);
            }}
            placeholder="example.com"
            disabled={busy}
            dir="ltr"
            className="h-[52px] w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm text-[#0b1020] outline-none transition-colors placeholder:text-[#a9adbe] focus:border-brand-indigo disabled:opacity-50 dark:border-field-line dark:bg-field dark:text-frost dark:placeholder:text-dim dark:focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={busy || !domain.trim()}
            className="h-[52px] shrink-0 rounded-2xl border border-black/10 bg-black/[0.03] px-6 text-sm font-bold text-[#0b1020] transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
          >
            {loading ? "جاري التحقق…" : "تحقق"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-[#ff5c7a]/30 bg-[#ff5c7a]/[0.08] px-4 py-3 text-sm text-[#b62347] dark:text-[#ff8da3]">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4 rounded-2xl border border-black/8 bg-black/[0.02] p-5 dark:border-white/8 dark:bg-white/[0.03]">
          <div>
            <h3 className="text-base font-bold text-[#0b1020] dark:text-frost">
              {result.ui.title}
            </h3>
            {result.provider.displayName && (
              <p className="mt-1 text-sm text-[#5b6178] dark:text-muted">
                المزود: {result.provider.displayName}
              </p>
            )}
            <p className="mt-1 text-xs text-[#8a90a8] dark:text-dim" dir="ltr">
              {result.domain} · {result.connectionMode}
              {result.automaticAvailable ? " · automatic available" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {result.ui.primaryAction === "connect_automatically" ? (
              <button
                type="button"
                onClick={onConnectAutomatically}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? "جاري التحويل…" : "ربط تلقائي"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectManually}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {attaching ? "جاري الربط…" : "ربط يدوي"}
              </button>
            )}

            {result.ui.secondaryAction === "connect_manually" && (
              <button
                type="button"
                onClick={onConnectManually}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] px-5 py-2.5 text-sm font-bold text-[#0b1020] transition-colors hover:bg-black/[0.06] disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
              >
                {attaching ? "جاري الربط…" : "ربط يدوي"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
