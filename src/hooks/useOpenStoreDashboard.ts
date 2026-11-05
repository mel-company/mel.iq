import { useCallback } from "react";
import { toast } from "sonner";
import { useValidateToStorefront } from "@/api/wrappers/auth.wrappers";

/** Strip to the platform slug (`battery` from `dash.battery.mel.iq`, etc.). */
export function toStoreSlug(domain?: string | null): string {
  return (
    domain
      ?.trim()
      .replace(/^https?:\/\//, "")
      .replace(/^dash\./i, "")
      .replace(/\.mel\.iq$/i, "")
      .split("/")[0]
      ?.split(".")[0] || ""
  );
}

function pickBridgeRedirect(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  for (const obj of [root, nested]) {
    const url = obj?.redirectUrl;
    if (typeof url === "string" && url.includes("/bridge?token=")) {
      return url;
    }
  }
  return null;
}

/**
 * Owner SSO: mel.iq → dash.{slug}.mel.iq/bridge?token=… → signed-in dashboard.
 *
 * Same-tab redirect (not a blank popup). Async `window.open("")` often never
 * navigates after the API returns, so the merchant sees “nothing happen”.
 * Never fall back to a bare dash host — that dumps them on /login without a session.
 */
export function useOpenStoreDashboard() {
  const mutation = useValidateToStorefront();

  const openDashboard = useCallback(
    (storeDomain: string | null | undefined) => {
      const slug = toStoreSlug(storeDomain);
      if (!slug) {
        toast.error("تعذر تحديد المتجر");
        return;
      }

      mutation.mutate(
        { store: slug },
        {
          onSuccess: (data) => {
            const redirectUrl = pickBridgeRedirect(data);
            if (!redirectUrl) {
              toast.error("تعذر فتح الداشبورد. حاول مرة أخرى.");
              return;
            }
            // Direct hand-off in this tab — what owners expect from mel.iq.
            window.location.assign(redirectUrl);
          },
          onError: (error: unknown) => {
            const message =
              (
                error as {
                  response?: { data?: { message?: string } };
                  message?: string;
                }
              )?.response?.data?.message ||
              (error as { message?: string })?.message ||
              "حدث خطأ في فتح الداشبورد";
            toast.error(message);
          },
        },
      );
    },
    [mutation],
  );

  return {
    openDashboard,
    isPending: mutation.isPending,
  };
}
