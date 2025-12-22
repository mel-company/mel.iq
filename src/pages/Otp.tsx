import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLogin, useVerify } from "@/api/wrappers/auth.wrappers";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeftIcon } from "lucide-react";

function OTPVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const verifyOtpMutation = useVerify();
  const resendOtpMutation = useLogin();
  const { login } = useAuth();

  const { phone } = location.state || { phone: "" };
  const maskedPhone = phone.replace(/(^\+?964)/, "+964 ");

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // العد التنازلي لإعادة الإرسال
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const autoSubmit = async (otpValue: string) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone: phone,
        code: otpValue,
      });

      // نتوقع من الباك إند { token, username }
      const token = (result as any)?.token;
      const username = (result as any)?.username;

      

      // نحدد مستخدم داخل AuthContext حتى يمر ProtectedRoute
      if (username || phone) {
        login(username || phone, ""); // الباسوورد غير مهم هنا
      }

      // نجاح التحقق - الانتقال للرئيسية
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err: any) {
      setError(err.message || "رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.");

      // مسح الحقول في حالة الخطأ
      setTimeout(() => {
        setOtp("");
      }, 300);
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
    if (!canResend) return;

    setResendCooldown(60);
    setCanResend(false);
    setError("");

    // استدعاء نفس endpoint /auth/send-otp لإعادة إرسال الكود
    resendOtpMutation.mutate({ phone });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            MEL.IQ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            التحقق من الهوية
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          {/* Progress Bar */}
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full w-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"></div>
          </div>

          <div className="p-8 space-y-6">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 opacity-50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 text-gray-400 text-xs font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                  رقم الهاتف
                </span>
              </div>
              <div className="flex-1 h-px mx-4 bg-gradient-to-r from-gray-300 via-gray-300 to-transparent dark:from-gray-700 dark:via-gray-700 dark:to-transparent"></div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold">
                  2
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  التحقق
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                أدخل رمز التحقق
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                تم إرسال رمز مكون من 4 أرقام إلى:
              </p>
              <p
                dir="ltr"
                className="text-sm  text-right font-medium text-violet-600 dark:text-violet-400"
              >
                {maskedPhone}
              </p>
            </div>

            <form className="space-y-6">
              {/* OTP Inputs */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  رمز التحقق
                </label>
                {/* نخلي حقل الـ OTP من اليسار لليمين حتى يكون ترتيب الأرقام واضح */}
                <div dir="ltr">
                  <InputOTP
                    maxLength={4}
                    value={otp}
                    onChange={(value) => {
                      // نسمح فقط بالأرقام (لاتينية من اليسار لليمين)
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

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{error}</span>
                  </p>
                </div>
              )}

              {/* Resend OTP */}
              <div className="flex items-center justify-center space-x-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  لم تصلك الرسالة؟
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className={`text-sm font-medium transition-colors ${
                    canResend
                      ? "text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
                      : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {canResend
                    ? "إعادة إرسال"
                    : `إعادة إرسال (${resendCooldown})`}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 4}
                onClick={handleSubmit}
                className={`w-full py-4 px-4 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  loading || otp.length !== 4
                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

            {/* Back to Login */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => navigate(-1)}
                className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>تغيير رقم الهاتف</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            هذا الرمز ساري لمدة 10 دقائق فقط
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            لا تشارك هذا الرمز مع أي شخص
          </p>
        </div>
      </div>

      {/* Add animation keyframes for shake */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `,
        }}
      />
    </div>
  );
}

export default OTPVerification;
