/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
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
  useFetchStores,
} from "@/api/wrappers/store.wrappers";
import { useDynadotSearch } from "@/api/wrappers/dynadot.wrappers";
import DomainPriceBreakdown from "@/components/DomainPriceBreakdown";
import type { DynadotSearchResult } from "@/api/endpoints/dynadot.endpoints";
import { useSetCustomDomain } from "@/api/wrappers/domain.wrappers";
import { extractPlatformSlug } from "@/hooks/useDomainCheck";
import { useFetchAllPlans } from "@/api/wrappers/plan.wrappers";
import {
  useBillingProviders,
  useInitPlatformPayment,
  useSubscriptionQuote,
} from "@/api/wrappers/platform-payment.wrapper";
import {
  quoteDue,
  quoteExplanation,
  quoteNextCharge,
} from "@/utils/subscription-quote";
import { CHECKOUT_DRAFT_KEY, LAST_PAYMENT_ID_KEY } from "@/pages/CheckoutPaymentReturn";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  isPhoneTakenError,
} from "@/utils/otp";
import { normalizeApiResponse } from "@/utils/storeUrls";
import {
  FOCUS_PROMPT_STATE,
  hasPendingGeneration,
  seedPromptDraft,
} from "@/utils/promptHandoff";
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
import CheckoutShell from "@/components/checkout/CheckoutShell";
import CheckoutBrandRail from "@/components/checkout/CheckoutBrandRail";
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
 * The payment tiles the frame draws — how each one *looks*, not whether it
 * may be used.
 *
 * QiCard and ZainCash share the same `/platform-payments/init` flow; the only
 * difference is `provider`. Card and FIB have no integration at all and are
 * permanently «قريباً».
 *
 * The two live ones used to carry `available: true`, typed in here, which
 * made this file a second answer to a question the server already had: an
 * operator can switch a gateway off for platform billing, and this could not
 * see it. The tile stayed, the buyer chose it, the plan was priced, a payment
 * row was created, and `chargeWithGateway` refused them at the end.
 * `available` is now decided per render from the server's own list.
 */
const PAYMENT_METHODS = [
  { id: "card", title: "بطاقة بنكية", detail: "Visa · Mastercard", mark: "VC", tint: "bg-brand-primary/15 text-brand-primary", provider: null },
  { id: "zaincash", title: "زين كاش", detail: "ZainCash", mark: "Z", tint: "bg-[#ff5252]/15 text-[#ff5252]", provider: "ZAIN_CASH" as const },
  { id: "qicard", title: "كي كارد", detail: "Qi Card", mark: "Q", tint: "bg-amber/15 text-amber", provider: "QI_CARD" as const },
  { id: "fib", title: "FIB", detail: "المصرف الأول", mark: "F", tint: "bg-brand-secondary/15 text-brand-secondary", provider: null },
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
  const [searchParams] = useSearchParams();
  const { user, login, loading: authLoading } = useAuth();
  /**
   * Set only by the dashboard («create store») and the payment return, which
   * still walk the manual plan → payment → store steps. A plain visit to
   * /checkout is signup: account, code, then the AI prompt.
   */
  const manualStoreSetup = Boolean(location.state?.skipToStep);

  // Fetch plans first
  const plans = useFetchAllPlans();
  const plansData = plans.data
    ? Array.isArray(plans.data)
      ? plans.data
      : plans.data?.data || []
    : [];

  /**
   * One store per merchant. If they already have one, checkout is not the
   * place to mint a second — send them back to the dashboard instead.
   */
  const { data: storesData, isLoading: storesLoading } = useFetchStores(
    undefined,
    Boolean(user),
  );
  const existingStoreCount = useMemo(
    () => normalizeApiResponse(storesData).length,
    [storesData],
  );

  useEffect(() => {
    if (!user || storesLoading) return;
    // Sent here by «أنشئ متجري»: back to the prompt, where the run they asked
    // for resumes (into their store, if this number already had one).
    if (!manualStoreSetup && hasPendingGeneration()) {
      navigate("/", { replace: true, state: FOCUS_PROMPT_STATE });
      return;
    }
    if (existingStoreCount < 1) {
      // Already signed in with no store: there is no account to create, and
      // the store comes from the prompt.
      if (!manualStoreSetup) {
        navigate("/", { replace: true, state: FOCUS_PROMPT_STATE });
      }
      return;
    }
    if (manualStoreSetup) {
      toast.info("لديك متجر واحد مسبقاً. كل حساب يحق له متجر واحد فقط.");
    }
    navigate("/dashboard", { replace: true });
  }, [user, storesLoading, existingStoreCount, navigate, manualStoreSetup]);

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
  const { data: billingProviders } = useBillingProviders();

  /**
   * The tiles, with availability decided by the server rather than by hand.
   *
   * A gateway-backed tile is available when the platform is actually
   * accepting that gateway for billing; `card` and `fib` never are, because
   * nothing implements them.
   *
   * Until the list arrives — and if it never does — the two gateways stay
   * available. A buyer with a card in hand being told the platform accepts
   * nothing is a lost sale and nothing they can fix, while an offered
   * gateway that turns out to be withdrawn is one readable refusal and
   * another tile to pick. The failure directions are not symmetric, so this
   * takes the recoverable one.
   */
  const paymentMethods = useMemo(
    () =>
      PAYMENT_METHODS.map((method) => ({
        ...method,
        available:
          method.provider !== null &&
          (!billingProviders ||
            billingProviders.some(
              (option) => option.provider === method.provider,
            )),
      })),
    [billingProviders],
  );
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
      paymentMethod: "",
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  /**
   * Account-step fields the merchant has already left (or tried to submit), so
   * a half-typed number isn't scolded on its first keystroke.
   */
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  /**
   * Set when register fails because the phone already belongs to an account —
   * shown under the phone field so the merchant sees it, not only a toast.
   */
  const [phoneTakenError, setPhoneTakenError] = useState("");
  /** The code went to an account that already existed (see below). */
  const [existingAccount, setExistingAccount] = useState(false);
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

  /**
   * What this buyer actually owes, and when the first real charge lands.
   *
   * Both were invented here. The summary hardcoded a «تجربة مجانية 14 يوماً»
   * line, a 0 د.ع total and a first-charge date 14 days out — on a promo that is
   * one free *month* and then six at half price, and on an offer that is once
   * per owner. So the dates were wrong by a fortnight, the half-price ladder was
   * disclosed nowhere at all, and a buyer who had already spent their free month
   * on an earlier store was shown a total of zero and then charged.
   *
   * Only asked once the buyer has a token and a plan — the quote is
   * subscription state, not catalogue data.
   */
  const planIdForQuote =
    formData.plan?.uuid || formData.plan?.planId || formData.plan?.id || null;
  const { data: quote, isLoading: quoteLoading } = useSubscriptionQuote(
    user && planIdForQuote && !isPlanFree
      ? {
          type: "INITIAL_SUBSCRIPTION",
          planId: String(planIdForQuote),
          billingPeriod: "MONTHLY",
        }
      : null,
  );
  const dueToday = quoteDue(quote);
  /**
   * What the buyer owes now, as a number.
   *
   * Defaults to "something is owed" until the quote lands, so the form asks for a
   * payment method rather than letting somebody through and needing one later —
   * the same direction the manage screen takes.
   */
  const dueNow = quote === undefined ? Infinity : quote.amount;
  const promoExplanation = quoteExplanation(quote);
  const firstChargeDate = quoteNextCharge(quote);
  /**
   * Nothing to collect at signup: a free plan, or the intro month covers the
   * first period. The server grants that month itself when the store is created
   * without a `paymentId`, so no payment step and no card.
   */
  const noPaymentNeeded = isPlanFree || dueNow === 0;

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

  // Preselect from ?planId= (landing pricing CTA) or from skipToStep defaults.
  useEffect(() => {
    if (formData.plan || plansData.length === 0) return;

    const fromQuery = searchParams.get("planId");
    if (fromQuery) {
      const match = plansData.find(
        (plan: any) =>
          String(plan.id) === fromQuery ||
          String(plan.uuid || "") === fromQuery ||
          String(plan.code || "").toUpperCase() === fromQuery.toUpperCase(),
      );
      if (match) {
        setFormData((prev) => ({ ...prev, plan: match }));
        return;
      }
    }

    // Basic, the plan on sale (its code is still PLUS), whichever way the
    // merchant arrived: signup, the dashboard, or a link without a plan.
    const defaultPlan = plansData.find(
      (plan: any) => String(plan.code || "").toUpperCase() === "PLUS",
    );
    if (defaultPlan) {
      setFormData((prev) => ({ ...prev, plan: defaultPlan }));
    }
  }, [plansData, searchParams, formData.plan]);

  /**
   * Arriving from the OTP step (or straight into step 3 from the dashboard)
   * goes past the plan and payment steps on its own once the quote says
   * nothing is due. Only that arrival, so "back" from a later step can still
   * show the plan.
   */
  const [autoAdvance, setAutoAdvance] = useState(
    location.state?.skipToStep === 3,
  );
  useEffect(() => {
    if (!autoAdvance || currentStep !== 3) return;
    if (!formData.plan?.id || !user) return;
    if (!isPlanFree && quote === undefined) return;
    setAutoAdvance(false);
    if (noPaymentNeeded) {
      setPaymentCompleted(true);
      setCurrentStep(5);
    } else {
      setCurrentStep(4);
    }
  }, [
    autoAdvance,
    currentStep,
    formData.plan,
    user,
    isPlanFree,
    quote,
    noPaymentNeeded,
  ]);

  /** Basic is picked for the merchant, so the plan step is not one of theirs. */
  const planPicked = Boolean(formData.plan?.id);
  const allSteps = [
    { number: 1, title: "المعلومات" },
    { number: 2, title: "التحقق" },
    { number: 3, title: "اختيار الخطة" },
    { number: 4, title: "الدفع" },
    { number: 5, title: "تخصيص المتجر" },
  ];
  const steps = allSteps.filter((step) =>
    manualStoreSetup
      ? (step.number !== 3 || !planPicked || currentStep === 3) &&
        (step.number !== 4 || !noPaymentNeeded || currentStep === 4)
      : // Signup ends at the code; the store is built from the AI prompt.
        step.number <= 2,
  );
  /** Position among the steps shown, for "الخطوة n من m". */
  const stepPosition = Math.max(
    1,
    steps.filter((step) => step.number <= currentStep).length,
  );

  const activeStepTitle =
    steps.find((s) => s.number === currentStep)?.title ?? steps[0].title;

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
  const phoneError = phoneTakenError || iqPhoneError(formData.phone);
  const nameError =
    formData.name.trim().length >= 2 ? "" : "يرجى إدخال الاسم الكامل (حرفان على الأقل).";
  const emailError = EMAIL_RE.test(formData.email.trim())
    ? ""
    : "يرجى إدخال بريد إلكتروني صالح.";
  const termsError = acceptedTerms
    ? ""
    : "يجب الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.";

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
    setPhoneTakenError("");
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

  /**
   * The number already has an account, so sign in to it instead.
   *
   * This used to stop signup and send the merchant to /login. Register writes
   * the user before the code is checked, so that also caught anyone who went
   * back from the code step and pressed continue again, or who left mid-signup
   * and came back: they were told they had an account they never finished.
   * Owning the phone is all an account needs, so the code goes out here and
   * the flow carries on from the same step.
   */
  const continueWithExistingAccount = (phoneE164: string, registerError: unknown) => {
    loginMutation(
      { phone: phoneE164 },
      {
        onSuccess: () => {
          toast.info("هذا الرقم لديه حساب مسبقاً — أرسلنا رمز الدخول إليه.");
          setExistingAccount(true);
          proceedToOtpStep(phoneE164);
        },
        onError: () => {
          // A removed account, typically: the register message says so.
          const message = getApiErrorMessage(
            registerError,
            "هذا الرقم لديه حساب مسبقاً. سجّل الدخول للمتابعة.",
          );
          setPhoneTakenError(message);
          setTouchedFields((prev) => ({ ...prev, phone: true }));
          toast.error(message);
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
      setTouchedFields({ name: true, email: true, phone: true, terms: true });
      const phoneE164 = toIqE164(formData.phone);

      if (!nameError && !emailError && phoneE164 && acceptedTerms) {
        registerMutation(
          {
            phone: phoneE164,
            name: formData.name,
            email: formData.email,
          },
          {
            onSuccess: (data: { message?: string }) => {
              if (data?.message) toast.success(data.message);
              proceedToOtpStep(phoneE164, data);
            },
            onError: (error) => {
              // الرقم مسجّل مسبقاً → نرسل رمز الدخول ونكمل من نفس الخطوة
              if (isPhoneTakenError(error)) {
                continueWithExistingAccount(phoneE164, error);
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
            refreshToken?: string;
            username?: string;
          }) => {
            setOtpVerified(true);
            const token = result?.token || result?.accessToken;
            const refreshToken = result?.refreshToken;
            const username = result?.username || formData.name || phone;
            if (token) {
              window.localStorage.setItem("token", token);
              if (refreshToken) {
                window.localStorage.setItem("refreshToken", refreshToken);
              }
              window.localStorage.setItem(
                "user",
                JSON.stringify({ token, refreshToken, username, phone }),
              );
              login(token, username, refreshToken);
            }

            // Signup is done. Once the store list is in, the effect at the
            // top sends the merchant on: to the AI prompt, which names and
            // creates the store (so there is no store form here), or to the
            // dashboard when this number already had one.
            seedPromptDraft(formData.businessType, formData.governorate);
            toast.success(
              existingAccount
                ? "تم تسجيل الدخول"
                : hasPendingGeneration()
                  ? "تم إنشاء حسابك! جاري إنشاء متجرك"
                  : "تم إنشاء حسابك! صف متجرك وسننشئه لك الآن",
            );
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

    // Free plans never hit the payment gateway — skip step 4 entirely.
    const free =
      Boolean(formData.plan.is_free) ||
      Number(formData.plan.monthly_price ?? 0) === 0;
    if (free) {
      setPaymentCompleted(true);
      setCurrentStep(5);
      return;
    }

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

    const selectedMethod = paymentMethods.find(
      (method) => method.id === formData.paymentMethod,
    );

    /**
     * A gateway is only needed when there is money to move through it.
     *
     * The summary beside this says «المستحق اليوم 0 د.ع» on a first monthly
     * period, and the form still refused to continue until the buyer had chosen
     * a payment method that would never be used. The manage screen learned this
     * when its picker was hidden for a free renewal; this is the same rule.
     */
    if (dueNow > 0 && (!selectedMethod?.available || !selectedMethod.provider)) {
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
        // Omitted when nothing is due: the server resolves its own default and
        // then never opens a transaction.
        provider: selectedMethod?.provider ?? undefined,
        billingPeriod: "MONTHLY",
        returnBaseUrl: `${window.location.origin}/checkout/payment-return`,
      },
      {
        onSuccess: (data) => {
          const redirectUrl = data?.redirectUrl;
          const paymentId = data?.id;

          /**
           * A payment can arrive already settled, with no gateway page to go
           * to, and this step used to call that a failure.
           *
           * The intro month is the normal case, not an edge: a first monthly
           * period resolves to 0 IQD, so the server writes the row `PAID`
           * without opening a transaction and returns it with no
           * `redirectUrl`. Every new merchant on monthly billing came through
           * here, was told «لم يتم استلام رابط الدفع», and stopped — step 5 was
           * unreachable, so no store was ever created. The summary panel
           * beside this button has always said «المستحق اليوم 0 د.ع»; it was
           * the only part of the flow that agreed with the server.
           *
           * It also catches the other way a `PAID` row comes back: the buyer
           * paid, returned in a fresh tab and pressed pay again, so
           * `resolveOpenAttempts` hands back the attempt the gateway says was
           * settled. Sending them to a payment page for money they have
           * already paid is the wrong answer there too.
           *
           * `paymentId` is carried into `formData`, not just `paymentCompleted`:
           * store creation sends it to `assertPaidInitialPayment`, and a paid
           * plan without one is refused with "paymentId is required".
           */
          if (data?.status === "PAID") {
            setProcessing(false);
            setPaymentCompleted(true);
            if (paymentId) {
              setFormData((prev) => ({ ...prev, paymentId: String(paymentId) }));
            }
            /**
             * Says which months the quote covered rather than naming the offer,
             * so this cannot drift from the ladder the way the hardcoded
             * «تجربة مجانية 14 يوماً» copy did. `quoteExplanation` is the same
             * sentence the summary panel shows.
             */
            toast.success(
              Number(data?.amount) > 0
                ? "تم تأكيد الدفع"
                : promoExplanation
                  ? `لا حاجة للدفع الآن — ${promoExplanation}`
                  : "لا حاجة للدفع الآن — تم تأكيد اشتراكك",
            );
            setCurrentStep(5);
            return;
          }

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

    if (existingStoreCount >= 1) {
      toast.info("لديك متجر واحد مسبقاً. كل حساب يحق له متجر واحد فقط.");
      navigate("/dashboard", { replace: true });
      return;
    }

    const data = new FormData();

    // Check if plan is selected - required before creating store
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل إنشاء المتجر");
      setCurrentStep(3);
      return;
    }

    const isFree =
      formData.plan?.is_free || Number(formData.plan?.monthly_price) === 0;
    if (!isFree && !formData.paymentId && !paymentCompleted && dueNow !== 0) {
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

  // Signed in and here for signup: the effect above is about to send them
  // on (prompt or dashboard), so there is no form to show in the meantime.
  if (authLoading || (user && !manualStoreSetup)) {
    return (
      <CheckoutShell>
        <div className="flex min-h-[50vh] w-full items-center justify-center">
          <Loader2 size={28} className="animate-spin text-white/60" />
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      {/* Brand rail first → right under RTL; plans/form fill the left. */}
      <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <CheckoutBrandRail
          currentStep={stepPosition}
          totalSteps={steps.length}
          stepTitle={activeStepTitle}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Mobile brand strip */}
          <div className="flex items-center justify-end gap-3 lg:hidden">
            <div className="flex flex-col text-right">
              <span dir="ltr" className="text-lg font-extrabold text-white">
                mel.iq
              </span>
              <span className="text-xs text-[#8b92b0]">نظام إدارة المتاجر</span>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)]">
              <img
                src="/images/landing/mel-mark.svg"
                alt=""
                aria-hidden
                width={48}
                height={48}
                className="size-12"
              />
            </span>
          </div>

          {!location.state?.skipToStep && (
            <CheckoutStepper steps={steps} currentStep={currentStep} />
          )}

          {/* Step content — open on the atmosphere (no nested chrome box). */}
          <div className="text-right">
          {/* Step 1: User Info - Only for non-logged in users */}
          {currentStep === 1 && !location.state?.skipToStep && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
                  أنشئ حسابك
                </h2>
                <p className="text-sm leading-6 text-[#9aa1bd]">
                  شهر أول مجاناً ثم 6 أشهر بنصف السعر — وتقدر تلغي في أي وقت
                </p>
              </div>

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
                  {/* No store name here: the AI prompt that follows names
                      the store. */}
                  <span className="hidden flex-1 sm:block" />
                </div>

                {/* These two are in the frame but the register endpoint takes
                    only name / email / phone, so they are not persisted —
                    hence optional. They do start the AI prompt off
                    (`seedPromptDraft`) once the code checks out. */}
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

                <CheckBox
                  checked={acceptedTerms}
                  onChange={setAcceptedTerms}
                  error={errorFor("terms", termsError)}
                >
                  أوافق على{" "}
                  {/* New tab: on a phone the links fill most of this line,
                      and a tap that navigated away lost the whole form. */}
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

                <StepFooter
                  submitLabel="متابعة"
                  busy={isRegistering || isLoggingIn || isSendingOtp}
                >
                  <p className="text-[13px] leading-5 text-muted">
                    لديك حساب؟{" "}
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/login", {
                          state: {
                            phone: toLocalDigits(formData.phone),
                          },
                        })
                      }
                      className="font-bold text-brand-primary hover:underline"
                    >
                      تسجيل الدخول
                    </button>
                  </p>
                </StepFooter>
              </form>
            </div>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {currentStep === 2 && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
            <div className="flex flex-col items-center gap-[22px] py-2 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
                  تحقق من رقمك
                </h2>
                <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm leading-6 text-[#9aa1bd]">
                  أرسلنا رمزاً من {CHECKOUT_OTP_LENGTH} أرقام إلى
                  <span dir="ltr" className="font-semibold text-white">
                    {formatIqPhone(formData.phone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[13px] font-bold text-[#7b8cff] hover:underline"
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
            </div>
          )}

          {/* Step 3: Plan Selection — open layout like the Mel mockup */}
          {currentStep === 3 && autoAdvance && planPicked && (
            // Basic is already picked; this shows only while the quote decides
            // whether anything is due before the store step.
            <p className="py-16 text-center text-sm text-[#9aa1bd]">
              جاري تجهيز باقتك الأساسية…
            </p>
          )}

          {currentStep === 3 && !(autoAdvance && planPicked) && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h2 className="text-[32px] font-extrabold leading-tight text-white sm:text-[36px]">
                  اختر خطتك
                </h2>
                <p className="text-[15px] leading-6 text-[#9aa1bd]">
                  لن يُخصم أي مبلغ اليوم — تبدأ الفوترة بعد انتهاء التجربة المجانية
                </p>
              </div>

              {plans.isLoading ? (
                <p className="py-10 text-center text-sm text-[#9aa1bd]">جاري تحميل الباقات…</p>
              ) : plansData.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-10">
                  <p className="text-sm text-[#9aa1bd]">
                    {plans.isError
                      ? "تعذر تحميل الباقات."
                      : "لا توجد باقات متاحة حالياً."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void plans.refetch()}
                    disabled={plans.isFetching}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-6 text-[13px] font-bold text-white transition-colors hover:bg-white/[0.08] disabled:opacity-40"
                  >
                    {plans.isFetching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "إعادة المحاولة"
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                        className={`relative rounded-[24px] border text-right transition-all ${
                          selected
                            ? "border-[#4f60f9]/70 bg-[#0c1024] shadow-[0_0_32px_rgba(79,96,249,0.28)]"
                            : "border-white/[0.08] bg-[#0a0d1c]/95 hover:border-[#4f60f9]/35"
                        }`}
                      >
                        <div className="flex h-full flex-col gap-6 px-6 pb-7 pt-7">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              {selected && (
                                <span className="rounded-full bg-[#4f60f9]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#9eb0ff]">
                                  مختارة
                                </span>
                              )}
                              <h3 className="flex-1 text-right text-[28px] font-bold text-white sm:text-[32px]">
                                {plan.name || ""}
                              </h3>
                            </div>
                            <p className="text-[13px] leading-6 text-[#a8aec8]">
                              {plan.description || ""}
                            </p>
                            <span className="h-px w-full bg-gradient-to-l from-transparent via-[#4f60f9]/50 to-transparent" />
                          </div>

                          <ul className="flex flex-col gap-3.5">
                            {planFeatures(plan).map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-3">
                                <span className="flex-1 text-right text-[14px] leading-snug text-[#e8eaf4]">
                                  {feature}
                                </span>
                                <span
                                  aria-hidden
                                  className="size-2.5 shrink-0 rounded-full bg-[#4f60f9] shadow-[0_0_8px_rgba(79,96,249,0.8)]"
                                />
                              </li>
                            ))}
                          </ul>

                          <p className="mt-auto flex items-end justify-end gap-1 pt-2">
                            {price ? (
                              <>
                                <span className="text-[34px] font-medium tracking-tight text-white">
                                  {price}
                                </span>
                                <span className="pb-1 text-sm text-[#73799b]">د.ع /شهرياً</span>
                              </>
                            ) : (
                              <span className="text-[28px] font-medium text-white">اتصل بنا</span>
                            )}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <StepFooter
                submitLabel="متابعة"
                disabled={!formData.plan}
                onSubmit={handlePlanSelection}
                onBack={() => setCurrentStep(2)}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
                  طريقة الدفع
                </h2>
                <p className="text-sm leading-6 text-[#9aa1bd]">
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {paymentMethods.map((method) => {
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
                            className={`flex flex-col gap-3 rounded-[18px] border p-4 text-right transition-all ${
                              selected
                                ? "border-brand-primary bg-brand-primary/10 shadow-[0_0_24px_rgba(79,96,249,0.2)]"
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
                          : "اختر زين كاش أو كي كارد للمتابعة إلى صفحة الدفع الآمنة."}
                    </p>
                  </div>

                  {/* Subscription summary — every figure here comes from the
                      selected plan, so it stays true when plans change. */}
                  <aside className="flex w-full flex-col gap-4 rounded-[22px] border border-[#4f60f9]/30 bg-[#12162c] p-5 lg:w-[320px]">
                    <h3 className="text-sm font-bold text-white">ملخص الاشتراك</h3>

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
                      {quote && quote.savings > 0 && (
                        <div className="flex items-center justify-between">
                          <dd className="text-mint">
                            -{quote.savings.toLocaleString("en-IQ")} د.ع
                          </dd>
                          <dt className="text-muted">خصم العرض</dt>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <dd className="text-frost">0 د.ع</dd>
                        <dt className="text-muted">الضريبة</dt>
                      </div>
                      <div className="mt-1 flex items-center justify-between border-t border-white/8 pt-3">
                        <dd className="text-xl font-bold text-frost">
                          {quoteLoading ? "..." : dueToday}
                        </dd>
                        <dt className="text-sm font-bold text-frost">المستحق اليوم</dt>
                      </div>
                    </dl>

                    {promoExplanation && (
                      <p className="text-[11px] leading-5 text-muted">
                        {promoExplanation}
                      </p>
                    )}

                    <p className="rounded-xl border border-mint/25 bg-mint/8 p-3 text-[11px] leading-5 text-muted">
                      {firstChargeDate && (
                        <span className="block font-bold text-mint">
                          أول دفعة: {firstChargeDate}
                        </span>
                      )}
                      سنذكّرك قبل 3 أيام من موعد التجديد، ويمكنك الإلغاء بدون رسوم.
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
                disabled={
                  !formData.plan ||
                  (!isPlanFree &&
                    !paymentCompleted &&
                    dueNow > 0 &&
                    !paymentMethods.some(
                      (method) =>
                        method.id === formData.paymentMethod && method.available,
                    ))
                }
                onSubmit={handlePayment}
                onBack={() => setCurrentStep(3)}
              />
            </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
            <div className="flex flex-col gap-[22px]">
              <div className="flex flex-col gap-1.5">
                <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
                  خصّص متجرك
                </h2>
                <p className="text-sm leading-6 text-[#9aa1bd]">
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
                  onBack={() => setCurrentStep(noPaymentNeeded ? 3 : 4)}
                />
              </form>
            </div>
            </div>
          )}
          </div>
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
    </CheckoutShell>
  );
}

export default Checkout;
