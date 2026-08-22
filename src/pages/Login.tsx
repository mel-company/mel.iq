import { ChangeEvent, FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import iqFlag from "@/assets/icon/iq.png";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { useLogin } from "@/api/wrappers/auth.wrappers";
import { getApiErrorMessage } from "@/utils/otp";

type LoginFormData = {
  phone: string;
};

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({ phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // التحقق من صحة الرقم عند تغييره
    const checkValidity = async () => {
      if (formData.phone.length >= 10) {
        const phone = "+964" + formData.phone;
        const parsed = parsePhoneNumberFromString(phone, "IQ");
        setIsValid(parsed?.isValid() || false);
      } else {
        setIsValid(false);
      }
    };
    checkValidity();
  }, [formData.phone]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // إزالة جميع الحروف
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
    setError("");
  };

  const { mutate: login, isPending } = useLogin();

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (loading || !isValid) return;

    setError("");
    setLoading(true);

    try {
      const parsed = parsePhoneNumberFromString(`+964${formData.phone}`, "IQ");

      if (!parsed || !parsed.isValid()) {
        setError("رقم غير صحيح. يرجى إدخال رقم عراقي صالح.");
        setLoading(false);
        return;
      }

      login(
        { phone: parsed.number },
        {
          onSuccess: (data) => {
            if (data?.message) toast.success(data.message);
            navigate("/otp", {
              state: { phone: parsed.number },
            });
          },
          onError: (err) => {
            setError(
              getApiErrorMessage(
                err,
                "حدث خطأ أثناء إرسال رمز التحقق. يرجى المحاولة مرة أخرى.",
              ),
            );
          },
          onSettled: () => {
            setLoading(false);
          },
        },
      );
    } catch {
      setError("حدث خطأ أثناء إرسال رمز التحقق. يرجى المحاولة مرة أخرى.");
      setLoading(false);
    }
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
            مرحلاً بك مجدداً
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          {/* Progress Bar */}
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"></div>
          </div>

          <div className="p-8 space-y-6">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold">
                  1
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  رقم الهاتف
                </span>
              </div>
              <div className="flex-1 h-px mx-4 bg-gradient-to-r from-transparent via-gray-300 to-gray-300 dark:via-gray-700 dark:to-gray-700"></div>
              <div className="flex items-center space-x-2 opacity-50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 text-gray-400 text-xs font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                  التحقق
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                أدخل رقمك
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                أدخل رقم هاتفك العراقي للبدء
              </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={(e) => {
                void handleSubmit(e);
              }}
            >
              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  رقم الهاتف
                </label>
                <div
                  className={`relative transition-all duration-300 ${
                    isFocused ? "transform scale-[1.02]" : ""
                  }`}
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      964
                    </span>
                    <img
                      src={iqFlag}
                      alt="IQ"
                      className="w-5 h-5 rounded-full shadow-sm"
                    />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="w-full pl-17 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-300"
                    placeholder="7xx xxx xxxx"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={10}
                  />

                  {formData.phone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isValid ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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

              {/* Terms */}
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="w-4 h-4 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 focus:ring-2"
                    defaultChecked
                  />
                </div>
                <label
                  htmlFor="terms"
                  className="text-sm text-gray-600 dark:text-gray-400"
                >
                  أوافق على{" "}
                  <a
                    href="#"
                    className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
                  >
                    الشروط والأحكام
                  </a>{" "}
                  و{" "}
                  <a
                    href="#"
                    className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
                  >
                    سياسة الخصوصية
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isValid}
                className={`w-full py-4 px-4 rounded-xl font-medium text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                  loading || !isValid
                    ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <span>إرسال رمز التحقق</span>
                      <ArrowLeftIcon className="w-5 h-5" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                ليس لديك حساب؟{" "}
                <a
                  href="/checkout"
                  className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                >
                  سجّل الآن
                </a>
                <span className="block mt-2 text-xs text-gray-400">
                  إذا سجّلت سابقاً وما أكملت التحقق، استخدم نفس الرقم هنا
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
