import { useEffect, useState } from "react";
import ModalPortal from "./ModalPortal";
import { CheckCircle2, ExternalLink, Copy, X } from "@/components/icons";
import { toast } from "sonner";
import {
  needsDashboardProvisioning,
  useWaitForDashboardReady,
} from "@/hooks/useWaitForDashboardReady";
import StoreProvisioningGate from "@/components/StoreProvisioningGate";
import { useValidateToStorefront } from "@/api/wrappers/auth.wrappers";
import { resolveDashboardUrl } from "@/utils/storeUrls";

/**
 * Shown when a generation finishes.
 *
 * Its buttons open the store's merchant dashboard on the editor page, signed
 * in, so the merchant lands inside the dashboard rather than in a bare editor
 * with no way back to orders and products.
 *
 * Deliberately replaces the old hard redirect: the user has just watched a
 * minute of progress and should see what was built and choose where to go,
 * rather than being thrown into the editor mid-thought. Opening in a new tab
 * also keeps the landing page (and its history list) available.
 */

interface SuccessModalProps {
  open: boolean;
  storeName?: string;
  subdomain?: string;
  /**
   * The generation's editor hand-off link. Its `store` and `generation` say
   * which dashboard to open and what to load; the link itself is only
   * followed when the dashboard session cannot be minted.
   */
  editorUrl?: string;
  /** The storefront address. */
  storeUrl?: string;
  /** True when the run already deployed it, so the address is answering. */
  published?: boolean;
  onClose: () => void;
}

export default function SuccessModal({
  open,
  storeName,
  subdomain,
  editorUrl,
  storeUrl,
  published = false,
  onClose,
}: SuccessModalProps) {
  const {
    isWaiting: isProvisioning,
    timedOut: provisioningTimedOut,
    lastStatus: provisioningStatus,
    error: provisioningError,
    waitUntilReady,
    reset: resetProvisioning,
  } = useWaitForDashboardReady();
  const [pendingOpen, setPendingOpen] = useState<{
    newTab: boolean;
  } | null>(null);
  const openDashboard = useValidateToStorefront();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      resetProvisioning();
      setPendingOpen(null);
    }
  }, [open, resetProvisioning]);

  if (!open) return null;

  const navigateTo = (url: string, tab: Window | null) => {
    if (tab && !tab.closed) tab.location.replace(url);
    else window.location.href = url;
  };

  /**
   * Signs the merchant in to their store's dashboard and lands them on its
   * editor page, the same place the dashboard's own «محرر الموقع» opens.
   *
   * The generation link carries everything needed: `store` to mint the
   * dashboard session for, and `generation`, which the dashboard passes on to
   * the editor once so a regeneration into an existing store still replaces
   * its pages. If the dashboard session cannot be minted, the editor link is
   * still a way into the new store, so it is used rather than a dead end.
   */
  const openDashboardEditor = async (tab: Window | null) => {
    if (!editorUrl) return;
    const params = new URL(editorUrl, window.location.origin).searchParams;
    const store = params.get("store") || subdomain;
    const generationId = params.get("generation");

    if (!store) {
      navigateTo(editorUrl, tab);
      return;
    }

    try {
      const data = await openDashboard.mutateAsync({ store });
      const redirectUrl: string | undefined =
        data?.redirectUrl || data?.data?.redirectUrl;
      if (!redirectUrl) throw new Error("no dashboard redirect");

      const url = new URL(redirectUrl);
      url.searchParams.set(
        "next",
        generationId
          ? `/editor?generation=${encodeURIComponent(generationId)}`
          : "/editor",
      );
      navigateTo(url.toString(), tab);
    } catch (err) {
      console.error("Could not open the dashboard, opening the editor:", err);
      navigateTo(editorUrl, tab);
    }
  };

  const openEditor = async (newTab: boolean) => {
    if (!editorUrl) return;
    resetProvisioning();
    setPendingOpen(null);

    // Opened empty inside the click and navigated once the session exists:
    // opening after the await loses the user gesture and the popup blocker
    // eats the tab. `noopener` would return null, so it is severed by hand.
    const openTab = () => {
      if (!newTab) return null;
      const tab = window.open("about:blank", "_blank");
      if (tab) tab.opener = null;
      return tab;
    };

    // Only the store's own `dash.<slug>` host has a certificate to wait for.
    const dashboardUrl = subdomain
      ? resolveDashboardUrl({ domain: subdomain })
      : null;
    if (
      !subdomain ||
      !dashboardUrl ||
      !needsDashboardProvisioning(dashboardUrl, subdomain)
    ) {
      await openDashboardEditor(openTab());
      return;
    }

    setPendingOpen({ newTab });
    const result = await waitUntilReady(subdomain);
    if (result.status === "ready") {
      await openDashboardEditor(openTab());
    }
  };

  return (
    <ModalPortal>
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gen-success-title"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1e1b4b] p-6 text-center shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="absolute start-4 top-4 text-white/40 transition-colors hover:text-white/80"
            >
              <X size={20} />
            </button>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#00c8ff]/10">
              <CheckCircle2 size={30} className="text-[#00c8ff]" />
            </div>

            <h2 id="gen-success-title" className="mb-2 text-xl font-bold text-white">
              تم إنشاء متجرك
            </h2>
            {storeName && (
              <p className="mb-1 text-lg text-white/90">{storeName}</p>
            )}

            {storeUrl && (
              <div className="mb-6 mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center justify-between gap-2" dir="ltr">
                  {published ? (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm text-[#00c8ff] underline-offset-2 hover:underline"
                    >
                      {storeUrl}
                    </a>
                  ) : (
                    <span className="truncate text-sm text-white/60">{storeUrl}</span>
                  )}
                  <button
                    type="button"
                    aria-label="نسخ العنوان"
                    onClick={() => {
                      navigator.clipboard?.writeText(storeUrl);
                      toast.success("تم نسخ العنوان");
                    }}
                    className="shrink-0 text-white/40 transition-colors hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <p className="mt-1 text-right text-[11px] text-white/35">
                  {published
                    ? "متجرك منشور والعنوان فعّال الآن"
                    : "يصبح العنوان فعّالاً بعد النشر من المحرر"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void openEditor(true)}
                disabled={!editorUrl || isProvisioning || openDashboard.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00c8ff] py-3 font-medium text-white transition-colors hover:bg-[#33d4ff] disabled:opacity-40"
              >
                <ExternalLink size={16} />
                افتح المتجر في تبويب جديد
              </button>

              <button
                type="button"
                onClick={() => void openEditor(false)}
                disabled={!editorUrl || isProvisioning || openDashboard.isPending}
                className="w-full rounded-full border border-white/15 py-3 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
              >
                افتح هنا
              </button>

              {subdomain && (
                <p className="pt-1 text-xs text-white/30">
                  المتجر محفوظ باسم {subdomain} — تجده لاحقاً في سجل الإنشاء
                </p>
              )}
            </div>
          </div>
        </div>

        <StoreProvisioningGate
          open={isProvisioning || provisioningTimedOut}
          domain={subdomain}
          lastStatus={provisioningStatus}
          timedOut={provisioningTimedOut}
          error={provisioningError}
          onRetry={() => {
            if (!pendingOpen) return;
            void openEditor(pendingOpen.newTab);
          }}
          onContinueAnyway={() => {
            if (!pendingOpen) return;
            const { newTab } = pendingOpen;
            resetProvisioning();
            setPendingOpen(null);
            const tab = newTab ? window.open("about:blank", "_blank") : null;
            if (tab) tab.opener = null;
            void openDashboardEditor(tab);
          }}
        />
      </>
    </ModalPortal>
  );
}
