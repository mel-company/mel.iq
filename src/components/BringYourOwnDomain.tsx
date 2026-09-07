import { useState } from "react";
import { toast } from "sonner";
import type { DomainConnectDiscovery } from "@/api/endpoints/domain.endpoints";
import { useDiscoverDomainConnect } from "@/api/wrappers/domain.wrappers";

/**
 * Path 3 only: merchant already owns a domain.
 * Calls discover — does NOT attach / custom-domain / Cloudflare.
 * Buttons follow result.ui.primaryAction (never provider name).
 */
export default function BringYourOwnDomain() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DomainConnectDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const discoverMutation = useDiscoverDomainConnect();

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
    // Template + Apply comes later — keep UI ready via primaryAction only.
    toast.info("الربط التلقائي قريباً بعد تفعيل القالب.");
  };

  const onConnectManually = () => {
    // DNS records empty for now — instructions land with Template + Apply.
    toast.info("تعليمات الربط اليدوي قريباً.");
  };

  const loading = discoverMutation.isPending;

  return (
    <section className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-400">
          عندي دومين جاهز
        </label>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
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
            disabled={loading}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black outline-none transition focus:border-transparent focus:ring-2 focus:ring-black disabled:opacity-50 dark:border-gray-600 dark:bg-black dark:text-white dark:focus:ring-white"
          />
          <button
            type="button"
            onClick={onCheck}
            disabled={loading || !domain.trim()}
            className="shrink-0 rounded-lg border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
          >
            {loading ? "جاري التحقق…" : "تحقق"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <div>
            <h3 className="text-base font-semibold text-black dark:text-white">
              {result.ui.title}
            </h3>
            {result.provider.displayName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                المزود: {result.provider.displayName}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500" dir="ltr">
              {result.domain} · {result.connectionMode}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {result.ui.primaryAction === "connect_automatically" ? (
              <button
                type="button"
                onClick={onConnectAutomatically}
                className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Connect Automatically
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectManually}
                className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Connect Manually
              </button>
            )}

            {result.ui.secondaryAction === "connect_manually" && (
              <button
                type="button"
                onClick={onConnectManually}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
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
