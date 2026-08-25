import { useEffect, useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
  useMe,
  useLogout,
  useValidateToStorefront,
} from "@/api/wrappers/auth.wrappers";
import { useFetchStores } from "@/api/wrappers/store.wrappers";
import { toast } from "sonner";
import { subscriptionKeys } from "@/api/wrappers/subscription.wrapper";
import { subscriptionAPI } from "@/api/endpoints/subscription.endpoint";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ExternalLink,
  LayoutDashboard,
  Settings,
  Store as StoreIcon,
  X,
} from "lucide-react";

// Types
interface Store {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  /** Public storefront URL from API, e.g. https://mystore.mel.iq */
  storeUrl?: string;
  is_deleted?: boolean;
}

/** https://{slug}.mel.iq — prefer API storeUrl, else build from domain slug. */
const resolveStorefrontUrl = (store: Store): string | null => {
  if (store.storeUrl?.trim()) return store.storeUrl.trim();
  const slug = store.domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .replace(/\.mel\.iq$/i, "")
    .split("/")[0];
  if (!slug) return null;
  return `https://${slug}.mel.iq`;
};

/** https://dash.{slug}.mel.iq */
const resolveDashboardUrl = (store: Store): string | null => {
  const slug = store.domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .replace(/\.mel\.iq$/i, "")
    .split("/")[0];
  if (!slug) return null;
  return `https://dash.${slug}.mel.iq`;
};

interface Subscription {
  id: string;
  storeId: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
  start_at?: string;
  end_at?: string;
  plan?: {
    name: string;
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

const R2_PUBLIC_BASE =
  "https://pub-f8707810144b47a6978976f94751bbc8.r2.dev";

/** Backend often returns a full signed/public URL; sometimes only the object key. */
const resolveStoreLogoUrl = (logo?: string | null): string | null => {
  if (!logo || logo === "placeholder") return null;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${R2_PUBLIC_BASE}/${logo.replace(/^\//, "")}`;
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

// Components
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-white dark:bg-black">
    <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ onCreateStore }: { onCreateStore: () => void }) => (
  <div className="text-center py-12 bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
    <div className="text-6xl mb-4">🛍️</div>
    <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
      لا يوجد متاجر
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6">
      ابدأ بإنشاء متجرك الأول الآن
    </p>
    <button
      onClick={onCreateStore}
      className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
    >
      إنشاء متجر جديد
    </button>
  </div>
);

const StoreCard = ({
  store,
  subscription,
  onManage,
}: {
  store: Store;
  subscription: Subscription | null;
  onManage: () => void;
}) => {
  const openStoreMutation = useValidateToStorefront();
  const [openChoiceOpen, setOpenChoiceOpen] = useState(false);
  const timeRemaining = subscription?.end_at
    ? getTimeRemaining(subscription.end_at)
    : null;
  const statusBadge = subscription ? getStatusBadge(subscription.status) : null;

  const domainOnly = store.domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^dash\./, "")
    .replace(/\.mel\.iq$/i, "")
    .split("/")[0] || "";
  const storefrontUrl = resolveStorefrontUrl(store);
  const dashboardUrl = resolveDashboardUrl(store);

  const handleOpenDashboard = () => {
    if (!domainOnly) return;
    setOpenChoiceOpen(false);

    // Open immediately on click so Safari treats it as a user gesture.
    const newWindow = window.open("", "_blank");

    openStoreMutation.mutate(
      { store: domainOnly },
      {
        onSuccess: (data: any) => {
          const redirectUrl =
            data?.redirectUrl ||
            data?.data?.redirectUrl ||
            dashboardUrl;
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
        onError: (error: any) => {
          newWindow?.close();
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "حدث خطأ في فتح الداشبورد";
          toast.error(errorMessage);
          console.error("Error opening dashboard:", error);
        },
      },
    );
  };

  const handleOpenStorefront = () => {
    if (!storefrontUrl) {
      toast.error("رابط المتجر غير متوفر حالياً.");
      return;
    }
    setOpenChoiceOpen(false);
    window.open(storefrontUrl, "_blank", "noopener,noreferrer");
  };

  const logoUrl = resolveStoreLogoUrl(store.logo);

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-black dark:text-white truncate">
          {store.name}
        </h3>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={store.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-100 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800 shrink-0">
          متجر
        </span>
      </div>

      {dashboardUrl && (
        <button
          type="button"
          dir="ltr"
          className="mb-3 block w-full truncate text-left text-xs text-violet-600 hover:underline dark:text-violet-400"
          onClick={() => setOpenChoiceOpen(true)}
        >
          {dashboardUrl.replace(/^https?:\/\//, "")}
        </button>
      )}

      {storefrontUrl && (
        <div className="mb-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
          <iframe
            src={storefrontUrl}
            className="w-full h-48"
            title={`معاينة ${store.name}`}
            loading="lazy"
          />
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          onClick={onManage}
          className="flex-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-800 flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" />
          إدارة
        </button>

        {domainOnly && (
          <button
            onClick={() => setOpenChoiceOpen(true)}
            disabled={openStoreMutation.isPending}
            className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            {openStoreMutation.isPending ? "جاري..." : "فتح"}
          </button>
        )}
      </div>

      {openChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpenChoiceOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`open-choice-${store.id}`}
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4
                  id={`open-choice-${store.id}`}
                  className="text-lg font-bold text-black dark:text-white"
                >
                  وين تريد تفتح؟
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  اختر المتجر أو لوحة التحكم
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenChoiceOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenStorefront}
                disabled={!storefrontUrl}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
              >
                <StoreIcon className="h-5 w-5 shrink-0 text-black dark:text-white" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-black dark:text-white">
                    فتح المتجر
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                    {storefrontUrl?.replace(/^https?:\/\//, "") || "غير متوفر"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenDashboard}
                disabled={openStoreMutation.isPending}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-right transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
              >
                <LayoutDashboard className="h-5 w-5 shrink-0 text-black dark:text-white" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-black dark:text-white">
                    {openStoreMutation.isPending ? "جاري الفتح..." : "فتح الداشبورد"}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400" dir="ltr">
                    {dashboardUrl?.replace(/^https?:\/\//, "") || `dash.${domainOnly}.mel.iq`}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
function Dashboard() {
  const { user, logout: logoutFromAuth } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const { data: me, isLoading: meLoading, isError } = useMe();
  const { data: storesData, isLoading: storesLoading } = useFetchStores();

  // Normalize and filter stores
  const stores = useMemo(() => {
    const normalized = normalizeApiResponse<Store>(storesData);
    return normalized.filter((store) => !store.is_deleted);
  }, [storesData]);

  // Fetch subscriptions for all stores
  const subscriptionQueries = useQueries({
    queries: stores.map((store) => ({
      queryKey: subscriptionKeys.list({ storeId: store.id }),
      queryFn: () => subscriptionAPI.fetchAll({ storeId: store.id }),
      enabled: !!store.id,
    })),
  });

  // Merge all subscriptions
  const subscriptions = useMemo(() => {
    const allSubscriptions: Subscription[] = [];
    subscriptionQueries.forEach((query) => {
      if (query.data) {
        const subs = normalizeApiResponse<Subscription>(query.data);
        allSubscriptions.push(...subs);
      }
    });
    return allSubscriptions;
  }, [subscriptionQueries]);

  const getStoreSubscription = useCallback(
    (store: Store): Subscription | null => {
      return subscriptions.find((s) => s.storeId === store.id) || null;
    },
    [subscriptions],
  );

  // Redirect only when /auth/me actually fails (401) — not when data is briefly empty
  useEffect(() => {
    if (!meLoading && isError) {
      navigate("/login", { replace: true });
    }
  }, [meLoading, isError, navigate]);

  const displayUser = me || user;
  const displayName =
    displayUser?.username || displayUser?.name || "صاحب المتجر";

  const isLoading = meLoading || storesLoading || (!displayUser && !isError);
  const subscriptionsLoading = subscriptionQueries.some((q) => q.isLoading);

  const handleCreateNewStore = useCallback(() => {
    navigate("/checkout", {
      state: {
        skipToStep: 3,
        userInfo: { name: displayName },
      },
    });
  }, [navigate, displayName]);

  const handleLogout = useCallback(() => {
    logoutFromAuth();
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    logoutMutation.mutate(undefined, {
      onSettled: () => navigate("/"),
    });
  }, [logoutFromAuth, logoutMutation, navigate]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-black dark:text-white">
              مرحباً، {displayName}
            </h1>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {logoutMutation.isPending ? "جاري..." : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">
            متاجري ({stores.length})
          </h2>
          <button
            onClick={handleCreateNewStore}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            + إنشاء متجر جديد
          </button>
        </div>

        {stores.length === 0 ? (
          <EmptyState onCreateStore={handleCreateNewStore} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store: Store) => {
              // التأكد من أن store.id موجود وصحيح
              if (!store.id) return null;

              return (
                <StoreCard
                  key={store.id}
                  store={store}
                  subscription={
                    getStoreSubscription(store) as Subscription | null
                  }
                  onManage={() => {
                    // التأكد من أن الرابط صحيح
                    const path = `/store/${encodeURIComponent(
                      store.id,
                    )}/manage`;
                    navigate(path);
                  }}
                />
              );
            })}
          </div>
        )}

        {subscriptionsLoading && (
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            جاري تحميل معلومات الاشتراكات...
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
