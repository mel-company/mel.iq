import { useState } from "react";
import { toast } from "sonner";
import type { DomainConnectDiscovery } from "@/api/endpoints/domain.endpoints";
import {
  useDiscoverDomainConnect,
  useStartDomainConnect,
} from "@/api/wrappers/domain.wrappers";

/**
 * Path 3 only: merchant already owns a domain.
 * Discover → buttons from ui.primaryAction (never provider name).
 * Automatic → POST /domain/connect/start → open applyUrl.
 * Does NOT attach / custom-domain / Cloudflare from this screen.
 */
export default function BringYourOwnDomain() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DomainConnectDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
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

    startMutation.mutate(
      { domain: target },
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

  const onConnectManually = () => {
    // DNS records / instructions come later — no attach here.
    toast.info("تعليمات الربط اليدوي قريباً.");
  };

  const loading = discoverMutation.isPending;
  const starting = startMutation.isPending;

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-2 block text-[13px] font-bold text-[#5b6178] dark:text-muted">
          عندي دومين جاهز
        </label>
        <p className="mb-4 text-sm leading-6 text-[#5b6178] dark:text-muted">
          أدخل دوميناً تملكه مسبقاً — نفحص إن كان الربط التلقائي متاحاً أو يدوياً.
          التحقق لا يربط الدومين بالمتجر.
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
            disabled={loading || starting}
            dir="ltr"
            className="h-[52px] w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm text-[#0b1020] outline-none transition-colors placeholder:text-[#a9adbe] focus:border-brand-indigo disabled:opacity-50 dark:border-field-line dark:bg-field dark:text-frost dark:placeholder:text-dim dark:focus:border-brand-primary"
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={loading || starting || !domain.trim()}
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
                disabled={starting}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting ? "جاري التحويل…" : "Connect Automatically"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectManually}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90"
              >
                Connect Manually
              </button>
            )}

            {result.ui.secondaryAction === "connect_manually" && (
              <button
                type="button"
                onClick={onConnectManually}
                disabled={starting}
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] px-5 py-2.5 text-sm font-bold text-[#0b1020] transition-colors hover:bg-black/[0.06] disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
              >
                Connect Manually
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
