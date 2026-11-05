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

/**
 * Owner SSO: mel.iq → dash.{slug}.mel.iq/bridge?token=… → signed-in dashboard.
 * Never open the bare /login host for the merchant who is already logged in here.
 */
export function useOpenStoreDashboard() {
  const mutation = useValidateToStorefront();

  const openDashboard = useCallback(
    (storeDomain: string | null | undefined, fallbackUrl?: string | null) => {
      const slug = toStoreSlug(storeDomain);
      if (!slug) {
        toast.error("تعذر تحديد المتجر");
        return;
      }

      // Keep the gesture so Safari allows the tab; fill URL after mint.
      const newWindow = window.open("", "_blank");

      mutation.mutate(
        { store: slug },
        {
          onSuccess: (data: { redirectUrl?: string; data?: { redirectUrl?: string } }) => {
            const redirectUrl =
              data?.redirectUrl || data?.data?.redirectUrl || fallbackUrl || null;
            if (!redirectUrl) {
              newWindow?.close();
              toast.error("تعذر فتح الداشبورد. حاول مرة أخرى.");
              return;
            }
            if (newWindow && !newWindow.closed) {
              newWindow.location.href = redirectUrl;
              return;
            }
            window.location.href = redirectUrl;
          },
          onError: (error: unknown) => {
            newWindow?.close();
            const message =
              (error as { response?: { data?: { message?: string } }; message?: string })
                ?.response?.data?.message ||
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
