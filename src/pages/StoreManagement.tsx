import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetchStores, useUpdateStore } from "@/api/wrappers/store.wrappers";
import {
  useFetchSubscriptions,
  useRenewSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useUpdateSubscription,
} from "@/api/wrappers/subscription.wrapper";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeftIcon, AlertCircle, ArrowRightIcon, X } from "lucide-react";
import { toast } from "sonner";

// Types
interface Store {
  id: string;
  name: string;
  domain?: string;
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

// Components
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-white dark:bg-black">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Skeleton className="h-12 w-64 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
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

const SubscriptionInfo = ({
  subscription,
  onRenew,
  onPause,
  onResume,
  onCancel,
  onUpgrade,
  isPending,
}: {
  subscription: Subscription | null;
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
      <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
          معلومات الاشتراك
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          لا يوجد اشتراك نشط لهذا المتجر
        </p>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining(subscription.end_at);
  const statusBadge = getStatusBadge(subscription.status);

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
        معلومات الاشتراك
      </h2>

      <div className="space-y-4">
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            الحالة:
          </span>
          <span
            className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
          >
            {statusBadge.text}
          </span>
        </div>

        {timeRemaining && (
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              الوقت المتبقي:
            </span>
            <span
              className={`ml-2 text-sm font-bold ${
                timeRemaining.expired
                  ? "text-red-600 dark:text-red-400"
                  : (timeRemaining.daysLeft ?? 0) <= 7
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {timeRemaining.text}
            </span>
          </div>
        )}

        {subscription.start_at && (
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              تاريخ البدء:
            </span>
            <span className="ml-2 text-sm text-black dark:text-white">
              {formatDate(subscription.start_at)}
            </span>
          </div>
        )}

        {subscription.end_at && (
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              تاريخ الانتهاء:
            </span>
            <span className="ml-2 text-sm text-black dark:text-white">
              {formatDate(subscription.end_at)}
            </span>
          </div>
        )}

        {subscription.plan?.name && (
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              الخطة:
            </span>
            <span className="ml-2 text-sm font-medium text-black dark:text-white">
              {subscription.plan.name}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {subscription.status === "ACTIVE" && (
          <>
            <button
              onClick={onRenew}
              disabled={isPending.renew}
              className="w-full bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-green-300 dark:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.renew ? "جاري..." : "تجديد الاشتراك"}
            </button>
            <button
              onClick={onUpgrade}
              disabled={isPending.upgrade}
              className="w-full bg-violet-100 dark:bg-violet-900 hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-800 dark:text-violet-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-violet-300 dark:border-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.upgrade ? "جاري..." : "ترقية الاشتراك"}
            </button>
            <button
              onClick={onPause}
              disabled={isPending.pause}
              className="w-full bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-yellow-300 dark:border-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.pause ? "جاري..." : "إيقاف الاشتراك"}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending.cancel}
              className="w-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-300 dark:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.cancel ? "جاري..." : "إلغاء الاشتراك"}
            </button>
          </>
        )}

        {subscription.status === "INACTIVE" && (
          <>
            <button
              onClick={onResume}
              disabled={isPending.resume}
              className="w-full bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-green-300 dark:border-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.resume ? "جاري..." : "استئناف الاشتراك"}
            </button>
            <button
              onClick={onCancel}
              disabled={isPending.cancel}
              className="w-full bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-300 dark:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending.cancel ? "جاري..." : "إلغاء الاشتراك"}
            </button>
          </>
        )}

        {(subscription.status === "CANCELLED" ||
          subscription.status === "EXPIRED") && (
          <button
            onClick={onUpgrade}
            disabled={isPending.upgrade}
            className="w-full bg-violet-100 dark:bg-violet-900 hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-800 dark:text-violet-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-violet-300 dark:border-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending.upgrade ? "جاري..." : "ترقية الاشتراك"}
          </button>
        )}
      </div>
    </div>
  );
};

// Main Component
function StoreManagement() {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  // التأكد من أن storeId موجود وصحيح (إزالة أي domain إذا كان موجوداً)
  const storeId = params.storeId?.split("/")[0] || params.storeId;

  const { data: storesData, isLoading: storesLoading } = useFetchStores();
  const { data: subscriptionsData, isLoading: subscriptionsLoading } =
    useFetchSubscriptions({ storeId });

  const renewMutation = useRenewSubscription();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();
  const updateSubscriptionMutation = useUpdateSubscription();
  const updateStoreMutation = useUpdateStore();
  const { data: plansData } = useFetchAllPlans();

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

  const storeUrl = store?.domain;
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
    }
  }, [store]);

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

    renewMutation.mutate(
      { id: subscription.id, durationMonths: duration },
      {
        onSuccess: () => {
          toast.success(
            `تم تجديد الاشتراك بنجاح لمدة ${duration} ${
              duration === 1 ? "شهر" : "أشهر"
            }`
          );
          setShowRenewModal(false);
          setSelectedDuration(1);
          setCustomDuration("");
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في تجديد الاشتراك");
          console.error("Error renewing subscription:", error);
        },
      }
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

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
              aria-label="العودة للوحة التحكم"
            >
              <ArrowRightIcon className="w-5 h-5 text-black dark:text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                إدارة {store.name}
              </h1>
              {storeUrl && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {storeUrl}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                  نافذة حية للموقع
                </h2>
              </div>
              {storeUrl ? (
                <iframe
                  src={storeUrl}
                  className="w-full h-[600px]"
                  title={`معاينة ${store.name}`}
                  allow="fullscreen"
                />
              ) : (
                <div className="h-[600px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  لا يوجد رابط للموقع
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SubscriptionInfo
              subscription={subscription}
              onRenew={handleRenew}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onUpgrade={handleUpgrade}
              isPending={{
                renew: renewMutation.isPending,
                pause: pauseMutation.isPending,
                resume: resumeMutation.isPending,
                cancel: cancelMutation.isPending,
                upgrade: updateSubscriptionMutation.isPending,
              }}
            />

            {/* Social Media */}
            <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
                حسابات الوسائط الاجتماعية
              </h2>
              <form onSubmit={handleSocialMediaSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram"
                    value={socialMedia.instagram}
                    onChange={handleSocialMediaChange}
                    placeholder="https://instagram.com/username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    Facebook
                  </label>
                  <input
                    type="url"
                    name="facebook"
                    value={socialMedia.facebook}
                    onChange={handleSocialMediaChange}
                    placeholder="https://facebook.com/username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    TikTok
                  </label>
                  <input
                    type="url"
                    name="tiktok"
                    value={socialMedia.tiktok}
                    onChange={handleSocialMediaChange}
                    placeholder="https://tiktok.com/@username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-2">
                    X (Twitter)
                  </label>
                  <input
                    type="url"
                    name="x"
                    value={socialMedia.x}
                    onChange={handleSocialMediaChange}
                    placeholder="https://x.com/username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white rounded-lg focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateStoreMutation.isPending}
                  className="w-full bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateStoreMutation.isPending
                    ? "جاري الحفظ..."
                    : "حفظ التغييرات"}
                </button>
              </form>
            </div>

            {/* Plan Info */}
            <div className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
                الخطة الحالية
              </h2>
              {isPlanBasic ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      أنت حالياً في الخطة الأولى
                    </p>
                    <p className="text-xs text-gray-500">
                      الترقية والتجديد غير متاحين في هذه الخطة
                    </p>
                  </div>
                  <button
                    disabled
                    className="w-full bg-gray-200 dark:bg-gray-800 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed border border-gray-300 dark:border-gray-700"
                  >
                    ترقية الخطة (مقفول)
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  className="w-full bg-violet-100 dark:bg-violet-900 hover:bg-violet-200 dark:hover:bg-violet-800 text-violet-800 dark:text-violet-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-violet-300 dark:border-violet-700"
                >
                  ترقية الخطة
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
                    (!customDuration && selectedDuration === 0)
                  }
                  className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renewMutation.isPending ? "جاري..." : "تأكيد التجديد"}
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
