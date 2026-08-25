import { useCallback, useRef, useState } from "react";
import { storeAPI } from "@/api/endpoints/store.endpoints";

export type DashboardReadyStatus = {
  ready: boolean;
  host: string;
  dnsOk: boolean;
  tlsOk: boolean;
};

export type WaitResult =
  | { status: "ready"; result: DashboardReadyStatus }
  | { status: "timeout"; result: DashboardReadyStatus | null }
  | { status: "cancelled" };

const DEFAULT_POLL_MS = 4_000;
const DEFAULT_TIMEOUT_MS = 3 * 60_000;

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .replace(/\.mel\.iq$/i, "")
    .split("/")[0];
}

/**
 * Polls POST /domain/dashboard-ready until TLS+DNS are ready or timeout.
 * Use before redirecting to dash.{slug}.mel.iq after first-time store create.
 */
export function useWaitForDashboardReady(options?: {
  pollIntervalMs?: number;
  timeoutMs?: number;
}) {
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const [isWaiting, setIsWaiting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [lastStatus, setLastStatus] = useState<DashboardReadyStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const activeDomainRef = useRef<string | null>(null);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setIsWaiting(false);
    setTimedOut(false);
    setLastStatus(null);
    setError(null);
    activeDomainRef.current = null;
  }, []);

  const checkOnce = useCallback(
    async (domain: string): Promise<DashboardReadyStatus> => {
      const data = await storeAPI.checkDashboardReady({ domain });
      return {
        ready: Boolean(data?.ready),
        host: data?.host || `dash.${domain}.mel.iq`,
        dnsOk: data?.dnsOk ?? false,
        tlsOk: data?.tlsOk ?? false,
      };
    },
    [],
  );

  const waitUntilReady = useCallback(
    async (rawDomain: string): Promise<WaitResult> => {
      const domain = normalizeDomain(rawDomain);
      if (!domain) {
        setError("النطاق غير صالح");
        return { status: "timeout", result: null };
      }

      cancelRef.current = false;
      activeDomainRef.current = domain;
      setTimedOut(false);
      setError(null);

      const startedAt = Date.now();
      let latest: DashboardReadyStatus | null = null;
      let gateShown = false;

      try {
        while (!cancelRef.current) {
          try {
            latest = await checkOnce(domain);
            setLastStatus(latest);
            if (latest.ready) {
              setIsWaiting(false);
              return { status: "ready", result: latest };
            }
            // Only show the full-screen gate once we know it is not ready yet,
            // so already-provisioned stores open without a flash.
            if (!gateShown) {
              gateShown = true;
              setIsWaiting(true);
            }
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "تعذر التحقق من جاهزية المتجر";
            setError(message);
            if (!gateShown) {
              gateShown = true;
              setIsWaiting(true);
            }
          }

          if (Date.now() - startedAt >= timeoutMs) {
            setTimedOut(true);
            setIsWaiting(false);
            return { status: "timeout", result: latest };
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, pollIntervalMs);
          });
        }

        setIsWaiting(false);
        return { status: "cancelled" };
      } finally {
        if (activeDomainRef.current === domain) {
          setIsWaiting(false);
        }
      }
    },
    [checkOnce, pollIntervalMs, timeoutMs],
  );

  return {
    isWaiting,
    timedOut,
    lastStatus,
    error,
    activeDomain: activeDomainRef.current,
    waitUntilReady,
    cancel,
    reset,
    normalizeDomain,
  };
}
