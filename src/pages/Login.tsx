import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "@/api/wrappers/auth.wrappers";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import iqFlag from "@/assets/icon/iq.png";

type LoginFormData = {
  phone: string;
};

function Login() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [formData, setFormData] = useState<LoginFormData>({ phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // نضيف +964 ونفحص كرقم عراقي
      const parsed = parsePhoneNumberFromString(`+964${formData.phone}`, "IQ");

      if (!parsed || !parsed.isValid()) {
        setError("رقم غير صحيح. يرجى إدخال رقم عراقي صالح.");
        setLoading(false);
        return;
      }

      const normalizedPhone = parsed.number; // مثال: +9647XXXXXXXX

      // ننتظر فعليًا استجابة الـ API قبل الانتقال
      await loginMutation.mutateAsync({ phone: normalizedPhone });

      // بعد النجاح ننتقل لصفحة OTP ومعنا الرقم
      navigate("/otp", { state: { phone: normalizedPhone } });
    } catch (err) {
      console.error("Login error:", err);
      setError("حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.");
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
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs shadow-sm">
                1
              </span>
              <span>رقم الجوال</span>
            </div>
            <span className="h-px w-8 bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-400 dark:border-gray-600 text-xs">
                2
              </span>
              <span>رمز التحقق</span>
            </div>
          </div>

          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            تسجيل الدخول
          </h2>
          <p className="mt-1 text-center text-sm text-gray-600 dark:text-gray-400">
            ادخل رقم جوالك العراقي وسيتم إرسال رمز تحقق (OTP) لك على الواتساب.
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

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"
              >
                رقم الجوال
              </label>
              <div className="relative ">
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-black dark:text-white flex-row-reverse items-center gap-2">
                  +964
                  <img src={iqFlag} alt="IQ" className="w-5 h-5 rounded-sm" />
                </span>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="appearance-none block w-full pl-24 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition"
                  placeholder="مثال: 7712345678"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="mr-2 block text-sm text-gray-900 dark:text-gray-300"
              >
                تذكرني
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "جاري إرسال رمز التحقق..." : "إرسال رمز التحقق"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
