import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "@/components/icons";
import { useLogin } from "@/api/wrappers/auth.wrappers";
import { getApiErrorMessage } from "@/utils/otp";
import AuthShell from "@/components/auth/AuthShell";
import BrandPanel from "@/components/auth/BrandPanel";

/** Local part of an Iraqi mobile number, without the +964. */
const LOCAL_PHONE_MAX = 10;

function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(true);
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);
  const { mutate: login, isPending } = useLogin();

  useEffect(() => {
    const parsed = parsePhoneNumberFromString(`+964${phone}`, "IQ");
    setIsValid(Boolean(parsed?.isValid()));
  }, [phone]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value.replace(/\D/g, ""));
    setError("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isPending || !isValid || !accepted) return;

    const parsed = parsePhoneNumberFromString(`+964${phone}`, "IQ");
    if (!parsed?.isValid()) {
      setError("رقم غير صحيح. يرجى إدخال رقم عراقي صالح.");
      return;
    }

    setError("");
    login(
      { phone: parsed.number },
      {
        onSuccess: (data) => {
          if (data?.message) toast.success(data.message);
          navigate("/otp", { state: { phone: parsed.number } });
        },
        onError: (err) => {
          setError(
            getApiErrorMessage(
              err,
              "حدث خطأ أثناء إرسال رمز التحقق. يرجى المحاولة مرة أخرى.",
            ),
          );
        },
      },
    );
  };

  return (
    <AuthShell>
      <div className="flex w-full max-w-[1072px] items-center justify-center gap-8">
        <div className="w-full max-w-[520px] rounded-[32px] bg-ink-raised p-6 text-right sm:p-9">
          <div className="flex flex-col items-start gap-[22px]">
            <span
              aria-hidden
              className="flex size-[58px] items-center justify-center overflow-hidden rounded-[34px] bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)]"
            >
              <img
                src="/images/landing/mel-mark.svg"
                alt=""
                width={58}
                height={58}
                className="size-[58px]"
              />
            </span>

            <div className="flex w-full flex-col gap-1.5">
              <h1 className="text-[30px] font-extrabold leading-[45px] text-frost">
                مرحباً بعودتك
              </h1>
              <p className="text-sm leading-[21px] text-muted">
                أدخل رقم هاتفك العراقي وسنرسل لك رمز تحقق عبر SMS
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-[22px]">
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-[13px] font-semibold text-muted">
                  رقم الهاتف
                </label>
                {/* The country affix sits at the field's start (right, under
                    RTL) while the digits themselves read left-to-right. */}
                <div
                  className={`flex h-[52px] w-full items-center gap-2.5 rounded-[14px] bg-field px-4 transition-colors ${
                    error
                      ? "border-[1.5px] border-[#ff5252]"
                      : "border-[1.5px] border-field-line focus-within:border-brand-primary"
                  }`}
                >
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="flex h-5 w-7 items-center justify-center rounded-md bg-[#161c44] text-[10px] font-bold text-muted">
                      IQ
                    </span>
                    <span dir="ltr" className="text-sm font-semibold text-frost">
                      +964
                    </span>
                    <span aria-hidden className="h-[22px] w-px bg-field-line" />
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={LOCAL_PHONE_MAX}
                    required
                    value={phone}
                    onChange={handleChange}
                    placeholder="7XX XXX XXXX"
                    className="min-w-0 flex-1 bg-transparent text-right text-sm text-frost placeholder:text-dim focus:outline-none"
                  />
                </div>
                {error && (
                  <p className="flex items-center gap-1.5 text-xs text-[#ff5252]">
                    <AlertCircle size={13} className="shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className="flex size-5 shrink-0 items-center justify-center rounded-md border border-field-line text-[11px] font-bold text-white peer-checked:border-transparent peer-checked:bg-[linear-gradient(135deg,#00b7ff_0%,#7d26f7_71%)]"
                >
                  {accepted ? "✓" : ""}
                </span>
                <span className="text-[13px] leading-5 text-muted">
                  أوافق على{" "}
                  <span className="font-bold text-brand-primary">الشروط والأحكام</span> و{" "}
                  <span className="font-bold text-brand-primary">سياسة الخصوصية</span>
                </span>
              </label>

              <button
                type="submit"
                disabled={isPending || !isValid || !accepted}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    إرسال رمز التحقق
                    <span aria-hidden className="text-lg leading-none">
                      ←
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-dim">أو</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <p className="w-full text-center text-[13px] leading-5 text-muted">
              ليس لديك حساب؟{" "}
              <Link to="/checkout" className="font-bold text-brand-primary hover:underline">
                أنشئ متجرك مجاناً
              </Link>
            </p>
          </div>
        </div>

        <BrandPanel />
      </div>
    </AuthShell>
  );
}

export default Login;
