import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLogin, useValidateUser, useVerify } from "@/api/wrappers/auth.wrappers";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRightIcon, Loader2 } from "@/components/icons";
import { getApiErrorMessage } from "@/utils/otp";
import AuthShell from "@/components/auth/AuthShell";
import OtpInputs from "@/components/auth/OtpInputs";

/**
 * Digits in the code.
 *
 * The Figma frame draws six boxes, but the server issues four
 * (`codes.service.ts`: `faker.number.int({ min: 1000, max: 9999 })`), and six
 * boxes the merchant can never fill is a dead end. Raise this the day the
 * backend does.
 */
const OTP_LENGTH = 4;

const RESEND_SECONDS = 60;

/** 65 -> "01:05", which is the countdown format the frame uses. */
function formatCountdown(total: number): string {
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * "+9647701234567" -> "+964 770 123 4567", the grouping the frame shows.
 *
 * Anything that isn't a full Iraqi mobile is returned as-is rather than
 * mangled into the wrong shape.
 */
function formatPhone(e164: string): string {
  if (!e164) return "—";
  const local = e164.replace(/^\+?964/, "");
  if (local.length !== 10) return e164;
  return `+964 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

function OTPVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mutate: verify, isPending: isVerifyingPending } = useVerify();
  const { mutate: resendOtp } = useLogin();
  const { mutate: validateUser, isPending: isValidatingUser } =
    useValidateUser();
  const { login } = useAuth();

  const phone = (location.state as { phone?: string } | null)?.phone || "";
  const storeFromState =
    (location.state as { store?: string } | null)?.store?.trim() || "";
  const storeFromQuery =
    new URLSearchParams(window.location.search).get("store")?.trim() || "";
  const storeSlug = storeFromState || storeFromQuery;
  const maskedPhone = formatPhone(phone);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const isBusy = isVerifyingPending || isValidatingUser;

  const goToRedirectError = (params?: { token?: string; store?: string }) => {
    navigate("/auth/redirect-error", {
      replace: true,
      state: {
        errorCode: "AUTH_REDIRECT_FAILED",
        token: params?.token || "",
        store: params?.store || "",
      },
    });
  };

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

  const submitOtp = (otpValue: string) => {
    if (isBusy || !phone) return;
    if (otpValue.length !== OTP_LENGTH) {
      setError("يرجى إدخال جميع الأرقام");
      return;
    }

    setError("");

    verify(
      { phone, code: otpValue },
      {
        onSuccess: (verifyData: any) => {
          const token =
            verifyData?.token ||
            verifyData?.accessToken ||
            verifyData?.data?.token ||
            verifyData?.data?.accessToken ||
            "";
          const verifyRedirect =
            verifyData?.redirectUrl || verifyData?.data?.redirectUrl;

          // احفظ الجلسة دائماً بعد verify الناجح
          persistAuth(verifyData);

          if (!token) {
            toast.warning(
              "تم التحقق لكن لم يُرجع التوكن. حاول تسجيل الدخول مرة أخرى إن لزم.",
            );
            navigate("/dashboard", { replace: true });
            return;
          }

          // إذا الـ verify رجّع رابط مباشر للمتجر/الداشبورد
          if (verifyRedirect) {
            window.location.href = verifyRedirect;
            return;
          }

          // فتح متجر محدد: نحتاج validate-user ثم redirect
          if (storeSlug) {
            validateUser(
              { store: storeSlug, token },
              {
                onSuccess: (validateData: any) => {
                  const redirectUrl =
                    validateData?.redirectUrl ||
                    validateData?.data?.redirectUrl;

                  if (!redirectUrl) {
                    goToRedirectError({ token, store: storeSlug });
                    return;
                  }

                  window.location.href = redirectUrl;
                },
                onError: () => {
                  goToRedirectError({ token, store: storeSlug });
                },
              },
            );
            return;
          }

          // تسجيل دخول عادي بدون store → لوحة mel.iq
          toast.success("تم التحقق بنجاح");
          navigate("/dashboard", { replace: true });
        },
        onError: (err) => {
          setError(
            getApiErrorMessage(
              err,
              "رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.",
            ),
          );
          setTimeout(() => setOtp(""), 300);
        },
      },
    );
  };

  const handleResendOtp = () => {
    if (!canResend || !phone) return;

    setResendCooldown(RESEND_SECONDS);
    setCanResend(false);
    setError("");

    resendOtp(
      { phone },
      {
        onSuccess: (data) => {
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
    <AuthShell>
      <div className="w-full max-w-[520px] rounded-[32px] bg-ink-raised p-6 text-right sm:p-9">
        <div className="flex flex-col items-start gap-[22px]">
          {/* Back to the phone step. The arrow points right — the direction
              "back" runs in an RTL page. */}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 text-sm text-muted transition-colors hover:text-frost"
          >
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-[10px] bg-slate"
            >
              <ArrowRightIcon size={20} />
            </span>
            العودة الى تسجيل الدخول
          </button>

          <div className="flex w-full flex-col gap-1.5">
            <h1 className="text-[30px] font-extrabold leading-[45px] text-frost">
              أدخل رمز التحقق
            </h1>
            <p className="flex flex-wrap items-center justify-start gap-1.5 text-sm leading-[21px] text-muted">
              أرسلنا رمزاً من {OTP_LENGTH} أرقام إلى
              <span dir="ltr" className="font-semibold text-frost">
                {maskedPhone}
              </span>
            </p>
          </div>

          <form
            className="flex w-full flex-col gap-[22px]"
            onSubmit={(e) => {
              e.preventDefault();
              submitOtp(otp);
            }}
          >
            <OtpInputs
              value={otp}
              length={OTP_LENGTH}
              status={error ? "error" : "default"}
              disabled={isBusy}
              autoFocus
              onChange={(value) => {
                setOtp(value);
                setError("");
              }}
              onComplete={submitOtp}
            />

            {error && (
              <p className="text-[13px] text-[#ff5252]">{error}</p>
            )}
            <button
              type="submit"
              disabled={isBusy || otp.length !== OTP_LENGTH}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : "تأكيد والدخول"}
            </button>
            <div className="flex items-center justify-between text-[13px] leading-5">


              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isBusy}
                  className="font-bold text-brand-primary transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  إعادة إرسال الرمز
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-muted">
                  إعادة الإرسال خلال
                  <span dir="ltr" className="font-semibold tabular-nums text-frost">
                    {formatCountdown(resendCooldown)}
                  </span>
                </span>
              )}
            </div>


          </form>
        </div>
      </div>
    </AuthShell>
  );
}

export default OTPVerification;
