import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useFetchStores, useUpdateStore } from "@/api/wrappers/store.wrappers";
import DomainSettingsFields from "@/components/DomainSettingsFields";
import {
  getStoreDomainInputValue,
  getStoreDomainType,
  normalizePlatformSlug,
  useDomainCheck,
} from "@/hooks/useDomainCheck";
import {
  getDomainPurchasePricing,
  formatUsd,
} from "@/utils/domainPricing";
import {
  useFetchSubscriptions,
  useRenewSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useUpdateSubscription,
} from "@/api/wrappers/subscription.wrapper";
import { useInitPlatformPayment } from "@/api/wrappers/platform-payment.wrapper";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowRightIcon,
  CreditCard,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";

type ManageTab = "overview" | "domain" | "subscription" | "social";

const R2_PUBLIC_BASE =
  "https://pub-f8707810144b47a6978976f94751bbc8.r2.dev";

const MANAGE_TABS: {
  id: ManageTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: "overview", label: "نظرة عامة", icon: LayoutGrid },
  { id: "domain", label: "الدومين", icon: Globe },
  { id: "subscription", label: "الاشتراك", icon: CreditCard },
  { id: "social", label: "السوشيال", icon: Share2 },
];

const RENEWAL_RETURN_KEY = "mel_renewal_return";
const DOMAIN_PURCHASE_RETURN_KEY = "mel_domain_purchase_return";
const LAST_PAYMENT_ID_KEY = "mel_last_platform_payment_id";

// Types
interface Store {
  id: string;
  name: string;
  domain?: string;
  customDomain?: string | null;
  /** Public storefront URL from API, e.g. https://mystore.mel.iq */
  storeUrl?: string;
  is_deleted?: boolean;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
  logo?: string | null;
}

interface Subscription {
  id: string;
  storeId: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
  start_at?: string;
  end_at?: string;
  planId?: string;
  plan?: {
    id?: string;
    name: string;
    is_free?: boolean;
    monthly_price?: number;
    yearly_price?: number;
  };
}

interface TimeRemaining {
  expired: boolean;
  text: string;
  daysLeft?: number;
}

// Utils
const normalizeApiResponse = <T,>(data: any): T[] => {
  if (!data) return [];
  const normalized = data?.data || data?.stores || data?.subscriptions || data;
  return Array.isArray(normalized) ? normalized : [];
};

const getTimeRemaining = (endDate?: string): TimeRemaining | null => {
  if (!endDate) return null;

  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { expired: true, text: "منتهي" };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      expired: false,
      text: `${days} يوم متبقي`,
      daysLeft: days,
    };
  }

  if (hours > 0) {
    return {
      expired: false,
      text: `${hours} ساعة متبقية`,
      daysLeft: 0,
    };
  }

  return {
    expired: false,
    text: `${minutes} دقيقة متبقية`,
    daysLeft: 0,
  };
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "غير محدد";

  try {
    return new Date(dateString).toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "تاريخ غير صالح";
  }
};

const STATUS_CONFIG = {
  ACTIVE: {
    text: "نشط",
    className:
      "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700",
  },
  INACTIVE: {
    text: "متوقف",
    className:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
  },
  CANCELLED: {
    text: "ملغي",
    className:
      "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700",
  },
  EXPIRED: {
    text: "منتهي",
    className:
      "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700",
  },
} as const;

const getStatusBadge = (status: string) => {
  return (
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      text: status,
      className:
        "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700",
    }
  );
};

const isBasicPlan = (planName?: string): boolean => {
  if (!planName) return false;
  const plan = planName.toLowerCase();
  return (
    plan.includes("أولى") || plan.includes("first") || plan.includes("basic")
  );
};

const resolveStoreLogoUrl = (logo?: string | null): string | null => {
  if (!logo || logo === "placeholder") return null;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${R2_PUBLIC_BASE}/${logo.replace(/^\//, "")}`;
};

const SectionCard = ({
  title,
  description,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-black ${className}`}
  >
    {(title || description) && (
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        {title && (
          <h2 className="text-lg font-semibold text-black dark:text-white">
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    )}
    <div className="p-6 text-black dark:text-white">{children}</div>
  </section>
);

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <div
      className="mt-1 text-sm font-semibold text-black dark:text-white"
      dir="ltr"
    >
      {value}
    </div>
    {hint && (
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
    )}
  </div>
);

// Components
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
    <div className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-black">
      <Skeleton className="h-10 w-72" />
    </div>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[28rem] w-full rounded-2xl" />
    </div>
  </div>
);

const StoreNotFound = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
    <div className="text-center">
      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
      <h2 className="text-2xl font-bold text-black dark:text-white mb-4">
        المتجر غير موجود
      </h2>
      <button
        onClick={onBack}
        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
      >
        العودة للوحة التحكم
      </button>
    </div>
  </div>
);

const SubscriptionPanel = ({
  subscription,
  isPlanBasic,
  onRenew,
  onPause,
  onResume,
  onCancel,
  onUpgrade,
  isPending,
}: {
  subscription: Subscription | null;
  isPlanBasic: boolean;
  onRenew: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onUpgrade: () => void;
  isPending: {
    renew: boolean;
    pause: boolean;
    resume: boolean;
    cancel: boolean;
    upgrade: boolean;
  };
}) => {
  if (!subscription) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
        <CreditCard className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        <p className="font-medium text-black dark:text-white">
          لا يوجد اشتراك نشط
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          هذا المتجر غير مرتبط باشتراك حالياً
        </p>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining(subscription.end_at);
  const statusBadge = getStatusBadge(subscription.status);

  const actionBtn =
    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="الحالة"
          value={
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.className}`}
            >
              {statusBadge.text}
            </span>
          }
        />
        <StatCard
          label="الخطة"
          value={subscription.plan?.name || "غير محدد"}
        />
        <StatCard
          label="الوقت المتبقي"
          value={
            <span
              className={
                timeRemaining?.expired
                  ? "text-red-600 dark:text-red-400"
                  : (timeRemaining?.daysLeft ?? 0) <= 7
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
              }
            >
              {timeRemaining?.text || "—"}
            </span>
          }
        />
        <StatCard
          label="تاريخ البدء"
          value={formatDate(subscription.start_at)}
        />
        <StatCard
          label="تاريخ الانتهاء"
          value={formatDate(subscription.end_at)}
        />
      </div>

      {isPlanBasic ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm font-medium text-black dark:text-white">
            الخطة الأولى
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            الترقية والتجديد غير متاحين في هذه الخطة
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              إجراءات الاشتراك
            </p>
            <div className="flex flex-wrap gap-2">
              {subscription.status === "ACTIVE" && (
                <>
                  <button
                    onClick={onRenew}
                    disabled={isPending.renew}
                    className={`${actionBtn} bg-green-600 text-white hover:bg-green-700`}
                  >
                    {isPending.renew ? "جاري..." : "تجديد"}
                  </button>
                  <button
                    onClick={onUpgrade}
                    disabled={isPending.upgrade}
                    className={`${actionBtn} border border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-200`}
                  >
                    {isPending.upgrade ? "جاري..." : "ترقية الخطة"}
                  </button>
                  <button
                    onClick={onPause}
                    disabled={isPending.pause}
                    className={`${actionBtn} border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-200`}
                  >
                    {isPending.pause ? "جاري..." : "إيقاف مؤقت"}
                  </button>
                </>
              )}

              {subscription.status === "INACTIVE" && (
                <button
                  onClick={onResume}
                  disabled={isPending.resume}
                  className={`${actionBtn} bg-green-600 text-white hover:bg-green-700`}
                >
                  {isPending.resume ? "جاري..." : "استئناف"}
                </button>
              )}

              {(subscription.status === "CANCELLED" ||
                subscription.status === "EXPIRED") && (
                <button
                  onClick={onUpgrade}
                  disabled={isPending.upgrade}
                  className={`${actionBtn} bg-violet-600 text-white hover:bg-violet-700`}
                >
                  {isPending.upgrade ? "جاري..." : "ترقية / تجديد"}
                </button>
              )}
            </div>
          </div>

          {(subscription.status === "ACTIVE" ||
            subscription.status === "INACTIVE") && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
              <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-300">
                منطقة الخطر
              </p>
              <button
                onClick={onCancel}
                disabled={isPending.cancel}
                className={`${actionBtn} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-300`}
              >
                {isPending.cancel ? "جاري..." : "إلغاء الاشتراك وحذف المتجر"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Component
function StoreManagement() {
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // التأكد من أن storeId موجود وصحيح (إزالة أي domain إذا كان موجوداً)
  const storeId = params.storeId?.split("/")[0] || params.storeId;

  const { data: storesData, isLoading: storesLoading, refetch: refetchStores } = useFetchStores();
  const {
    data: subscriptionsData,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useFetchSubscriptions({ storeId });

  // After ZainCash: land here with ?paymentId=&result=success
  useEffect(() => {
    const paymentId = searchParams.get("paymentId");
    const result = searchParams.get("result");
    if (!paymentId || !result) return;

    const domainReturnRaw = sessionStorage.getItem(DOMAIN_PURCHASE_RETURN_KEY);
    const domainReturn = domainReturnRaw
      ? (JSON.parse(domainReturnRaw) as { storeId?: string; domain?: string })
      : null;
    const isDomainPurchase = Boolean(domainReturn?.domain);

    if (result === "success") {
      if (isDomainPurchase) {
        toast.success("تم الدفع بنجاح! سيتم تسجيل الدومين وربطه بمتجرك.");
        void refetchStores();
      } else {
        toast.success("تم الدفع بنجاح وتم تجديد الاشتراك");
        void refetchSubscriptions();
      }
    } else {
      toast.error(
        isDomainPurchase
          ? "فشلت عملية دفع الدومين. حاول مرة أخرى."
          : "فشلت عملية الدفع. حاول مرة أخرى.",
      );
    }

    sessionStorage.removeItem(RENEWAL_RETURN_KEY);
    sessionStorage.removeItem(DOMAIN_PURCHASE_RETURN_KEY);
    sessionStorage.removeItem(LAST_PAYMENT_ID_KEY);

    const next = new URLSearchParams(searchParams);
    next.delete("paymentId");
    next.delete("result");
    next.delete("status");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refetchSubscriptions, refetchStores]);

  const renewMutation = useRenewSubscription();
  const initPaymentMutation = useInitPlatformPayment();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();
  const updateSubscriptionMutation = useUpdateSubscription();
  const updateStoreMutation = useUpdateStore();
  const { data: plansData } = useFetchAllPlans();

  const {
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
  } = useDomainCheck();

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Renew modal state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [customDuration, setCustomDuration] = useState<string>("");

  // Cancel/Delete store modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleteStoreName, setDeleteStoreName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ManageTab>("overview");

  const stores = useMemo(() => {
    const normalized = normalizeApiResponse<Store>(storesData);
    return normalized.filter((store) => !store.is_deleted);
  }, [storesData]);

  const store = useMemo(
    () => stores.find((s) => s.id === storeId),
    [stores, storeId]
  );

  // Social media form state
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    x: "",
  });

  const subscription = useMemo(() => {
    const normalized = normalizeApiResponse<Subscription>(subscriptionsData);
    return normalized[0] || null;
  }, [subscriptionsData]);

  const storeUrl =
    store?.storeUrl ||
    (store?.customDomain
      ? `https://${store.customDomain.replace(/^https?:\/\//, "")}`
      : store?.domain
        ? `https://${normalizePlatformSlug(store.domain)}.mel.iq`
        : undefined);
  const isLoading = storesLoading || subscriptionsLoading;
  const isPlanBasic = isBasicPlan(subscription?.plan?.name);

  // Update social media state when store changes
  useEffect(() => {
    if (store) {
      setSocialMedia({
        instagram: store.instagram || "",
        facebook: store.facebook || "",
        tiktok: store.tiktok || "",
        x: store.x || "",
      });

      setDomain(getStoreDomainInputValue(store));
      setDomainType(getStoreDomainType(store));
      resetCheck();
    }
  }, [store, setDomain, setDomainType, resetCheck]);

  const handleRenew = () => {
    setShowRenewModal(true);
  };

  const handleConfirmRenew = () => {
    if (!subscription?.id) return;

    const duration = customDuration
      ? parseInt(customDuration)
      : selectedDuration;

    if (!duration || duration < 1) {
      toast.error("الرجاء اختيار عدد أشهر صحيح");
      return;
    }

    const planId = subscription.plan?.id || subscription.planId;
    const isFree =
      subscription.plan?.is_free === true ||
      !(Number(subscription.plan?.monthly_price) > 0);

    if (!isFree) {
      if (!planId || !storeId) {
        toast.error("تعذر تحديد الخطة للتجديد");
        return;
      }

      sessionStorage.setItem(
        RENEWAL_RETURN_KEY,
        JSON.stringify({ storeId, durationMonths: duration }),
      );

      initPaymentMutation.mutate(
        {
          type: "RENEWAL",
          planId,
          storeId,
          durationMonths: duration,
          billingPeriod: duration >= 12 ? "YEARLY" : "MONTHLY",
          returnBaseUrl: `${window.location.origin}/store/${storeId}/manage`,
        },
        {
          onSuccess: (data) => {
            const redirectUrl = data?.redirectUrl || data?.data?.redirectUrl;
            const paymentId = data?.id || data?.data?.id;
            if (!redirectUrl) {
              toast.error("تعذر بدء عملية الدفع");
              return;
            }
            if (paymentId) {
              sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
            }
            window.location.href = redirectUrl;
          },
          onError: (error: any) => {
            toast.error(
              error?.response?.data?.message || "حدث خطأ في بدء الدفع",
            );
            console.error("Error initiating renewal payment:", error);
          },
        },
      );
      return;
    }

    renewMutation.mutate(
      { id: subscription.id, durationMonths: duration },
      {
        onSuccess: () => {
          toast.success(
            `تم تجديد الاشتراك بنجاح لمدة ${duration} ${
              duration === 1 ? "شهر" : "أشهر"
            }`,
          );
          setShowRenewModal(false);
          setSelectedDuration(1);
          setCustomDuration("");
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || "حدث خطأ في تجديد الاشتراك",
          );
          console.error("Error renewing subscription:", error);
        },
      },
    );
  };

  const handlePause = () => {
    if (subscription?.id) {
      pauseMutation.mutate(subscription.id, {
        onSuccess: () => {
          toast.success("تم إيقاف الاشتراك بنجاح");
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في إيقاف الاشتراك");
          console.error("Error pausing subscription:", error);
        },
      });
    }
  };

  const handleResume = () => {
    if (subscription?.id) {
      resumeMutation.mutate(subscription.id, {
        onSuccess: () => {
          toast.success("تم استئناف الاشتراك بنجاح");
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في استئناف الاشتراك");
          console.error("Error resuming subscription:", error);
        },
      });
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!subscription?.id || !store) return;

    if (deleteStoreName.trim() !== store.name.trim()) {
      toast.error("اسم المتجر غير متطابق. الرجاء إدخال الاسم الصحيح.");
      return;
    }

    cancelMutation.mutate(subscription.id, {
      onSuccess: () => {
        toast.success(
          "تم إلغاء الاشتراك وحذف المتجر بنجاح. يمكنك استرجاعه خلال 30 يوم."
        );
        setShowCancelModal(false);
        setDeleteStoreName("");
        // Redirect to dashboard after deletion
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      },
      onError: (error: any) => {
        toast.error("حدث خطأ في إلغاء الاشتراك");
        console.error("Error cancelling subscription:", error);
      },
    });
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = () => {
    if (!subscription?.id || !selectedPlanId) {
      toast.error("الرجاء اختيار خطة للترقية");
      return;
    }

    updateSubscriptionMutation.mutate(
      {
        id: subscription.id,
        data: {
          planId: selectedPlanId,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم ترقية الاشتراك بنجاح");
          setShowUpgradeModal(false);
          setSelectedPlanId(null);
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في ترقية الاشتراك");
          console.error("Error upgrading subscription:", error);
        },
      }
    );
  };

  const handleSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialMedia({
      ...socialMedia,
      [e.target.name]: e.target.value,
    });
  };

  const handleDomainSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeId || !store) return;

    const normalizedDomain = domain.trim().toLowerCase();
    const isCustomPurchase = domainType === "custom";
    const customDomainAlreadyLinked =
      (store.customDomain || "").trim().toLowerCase() === normalizedDomain;

    if (isCustomPurchase) {
      if (customDomainAlreadyLinked) {
        toast.info("هذا الدومين المخصص مربوط بالفعل");
        return;
      }
    } else {
      const originalSlug = normalizePlatformSlug(store.domain);
      if (normalizedDomain === originalSlug) {
        toast.info("لم يتم تغيير الدومين");
        return;
      }
    }

    if (!domainChecked || domainAvailable !== true) {
      toast.error("الرجاء التحقق من توفر الدومين أولاً");
      return;
    }

    if (domainType === "custom") {
      const pricing = getDomainPurchasePricing(dynadotResult?.price);
      if (!pricing) {
        toast.error("تعذر حساب سعر الدومين. أعد التحقق من التوفر.");
        return;
      }

      sessionStorage.setItem(
        DOMAIN_PURCHASE_RETURN_KEY,
        JSON.stringify({ storeId, domain: normalizedDomain }),
      );

      initPaymentMutation.mutate(
        {
          type: "DOMAIN_REGISTRATION",
          storeId,
          domain: normalizedDomain,
          returnBaseUrl: `${window.location.origin}/store/${storeId}/manage`,
        },
        {
          onSuccess: (data) => {
            const redirectUrl = data?.redirectUrl || data?.data?.redirectUrl;
            const paymentId = data?.id || data?.data?.id;
            if (!redirectUrl) {
              toast.error("تعذر بدء الدفع عبر زين كاش");
              return;
            }
            if (paymentId) {
              sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
            }
            window.location.href = redirectUrl;
          },
          onError: (error: any) => {
            sessionStorage.removeItem(DOMAIN_PURCHASE_RETURN_KEY);
            console.error("Error initiating domain payment:", error);
            toast.error(
              error?.response?.data?.message ||
                "تعذر بدء الدفع عبر زين كاش. حاول مرة أخرى.",
            );
          },
        },
      );
      return;
    }

    updateStoreMutation.mutate(
      {
        id: storeId,
        data: {
          domain: normalizePlatformSlug(domain),
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث سلاج المنصة بنجاح");
          resetCheck();
          void refetchStores();
        },
        onError: (error: any) => {
          console.error("Error updating platform domain:", error);
          toast.error(
            error?.response?.data?.message || "حدث خطأ في تحديث الدومين",
          );
        },
      },
    );
  };

  const handleSocialMediaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (storeId) {
      updateStoreMutation.mutate(
        {
          id: storeId,
          data: {
            instagram: socialMedia.instagram || null,
            facebook: socialMedia.facebook || null,
            tiktok: socialMedia.tiktok || null,
            x: socialMedia.x || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("تم تحديث حسابات الوسائط الاجتماعية بنجاح");
          },
          onError: (error) => {
            console.error("Error updating social media:", error);
            toast.error("حدث خطأ في تحديث حسابات الوسائط الاجتماعية");
          },
        }
      );
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!store) return <StoreNotFound onBack={() => navigate("/dashboard")} />;

  const normalizedDomainInput = domain.trim().toLowerCase();
  const customDomainAlreadyLinked =
    (store.customDomain || "").trim().toLowerCase() === normalizedDomainInput;
  const subdomainChanged =
    normalizedDomainInput !== normalizePlatformSlug(store.domain).toLowerCase();

  const canPurchaseCustomDomain =
    domainType === "custom" &&
    domainChecked &&
    domainAvailable === true &&
    !customDomainAlreadyLinked &&
    getDomainPurchasePricing(dynadotResult?.price) != null;

  const canUpdateSubdomain =
    domainType === "subdomain" &&
    subdomainChanged &&
    domainChecked &&
    domainAvailable === true;

  const canSaveDomain = canPurchaseCustomDomain || canUpdateSubdomain;
  const isSavingDomain =
    updateStoreMutation.isPending || initPaymentMutation.isPending;
  const domainPricing =
    domainType === "custom" ? getDomainPurchasePricing(dynadotResult?.price) : null;

  const platformSlug = normalizePlatformSlug(store.domain);
  const platformUrl = platformSlug ? `https://${platformSlug}.mel.iq` : null;
  const dashboardUrl = platformSlug
    ? `https://dash.${platformSlug}.mel.iq`
    : null;
  const logoUrl = resolveStoreLogoUrl(store.logo);
  const subscriptionBadge = subscription
    ? getStatusBadge(subscription.status)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-black/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-900"
              aria-label="العودة للوحة التحكم"
            >
              <ArrowRightIcon className="h-5 w-5 text-black dark:text-white" />
            </button>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={store.name}
                className="h-11 w-11 shrink-0 rounded-xl border border-gray-200 object-cover dark:border-gray-800"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
                <LayoutDashboard className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold text-black dark:text-white sm:text-2xl">
                  {store.name}
                </h1>
                {subscriptionBadge && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${subscriptionBadge.className}`}
                  >
                    {subscriptionBadge.text}
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                إدارة المتجر
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-white dark:hover:bg-gray-900"
              >
                <ExternalLink className="h-4 w-4" />
                فتح المتجر
              </a>
            )}
            {dashboardUrl && (
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                <LayoutDashboard className="h-4 w-4" />
                الداشبورد
              </a>
            )}
          </div>
        </div>

        <nav className="mx-auto max-w-7xl border-t border-gray-100 px-4 dark:border-gray-900 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-1">
            {MANAGE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="رابط المتجر"
            value={storeUrl?.replace(/^https?:\/\//, "") || "—"}
            hint="الرابط العام للزوار"
          />
          <StatCard
            label="سلاج المنصة"
            value={platformSlug ? `${platformSlug}.mel.iq` : "—"}
            hint="الدومين الافتراضي على MEL"
          />
          <StatCard
            label="الدومين المخصص"
            value={store.customDomain || "غير مربوط"}
            hint={store.customDomain ? "يعرض بدل سلاج المنصة" : "يمكن ربطه من تبويب الدومين"}
          />
          <StatCard
            label="الخطة"
            value={subscription?.plan?.name || "—"}
            hint={
              subscription
                ? getTimeRemaining(subscription.end_at)?.text || "—"
                : "لا يوجد اشتراك"
            }
          />
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard
                title="معاينة المتجر"
                description="عرض مباشر لصفحة المتجر الحالية"
              >
                {storeUrl ? (
                  <iframe
                    src={storeUrl}
                    className="h-[32rem] w-full rounded-xl border border-gray-200 dark:border-gray-800"
                    title={`معاينة ${store.name}`}
                    allow="fullscreen"
                  />
                ) : (
                  <div className="flex h-[32rem] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <Globe className="mb-3 h-10 w-10" />
                    <p>لا يوجد رابط للمتجر بعد</p>
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="روابط سريعة">
                <div className="space-y-2">
                  {storeUrl && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm text-black transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
                    >
                      <span>المتجر</span>
                      <span className="text-gray-500" dir="ltr">
                        {storeUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                  {platformUrl && (
                    <a
                      href={platformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm text-black transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
                    >
                      <span>منصة MEL</span>
                      <span className="text-gray-500" dir="ltr">
                        {platformUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                  {dashboardUrl && (
                    <a
                      href={dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm text-black transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
                    >
                      <span>لوحة التحكم</span>
                      <span className="text-gray-500" dir="ltr">
                        {dashboardUrl.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="ملخص الاشتراك">
                {subscription ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">الحالة</span>
                      <span className="font-medium text-black dark:text-white">
                        {subscriptionBadge?.text}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">الخطة</span>
                      <span className="font-medium text-black dark:text-white">
                        {subscription.plan?.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500 dark:text-gray-400">ينتهي</span>
                      <span className="font-medium text-black dark:text-white">
                        {formatDate(subscription.end_at)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("subscription")}
                      className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
                    >
                      إدارة الاشتراك
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    لا يوجد اشتراك نشط
                  </p>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {/* Tab: Domain */}
        {activeTab === "domain" && (
          <div className="mx-auto max-w-3xl">
            <SectionCard
              title="إعدادات الدومين"
              description="سلاج المنصة للروابط الافتراضية، والدومين المخصص للمتاجر التي تملك دوميناً خاصاً"
            >
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                <StatCard
                  label="سلاج المنصة"
                  value={`${platformSlug || "—"}.mel.iq`}
                />
                <StatCard
                  label="الدومين المخصص"
                  value={store.customDomain || "غير مربوط"}
                />
              </div>

              <form onSubmit={handleDomainSubmit} className="space-y-4">
                <DomainSettingsFields
                  variant="management"
                  inputNamePrefix="manage-"
                  domain={domain}
                  domainType={domainType}
                  domainChecked={domainChecked}
                  domainAvailable={domainAvailable}
                  isCheckingDomain={isCheckingDomain}
                  dynadotResult={dynadotResult}
                  onDomainChange={handleDomainChange}
                  onDomainTypeChange={handleDomainTypeChange}
                  onCheck={checkDomain}
                />
                <button
                  type="submit"
                  disabled={!canSaveDomain || isSavingDomain}
                  className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {isSavingDomain
                    ? "جاري التحويل لزين كاش..."
                    : domainType === "custom" && domainPricing
                      ? `الدفع عبر زين كاش — ${formatUsd(domainPricing.totalUsd)}`
                      : "حفظ سلاج المنصة"}
                </button>
              </form>
            </SectionCard>
          </div>
        )}

        {/* Tab: Subscription */}
        {activeTab === "subscription" && (
          <SectionCard
            title="الاشتراك والفوترة"
            description="إدارة الخطة، التجديد، والترقية"
          >
            <SubscriptionPanel
              subscription={subscription}
              isPlanBasic={isPlanBasic}
              onRenew={handleRenew}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onUpgrade={handleUpgrade}
              isPending={{
                renew:
                  renewMutation.isPending || initPaymentMutation.isPending,
                pause: pauseMutation.isPending,
                resume: resumeMutation.isPending,
                cancel: cancelMutation.isPending,
                upgrade: updateSubscriptionMutation.isPending,
              }}
            />
          </SectionCard>
        )}

        {/* Tab: Social */}
        {activeTab === "social" && (
          <div className="mx-auto max-w-3xl">
            <SectionCard
              title="حسابات الوسائط الاجتماعية"
              description="تظهر روابط حساباتك في صفحة المتجر"
            >
              <form onSubmit={handleSocialMediaSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      { name: "instagram", label: "Instagram", placeholder: "https://instagram.com/username" },
                      { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/username" },
                      { name: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@username" },
                      { name: "x", label: "X (Twitter)", placeholder: "https://x.com/username" },
                    ] as const
                  ).map((field) => (
                    <div key={field.name}>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                        {field.label}
                      </label>
                      <input
                        type="url"
                        name={field.name}
                        value={socialMedia[field.name]}
                        onChange={handleSocialMediaChange}
                        placeholder={field.placeholder}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-black outline-none transition focus:border-transparent focus:ring-2 focus:ring-black dark:border-gray-600 dark:bg-black dark:text-white dark:focus:ring-white"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={updateStoreMutation.isPending}
                  className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {updateStoreMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ حسابات السوشيال"}
                </button>
              </form>
            </SectionCard>
          </div>
        )}
      </main>

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                تجديد الاشتراك
              </h2>
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setSelectedDuration(1);
                  setCustomDuration("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                اختر مدة التجديد:
              </p>
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => {
                    setSelectedDuration(1);
                    setCustomDuration("");
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedDuration === 1 && !customDuration
                      ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-black dark:text-white font-medium">
                      1 شهر
                    </span>
                    {selectedDuration === 1 && !customDuration && (
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setSelectedDuration(6);
                    setCustomDuration("");
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedDuration === 6 && !customDuration
                      ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-black dark:text-white font-medium">
                      6 أشهر
                    </span>
                    {selectedDuration === 6 && !customDuration && (
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => {
                    setSelectedDuration(12);
                    setCustomDuration("");
                  }}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedDuration === 12 && !customDuration
                      ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-black dark:text-white font-medium">
                      سنة (12 شهر)
                    </span>
                    {selectedDuration === 12 && !customDuration && (
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  أو أدخل عدد أشهر مخصص:
                </label>
                <input
                  type="number"
                  min="1"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    if (e.target.value) {
                      setSelectedDuration(0);
                    }
                  }}
                  placeholder="مثال: 3 أو 4"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent outline-none transition"
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowRenewModal(false);
                    setSelectedDuration(1);
                    setCustomDuration("");
                  }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmRenew}
                  disabled={
                    renewMutation.isPending ||
                    initPaymentMutation.isPending ||
                    (!customDuration && selectedDuration === 0)
                  }
                  className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renewMutation.isPending || initPaymentMutation.isPending
                    ? "جاري..."
                    : "تأكيد التجديد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
            <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                ترقية الاشتراك
              </h2>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedPlanId(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                اختر الخطة التي تريد الترقية إليها:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const plans = Array.isArray(plansData)
                    ? plansData
                    : (plansData as any)?.data ||
                      (plansData as any)?.plans ||
                      [];
                  return plans
                    .filter((plan: any) => plan.enabled !== false)
                    .map((plan: any) => {
                      const isSelected = selectedPlanId === plan.id;
                      const isCurrentPlan =
                        subscription?.plan?.name === plan.name;
                      return (
                        <div
                          key={plan.id}
                          onClick={() =>
                            !isCurrentPlan && setSelectedPlanId(plan.id)
                          }
                          className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-violet-500 dark:border-violet-400 bg-violet-50 dark:bg-violet-900/30"
                              : isCurrentPlan
                              ? "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60 cursor-not-allowed"
                              : "border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700"
                          }`}
                        >
                          {isCurrentPlan && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
                                الخطة الحالية
                              </span>
                            </div>
                          )}
                          {plan.most_popular && !isCurrentPlan && (
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <span className="bg-black dark:bg-white text-white dark:text-black px-3 py-1 rounded-full text-xs font-semibold">
                                الأكثر شعبية
                              </span>
                            </div>
                          )}
                          <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {plan.description}
                          </p>
                          <div className="mb-4">
                            <div className="flex items-baseline">
                              <span className="text-3xl font-extrabold text-black dark:text-white">
                                {plan.monthly_price
                                  ? plan.monthly_price.toLocaleString("en-IQ")
                                  : "0"}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 mr-1 text-sm">
                                د.ع
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              /شهرياً
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-4 flex items-center text-violet-600 dark:text-violet-400">
                              <svg
                                className="w-5 h-5 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-sm font-medium">محدد</span>
                            </div>
                          )}
                        </div>
                      );
                    });
                })()}
              </div>
              <div className="mt-6 flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlanId(null);
                  }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmUpgrade}
                  disabled={
                    !selectedPlanId || updateSubscriptionMutation.isPending
                  }
                  className="px-6 py-2 bg-violet-600 dark:bg-violet-500 text-white rounded-lg hover:bg-violet-700 dark:hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateSubscriptionMutation.isPending
                    ? "جاري..."
                    : "تأكيد الترقية"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel/Delete Store Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="sticky top-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                إلغاء الاشتراك وحذف المتجر
              </h2>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setDeleteStoreName("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                      تحذير: هذا الإجراء سيؤدي إلى إلغاء الاشتراك وحذف المتجر
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
                      <li>سيتم إلغاء الاشتراك الحالي</li>
                      <li>سيتم حذف المتجر (حذف ناعم)</li>
                      <li>يمكنك استرجاع المتجر خلال 30 يوم</li>
                      <li>بعد 30 يوم سيتم الحذف النهائي</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                  للتأكيد، يرجى كتابة اسم المتجر:{" "}
                  <span className="font-bold text-black dark:text-white">
                    {store?.name}
                  </span>
                </label>
                <input
                  type="text"
                  value={deleteStoreName}
                  onChange={(e) => setDeleteStoreName(e.target.value)}
                  placeholder="أدخل اسم المتجر هنا"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent outline-none transition"
                />
              </div>

              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>ملاحظة:</strong> إذا كنت تريد استرجاع المتجر خلال 30
                  يوم، يمكنك التواصل مع{" "}
                  <a
                    href="mailto:support@mel.iq"
                    className="underline hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    دعم العملاء
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setDeleteStoreName("");
                  }}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={
                    !deleteStoreName ||
                    deleteStoreName.trim() !== store?.name?.trim() ||
                    cancelMutation.isPending
                  }
                  className="px-6 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelMutation.isPending ? "جاري..." : "تأكيد الحذف"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreManagement;
