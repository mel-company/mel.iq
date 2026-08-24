import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useValidateUser } from "@/api/wrappers/auth.wrappers";

type RedirectErrorState = {
  token?: string;
  store?: string;
  errorCode?: string;
};

function AuthRedirectError() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RedirectErrorState | null) || {};
  const [isRetrying, setIsRetrying] = useState(false);
  const { mutateAsync: validateUser } = useValidateUser();

  const store = String(state.store || "").trim();
  const token = String(state.token || "").trim();
  const errorCode = state.errorCode || "AUTH_REDIRECT_FAILED";

  const handleRetry = async () => {
    if (!store || !token) {
      toast.error("لا تتوفر بيانات كافية لإعادة المحاولة.");
      return;
    }

    setIsRetrying(true);
    try {
      const res = (await validateUser({
        store,
        token,
      })) as { redirectUrl?: string; data?: { redirectUrl?: string } };
      const redirectUrl = res?.redirectUrl || res?.data?.redirectUrl;

      if (!redirectUrl) {
        toast.error("تعذر جلب رابط لوحة التحكم. حاول مرة أخرى.");
        return;
      }

      window.location.assign(redirectUrl);
    } catch (error) {
      console.error("AUTH REDIRECT FAILED", error);
      toast.error("فشلت إعادة المحاولة. حاول مرة أخرى.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          حدث خطأ أثناء فتح لوحة التحكم
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-1">
          تم تسجيل الدخول بنجاح، لكن تعذر فتح لوحة تحكم المتجر.
        </p>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          حاول مرة أخرى أو ارجع للصفحة الرئيسية.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void handleRetry()}
            disabled={isRetrying || !store || !token}
            className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? "جاري إعادة المحاولة..." : "إعادة المحاولة"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-3 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            العودة للرئيسية
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          رمز الخطأ: {errorCode}
        </p>
      </div>
    </div>
  );
}

export default AuthRedirectError;
