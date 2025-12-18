import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useVerify } from "@/api/wrappers/auth.wrappers";
import iqFlag from "@/assets/icon/iq.png";

type LocationState = {
  phone: string;
};

function Otp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const verifyMutation = useVerify();

  const state = (location.state as LocationState) || { phone: "" };
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const phone = state.phone;

  useEffect(() => {
    if (!phone) {
      // لو ماكو رقم (مثلاً فتح الصفحة مباشرة)، نرجعه لصفحة تسجيل الدخول
      navigate("/login", { replace: true });
    }
  }, [phone, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const verifyResult = await verifyMutation.mutateAsync({
        code: otp,
        phone,
      });

      // نستخدم AuthContext كمخزن بسيط للحالة
      const result = login(phone, otp);

      if (result.success) {
        // هنا تقدر تستخدم verifyResult لو عندك بيانات إضافية
        navigate("/dashboard");
      } else {
        setError("فشل تسجيل الدخول. تأكد من الرمز وحاول مرة أخرى.");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      setError("حدث خطأ أثناء التحقق من الرمز. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-center text-2xl font-extrabold text-gray-900 dark:text-white">
            MEL.IQ
          </h1>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 text-xs">
                1
              </span>
              <span>رقم الجوال</span>
            </div>
            <span className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs shadow-sm">
                2
              </span>
              <span>رمز التحقق</span>
            </div>
          </div>

          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            تأكيد رمز التحقق
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
            أدخل رمز التحقق (OTP) الذي تم إرساله إلى رقمك العراقي.
          </p>
        </div>
        <form
          className="mt-8 space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                رقم الجوال
              </label>
              <div className="relative">
                <img
                  src={iqFlag}
                  alt="IQ"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-sm"
                />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-black dark:text-white">
                  +964
                </span>
                <input
                  type="text"
                  value={phone.replace("+964", "")}
                  readOnly
                  className="appearance-none block w-full pl-24 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg sm:text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                رمز التحقق (OTP)
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition"
                placeholder="أدخل رمز التحقق المرسل إلى جوالك"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "جاري تأكيد الرمز..." : "تأكيد الرمز والدخول"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Otp;
