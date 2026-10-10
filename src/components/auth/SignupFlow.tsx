import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authAPI } from "@/api/endpoints/auth.endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage, isPhoneTakenError } from "@/utils/otp";
import {
  formatIqPhone,
  iqPhoneError,
  toIqE164,
  toLocalDigits,
} from "@/utils/phone";
import { seedPromptDraft } from "@/utils/promptHandoff";
import OtpInputs from "@/components/auth/OtpInputs";
import {
  CheckBox,
  Field,
  type FieldState,
  PhoneInput,
  SelectInput,
  StepFooter,
  TextInput,
} from "@/components/checkout/fields";

/**
 * The one way an account is created: the create-account page's form and code
 * step.
 *
 * Rendered by the create-account page and, unchanged, in the window that opens
 * over the landing prompt when a signed-out visitor presses «أنشئ متجري». The
 * window exists so signing up does not navigate away from a generation the
 * merchant has already asked for; the form inside it is this one, so the two
 * entry points ask the same questions, check them the same way and handle an
 * existing number the same way.
 */

/**
 * Digits in the verification code.
 *
 * The frames draw six boxes; the server issues four
 * (`codes.service.ts`: `faker.number.int({ min: 1000, max: 9999 })`).
 */
const OTP_LENGTH = 4;

/** Iraq's governorates, for the account step's picker. */
const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "بابل", "ذي قار",
  "الأنبار", "ديالى", "كركوك", "واسط", "صلاح الدين", "المثنى", "القادسية",
  "ميسان", "دهوك", "السليمانية",
];

/** Business categories offered on the account step. */
const BUSINESS_TYPES = [
  "ملابس وأزياء", "إلكترونيات وهواتف", "مستحضرات تجميل وعطور", "أغذية ومشروبات",
  "أثاث ومستلزمات منزل", "رياضة ولياقة", "كتب وقرطاسية", "صحة وأدوية", "أخرى",
];

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export type SignupStep = "account" | "login" | "otp";

type SignupFlowProps = {
  /** `modal` keeps every field in one column and drops the page headline size. */
  layout?: "page" | "modal";
  /** Lets the page keep its stepper in step with the form. */
  onStepChange?: (step: SignupStep) => void;
  /**
   * «لديك حساب؟» on the page goes to /login. Without it (the window) the
   * phone-only sign-in happens in place, so the prompt underneath survives.
   */
  onLoginLink?: (localPhone: string) => void;
  /** Toast for a brand-new account; the caller knows what happens next. */
  createdMessage?: string;
  onAuthenticated: (info: { existingAccount: boolean }) => void;
};

export default function SignupFlow({
  layout = "page",
  onStepChange,
  onLoginLink,
  createdMessage = "تم إنشاء حسابك",
  onAuthenticated,
}: SignupFlowProps) {
  const { login } = useAuth();
  const [step, setStepState] = useState<SignupStep>("account");
  const [fields, setFields] = useState({
    name: "",
    email: "",
    phone: "",
    businessType: "",
    governorate: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  /** Set when the number cannot be used, shown under the phone field. */
  const [phoneTakenError, setPhoneTakenError] = useState("");
  /** The number the code went to, E.164. */
  const [codePhone, setCodePhone] = useState("");
  /** The code went to an account that already existed. */
  const [existingAccount, setExistingAccount] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const setStep = (next: SignupStep) => {
    setStepState(next);
    onStepChange?.(next);
  };
  useEffect(() => {
    onStepChange?.("account");
    // Only the opening step; later ones are reported by setStep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const row =
    layout === "modal" ? "flex flex-col gap-5" : "flex flex-col gap-5 sm:flex-row";

  const nameError =
    fields.name.trim().length >= 2 ? "" : "يرجى إدخال الاسم الكامل (حرفان على الأقل).";
  const emailError = EMAIL_RE.test(fields.email.trim())
    ? ""
    : "يرجى إدخال بريد إلكتروني صالح.";
  const phoneError = phoneTakenError || iqPhoneError(fields.phone);
  const termsError = acceptedTerms
    ? ""
    : "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.";

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));
  /** Leaving a field only counts as "touched" once something is in it. */
  const blurHandler = (field: string, value: string) => () => {
    if (value.trim()) markTouched(field);
  };
  /** An error is only shown once the field has been left or submitted. */
  const errorFor = (field: string, message: string): string | undefined =>
    message && touched[field] ? message : undefined;
  const stateFor = (field: string, message: string): FieldState =>
    errorFor(field, message) ? "error" : message ? "default" : "valid";

  const setField =
    (name: keyof typeof fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFields((prev) => ({ ...prev, [name]: e.target.value }));

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneTakenError("");
    setFields((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }));
  };

  const goToCode = (phoneE164: string, existing: boolean) => {
    setCodePhone(phoneE164);
    setExistingAccount(existing);
    setOtp("");
    setStep("otp");
  };

  /**
   * The number already has an account, so sign in to it instead.
   *
   * Register writes the user before the code is checked, so this is also what
   * someone hits who went back from the code step and pressed continue again,
   * or who left mid-signup and came back. Owning the phone is all an account
   * needs, so the code goes out here and the flow carries on.
   */
  const continueWithExistingAccount = async (
    phoneE164: string,
    registerError: unknown,
  ) => {
    try {
      await authAPI.login({ phone: phoneE164 });
      toast.info("هذا الرقم لديه حساب مسبقاً — أرسلنا رمز الدخول إليه.");
      goToCode(phoneE164, true);
    } catch {
      // A removed account, typically: the register message says so.
      const message = getApiErrorMessage(
        registerError,
        "هذا الرقم لديه حساب مسبقاً. سجّل الدخول للمتابعة.",
      );
      setPhoneTakenError(message);
      markTouched("phone");
      toast.error(message);
    }
  };

  const submitAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Checked here rather than at the API: the message lands under the field
    // that is wrong, and no code goes to a mistyped number.
    setTouched({ name: true, email: true, phone: true, terms: true });
    const phoneE164 = toIqE164(fields.phone);
    if (nameError || emailError || !phoneE164 || !acceptedTerms) {
      toast.error("الرجاء تصحيح الحقول المعلَّمة بالأحمر قبل المتابعة.");
      return;
    }

    setBusy(true);
    try {
      const data = await authAPI.register({
        phone: phoneE164,
        name: fields.name.trim(),
        email: fields.email.trim(),
      });
      if (data?.message) toast.success(data.message);
      goToCode(phoneE164, false);
    } catch (error) {
      if (isPhoneTakenError(error)) {
        await continueWithExistingAccount(phoneE164, error);
      } else {
        toast.error(
          getApiErrorMessage(error, "حدث خطأ في التسجيل. الرجاء المحاولة مرة أخرى."),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  /** The window's in-place sign-in: phone only, then the same code step. */
  const submitLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    markTouched("phone");
    const phoneE164 = toIqE164(fields.phone);
    if (!phoneE164) return;

    setBusy(true);
    try {
      await authAPI.login({ phone: phoneE164 });
      goToCode(phoneE164, true);
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        toast.info("لا يوجد حساب بهذا الرقم — أكمل بياناتك لإنشاء حساب.");
        setStep("account");
        return;
      }
      toast.error(getApiErrorMessage(error, "تعذر إرسال رمز التحقق. حاول مرة أخرى."));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (code: string = otp) => {
    if (code.length !== OTP_LENGTH || busy) return;

    setBusy(true);
    try {
      const result = await authAPI.verify({ phone: codePhone, code });
      const token = result?.token || result?.accessToken;
      if (!token) {
        toast.error("تعذر إكمال تسجيل الدخول. حاول مرة أخرى.");
        return;
      }
      setOtpVerified(true);
      login(token, result?.username || fields.name || codePhone, result?.refreshToken);
      // What they picked as their business starts the prompt off (a draft
      // they already typed is never replaced).
      seedPromptDraft(fields.businessType, fields.governorate);
      toast.success(existingAccount ? "تم تسجيل الدخول" : createdMessage);
      onAuthenticated({ existingAccount });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "رمز التحقق غير صحيح. الرجاء المحاولة مرة أخرى."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!codePhone) return;
    setResending(true);
    try {
      // /auth/login sends a code to any existing user, which the account is
      // from the moment register succeeds.
      await authAPI.login({ phone: codePhone });
      setOtp("");
      toast.success("تم إرسال رمز جديد إلى رقمك");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "تعذر إعادة إرسال الرمز. حاول مرة أخرى."));
    } finally {
      setResending(false);
    }
  };

  const headline =
    layout === "modal"
      ? "text-2xl font-extrabold leading-tight text-white"
      : "text-[28px] font-extrabold leading-tight text-white sm:text-[32px]";

  if (step === "otp") {
    return (
      <div className="flex flex-col items-center gap-[22px] py-2 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <h2 className={headline}>تحقق من رقمك</h2>
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm leading-6 text-[#9aa1bd]">
            أرسلنا رمزاً من {OTP_LENGTH} أرقام إلى
            <span dir="ltr" className="font-semibold text-white">
              {formatIqPhone(codePhone)}
            </span>
            <button
              type="button"
              onClick={() => setStep(existingAccount && !fields.name ? "login" : "account")}
              className="text-[13px] font-bold text-[#7b8cff] hover:underline"
            >
              تعديل
            </button>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitCode();
          }}
          className="flex w-full max-w-[444px] flex-col items-center gap-[22px]"
        >
          <OtpInputs
            value={otp}
            length={OTP_LENGTH}
            disabled={busy}
            autoFocus
            status={otpVerified ? "success" : "default"}
            onChange={setOtp}
            // The last digit submits, so the button is a fallback rather than
            // one more tap (and one a toast can sit on top of on a phone).
            onComplete={(code) => void submitCode(code)}
          />

          <div className="flex w-full items-center justify-end text-[13px] leading-5">
            <span className="flex items-center gap-1.5 text-muted">
              لم يصلك الرمز؟
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="font-bold text-brand-primary transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {resending ? "جاري الإرسال…" : "إعادة الإرسال"}
              </button>
            </span>
          </div>

          {otpVerified && (
            <p className="flex items-center gap-2 rounded-full border border-mint/35 bg-mint/10 px-3.5 py-2.5 text-[13px] font-bold text-mint">
              <span aria-hidden>✓</span>
              تم التحقق بنجاح
            </p>
          )}

          <div className="w-full pt-4">
            <StepFooter
              submitLabel="متابعة"
              busy={busy}
              disabled={otp.length !== OTP_LENGTH}
              onBack={() => setStep(existingAccount && !fields.name ? "login" : "account")}
            />
          </div>
        </form>
      </div>
    );
  }

  if (step === "login") {
    return (
      <div className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-1.5">
          <h2 className={headline}>تسجيل الدخول</h2>
          <p className="text-sm leading-6 text-[#9aa1bd]">
            أدخل رقم هاتفك وسنرسل لك رمز الدخول
          </p>
        </div>
        <form onSubmit={submitLogin} noValidate className="flex flex-col gap-[22px]">
          <Field
            label="رقم الهاتف"
            htmlFor="signup-login-phone"
            error={errorFor("phone", phoneError)}
          >
            <PhoneInput
              id="signup-login-phone"
              value={fields.phone}
              onChange={handlePhoneChange}
              onBlur={blurHandler("phone", fields.phone)}
              autoFocus
              autoComplete="tel-national"
              placeholder="7XX XXX XXXX"
              state={stateFor("phone", phoneError)}
            />
          </Field>
          <StepFooter submitLabel="إرسال الرمز" busy={busy}>
            <p className="text-[13px] leading-5 text-muted">
              ليس لديك حساب؟{" "}
              <button
                type="button"
                onClick={() => setStep("account")}
                className="font-bold text-brand-primary hover:underline"
              >
                أنشئ حساباً
              </button>
            </p>
          </StepFooter>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-1.5">
        <h2 className={headline}>أنشئ حسابك</h2>
        <p className="text-sm leading-6 text-[#9aa1bd]">
          شهر أول مجاناً ثم 6 أشهر بنصف السعر — وتقدر تلغي في أي وقت
        </p>
      </div>

      <form onSubmit={submitAccount} noValidate className="flex flex-col gap-[22px]">
        {/* Two per row on the page; RTL puts the first field on the right,
            which is the order the frame reads in. */}
        <div className={row}>
          <Field label="الاسم الكامل" htmlFor="name" error={errorFor("name", nameError)}>
            <TextInput
              id="name"
              name="name"
              value={fields.name}
              onChange={setField("name")}
              onBlur={blurHandler("name", fields.name)}
              required
              autoComplete="name"
              placeholder="محمد علي يوسف"
              state={stateFor("name", nameError)}
            />
          </Field>
          <Field label="البريد الإلكتروني" htmlFor="email" error={errorFor("email", emailError)}>
            <TextInput
              id="email"
              name="email"
              type="email"
              dir="ltr"
              value={fields.email}
              onChange={setField("email")}
              onBlur={blurHandler("email", fields.email)}
              required
              autoComplete="email"
              placeholder="you@store.iq"
              state={stateFor("email", emailError)}
            />
          </Field>
        </div>

        <div className={row}>
          <Field
            label="رقم الهاتف"
            htmlFor="phone"
            hint="سنرسل رمز التحقق إلى هذا الرقم"
            error={errorFor("phone", phoneError)}
          >
            <PhoneInput
              id="phone"
              name="phone"
              value={fields.phone}
              onChange={handlePhoneChange}
              onBlur={blurHandler("phone", fields.phone)}
              required
              autoComplete="tel-national"
              placeholder="7XX XXX XXXX"
              state={stateFor("phone", phoneError)}
            />
          </Field>
          {/* No store name: the AI prompt names the store. */}
          {layout === "page" && <span className="hidden flex-1 sm:block" />}
        </div>

        {/* Not persisted (the register endpoint takes name / email / phone),
            hence optional. They start the AI prompt off once the code checks
            out (`seedPromptDraft`). */}
        <div className={row}>
          <Field label="نوع النشاط التجاري" htmlFor="businessType">
            <SelectInput
              id="businessType"
              name="businessType"
              value={fields.businessType}
              onChange={setField("businessType")}
              placeholder="اختر نوع النشاط"
            >
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type} className="bg-ink-raised text-frost">
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="المحافظة" htmlFor="governorate">
            <SelectInput
              id="governorate"
              name="governorate"
              value={fields.governorate}
              onChange={setField("governorate")}
              placeholder="اختر المحافظة"
            >
              {GOVERNORATES.map((name) => (
                <option key={name} value={name} className="bg-ink-raised text-frost">
                  {name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <CheckBox
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
          error={errorFor("terms", termsError)}
        >
          أوافق على{" "}
          {/* New tab: on a phone the links fill most of this line, and a tap
              that navigated away lost the whole form. */}
          <Link
            to="/terms-of-use"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            شروط الاستخدام
          </Link>{" "}
          و{" "}
          <Link
            to="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-brand-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            سياسة الخصوصية
          </Link>
        </CheckBox>

        <StepFooter submitLabel="متابعة" busy={busy}>
          <p className="text-[13px] leading-5 text-muted">
            لديك حساب؟{" "}
            <button
              type="button"
              onClick={() =>
                onLoginLink ? onLoginLink(toLocalDigits(fields.phone)) : setStep("login")
              }
              className="font-bold text-brand-primary hover:underline"
            >
              تسجيل الدخول
            </button>
          </p>
        </StepFooter>
      </form>
    </div>
  );
}
