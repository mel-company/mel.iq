import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMe, useLogout } from "@/api/wrappers/auth.wrappers";
import { useFetchStores } from "@/api/wrappers/store.wrappers";
import { Skeleton } from "@/components/ui/skeleton";

function Dashboard() {
  const { user, logout: logoutFromAuth } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const { data: me, isLoading: meLoading, isError } = useMe();
  const {
    data: storesData,
    isLoading: storesLoading,
    isError: storesError,
  } = useFetchStores();

  // إذا التوكن منتهي أو /auth/me رجّعت خطأ → نرجع المستخدم للّوگن
  useEffect(() => {
    if (meLoading) return;
    if (isError || !me) {
      navigate("/login", { replace: true });
    }
  }, [meLoading, isError, me, navigate]);

  const displayUser: any = me || user;
  const displayName =
    displayUser?.username || displayUser?.name || "صاحب المتجر";

  // نحاول نلقط المصفوفة حسب شكل الـ API
  const storesRaw: any =
    (storesData as any)?.data ||
    (storesData as any)?.stores ||
    storesData ||
    [];
  const stores: any[] = Array.isArray(storesRaw) ? storesRaw : [];

  const handleCreateNewStore = () => {
    navigate("/checkout", {
      state: {
        skipToStep: 3,
        userInfo: {
          name: displayName,
        },
      },
    });
  };

  const handleLogout = () => {
    // مسح الـ state المحلي
    logoutFromAuth();
    // مسح localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // إرسال طلب logout للباك إند
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/");
      },
      onError: () => {
        // حتى لو فشل الطلب، نرجع للصفحة الرئيسية
        navigate("/");
      },
    });
  };

  const isLoadingAll = meLoading || storesLoading || (!displayUser && !isError);

  // لودنغ سكيلتون (shadcn)
  if (isLoadingAll) {
    return (
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
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-40 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* الهيدر */}
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-white">
                مرحباً، {displayName}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-800"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* قائمة المتاجر */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
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

          {!storesError && stores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store: any, index: number) => (
                <div
                  key={store.id ?? index}
                  className="bg-white dark:bg-black rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-black dark:text-white">
                      {store.name || `متجر ${index + 1}`}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-100 dark:bg-gray-900 text-black dark:text-white border-gray-200 dark:border-gray-800">
                      متجر
                    </span>
                  </div>
                  {store.url && (
                    <a
                      href={store.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black dark:text-white hover:underline text-sm font-mono mb-4 block break-all"
                    >
                      {store.url}
                    </a>
                  )}
                  {store.url && (
                    <div className="mb-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                      <iframe
                        src={store.url}
                        className="w-full h-96"
                        title={`معاينة ${store.name}`}
                        frameBorder="0"
                        allow="fullscreen"
                      />
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-gray-800">
                      إدارة
                    </button>
                    {store.url && (
                      <a
                        href={store.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
                      >
                        فتح في نافذة جديدة
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
              <div className="text-6xl mb-4">🛍️</div>
              <h3 className="text-xl font-semibold text-black dark:text-white mb-2">
                لا يوجد متاجر
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                ابدأ بإنشاء متجرك الأول الآن
              </p>
              <button
                onClick={handleCreateNewStore}
                className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg font-semibold transition-colors hover:bg-gray-800 dark:hover:bg-gray-200"
              >
                إنشاء متجر جديد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
