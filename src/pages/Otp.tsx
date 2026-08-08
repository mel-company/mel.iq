import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLogin, useVerify } from "@/api/wrappers/auth.wrappers";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeftIcon } from "lucide-react";
import {
  extractDevOtp,
  getApiErrorMessage,
  showDevOtpToast,
} from "@/utils/otp";

function OTPVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const verifyOtpMutation = useVerify();
  const resendOtpMutation = useLogin();
  const { login } = useAuth();

  const phone = (location.state as { phone?: string } | null)?.phone || "";
  const initialOtp =
    (location.state as { otpCode?: string } | null)?.otpCode || "";
  const maskedPhone = phone
    ? phone.replace(/(^\+?964)/, "+964 ")
    : "—";

  const [otp, setOtp] = useState(initialOtp);
  const [devOtp, setDevOtp] = useState(initialOtp);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!phone) {
      toast.error("رقم الهاتف غير موجود. أعد تسجيل الدخول.");
      navigate("/login", { replace: true });
    }
  }, [phone, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setCanResend(true);
  }, [resendCooldown]);

  const persistAuth = (result: unknown) => {
    const data = result as {
      token?: string;
      accessToken?: string;
      username?: string;
      user?: { phone?: string; name?: string };
    };
    const token = data?.token || data?.accessToken;
    const username =
      data?.username || data?.user?.phone || data?.user?.name || phone;

    if (token) {
      window.localStorage.setItem("token", token);
      window.localStorage.setItem(
        "user",
        JSON.stringify({ token, username, phone }),
      );
      login(token, username);
    }
    return Boolean(token);
  };

  const autoSubmit = async (otpValue: string) => {
    if (loading || !phone) return;

    setLoading(true);
    setError("");

    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone,
        code: otpValue,
      });

      const ok = persistAuth(result);
      if (!ok) {
        toast.warning(
          "تم التحقق لكن لم يُرجع التوكن. حاول تسجيل الدخول مرة أخرى إن لزم.",
        );
      } else {
        toast.success("تم التحقق بنجاح");
      }

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          "رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.",
        ),
      );
      setTimeout(() => setOtp(""), 300);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (otp.length !== 4) {
      setError("يرجى إدخال جميع الأرقام");
      return;
    }
    await autoSubmit(otp);
  };

  const handleResendOtp = () => {
    if (!canResend || !phone) return;

    setResendCooldown(60);
    setCanResend(false);
    setError("");

    resendOtpMutation.mutate(
      { phone },
      {
        onSuccess: (data) => {
          const code = extractDevOtp(data);
          if (code) {
            setDevOtp(code);
            setOtp(code);
            showDevOtpToast(code);
          }
          toast.success(data?.message || "تم إرسال رمز جديد");
        },
        onError: (err) => {
          toast.error(
            getApiErrorMessage(err, "تعذر إعادة إرسال الرمز. حاول مرة أخرى."),
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            MEL.IQ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            التحقق من الهوية
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full w-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" />
          </div>

          <div className="p-8 space-y-6">
            {devOtp && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 p-4 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">
                  رمز الاختبار (يظهر لأن الواتساب قد لا يصل أثناء التطوير)
                </p>
                <p
                  dir="ltr"
                  className="text-3xl font-bold tracking-[0.35em] text-amber-800 dark:text-amber-200"
                >
                  {devOtp}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtp(devOtp);
                    void autoSubmit(devOtp);
                  }}
                  className="mt-3 text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                  استخدم هذا الرمز تلقائياً
                </button>
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                أدخل رمز التحقق
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تم إرسال رمز مكون من 4 أرقام إلى:
              </p>
              <p
                dir="ltr"
                className="text-sm text-right font-medium text-violet-600 dark:text-violet-400"
              >
                {maskedPhone}
              </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  رمز التحقق
                </label>
                <div dir="ltr">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(value) => {
                      if (!/^\d*$/.test(value)) return;
                      setOtp(value);
                      setError("");
                    }}
                    containerClassName="justify-between"
                  >
                    <InputOTPGroup className="w-full justify-between">
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  أدخل الرمز الذي تلقيته على واتساب
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  لم تصلك الرسالة؟
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`text-sm font-medium transition-colors ${
                    canResend
                      ? "text-violet-600 dark:text-violet-400 hover:text-violet-700"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {canResend
                    ? "إعادة إرسال"
                    : `إعادة إرسال (${resendCooldown})`}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 4}
                className={`w-full py-4 px-4 rounded-xl font-medium text-white transition-all ${
                  loading || otp.length !== 4
                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <span>تحقق من الرمز</span>
                      <ArrowLeftIcon className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                تغيير رقم الهاتف
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OTPVerification;
