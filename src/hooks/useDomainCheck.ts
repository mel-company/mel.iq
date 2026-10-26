import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { DynadotSearchResult } from "@/api/endpoints/dynadot.endpoints";
import { useDynadotSearch } from "@/api/wrappers/dynadot.wrappers";
import { useCheckStoreDomainAvailability } from "@/api/wrappers/store.wrappers";
import { joinCustomDomain, splitCustomDomain } from "@/utils/domainTlds";

export type DomainType = "subdomain" | "custom";

export function inferDomainType(domain?: string): DomainType {
  if (!domain) return "subdomain";
  const clean = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .split("/")[0];
  if (!clean.includes(".")) return "subdomain";
  if (clean.endsWith(".mel.iq")) return "subdomain";
  return "custom";
}

/** Platform slug only — e.g. `hasan` from `hasan` or `hasan.mel.iq`. */
export function normalizePlatformSlug(domain?: string | null): string {
  if (!domain) return "";
  const clean = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .split("/")[0];
  return clean.replace(/\.mel\.iq$/i, "").split(".")[0];
}

export function normalizeDomainValue(domain?: string): string {
  if (!domain) return "";
  const clean = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .split("/")[0];
  if (inferDomainType(clean) === "subdomain") {
    return normalizePlatformSlug(clean);
  }
  return clean;
}

export function extractPlatformSlug(
  value: string,
  domainType: DomainType,
): string {
  const clean = value.trim().toLowerCase();
  if (domainType === "subdomain") {
    return normalizePlatformSlug(clean);
  }
  return clean.split(".")[0];
}

export function getStoreDomainType(store: {
  domain?: string | null;
  customDomain?: string | null;
}): DomainType {
  if (store.customDomain?.trim()) return "custom";
  return inferDomainType(store.domain || "");
}

export function getStoreDomainInputValue(store: {
  domain?: string | null;
  customDomain?: string | null;
}): string {
  if (store.customDomain?.trim()) {
    return store.customDomain.trim().toLowerCase();
  }
  if (inferDomainType(store.domain || "") === "custom") {
    return normalizeDomainValue(store.domain);
  }
  return normalizePlatformSlug(store.domain);
}

type UseDomainCheckOptions = {
  initialDomain?: string;
  initialDomainType?: DomainType;
};

export function useDomainCheck({
  initialDomain = "",
  initialDomainType = "subdomain",
}: UseDomainCheckOptions = {}) {
  const [domain, setDomain] = useState(initialDomain);
  const [domainType, setDomainType] = useState<DomainType>(initialDomainType);
  const [domainChecked, setDomainChecked] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [dynadotResult, setDynadotResult] = useState<DynadotSearchResult | null>(
    null,
  );

  const checkDomainAvailabilityMutation = useCheckStoreDomainAvailability();
  const dynadotSearchMutation = useDynadotSearch();

  const resetCheck = useCallback(() => {
    setDomainChecked(false);
    setDomainAvailable(null);
    setDynadotResult(null);
  }, []);

  const handleDomainChange = useCallback(
    (value: string) => {
      setDomain(value);
      resetCheck();
    },
    [resetCheck],
  );

  const handleDomainTypeChange = useCallback(
    (type: DomainType) => {
      setDomainType(type);
      // Switching into buy: keep the slug and attach the default TLD.
      if (type === "custom") {
        setDomain((prev) => {
          const { name, tld } = splitCustomDomain(prev);
          return joinCustomDomain(name || prev, tld);
        });
      } else {
        setDomain((prev) => splitCustomDomain(prev).name || prev.split(".")[0] || prev);
      }
      resetCheck();
    },
    [resetCheck],
  );

  const checkDomain = useCallback(() => {
    if (!domain.trim()) {
      toast.error("الرجاء إدخال الدومين أولاً");
      return;
    }

    setIsCheckingDomain(true);
    setDomainChecked(false);
    setDynadotResult(null);

    if (domainType === "custom") {
      const { name, tld } = splitCustomDomain(domain);
      const normalized = joinCustomDomain(name, tld);
      if (!normalized) {
        setIsCheckingDomain(false);
        toast.error("الرجاء إدخال اسم الدومين أولاً");
        return;
      }
      if (normalized !== domain.trim().toLowerCase()) {
        setDomain(normalized);
      }
      dynadotSearchMutation.mutate(
        { domain: normalized },
        {
          onSuccess: (results) => {
            setIsCheckingDomain(false);
            setDomainChecked(true);

            const result =
              results.find((r) => r.domain === normalized) ?? results[0] ?? null;
            setDynadotResult(result);

            if (!result) {
              setDomainAvailable(false);
              toast.error("لم يتم العثور على نتيجة للدومين.");
              return;
            }

            if (!result.supported) {
              setDomainAvailable(false);
              toast.error(
                result.error ||
                  "هذا النوع من الدومينات غير مدعوم للتسجيل (مثل .iq). جرّب دوميناً مثل example.com",
              );
              return;
            }

            if (result.available) {
              setDomainAvailable(true);
              toast.success("الدومين متاح للتسجيل!");
            } else {
              setDomainAvailable(false);
              toast.error(
                result.premium
                  ? "الدومين متاح كـ premium — التسجيل لاحقاً."
                  : "الدومين غير متاح. الرجاء اختيار دومين آخر.",
              );
            }
          },
          onError: (error: any) => {
            setIsCheckingDomain(false);
            setDomainChecked(false);
            console.error("Error searching domain via Dynadot:", error);
            toast.error(
              error?.response?.data?.message ||
                error?.message ||
                "حدث خطأ في البحث عن الدومين",
            );
          },
        },
      );
      return;
    }

    checkDomainAvailabilityMutation.mutate(
      { domain, domainType },
      {
        onSuccess: (data: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(true);
          const available =
            data?.isAvailable ?? data?.data?.isAvailable ?? false;
          setDomainAvailable(available);

          if (available) {
            toast.success("الدومين متاح! يمكنك المتابعة.");
          } else {
            toast.error("الدومين غير متاح. الرجاء اختيار دومين آخر.");
          }
        },
        onError: (error: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(false);
          console.error("Error checking domain:", error);
          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "حدث خطأ في التحقق من الدومين",
          );
        },
      },
    );
  }, [
    domain,
    domainType,
    checkDomainAvailabilityMutation,
    dynadotSearchMutation,
  ]);

  return {
    domain,
    domainType,
    domainChecked,
    domainAvailable,
    isCheckingDomain,
    dynadotResult,
    setDomain,
    setDomainType,
    handleDomainChange,
    handleDomainTypeChange,
    checkDomain,
    resetCheck,
  };
}
