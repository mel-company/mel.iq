/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useRegister,
  useVerify,
  useSendOtp,
  useLogin,
} from "@/api/wrappers/auth.wrappers";
import {
  useAddStore,
  useCheckStoreDomainAvailability,
} from "@/api/wrappers/store.wrappers";
import { useDynadotSearch } from "@/api/wrappers/dynadot.wrappers";
import DomainPriceBreakdown from "@/components/DomainPriceBreakdown";
import type { DynadotSearchResult } from "@/api/endpoints/dynadot.endpoints";
import { useSetCustomDomain } from "@/api/wrappers/domain.wrappers";
import { extractPlatformSlug } from "@/hooks/useDomainCheck";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import { useInitPlatformPayment } from "@/api/wrappers/platform-payment.wrapper";
import { CHECKOUT_DRAFT_KEY, LAST_PAYMENT_ID_KEY } from "@/pages/CheckoutPaymentReturn";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  isPhoneTakenError,
} from "@/utils/otp";
import {
  formatIqPhone,
  iqPhoneError,
  toIqE164,
  toLocalDigits,
} from "@/utils/phone";
import { useWaitForDashboardReady } from "@/hooks/useWaitForDashboardReady";
import StoreProvisioningGate from "@/components/StoreProvisioningGate";
import { Loader2, Upload, X } from "@/components/icons";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
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
 * Digits in the verification code.
 *
 * The frames draw six boxes; the server issues four
 * (`codes.service.ts`: `faker.number.int({ min: 1000, max: 9999 })`), and the
 * existing verify call here already checks for four.
 */
const CHECKOUT_OTP_LENGTH = 4;

/** Iraq's governorates, for the account step's picker. */
const GOVERNORATES = [
  "بغداد", "البصرة", "نينوى", "أربيل", "النجف", "كربلاء", "بابل", "ذي قار",
  "الأنبار", "ديالى", "كركوك", "واسط", "صلاح الدين", "المثنى", "القادسية",
  "ميسان", "دهوك", "السليمانية",
];

/**
 * The payment tiles the frame draws.
 *
 * QiCard and ZainCash share the same `/platform-payments/init` flow; the
 * only difference is `provider`. Card and FIB stay visible but disabled.
 */
const PAYMENT_METHODS = [
  { id: "card", title: "بطاقة بنكية", detail: "Visa · Mastercard", mark: "VC", tint: "bg-brand-primary/15 text-brand-primary", available: false, provider: null },
  { id: "zaincash", title: "زين كاش", detail: "ZainCash", mark: "Z", tint: "bg-[#ff5252]/15 text-[#ff5252]", available: true, provider: "ZAIN_CASH" as const },
  { id: "qicard", title: "كي كارد", detail: "Qi Card", mark: "Q", tint: "bg-amber/15 text-amber", available: true, provider: "QI_CARD" as const },
  { id: "fib", title: "FIB", detail: "المصرف الأول", mark: "F", tint: "bg-brand-secondary/15 text-brand-secondary", available: false, provider: null },
];

/** Business categories offered on the account step. */
const BUSINESS_TYPES = [
  "ملابس وأزياء", "إلكترونيات وهواتف", "مستحضرات تجميل وعطور", "أغذية ومشروبات",
  "أثاث ومستلزمات منزل", "رياضة ولياقة", "كتب وقرطاسية", "صحة وأدوية", "أخرى",
];

/**
 * A plan's feature labels.
 *
 * `plan.features` comes back through the FeaturePlan join, so each row wraps
 * the feature rather than being one; older payloads inline it. Both shapes are
 * read here so the cards are not silently blank either way.
 */
function planFeatures(plan: any): string[] {
  return (plan?.features || [])
    .map((row: any) => row?.feature ?? row)
    .filter((f: any) => f && f.enabled !== false)
    .map((f: any) => String(f.name || "").trim())
    .filter(Boolean);
}

/** Phone used for OTP (logged-in user object or checkout form), always IQ E.164 when possible. */
function resolveOtpPhone(user: unknown, formPhone: string): string | null {
  const u = user as {
    phone?: string;
    username?: string;
    user?: { phone?: string };
  } | null;

  const candidates = [
    formPhone,
    u?.phone,
    u?.user?.phone,
    // AuthContext sometimes stores username as the phone after verify
    u?.username,
  ];

  for (const raw of candidates) {
    if (raw == null || String(raw).trim() === "") continue;
    const normalized = toIqE164(String(raw));
    if (normalized) return normalized;
  }
  return null;
}

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // Fetch plans first
  const plans = useFetchAllPlans();
  const plansData = plans.data
    ? Array.isArray(plans.data)
      ? plans.data
      : plans.data?.data || []
    : [];

  // Always start from step 1 (plan selection) unless skipToStep is provided
  // User must select a plan before creating a store
  const initialStep = location.state?.skipToStep || 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const { mutate: registerMutation, isPending: isRegistering } = useRegister();
  const { mutate: loginMutation, isPending: isLoggingIn } = useLogin();
  const { mutate: sendOtpMutation, isPending: isSendingOtp } = useSendOtp();
  const { mutate: verifyOtpMutation, isPending: isVerifyingOtp } = useVerify();
  const { mutate: addStoreMutation } = useAddStore();
  const { mutate: setCustomDomainMutation } = useSetCustomDomain();
  const { mutate: initPaymentMutation, isPending: isInitiatingPayment } =
    useInitPlatformPayment();
  const {
    timedOut: provisioningTimedOut,
    lastStatus: provisioningStatus,
    error: provisioningError,
    waitUntilReady,
    reset: resetProvisioning,
  } = useWaitForDashboardReady();
  const [pendingTemplatesNav, setPendingTemplatesNav] = useState<{
    websiteType: string;
    domain: string;
    url: string;
  } | null>(null);

  // Initialize formData with user info if available - using lazy initialization
  const [formData, setFormData] = useState(() => {
    // Get initial values from location.state
    const initialName = location.state?.userInfo?.name || "";
    const initialEmail = location.state?.userInfo?.email || "";
    const initialPhone = location.state?.userInfo?.phone || "";

    // Handle plan: selectedPlan from location.state
    const draft = location.state?.checkoutDraft;
    let initialPlan = location.state?.selectedPlan || draft?.plan || null;

    return {
      name: initialName || draft?.name || "",
      email: initialEmail || draft?.email || "",
      phone: initialPhone || draft?.phone || "",
      plan: initialPlan,
      otp: "",
      paymentMethod: "qicard",
      paymentId: (location.state?.paymentId as string | null) || null,
      websiteType: draft?.websiteType || "store",
      logo: null as string | null,
      logoFile: null as File | null,
      storeName: draft?.storeName || "",
      // Collected on the account step because the frame asks for them. The
      // register endpoint takes only name/email/phone, so they are not
      // persisted yet — wire them through when the API grows the fields.
      businessType: "",
      governorate: "",
      domain: draft?.domain || "",
      domainType: draft?.domainType || "subdomain",
      websiteUrl: "",
      username: "",
      password: "",
    };
  });

  const [otpSent, setOtpSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  /**
   * Account-step fields the merchant has already left (or tried to submit), so
   * a half-typed number isn't scolded on its first keystroke.
   */
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  /** Drives the success pill the frame shows once the code checks out. */
  const [otpVerified, setOtpVerified] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(
    () => Boolean(location.state?.paymentCompleted),
  );
  const [processing, setProcessing] = useState(false);
  const [domainChecked, setDomainChecked] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [dynadotResult, setDynadotResult] = useState<DynadotSearchResult | null>(
    null,
  );

  const monthlyPrice = Number(formData.plan?.monthly_price ?? 0);
  const isPlanFree = Boolean(formData.plan?.is_free) || monthlyPrice === 0;
  const planPriceLabel = monthlyPrice ? monthlyPrice.toLocaleString("en-IQ") : "0";
  /** End of the 14-day trial — the date the first charge actually lands. */
  const firstChargeDate = new Date(Date.now() + 14 * 864e5).toLocaleDateString("ar", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const goToTemplates = (nav: {
    websiteType: string;
    domain: string;
    url: string;
  }) => {
    resetProvisioning();
    setPendingTemplatesNav(null);
    navigate("/templates", { state: nav });
  };

  const finishAfterProvisioning = async (nav: {
    websiteType: string;
    domain: string;
    url: string;
  }) => {
    setPendingTemplatesNav(nav);
    const result = await waitUntilReady(nav.domain);
    if (result.status === "ready" || result.status === "cancelled") {
      if (result.status === "ready") goToTemplates(nav);
      return;
    }
    // timeout: gate stays open with retry / continue buttons
  };

  // Set default plan if skipToStep is 3 and no plan selected
  useEffect(() => {
    if (
      location.state?.skipToStep === 3 &&
      !formData.plan &&
      plansData.length > 0
    ) {
      const defaultPlan = plansData.find((plan: any) => plan.name === "Go");
      if (defaultPlan) {
        setFormData((prev) => ({ ...prev, plan: defaultPlan }));
      }
    }
  }, [plansData, location.state?.skipToStep]);

  // If user is logged in and on step 2, send OTP automatically
  useEffect(() => {
    if (user && currentStep === 2 && !otpSent) {
      const phone = resolveOtpPhone(user, formData.phone);
      if (phone) {
        sendOtpMutation(
          { phone },
          {
            onSuccess: (data) => {
              setFormData((prev) => ({ ...prev, phone }));
              setOtpSent(true);
            },
            onError: (error) => {
              console.error("Error sending OTP:", error);
              toast.error(
                getApiErrorMessage(
                  error,
                  "تعذر إرسال رمز التحقق. حاول مرة أخرى.",
                ),
              );
            },
          },
        );
      }
    }
  }, [user, currentStep, otpSent, sendOtpMutation, formData.phone]);

  const steps = [
    { number: 1, title: "المعلومات", icon: "👤" },
    { number: 2, title: "التحقق", icon: "🔐" },
    { number: 3, title: "اختيار الخطة", icon: "📦" },
    { number: 4, title: "الدفع", icon: "💳" },
    { number: 5, title: "تخصيص المتجر", icon: "⚙️" },
  ];

  const checkDomainAvailabilityMutation = useCheckStoreDomainAvailability();
  const dynadotSearchMutation = useDynadotSearch();

  // The plans query is deliberately NOT gated on here. It used to short-circuit
  // the whole component to a bare "Loading..." / "Error:" div, which blanked
  // all five steps — including the account and verification steps, which never
  // touch plans — and left the wizard stuck behind an unreachable API. Step 3
  // is the only step that needs plans, and it renders its own loading, empty
  // and failed states.
  // Widened to cover the account step's two <select>s as well as its inputs —
  // they all just write their `name` into formData.
  /**
   * The account step's own checks.
   *
   * `/auth/register` is the first thing that ever looked at these, so a typo in
   * the number came back as a server error — or worse, succeeded and sent the
   * code to someone else's phone. They are validated here, in place, instead.
   */
  const EMAIL_RE = /^\S+@\S+\.\S+$/;
  const accountPhone = user ? resolveOtpPhone(user, "") : null;
  /**
   * What the phone field shows: the digits as typed, so a leading 0 does not
   * disappear under the cursor — unless the value is one this flow normalized
   * (`proceedToOtpStep` stores E.164), which reads back as the local number.
   */
  const localPhone = /^(\+|964)/.test(formData.phone)
    ? toLocalDigits(formData.phone)
    : formData.phone;
  const phoneError = iqPhoneError(formData.phone);
  const nameError =
    formData.name.trim().length >= 2 ? "" : "يرجى إدخال الاسم الكامل (حرفان على الأقل).";
  const emailError = EMAIL_RE.test(formData.email.trim())
    ? ""
    : "يرجى إدخال بريد إلكتروني صالح.";

  const markTouched = (field: string) =>
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

  /** Leaving a field only counts as "touched" once something is in it. */
  const blurHandler = (field: string, value: string) => () => {
    if (value.trim()) markTouched(field);
  };

  /** An error is only shown once the field has been left or submitted. */
  const errorFor = (field: string, message: string): string | undefined =>
    message && touchedFields[field] ? message : undefined;

  const stateFor = (field: string, message: string): FieldState =>
    errorFor(field, message) ? "error" : message ? "default" : "valid";

  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      phone: e.target.value.replace(/\D/g, ""),
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Reset domain check when domain changes
    if (e.target.name === "domain" || e.target.name === "domainType") {
      setDomainChecked(false);
      setDomainAvailable(null);
      setDynadotResult(null);
    }
  };

  const handlePlanSelect = (plan: any) => {
    setFormData({ ...formData, plan });
  };

  const handleCheckDomainAvailability = () => {
    if (!formData.domain) {
      toast.error("الرجاء إدخال الدومين أولاً");
      return;
    }

    setIsCheckingDomain(true);
    setDomainChecked(false);
    setDynadotResult(null);

    if (formData.domainType === "custom") {
      const domain = formData.domain.trim().toLowerCase();
      dynadotSearchMutation.mutate(
        { domain },
        {
          onSuccess: (results) => {
            setIsCheckingDomain(false);
            setDomainChecked(true);

            const result =
              results.find((r) => r.domain === domain) ?? results[0] ?? null;
            setDynadotResult(result);

            if (!result) {
              setDomainAvailable(false);
              toast.error("لم يتم العثور على نتيجة للدومين.");
              return;
            }

            if (!result.supported) {
              setDomainAvailable(false);
              toast.error(
                result.error ||
                  "هذا النوع من الدومينات غير مدعوم للتسجيل (مثل .iq). جرّب دوميناً مثل example.com",
              );
              return;
            }

            if (result.available) {
              setDomainAvailable(true);
              toast.success("الدومين متاح للتسجيل!");
            } else {
              setDomainAvailable(false);
              toast.error(
                result.premium
                  ? "الدومين متاح كـ premium — التسجيل لاحقاً."
                  : "الدومين غير متاح. الرجاء اختيار دومين آخر.",
              );
            }
          },
          onError: (error: any) => {
            setIsCheckingDomain(false);
            setDomainChecked(false);
            console.error("Error searching domain via Dynadot:", error);
            const errorMessage =
              error?.response?.data?.message ||
              error?.message ||
              "حدث خطأ في البحث عن الدومين";
            toast.error(errorMessage);
          },
        },
      );
      return;
    }

    checkDomainAvailabilityMutation.mutate(
      {
        domain: formData.domain,
        domainType: formData.domainType,
      },
      {
        onSuccess: (data: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(true);
          const available =
            data?.isAvailable ?? data?.data?.isAvailable ?? false;
          setDomainAvailable(available);

          if (available) {
            toast.success("الدومين متاح! يمكنك المتابعة.");
          } else {
            toast.error("الدومين غير متاح. الرجاء اختيار دومين آخر.");
          }
        },
        onError: (error: any) => {
          setIsCheckingDomain(false);
          setDomainChecked(false);
          console.error("Error checking domain:", error);
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "حدث خطأ في التحقق من الدومين";
          toast.error(errorMessage);
        },
      },
    );
  };

  const proceedToOtpStep = (phone: string, data?: unknown) => {
    setFormData((prev) => ({
      ...prev,
      phone,
      otp: "",
    }));
    setOtpSent(true);
    setCurrentStep(2);
  };

  const continueWithExistingPhone = (phoneE164: string) => {
    // الرقم مسجّل مسبقاً (حتى لو ما اكتمل verify) → نعيد إرسال OTP عبر login
    loginMutation(
      { phone: phoneE164 },
      {
        onSuccess: (data) => {
          toast.success(
            "هذا الرقم مسجّل مسبقاً. أرسلنا رمز تحقق جديد لإكمال الحساب.",
          );
          proceedToOtpStep(phoneE164, data);
        },
        onError: (loginError) => {
          // لا تستخدم /auth/send-otp هنا — يحتاج JWT والضيف ما عنده توكن بعد
          toast.error(
            getApiErrorMessage(
              loginError,
              "الرقم مسجّل لكن تعذر إرسال رمز التحقق. جرّب تسجيل الدخول من /login.",
            ),
          );
        },
      },
    );
  };

  const handleStep1Submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If user is logged in, just proceed to OTP step
    if (user) {
      // Send OTP for logged in user
      const phone = accountPhone || toIqE164(formData.phone);
      if (phone) {
        sendOtpMutation(
          { phone },
          {
            onSuccess: (data) => {
              proceedToOtpStep(phone, data);
            },
            onError: (error) => {
              toast.error(
                getApiErrorMessage(
                  error,
                  "حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى.",
                ),
              );
              console.error("Error sending OTP:", error);
            },
          },
        );
      } else {
        markTouched("phone");
        toast.error(
          "لم يُعثر على رقم هاتف صالح في حسابك. أدخل رقمك للمتابعة.",
        );
      }
    } else {
      // If user is not logged in, register then send OTP (same flow as login)
      // Every field is checked here rather than at the API: the message lands
      // under the field that is wrong, and no OTP goes to a mistyped number.
      setTouchedFields({ name: true, email: true, phone: true });
      const phoneE164 = toIqE164(formData.phone);

      if (!nameError && !emailError && phoneE164) {
        registerMutation(
          {
            phone: phoneE164,
            name: formData.name,
            email: formData.email,
          },
          {
            onSuccess: (data: { message?: string; codeOnlyOnDev?: number }) => {
              if (data?.message) toast.success(data.message);
              proceedToOtpStep(phoneE164, data);
            },
            onError: (error) => {
              // الرقم صار بالداتابيس قبل ما تكمل verify → نكمّل عبر login/OTP
              if (isPhoneTakenError(error)) {
                continueWithExistingPhone(phoneE164);
                return;
              }
              toast.error(
                getApiErrorMessage(
                  error,
                  "حدث خطأ في التسجيل. الرجاء المحاولة مرة أخرى.",
                ),
              );
              console.error("Error registering:", error);
            },
          },
        );
      } else {
        toast.error("الرجاء تصحيح الحقول المعلَّمة بالأحمر قبل المتابعة.");
      }
    }
  };

  const handleOTPVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.otp && formData.otp.length === CHECKOUT_OTP_LENGTH) {
      const phone = resolveOtpPhone(user, formData.phone);
      if (!phone) {
        toast.error("رقم الهاتف غير صالح. ارجع للخطوة السابقة وأعد المحاولة.");
        return;
      }
      verifyOtpMutation(
        {
          phone,
          code: formData.otp,
        },
        {
          onSuccess: (result: {
            token?: string;
            accessToken?: string;
            username?: string;
          }) => {
            setOtpVerified(true);
            const token = result?.token || result?.accessToken;
            const username = result?.username || formData.name || phone;
            if (token) {
              window.localStorage.setItem("token", token);
              window.localStorage.setItem(
                "user",
                JSON.stringify({ token, username, phone }),
              );
              login(token, username);
            }

            const genUsername = `user_${Math.random().toString(36).substr(2, 9)}`;
            const password = Math.random().toString(36).substr(2, 12);
            const websiteUrl = `https://${formData.domain}.mel.iq/${genUsername}`;

            setFormData({
              ...formData,
              username: genUsername,
              password,
              websiteUrl,
              domain: formData.domain,
            });
            toast.success("تم التحقق بنجاح");
            setCurrentStep(3);
          },
          onError: (error) => {
            toast.error(
              getApiErrorMessage(
                error,
                "رمز OTP غير صحيح. الرجاء المحاولة مرة أخرى.",
              ),
            );
            console.error("Error verifying OTP:", error);
          },
        },
      );
    } else {
      toast.error("الرجاء إدخال رمز OTP صحيح (4 أرقام)");
    }
  };

  const handlePlanSelection = () => {
    // Check if plan is selected
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل المتابعة");
      return;
    }
    // Proceed to payment step
    setCurrentStep(4);
  };

  const handlePayment = () => {
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل الدفع");
      setCurrentStep(3);
      return;
    }

    const planId =
      formData.plan?.uuid || formData.plan?.planId || formData.plan?.id;

    // Free plans skip the payment gateway
    if (formData.plan?.is_free || Number(formData.plan?.monthly_price) === 0) {
      setPaymentCompleted(true);
      setCurrentStep(5);
      return;
    }

    const selectedMethod = PAYMENT_METHODS.find(
      (method) => method.id === formData.paymentMethod,
    );
    if (!selectedMethod?.available || !selectedMethod.provider) {
      toast.error("الرجاء اختيار طريقة دفع");
      return;
    }

    setProcessing(true);
    sessionStorage.setItem(
      CHECKOUT_DRAFT_KEY,
      JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan: formData.plan,
        storeName: formData.storeName,
        domain: formData.domain,
        domainType: formData.domainType,
        websiteType: formData.websiteType,
      }),
    );

    initPaymentMutation(
      {
        type: "INITIAL_SUBSCRIPTION",
        planId,
        provider: selectedMethod.provider,
        billingPeriod: "MONTHLY",
        returnBaseUrl: `${window.location.origin}/checkout/payment-return`,
      },
      {
        onSuccess: (data) => {
          const redirectUrl = data?.redirectUrl;
          const paymentId = data?.id;
          if (!redirectUrl) {
            setProcessing(false);
            toast.error("لم يتم استلام رابط الدفع");
            return;
          }
          if (paymentId) {
            sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
          }
          window.location.href = redirectUrl;
        },
        onError: (error: any) => {
          setProcessing(false);
          toast.error(
            error?.response?.data?.message ||
              "تعذر بدء الدفع. حاول مرة أخرى.",
          );
        },
      },
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL for display
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          logo: reader.result as string,
          logoFile: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWebsiteCustomization = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data = new FormData();

    // Check if plan is selected - required before creating store
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل إنشاء المتجر");
      setCurrentStep(3);
      return;
    }

    const isFree =
      formData.plan?.is_free || Number(formData.plan?.monthly_price) === 0;
    if (!isFree && !formData.paymentId && !paymentCompleted) {
      toast.error("يجب إكمال الدفع قبل إنشاء المتجر");
      setCurrentStep(4);
      return;
    }

    // Check if domain is available before proceeding
    if (!domainChecked) {
      toast.error("الرجاء التحقق من توفر الدومين أولاً");
      return;
    }

    if (domainAvailable === false || domainAvailable === null) {
      toast.error("الدومين غير متاح. الرجاء اختيار دومين آخر والتحقق منه.");
      return;
    }

    if (formData.logo) {
      data.append("logo", formData.logo);
    }

    if (formData.websiteType && formData.domain) {
      const platformSlug = extractPlatformSlug(
        formData.domain,
        formData.domainType === "custom" ? "custom" : "subdomain",
      );
      const customDomain =
        formData.domainType === "custom"
          ? formData.domain.trim().toLowerCase()
          : null;

      const finalUrl =
        formData.domainType === "subdomain"
          ? `https://${platformSlug}.mel.iq`
          : `https://${customDomain}`;

      const updatedFormData = {
        ...formData,
        websiteUrl: finalUrl,
      };

      setFormData(updatedFormData);

      const finishStoreSetup = () => {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        void finishAfterProvisioning({
          websiteType: formData.websiteType,
          domain: platformSlug,
          url: platformSlug,
        });
      };

      // Save store to user account if logged in
      if (user) {
        const storeFormData = new FormData();
        storeFormData.append(
          "name",
          formData.storeName || platformSlug || formData.domain,
        );
        storeFormData.append(
          "type",
          formData.websiteType === "store" ? "ECOMMERCE" : "RESTAURANT",
        );
        storeFormData.append("domain", platformSlug);
        if (formData.logoFile) {
          storeFormData.append("logo", formData.logoFile);
        }
        storeFormData.append("createdAt", new Date().toISOString());
        storeFormData.append(
          "planId",
          formData.plan.uuid || formData.plan.planId || formData.plan.id,
        );
        if (formData.paymentId) {
          storeFormData.append("paymentId", formData.paymentId);
        }

        addStoreMutation(storeFormData, {
          onSuccess: () => {
            if (customDomain) {
              setCustomDomainMutation(
                { domain: customDomain },
                {
                  onSuccess: finishStoreSetup,
                  onError: (error) => {
                    console.error("Error setting custom domain:", error);
                    toast.error(
                      "تم إنشاء المتجر لكن فشل ربط الدومين المخصص. يمكنك ربطه من الإدارة.",
                    );
                    finishStoreSetup();
                  },
                },
              );
              return;
            }
            finishStoreSetup();
          },
          onError: (error) => {
            console.error("Error creating store:", error);
            toast.error("حدث خطأ في إنشاء المتجر. الرجاء المحاولة مرة أخرى.");
          },
        });
      } else {
        void finishAfterProvisioning({
          websiteType: formData.websiteType,
          domain: platformSlug,
          url: platformSlug,
        });
      }
    }
  };

  const resendOTP = () => {
    const phone = resolveOtpPhone(user, formData.phone);
    if (!phone) {
      toast.error("رقم الهاتف غير صالح لإعادة الإرسال");
      return;
    }

    // /auth/send-otp يحتاج JWT — قبل اكتمال verify نستخدم /auth/login
    const hasToken =
      typeof window !== "undefined" &&
      Boolean(
        window.localStorage.getItem("token") &&
          window.localStorage.getItem("token") !== "undefined",
      );

    const onResendSuccess = (data: unknown) => {
      setFormData((prev) => ({ ...prev, otp: "" }));
      toast.success("تم إرسال رمز OTP جديد إلى رقمك");
    };

    const onResendError = (error: unknown) => {
      toast.error(
        getApiErrorMessage(
          error,
          "حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى.",
        ),
      );
      console.error("Error resending OTP:", error);
    };

    if (hasToken) {
      sendOtpMutation({ phone }, { onSuccess: onResendSuccess, onError: onResendError });
    } else {
      loginMutation({ phone }, { onSuccess: onResendSuccess, onError: onResendError });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink py-14 font-setar text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(149, 158, 254, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(149, 158, 254, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "109px 109px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[383px] end-[-120px] size-[759px] rounded-full bg-[#1b5c8f]/25 blur-[180px]"
      />

      <div className="relative mx-auto flex max-w-[1064px] flex-col gap-5 px-4 sm:px-6">
        {!location.state?.skipToStep && (
          <CheckoutStepper steps={steps} currentStep={currentStep} />
        )}

        {/* Step Content */}
        <div className="rounded-3xl bg-ink-raised p-6 text-right sm:p-9">
          {/* Step 1: User Info - Only for non-logged in users */}
          {currentStep === 1 && !location.state?.skipToStep && (
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[30px] font-extrabold leading-[45px] text-frost">
                  {user ? "المتابعة إلى التحقق" : "أنشئ حسابك"}
                </h2>
                <p className="text-sm leading-[21px] text-muted">
                  {user
                    ? "سنرسل رمز تحقق إلى رقمك المسجل للمتابعة"
                    : "تجربة مجانية 14 يوماً — بدون بطاقة ائتمانية، وتقدر تلغي في أي وقت"}
                </p>
              </div>

              {user ? (
                /* Signed in, so the only thing this step still needs is the
                   number the code goes to — shown rather than assumed, and
                   typed in when the account carries no usable one. */
                <div className="flex flex-col gap-[22px]">
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <Field
                      label="رقم الهاتف"
                      htmlFor="account-phone"
                      hint={
                        accountPhone ? "سنرسل رمز التحقق إلى هذا الرقم" : undefined
                      }
                      error={accountPhone ? undefined : errorFor("phone", phoneError)}
                    >
                      {accountPhone ? (
                        <div
                          id="account-phone"
                          dir="ltr"
                          className="flex h-[52px] w-full items-center rounded-[14px] border-[1.5px] border-mint bg-field px-4 text-sm text-frost"
                        >
                          {formatIqPhone(accountPhone)}
                        </div>
                      ) : (
                        <PhoneInput
                          id="account-phone"
                          name="phone"
                          value={localPhone}
                          onChange={handlePhoneChange}
                          onBlur={blurHandler("phone", formData.phone)}
                          autoComplete="tel-national"
                          placeholder="7XX XXX XXXX"
                          state={stateFor("phone", phoneError)}
                        />
                      )}
                    </Field>
                    <span className="hidden flex-1 sm:block" />
                  </div>

                  <StepFooter
                    submitLabel="المتابعة إلى التحقق"
                    busy={isSendingOtp}
                    onSubmit={() => {
                      const phone = accountPhone || toIqE164(formData.phone);
                      if (!phone) {
                        markTouched("phone");
                        toast.error(
                          "لم يُعثر على رقم هاتف صالح في حسابك. أدخل رقمك للمتابعة.",
                        );
                        return;
                      }
                      sendOtpMutation(
                        { phone },
                        {
                          onSuccess: () => {
                            setFormData((prev) => ({ ...prev, phone, otp: "" }));
                            setOtpSent(true);
                            setCurrentStep(2);
                          },
                          onError: (error) => {
                            toast.error(
                              getApiErrorMessage(
                                error,
                                "حدث خطأ في إرسال رمز OTP. الرجاء المحاولة مرة أخرى.",
                              ),
                            );
                          },
                        },
                      );
                    }}
                  />
                </div>
              ) : (
                <form
                  onSubmit={handleStep1Submit}
                  noValidate
                  className="flex flex-col gap-[22px]"
                >
                  {/* Two per row on desktop; RTL puts the first field on the
                      right, which is the order the frame reads in. */}
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <Field
                      label="الاسم الكامل"
                      htmlFor="name"
                      error={errorFor("name", nameError)}
                    >
                      <TextInput
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        onBlur={blurHandler("name", formData.name)}
                        required
                        autoComplete="name"
                        placeholder="محمد علي يوسف"
                        state={stateFor("name", nameError)}
                      />
                    </Field>
                    <Field
                      label="البريد الإلكتروني"
                      htmlFor="email"
                      error={errorFor("email", emailError)}
                    >
                      <TextInput
                        id="email"
                        name="email"
                        type="email"
                        dir="ltr"
                        value={formData.email}
                        onChange={handleInputChange}
                        onBlur={blurHandler("email", formData.email)}
                        required
                        autoComplete="email"
                        placeholder="you@store.iq"
                        state={stateFor("email", emailError)}
                      />
                    </Field>
                  </div>

                  <div className="flex flex-col gap-5 sm:flex-row">
                    <Field
                      label="رقم الهاتف"
                      htmlFor="phone"
                      hint="سنرسل رمز التحقق إلى هذا الرقم"
                      error={errorFor("phone", phoneError)}
                    >
                      <PhoneInput
                        id="phone"
                        name="phone"
                        value={localPhone}
                        onChange={handlePhoneChange}
                        onBlur={blurHandler("phone", formData.phone)}
                        required
                        autoComplete="tel-national"
                        placeholder="7XX XXX XXXX"
                        state={stateFor("phone", phoneError)}
                      />
                    </Field>
                    <Field label="اسم المتجر" htmlFor="storeName">
                      <TextInput
                        id="storeName"
                        name="storeName"
                        value={formData.storeName}
                        onChange={handleInputChange}
                        placeholder="مثال: متجر البركة"
                      />
                    </Field>
                  </div>

                  {/* These two are in the frame but the register endpoint takes
                      only name / email / phone, so they are collected and not
                      yet persisted — hence optional rather than required. */}
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <Field label="نوع النشاط التجاري" htmlFor="businessType">
                      <SelectInput
                        id="businessType"
                        name="businessType"
                        value={formData.businessType}
                        onChange={handleInputChange}
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
                        value={formData.governorate}
                        onChange={handleInputChange}
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

                  <CheckBox checked={acceptedTerms} onChange={setAcceptedTerms}>
                    أوافق على{" "}
                    <span className="font-bold text-brand-primary">الشروط والأحكام</span>{" "}
                    و <span className="font-bold text-brand-primary">سياسة الخصوصية</span>
                  </CheckBox>

                  <StepFooter
                    submitLabel="متابعة"
                    busy={isRegistering || isLoggingIn || isSendingOtp}
                    disabled={!acceptedTerms}
                  >
                    <p className="text-[13px] leading-5 text-muted">
                      لديك حساب؟{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="font-bold text-brand-primary hover:underline"
                      >
                        تسجيل الدخول
                      </button>
                    </p>
                  </StepFooter>
                </form>
              )}
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center gap-[22px] py-6 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-[30px] font-extrabold leading-[45px] text-frost">
                  تحقق من رقمك
                </h2>
                <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm leading-[21px] text-muted">
                  أرسلنا رمزاً من {CHECKOUT_OTP_LENGTH} أرقام إلى
                  <span dir="ltr" className="font-semibold text-frost">
                    {formatIqPhone(formData.phone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[13px] font-bold text-brand-primary hover:underline"
                  >
                    تعديل
                  </button>
                </p>
              </div>

              <form
                onSubmit={handleOTPVerify}
                className="flex w-full max-w-[444px] flex-col items-center gap-[22px]"
              >
                <OtpInputs
                  value={formData.otp}
                  length={CHECKOUT_OTP_LENGTH}
                  disabled={isVerifyingOtp}
                  autoFocus
                  status={otpVerified ? "success" : "default"}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, otp: value }))
                  }
                />

                <div className="flex w-full items-center justify-between text-[13px] leading-5">
                  {/* The frame offers a voice fallback; there is no voice
                      endpoint, so it keeps the frame's disabled tone. */}
                  <span className="font-bold text-dim" title="غير متاح حالياً">
                    اتصال صوتي
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    لم يصلك الرمز؟
                    <button
                      type="button"
                      onClick={resendOTP}
                      disabled={isSendingOtp}
                      className="font-bold text-brand-primary transition-opacity hover:opacity-80 disabled:opacity-40"
                    >
                      {isSendingOtp ? "جاري الإرسال…" : "إعادة الإرسال"}
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
                    busy={isVerifyingOtp}
                    disabled={formData.otp.length !== CHECKOUT_OTP_LENGTH}
                    onBack={() => setCurrentStep(1)}
                  />
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1.5">
                {/* The frame heads this step "طريقة الدفع", which is step 4's
                    title left in by mistake — this is the plan picker. */}
                <h2 className="text-[30px] font-extrabold leading-[45px] text-frost">
                  اختر خطتك
                </h2>
                <p className="text-sm leading-[21px] text-muted">
                  لن يُخصم أي مبلغ اليوم — تبدأ الفوترة بعد انتهاء التجربة المجانية
                </p>
              </div>

              {plans.isLoading ? (
                <p className="py-10 text-center text-sm text-muted">جاري تحميل الباقات…</p>
              ) : plansData.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <p className="text-sm text-muted">
                    {plans.isError
                      ? "تعذر تحميل الباقات."
                      : "لا توجد باقات متاحة حالياً."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void plans.refetch()}
                    disabled={plans.isFetching}
                    className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/[0.04] px-6 text-[13px] font-bold text-frost transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    {plans.isFetching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "إعادة المحاولة"
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {plansData.map((plan: any) => {
                    const selected = formData.plan?.id === plan.id;
                    const price = plan.monthly_price
                      ? Number(plan.monthly_price).toLocaleString("en-IQ")
                      : null;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handlePlanSelect(plan)}
                        aria-pressed={selected}
                        className={
                          selected
                            ? // A gradient 1px frame, as on the landing page's
                              // featured tier.
                              "relative rounded-3xl bg-gradient-to-b from-[#463bbf] via-[#9c96e3] to-[#463bbf] p-px text-right"
                            : "relative rounded-3xl border border-hairline text-right transition-colors hover:border-brand-secondary/30"
                        }
                      >
                        <div
                          className={`flex h-full flex-col gap-6 rounded-3xl px-7 pb-8 pt-7 ${
                            selected ? "bg-[#06051e]" : "bg-ink-panel"
                          }`}
                        >
                          <div className="flex flex-col gap-4">
                            <h3 className="text-3xl font-bold text-frost">
                              {plan.name || ""}
                            </h3>
                            <p className="text-sm leading-6 text-[#cac9d1]">
                              {plan.description || ""}
                            </p>
                            <span className="h-px w-full bg-gradient-to-l from-[#0c0f26] via-[#3f48d9] to-[#0c0f26]" />
                          </div>

                          <ul className="flex flex-col gap-4">
                            {planFeatures(plan).map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-3">
                                  <span className="flex-1 text-[15px] leading-snug text-frost">
                                    {feature}
                                  </span>
                                  <span
                                    aria-hidden
                                    className="flex size-[29px] shrink-0 items-center justify-center rounded-[10px] bg-[#131331]"
                                  >
                                    <span className="size-[7px] rounded-full bg-brand-primary" />
                                  </span>
                                </li>
                            ))}
                          </ul>

                          <p className="mt-auto flex items-end justify-end gap-1 pt-2">
                            {price ? (
                              <>
                                <span className="text-4xl font-medium tracking-tight text-frost">
                                  {price} د.ع
                                </span>
                                <span className="text-base text-[#73799b]">/شهرياً</span>
                              </>
                            ) : (
                              <span className="text-4xl font-medium text-frost">اتصل بنا</span>
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <StepFooter
                submitLabel="متابعة إلى الدفع"
                disabled={!formData.plan}
                onSubmit={handlePlanSelection}
                onBack={() => setCurrentStep(2)}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[30px] font-extrabold leading-[45px] text-frost">
                  طريقة الدفع
                </h2>
                <p className="text-sm leading-[21px] text-muted">
                  لن يُخصم أي مبلغ اليوم — تبدأ الفوترة بعد انتهاء التجربة المجانية
                </p>
              </div>

              {processing ? (
                <div className="flex flex-col items-center gap-4 py-16">
                  <Loader2 size={40} className="animate-spin text-brand-primary" />
                  <p className="text-sm text-muted">جاري معالجة الدفع…</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-start">
                  <div className="flex flex-1 flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                      {PAYMENT_METHODS.map((method) => {
                        const selected = formData.paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            disabled={!method.available}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                paymentMethod: method.id,
                              }))
                            }
                            aria-pressed={selected}
                            className={`flex flex-col gap-3 rounded-[18px] border p-4 text-right transition-colors ${
                              selected
                                ? "border-brand-primary bg-brand-primary/5"
                                : "border-field-line bg-field hover:border-line"
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <span className="flex items-center justify-between">
                              <span
                                aria-hidden
                                className={`flex size-[18px] items-center justify-center rounded-full border ${
                                  selected ? "border-brand-indigo" : "border-line"
                                }`}
                              >
                                {selected && (
                                  <span className="size-2.5 rounded-full bg-brand-indigo" />
                                )}
                              </span>
                              <span
                                aria-hidden
                                className={`flex size-7 items-center justify-center rounded-md text-xs font-bold ${method.tint}`}
                              >
                                {method.mark}
                              </span>
                            </span>
                            <span className="flex flex-col">
                              <span className="text-sm font-bold text-frost">
                                {method.title}
                              </span>
                              <span className="text-[11px] text-muted">
                                {method.available ? method.detail : "قريباً"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-xs leading-5 text-dim">
                      {formData.paymentMethod === "qicard"
                        ? "ستُحوَّل إلى صفحة كي كارد الآمنة لإتمام الدفع، ثم تعود إلى هنا تلقائياً."
                        : formData.paymentMethod === "zaincash"
                          ? "ستُحوَّل إلى صفحة زين كاش الآمنة لإتمام الدفع، ثم تعود إلى هنا تلقائياً."
                          : "ستُحوَّل إلى صفحة الدفع الآمنة لإتمام العملية، ثم تعود إلى هنا تلقائياً."}
                    </p>
                  </div>

                  {/* Subscription summary — every figure here comes from the
                      selected plan, so it stays true when plans change. */}
                  <aside className="flex w-full flex-col gap-4 rounded-[18px] bg-field p-5 lg:w-[320px]">
                    <h3 className="text-sm font-bold text-frost">ملخص الاشتراك</h3>

                    <div className="flex items-center justify-between rounded-xl bg-brand-primary/8 p-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-bold text-brand-primary hover:underline"
                      >
                        تغيير
                      </button>
                      <span className="flex flex-col text-right">
                        <span className="text-sm font-bold text-frost">
                          {formData.plan?.name || "لم تُختر خطة"}
                        </span>
                        <span className="text-[11px] text-muted">
                          فوترة شهرية · تجديد تلقائي
                        </span>
                      </span>
                    </div>

                    <dl className="flex flex-col gap-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <dd className="text-frost">{planPriceLabel} د.ع</dd>
                        <dt className="text-muted">الاشتراك / شهر</dt>
                      </div>
                      <div className="flex items-center justify-between">
                        <dd className="text-mint">-{planPriceLabel} د.ع</dd>
                        <dt className="text-muted">تجربة مجانية 14 يوماً</dt>
                      </div>
                      <div className="flex items-center justify-between">
                        <dd className="text-frost">0 د.ع</dd>
                        <dt className="text-muted">الضريبة</dt>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/8 pt-3">
                        <dd className="text-xl font-bold text-frost">0 د.ع</dd>
                        <dt className="text-sm font-bold text-frost">المستحق اليوم</dt>
                      </div>
                    </dl>

                    <p className="rounded-xl border border-mint/25 bg-mint/8 p-3 text-[11px] leading-5 text-muted">
                      <span className="block font-bold text-mint">
                        أول دفعة: {firstChargeDate}
                      </span>
                      سنذكّرك قبل 3 أيام من انتهاء التجربة، ويمكنك الإلغاء بدون رسوم.
                    </p>
                  </aside>
                </div>
              )}

              <StepFooter
                submitLabel={
                  paymentCompleted
                    ? "تم الدفع بنجاح"
                    : isPlanFree
                      ? "متابعة مجاناً"
                      : "متابعة"
                }
                busy={isInitiatingPayment || processing}
                disabled={!formData.plan}
                onSubmit={handlePayment}
                onBack={() => setCurrentStep(3)}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[30px] font-extrabold leading-[45px] text-frost">
                  خصّص متجرك
                </h2>
                <p className="text-sm leading-[21px] text-muted">
                  آخر خطوة — يمكنك تغيير كل هذا لاحقاً من الإعدادات
                </p>
              </div>

              <form
                onSubmit={handleWebsiteCustomization}
                className="flex flex-col gap-[22px]"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Field label="اسم المتجر" htmlFor="storeName5">
                    <TextInput
                      id="storeName5"
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleInputChange}
                      required
                      placeholder="متجر البركة للأطعمة"
                    />
                  </Field>

                  <Field
                    label="رابط المتجر"
                    htmlFor="domain"
                    error={
                      domainChecked && domainAvailable === false
                        ? "هذا الرابط محجوز، جرّب رابطاً آخر"
                        : undefined
                    }
                  >
                    {/* The `.mel.iq` suffix is fixed chrome, not typed — the
                        field holds only the subdomain the merchant picks. */}
                    <div
                      className={`flex h-[52px] w-full items-center gap-2.5 rounded-[14px] bg-field px-4 text-sm transition-colors ${
                        domainChecked && domainAvailable
                          ? "border-[1.5px] border-mint"
                          : domainChecked && domainAvailable === false
                            ? "border-[1.5px] border-[#ff5252]"
                            : "border border-field-line focus-within:border-[1.5px] focus-within:border-brand-primary"
                      }`}
                    >
                      {domainChecked && domainAvailable && (
                        <span className="shrink-0 text-xs font-bold text-mint">✓ متاح</span>
                      )}
                      <input
                        id="domain"
                        name="domain"
                        dir="ltr"
                        value={formData.domain}
                        onChange={handleInputChange}
                        required
                        placeholder="albaraka"
                        className="min-w-0 flex-1 bg-transparent text-left text-frost placeholder:text-dim focus:outline-none"
                      />
                      {formData.domainType === "subdomain" && (
                        <span dir="ltr" className="shrink-0 font-semibold text-muted">
                          .mel.iq
                        </span>
                      )}
                    </div>
                  </Field>
                </div>

                {/* Not in the frame, but the flow and the Dynadot integration
                    both still support bringing your own domain — dropping the
                    control would quietly remove a paid feature. */}
                <div className="flex items-center gap-2 self-end rounded-[14px] bg-field p-1">
                  {[
                    { id: "subdomain", label: "نطاق فرعي مجاني" },
                    { id: "custom", label: "نطاق خاص بك" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        handleInputChange({
                          target: { name: "domainType", value: option.id },
                        } as React.ChangeEvent<HTMLInputElement>)
                      }
                      className={`rounded-[10px] px-4 py-2 text-[13px] font-bold transition-colors ${
                        formData.domainType === option.id
                          ? "bg-gradient-to-l from-brand-violet to-brand-indigo text-white"
                          : "text-muted hover:text-frost"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 text-right">
                  <span className="text-[13px] font-semibold leading-5 text-muted">
                    شعار المتجر
                  </span>
                  <div className="flex items-center gap-4 rounded-[18px] border border-dashed border-field-line bg-field p-4">
                    <label
                      htmlFor="logo-upload"
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold text-frost transition-colors hover:bg-white/[0.08]"
                    >
                      <Upload size={16} />
                      رفع
                    </label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/svg+xml,image/webp,image/jpeg"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <span className="flex flex-1 flex-col text-right">
                      <span className="text-[13px] text-frost">
                        اسحب شعارك هنا أو اضغط للرفع
                      </span>
                      <span className="text-[11px] text-dim">
                        PNG / SVG / WebP · حتى 2MB · يُفضّل مربع
                      </span>
                    </span>
                    {formData.logo && (
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        <img
                          src={formData.logo as string}
                          alt="شعار المتجر"
                          className="size-full object-contain p-1"
                        />
                        <button
                          type="button"
                          aria-label="إزالة الشعار"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, logo: null, logoFile: null }))
                          }
                          className="absolute end-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white/80 hover:text-white"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleCheckDomainAvailability}
                    disabled={!formData.domain || isCheckingDomain}
                    className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[14px] border border-white/12 bg-white/[0.04] text-[13px] font-bold text-frost transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    {isCheckingDomain ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "التحقق من توفر الرابط"
                    )}
                  </button>

                  {formData.domainType === "custom" && dynadotResult && (
                    <div
                      className={`rounded-[14px] border p-3 text-[13px] ${
                        dynadotResult.available && dynadotResult.supported
                          ? "border-mint/30 bg-mint/8 text-mint"
                          : "border-amber/30 bg-amber/8 text-amber"
                      }`}
                    >
                      <p dir="ltr" className="font-semibold">
                        {dynadotResult.domain}
                      </p>
                      {!dynadotResult.supported && (
                        <p className="mt-1">
                          {dynadotResult.error ||
                            "نوع الدومين غير مدعوم للتسجيل عبر Dynadot"}
                        </p>
                      )}
                      {dynadotResult.supported && !dynadotResult.available && (
                        <p className="mt-1">
                          {dynadotResult.premium
                            ? "دومين premium — التسجيل متاح لاحقاً"
                            : "الدومين مسجّل مسبقاً وغير متاح"}
                        </p>
                      )}
                      {dynadotResult.available && (
                        <DomainPriceBreakdown result={dynadotResult} />
                      )}
                    </div>
                  )}
                </div>

                <StepFooter
                  submitLabel="متابعة"
                  disabled={!domainChecked || domainAvailable === false}
                  onBack={() => setCurrentStep(4)}
                />
              </form>
            </div>
          )}
        </div>
      </div>

      <StoreProvisioningGate
        open={Boolean(pendingTemplatesNav)}
        domain={pendingTemplatesNav?.domain || formData.domain}
        lastStatus={provisioningStatus}
        timedOut={provisioningTimedOut}
        error={provisioningError}
        onRetry={() => {
          if (!pendingTemplatesNav) return;
          void finishAfterProvisioning(pendingTemplatesNav);
        }}
        onContinueAnyway={() => {
          if (pendingTemplatesNav) goToTemplates(pendingTemplatesNav);
        }}
      />
    </div>
  );
}

export default Checkout;
