import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "@/components/icons";
import AuthShell from "@/components/auth/AuthShell";
import OtpInputs from "@/components/auth/OtpInputs";
import { IQ_LOCAL_PHONE_LENGTH, iqPhoneError, toIqE164, toLocalDigits } from "@/utils/phone";

/**
 * Sign in with Mel, for shoppers: the page every Mel store opens in a pop-up
 * (through `/shopper/auth/bounce`) when the shopper has no Mel session yet.
 *
 * Phone, then the code on WhatsApp, then a name the first time. Signing in
 * sets the Mel cookie on `.mel.iq`; the page then goes back through
 * `auth/bounce`, which hands the store a one-time ticket; the store's pop-up
 * passes it to the page that opened it and closes. The page never
 * redirects anywhere else: the API checks that `return` belongs to `store`.
 */

const API = import.meta.env.VITE_API_BASE_URL || "https://api.mel.iq/api/v1";
const CODE_LENGTH = 4;

interface Shopper {
  name: string | null;
}

async function call<T>(path: string, body: unknown, init: { method?: string; token?: string } = {}): Promise<T> {
  const response = await fetch(`${API}/shopper${path}`, {
    method: init.method ?? "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    // Validation messages come back in English (e.g. a prefix the server does not take): say it in Arabic.
    const readable = typeof message === "string" && /[\u0600-\u06FF]/.test(message) ? message : null;
    throw new Error(readable ?? (response.status === 429 ? "محاولات كثيرة، حاول بعد قليل" : response.status === 400 && path === "/auth/code" ? "رقم غير مدعوم. أدخل رقم موبايل عراقي يبدأ بـ 075 أو 077 أو 078." : "حدث خطأ، حاول مرة أخرى"));
  }
  return data as T;
}

type Step = "phone" | "code" | "name";

export default function ShopperSignIn() {
  const back = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const store = params.get("store")?.trim();
    const returnUrl = params.get("return")?.trim();
    if (!store || !returnUrl || !/^https?:\/\//i.test(returnUrl)) return null;
    return `${API}/shopper/auth/bounce?store=${encodeURIComponent(store)}&return=${encodeURIComponent(returnUrl)}`;
  }, []);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const goBack = () => {
    if (!back) return;
    setLeaving(true);
    window.location.replace(back);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (problem) {
      // A dropped connection reads "Failed to fetch": say it in the shopper's words.
      setError(problem instanceof TypeError || !(problem instanceof Error) ? "تعذر الاتصال، تحقق من الإنترنت وحاول مرة أخرى" : problem.message);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const e164 = toIqE164(phone);
      if (!e164) throw new Error(iqPhoneError(phone));
      await call("/auth/code", { phone: e164 });
      setCode("");
      setStep("code");
    });

  const verify = (value = code) =>
    run(async () => {
      if (value.length !== CODE_LENGTH) throw new Error("أدخل الرمز كاملاً");
      const out = await call<{ token: string; shopper: Shopper }>("/auth/verify", {
        phone: toIqE164(phone),
        code: Number(value),
      });
      if (out.shopper?.name) return goBack();
      setToken(out.token);
      setStep("name");
    });

  const saveName = () =>
    run(async () => {
      if (name.trim()) await call("/me", { name: name.trim() }, { method: "PATCH", token });
      goBack();
    });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || leaving) return;
    void (step === "phone" ? sendCode() : step === "code" ? verify() : saveName());
  };

  const field =
    "flex h-[52px] w-full items-center gap-2.5 rounded-[14px] border-[1.5px] bg-field px-4 transition-colors " +
    (error ? "border-[#ff5252]" : "border-field-line focus-within:border-brand-primary");

  return (
    // A store opens this in a pop-up: no way off to Mel's home from here.
    <AuthShell homeLink={false}>
      <div className="w-full max-w-[460px] rounded-[32px] bg-ink-raised p-6 text-right sm:p-9">
        <div className="flex flex-col items-start gap-[22px]">
          <span
            aria-hidden
            className="flex size-[58px] items-center justify-center overflow-hidden rounded-[34px] bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)]"
          >
            <img src="/images/landing/mel-mark.svg" alt="" width={58} height={58} className="size-[58px]" />
          </span>

          <div className="flex w-full flex-col gap-1.5">
            <h1 className="text-2xl font-extrabold leading-9 text-frost">
              {step === "name" ? "ما اسمك؟" : "الدخول بحساب Mel"}
            </h1>
            <p className="text-sm leading-[21px] text-muted">
              {!back
                ? "افتح هذه الصفحة من زر «المتابعة بحساب Mel» في المتجر."
                : step === "phone"
                  ? "حساب واحد يعمل في كل متاجر Mel. أدخل رقم هاتفك وسنرسل لك رمزاً على واتساب."
                  : step === "code"
                    ? `أرسلنا رمزاً من ${CODE_LENGTH} أرقام على واتساب إلى 0${phone}`
                    : "يظهر للمتاجر التي تطلب منها."}
            </p>
          </div>

          {back && (
            <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-[22px]">
              {step === "phone" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="text-[13px] font-semibold text-muted">
                    رقم الهاتف
                  </label>
                  <div className={field}>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      dir="ltr"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={IQ_LOCAL_PHONE_LENGTH + 1}
                      autoFocus
                      value={phone}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setPhone(toLocalDigits(e.target.value).slice(0, IQ_LOCAL_PHONE_LENGTH + 1));
                        setError("");
                      }}
                      placeholder="7XX XXX XXXX"
                      className="min-w-0 flex-1 bg-transparent text-left text-sm text-frost placeholder:text-dim focus:outline-none"
                    />
                    <span className="flex shrink-0 items-center gap-2">
                      <span aria-hidden className="h-[22px] w-px bg-field-line" />
                      <span dir="ltr" className="text-sm font-semibold text-frost">
                        +964
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {step === "code" && (
                <OtpInputs
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError("");
                  }}
                  onComplete={(value) => void verify(value)}
                  length={CODE_LENGTH}
                  status={error ? "error" : "default"}
                  disabled={busy || leaving}
                  autoFocus
                />
              )}

              {step === "name" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-[13px] font-semibold text-muted">
                    الاسم
                  </label>
                  <div className={field}>
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      maxLength={80}
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-sm text-frost placeholder:text-dim focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-[#ff5252]">
                  <AlertCircle size={13} className="shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || leaving}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-l from-brand-violet to-brand-indigo px-5 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy || leaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : step === "phone" ? (
                  "إرسال الرمز"
                ) : step === "code" ? (
                  "تأكيد"
                ) : (
                  "متابعة"
                )}
              </button>

              {step === "code" && (
                <div className="flex w-full justify-center gap-5 text-[13px]">
                  <button type="button" className="text-muted hover:text-frost" onClick={() => setStep("phone")}>
                    تغيير الرقم
                  </button>
                  <button type="button" className="text-muted hover:text-frost disabled:opacity-40" disabled={busy} onClick={() => void sendCode()}>
                    إعادة إرسال الرمز
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </AuthShell>
  );
}
