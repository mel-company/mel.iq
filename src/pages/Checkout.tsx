/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useAddStore,
  useFetchStores,
} from "@/api/wrappers/store.wrappers";
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
import { normalizeApiResponse } from "@/utils/storeUrls";
import {
  FOCUS_PROMPT_STATE,
  hasPromptPending,
  seedPromptDraft,
} from "@/utils/promptHandoff";
import {
  getApiErrorMessage,
  getContentPolicyNameMessage,
  isContentPolicyError,
} from "@/utils/otp";
import { BUSINESS_TYPES, GOVERNORATES } from "@/utils/businessProfile";
import {
  cleanSubdomainInput,
  isValidSubdomain,
  subdomainCandidates,
} from "@/utils/subdomainSuggest";
import { storeAPI } from "@/api/endpoints/store.endpoints";
import { Loader2, Upload, X } from "@/components/icons";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";
import CheckoutShell from "@/components/checkout/CheckoutShell";
import CheckoutBrandRail from "@/components/checkout/CheckoutBrandRail";
import CheckoutDone from "@/components/checkout/CheckoutDone";
import SignupFlow from "@/components/auth/SignupFlow";
import { PaymentProviderLogo, PROVIDER_LOGOS } from "@/components/PaymentProviderPicker";
import {
  BackIconButton,
  Field,
  SelectInput,
  StepFooter,
  TextInput,
} from "@/components/checkout/fields";

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
  { id: "card", title: "بطاقة بنكية", detail: "Visa · Mastercard", mark: "VC", tint: "bg-brand-primary/15 text-brand-primary", provider: null, logo: null },
  { id: "zaincash", title: "زين كاش", detail: "ZainCash", mark: "Z", tint: "bg-[#ff5252]/15 text-[#ff5252]", provider: "ZAIN_CASH" as const, logo: PROVIDER_LOGOS.ZAIN_CASH },
  { id: "qicard", title: "كي كارد", detail: "Qi Card", mark: "Q", tint: "bg-amber/15 text-amber", provider: "QI_CARD" as const, logo: PROVIDER_LOGOS.QI_CARD },
  { id: "fib", title: "FIB", detail: "المصرف الأول", mark: "F", tint: "bg-brand-secondary/15 text-brand-secondary", provider: null, logo: null },
];

/**
 * A plan's feature labels.
 *
 * `plan.features` comes back through the FeaturePlan join, so each row wraps
 * the feature rather than being one; older payloads inline it. Both shapes are
 * read here so the cards are not silently blank either way.
 */
function planFeatures(plan: any): string[] {
  const named = (plan?.features || [])
    .map((row: any) => row?.feature ?? row)
    .filter((f: any) => f && f.enabled !== false)
    .map((f: any) => String(f.name || "").trim())
    .filter(Boolean);
  return named.length > 0 ? named : planGrant(plan);
}

/**
 * The plan's grant from its own columns (caps, AI, Grow features), for a plan
 * with no feature rows — which is every plan in production.
 */
function planGrant(plan: any): string[] {
  if (!plan || !("max_products" in plan)) return [];
  const cap = (limit: unknown, capped: (n: number) => string, unlimited: string) =>
    typeof limit === "number" ? capped(limit) : unlimited;
  const lines = [
    cap(plan.max_products, (n) => `حتى ${n} منتج`, "منتجات بلا حدود"),
    cap(plan.max_categories, (n) => `حتى ${n} أقسام`, "أقسام بلا حدود"),
    cap(plan.max_monthly_orders, (n) => `${n} طلب شهرياً`, "طلبات بلا حدود"),
    cap(plan.max_coupons, (n) => `${n} كوبونات خصم`, "كوبونات بلا حدود"),
  ];
  if (Number(plan.ai_store_credits) > 0) {
    lines.push(`${plan.ai_store_credits} متاجر بالذكاء الاصطناعي شهرياً`);
  } else if (Number(plan.ai_store_trial) > 0) {
    lines.push("تجربة مجانية لإنشاء متجر بالذكاء الاصطناعي");
  }
  if (plan.has_ai_editor && Number(plan.ai_editor_credits) > 0) {
    lines.push(`${plan.ai_editor_credits} رصيد شهرياً لمساعد المحرر الذكي`);
  } else if (Number(plan.ai_editor_trial) > 0) {
    lines.push(`تجربة مساعد المحرر الذكي (${plan.ai_editor_trial} رسائل)`);
  }
  if (plan.has_social_pixels) lines.push("بكسلات الإعلانات: ميتا، تيك توك، سناب");
  if (plan.has_custom_domain) lines.push("ربط نطاقك الخاص");
  return lines;
}

type BillingPeriod = "MONTHLY" | "QUARTERLY" | "YEARLY";

const BILLING_PERIODS: { value: BillingPeriod; label: string }[] = [
  { value: "MONTHLY", label: "شهري" },
  { value: "QUARTERLY", label: "3 أشهر" },
  { value: "YEARLY", label: "سنوي" },
];

const readPeriod = (raw: string | null): BillingPeriod =>
  raw === "QUARTERLY" || raw === "YEARLY" ? raw : "MONTHLY";

/**
 * Catalogue price for the chosen billing period.
 *
 * Monthly is list (or the intro offer elsewhere). Quarterly / yearly apply
 * their own discount on the period total — 10% / 25% by default — and never
 * stack with the intro ladder.
 */
function periodCataloguePrice(
  plan: any,
  period: BillingPeriod,
): {
  amount: number;
  listAmount: number | null;
  label: string;
  discountPercent: number;
} {
  const monthly = Number(plan?.monthly_price ?? 0);
  if (period === "MONTHLY") {
    return {
      amount: monthly,
      listAmount: null,
      label: "/شهرياً",
      discountPercent: 0,
    };
  }
  const months = period === "YEARLY" ? 12 : 3;
  const discountPercent = Number(
    period === "YEARLY"
      ? (plan?.pricing?.yearly?.discountPercent ?? 25)
      : (plan?.pricing?.quarterly?.discountPercent ?? 10),
  );
  const listAmount = monthly * months;
  const fromApi =
    period === "YEARLY"
      ? Number(plan?.pricing?.yearly?.price ?? 0)
      : Number(plan?.pricing?.quarterly?.price ?? 0);
  const amount =
    fromApi > 0
      ? fromApi
      : Math.round((listAmount * (100 - discountPercent)) / 100);
  return {
    amount,
    listAmount: discountPercent > 0 ? listAmount : null,
    label: period === "YEARLY" ? "/سنوياً" : "/3 أشهر",
    discountPercent,
  };
}

/**
 * The plan's intro offer (free months, then a discount), from the catalogue's
 * `pricing` block or, on older payloads, the plan's promo columns. `null` when
 * the plan runs no offer.
 */
function planIntro(plan: any): {
  freeMonths: number;
  discountMonths: number;
  discountPercent: number;
  discountPrice: number;
} | null {
  const monthly = Number(plan?.monthly_price ?? 0);
  const fromPricing = plan?.pricing?.monthly?.intro;
  const intro = fromPricing
    ? {
        enabled: Boolean(fromPricing.enabled),
        freeMonths: Number(fromPricing.freeMonths ?? 0),
        discountMonths: Number(fromPricing.discountMonths ?? 0),
        discountPercent: Number(fromPricing.discountPercent ?? 0),
        discountPrice: Number(fromPricing.discountPrice ?? 0),
      }
    : {
        enabled: Boolean(plan?.promo_enabled),
        freeMonths: Number(plan?.promo_free_months ?? 0),
        discountMonths: Number(plan?.promo_discount_months ?? 0),
        discountPercent: Number(plan?.promo_discount_percent ?? 0),
        discountPrice: Math.round(
          monthly * (1 - Number(plan?.promo_discount_percent ?? 0) / 100),
        ),
      };
  // Basic opens with a free month; Grow with half price for three months.
  const hasDiscount = intro.discountMonths > 0 && intro.discountPercent > 0;
  if (!intro.enabled || monthly <= 0 || (intro.freeMonths <= 0 && !hasDiscount)) {
    return null;
  }
  const { enabled: _enabled, ...rest } = intro;
  return rest;
}

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  /**
   * Monthly, 3 months (10% off) or a year (25% off), from the pricing
   * section's switch. Never stacked with the intro offer: the server prices
   * both and charges the cheaper, and the summary shows what that is.
   */
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(() =>
    readPeriod(searchParams.get("period")),
  );
  /**
   * Set only by the payment return, which still walks the manual payment →
   * store steps for a paid checkout already under way. A plain visit to
   * /checkout is the full signup wizard: account → code → plan → payment
   * (when due) → store/domain.
   */
  const manualStoreSetup = Boolean(location.state?.skipToStep);
  /**
   * After OTP the merchant stays in this wizard (plan → domain) instead of
   * bouncing to the landing prompt. Cleared when they leave checkout.
   */
  const [signupInProgress, setSignupInProgress] = useState(false);
  /** Set once the store exists: the wizard shows its finish screen. */
  const [createdStore, setCreatedStore] = useState<{
    slug: string;
    name: string;
  } | null>(null);

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
    // Their store was just made here; the finish screen owns what is next.
    if (createdStore) return;
    if (existingStoreCount >= 1) {
      if (manualStoreSetup) {
        toast.info("لديك متجر واحد مسبقاً. كل حساب يحق له متجر واحد فقط.");
      }
      navigate("/dashboard", { replace: true });
      return;
    }
    // Mid signup after OTP — stay for plan, payment, and domain.
    if (signupInProgress || manualStoreSetup) return;
    // Already signed in with no store (navbar / deep link): build from the prompt.
    navigate("/", { replace: true, state: FOCUS_PROMPT_STATE });
  }, [
    user,
    storesLoading,
    existingStoreCount,
    navigate,
    manualStoreSetup,
    signupInProgress,
    createdStore,
  ]);

  // Always start from step 1 (plan selection) unless skipToStep is provided
  // User must select a plan before creating a store
  const initialStep = location.state?.skipToStep || 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const { mutate: addStoreMutation } = useAddStore();
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

  const [paymentCompleted, setPaymentCompleted] = useState(
    () => Boolean(location.state?.paymentCompleted),
  );
  const [processing, setProcessing] = useState(false);
  const [domainChecked, setDomainChecked] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [creatingStore, setCreatingStore] = useState(false);
  /** Who just signed up, for the link suggestion on the store step. */
  const [account, setAccount] = useState<{ email: string; phone: string } | null>(
    null,
  );
  /** Store name rejected by the server content policy — change it to continue. */
  const [storeNameError, setStoreNameError] = useState("");

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
          billingPeriod,
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

  /**
   * The store exists. A merchant who pressed «أنشئ متجري» before signing up
   * goes straight home, where the prompt they typed starts generating into
   * this store; everyone else gets the finish screen.
   */
  const finishStoreSetup = (slug: string, name: string) => {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    seedPromptDraft(formData.businessType, formData.governorate);
    setCreatedStore({ slug, name });
    if (hasPromptPending()) {
      navigate("/", { replace: true, state: FOCUS_PROMPT_STATE });
      return;
    }
    setCurrentStep(6);
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

    // Basic, whichever way the merchant arrived: signup, the dashboard, or a
    // link without a plan. Its first month is free, so signup is not
    // interrupted by a payment. PLUS (Grow) on a server without the Basic row.
    const byCode = (code: string) =>
      plansData.find(
        (plan: any) => String(plan.code || "").toUpperCase() === code,
      );
    const defaultPlan = byCode("BASIC") ?? byCode("PLUS");
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
  // Full wizard always — including domain. Payment is the only step that
  // drops out when nothing is due (free plan / intro month).
  const steps = allSteps.filter(
    (step) =>
      (step.number !== 3 || !planPicked || currentStep === 3 || signupInProgress) &&
      (step.number !== 4 || !noPaymentNeeded || currentStep === 4),
  );
  /** Position among the steps shown, for "الخطوة n من m". */
  const stepPosition = Math.max(
    1,
    steps.filter((step) => step.number <= currentStep).length,
  );

  const activeStepTitle =
    currentStep === 6
      ? "تم إنشاء حسابك"
      : (steps.find((s) => s.number === currentStep)?.title ?? steps[0].title);


  // The plans query is deliberately NOT gated on here. It used to short-circuit
  // the whole component to a bare "Loading..." / "Error:" div, which blanked
  // all five steps — including the account and verification steps, which never
  // touch plans — and left the wizard stuck behind an unreachable API. Step 3
  // is the only step that needs plans, and it renders its own loading, empty
  // and failed states.
  // Widened to cover the account step's two <select>s as well as its inputs —
  // they all just write their `name` into formData.
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "storeName") setStoreNameError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (plan: any) => {
    setFormData({ ...formData, plan });
  };

  /** Bumped on every edit, so an older answer cannot land on a newer link. */
  const domainCheckSeq = useRef(0);
  /** Once the merchant types a link, the suggestion leaves it alone. */
  const domainEditedRef = useRef(false);
  const suggestedLinkRef = useRef(false);

  /** Whether `slug` is free; `null` when the server could not be asked. */
  const subdomainIsFree = async (slug: string): Promise<boolean | null> => {
    try {
      const data = await storeAPI.checkDomainAvailability({
        domain: slug,
        domainType: "subdomain",
      });
      return Boolean(data?.isAvailable ?? data?.data?.isAvailable ?? false);
    } catch {
      return null;
    }
  };

  /**
   * Checks the link as typed. Runs when the field loses focus and again on
   * submit if it never finished, so there is no separate button to press.
   */
  const checkSubdomain = async (slug: string = formData.domain): Promise<boolean> => {
    if (!slug) {
      setDomainChecked(false);
      setDomainAvailable(null);
      return false;
    }
    if (!isValidSubdomain(slug)) {
      setDomainChecked(true);
      setDomainAvailable(false);
      setDomainError("يبدأ بحرف إنجليزي، ثم حروف وأرقام و - فقط (3 أحرف على الأقل)");
      return false;
    }
    const seq = ++domainCheckSeq.current;
    setIsCheckingDomain(true);
    const free = await subdomainIsFree(slug);
    if (seq !== domainCheckSeq.current) return Boolean(free);
    setIsCheckingDomain(false);
    if (free === null) {
      setDomainChecked(false);
      setDomainAvailable(null);
      toast.error("تعذر التحقق من الرابط. حاول مرة أخرى.");
      return false;
    }
    setDomainChecked(true);
    setDomainAvailable(free);
    setDomainError(free ? "" : "هذا الرابط محجوز، جرّب رابطاً آخر");
    return free;
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    domainEditedRef.current = true;
    domainCheckSeq.current += 1;
    setIsCheckingDomain(false);
    setDomainChecked(false);
    setDomainAvailable(null);
    setDomainError("");
    const domain = cleanSubdomainInput(e.target.value);
    setFormData((prev) => ({ ...prev, domain, domainType: "subdomain" }));
  };

  /**
   * Opens the store step on a link that is already free: from the store
   * name, the email, or the phone, checked one by one until one is.
   */
  useEffect(() => {
    if (currentStep !== 5 || suggestedLinkRef.current || formData.domain) return;
    suggestedLinkRef.current = true;
    let cancelled = false;
    const candidates = subdomainCandidates({
      storeName: formData.storeName,
      email: account?.email || formData.email,
      phone: account?.phone || formData.phone,
    });
    void (async () => {
      const seq = ++domainCheckSeq.current;
      setIsCheckingDomain(true);
      for (const candidate of candidates) {
        const free = await subdomainIsFree(candidate);
        if (cancelled || domainEditedRef.current || seq !== domainCheckSeq.current) {
          return;
        }
        if (free === null) break;
        if (free) {
          setFormData((prev) => ({ ...prev, domain: candidate, domainType: "subdomain" }));
          setDomainChecked(true);
          setDomainAvailable(true);
          setDomainError("");
          break;
        }
      }
      if (!cancelled && seq === domainCheckSeq.current) setIsCheckingDomain(false);
    })();
    return () => {
      cancelled = true;
      if (!domainEditedRef.current) suggestedLinkRef.current = false;
    };
    // Only on arriving at the step; the fields it reads are a starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const handlePlanSelection = () => {
    // Check if plan is selected
    if (!formData.plan || !formData.plan.id) {
      toast.error("الرجاء اختيار خطة قبل المتابعة");
      return;
    }

    // Free / nothing due today: skip the gateway, go straight to domain.
    const free =
      Boolean(formData.plan.is_free) ||
      Number(formData.plan.monthly_price ?? 0) === 0;
    if (free || noPaymentNeeded) {
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
        billingPeriod,
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

  const readLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة (PNG / SVG / WebP).");
      return;
    }
    // Create preview URL for display
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        logo: reader.result as string,
        logoFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readLogoFile(file);
    e.target.value = "";
  };

  const handleWebsiteCustomization = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creatingStore) return;

    if (existingStoreCount >= 1) {
      toast.info("لديك متجر واحد مسبقاً. كل حساب يحق له متجر واحد فقط.");
      navigate("/dashboard", { replace: true });
      return;
    }

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

    if (!user) {
      toast.error("سجّل الدخول أولاً لإنشاء متجرك.");
      navigate("/login");
      return;
    }

    const slug = formData.domain;
    const free =
      domainChecked && domainAvailable === true ? true : await checkSubdomain(slug);
    if (!free) {
      toast.error(slug ? "اختر رابطاً متاحاً لمتجرك." : "الرجاء إدخال رابط المتجر.");
      return;
    }

    const name = formData.storeName.trim() || slug;
    const storeFormData = new FormData();
    storeFormData.append("name", name);
    storeFormData.append(
      "type",
      formData.websiteType === "store" ? "ECOMMERCE" : "RESTAURANT",
    );
    storeFormData.append("domain", slug);
    if (formData.governorate) {
      storeFormData.append("location", formData.governorate);
    }
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

    setCreatingStore(true);
    addStoreMutation(storeFormData, {
      onSuccess: () => finishStoreSetup(slug, name),
      onError: (error) => {
        console.error("Error creating store:", error);
        setCreatingStore(false);
        if (isContentPolicyError(error)) {
          const message = getContentPolicyNameMessage(error);
          setStoreNameError(message);
          toast.error(message);
          document.getElementById("storeName5")?.focus();
          return;
        }
        toast.error(
          getApiErrorMessage(
            error,
            "حدث خطأ في إنشاء المتجر. الرجاء المحاولة مرة أخرى.",
          ),
        );
      },
    });
  };

  // Already signed in and not mid-wizard: the effect above is about to send
  // them on (prompt or dashboard). After OTP, `signupInProgress` keeps the
  // plan → domain steps on screen instead of this spinner forever.
  if (authLoading || (user && !manualStoreSetup && !signupInProgress)) {
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
          {!location.state?.skipToStep && currentStep !== 6 && (
            <CheckoutStepper steps={steps} currentStep={currentStep} />
          )}

          {/* Step content — open on the atmosphere (no nested chrome box). */}
          <div className="text-right">
          {/* Steps 1–2: account + verification (also where the landing
              prompt sends signed-out visitors after saving their draft). */}
          {!manualStoreSetup && currentStep <= 2 && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
              <SignupFlow
                onStepChange={(step) => setCurrentStep(step === "otp" ? 2 : 1)}
                onLoginLink={(phone) => navigate("/login", { state: { phone } })}
                createdMessage="تم إنشاء حسابك — اختر باقتك ثم حدد دومين متجرك"
                onAuthenticated={({ email, phone }) => {
                  // The wizard carries on to plan and store. A prompt typed
                  // before signing up stays pending: once the store exists,
                  // home starts generating it into that store.
                  setAccount({ email, phone });
                  setSignupInProgress(true);
                  setCurrentStep(3);
                }}
              />
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
                  {noPaymentNeeded
                    ? "هذي الباقة مجاناً اليوم — ما راح ينخصم أي مبلغ هسه"
                    : quote
                      ? `المستحق اليوم ${dueToday}${promoExplanation ? ` — ${promoExplanation}` : ""}`
                      : "اختر الباقة ومدة الاشتراك"}
                </p>
                <div
                  role="tablist"
                  aria-label="مدة الاشتراك"
                  className="mt-2 flex w-fit max-w-full flex-wrap rounded-full border border-white/[0.08] bg-white/[0.03] p-1"
                >
                  {BILLING_PERIODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={billingPeriod === option.value}
                      onClick={() => setBillingPeriod(option.value)}
                      className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors sm:px-4 ${
                        billingPeriod === option.value
                          ? "bg-[#4f60f9] text-white"
                          : "text-[#9aa1bd] hover:text-white"
                      }`}
                    >
                      {option.label}
                      {option.value === "QUARTERLY" && " · خصم 10%"}
                      {option.value === "YEARLY" && " · خصم 25%"}
                    </button>
                  ))}
                </div>
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
                // One plan on sale: it takes the whole width and lays its
                // features and price side by side instead of a thin column.
                <div
                  className={`grid items-stretch gap-5 ${
                    plansData.length === 1
                      ? ""
                      : plansData.length === 2
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {plansData.map((plan: any) => {
                    const selected = formData.plan?.id === plan.id;
                    const wide = plansData.length === 1;
                    const monthly = Number(plan.monthly_price ?? 0);
                    const isFree =
                      Boolean(plan.is_free) || monthly === 0;
                    const catalogue = periodCataloguePrice(plan, billingPeriod);
                    const price =
                      !isFree && catalogue.amount > 0
                        ? catalogue.amount.toLocaleString("en-IQ")
                        : null;
                    const listPrice =
                      catalogue.listAmount != null &&
                      catalogue.listAmount > catalogue.amount
                        ? catalogue.listAmount.toLocaleString("en-IQ")
                        : null;
                    // Intro offer is monthly-only and never stacks with the
                    // 3-month / yearly period discount. A buyer whose quote
                    // says they owe money has spent the intro already.
                    const intro =
                      billingPeriod !== "MONTHLY" ||
                      (selected && quote && quote.amount > 0)
                        ? null
                        : planIntro(plan);
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
                        <div
                          className={`flex h-full flex-col gap-6 px-6 pb-7 pt-7 ${
                            wide ? "sm:flex-row sm:items-stretch sm:gap-10 sm:px-9 sm:py-9" : ""
                          }`}
                        >
                          <div className={`flex flex-col gap-6 ${wide ? "sm:flex-1" : ""}`}>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                              {isFree && (
                                <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-[11px] font-bold text-mint">
                                  مجاناً
                                </span>
                              )}
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
                          </div>

                          <div
                            className={`mt-auto flex flex-col ${
                              wide
                                ? "sm:mt-0 sm:w-[46%] sm:shrink-0 sm:justify-center sm:border-s sm:border-white/[0.08] sm:ps-10"
                                : ""
                            }`}
                          >
                          {isFree || !price ? (
                            <p className="mt-auto flex items-end justify-end gap-1 pt-2">
                              {isFree ? (
                                <span className="text-[34px] font-medium tracking-tight text-mint">
                                  ببلاش
                                </span>
                              ) : (
                                <span className="text-[28px] font-medium text-white">اتصل بنا</span>
                              )}
                            </p>
                          ) : intro ? (
                            // The offer as it will be charged: free month(s),
                            // then the discounted months, then list price.
                            <div className="mt-auto flex flex-col gap-3 pt-2">
                              {intro.freeMonths > 0 && (
                              <p className="flex items-end gap-2">
                                <span className="text-[34px] font-medium leading-none tracking-tight text-mint">
                                  ببلاش
                                </span>
                                <span className="pb-0.5 text-sm text-[#a8aec8]">
                                  {intro.freeMonths === 1
                                    ? "الشهر الأول"
                                    : `أول ${intro.freeMonths} أشهر`}
                                </span>
                              </p>
                              )}
                              {intro.discountMonths > 0 && (
                                <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                  <span className="text-[22px] font-medium text-white">
                                    {intro.discountPrice.toLocaleString("en-US")}
                                  </span>
                                  <span className="text-sm text-[#a8aec8]">
                                    د.ع /شهرياً لمدة {intro.discountMonths} أشهر
                                  </span>
                                  <span className="text-sm text-[#73799b] line-through">
                                    {price}
                                  </span>
                                  <span className="rounded-full bg-[#4f60f9]/20 px-2 py-0.5 text-[11px] font-bold text-[#9eb0ff]">
                                    خصم <bdi dir="ltr">{intro.discountPercent}%</bdi>
                                  </span>
                                </p>
                              )}
                              <p className="text-[12px] text-[#73799b]">
                                بعدها {price} د.ع شهرياً
                              </p>
                              {intro.freeMonths > 0 && (
                              <p className="flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/10 px-3 py-2 text-[12px] font-bold text-mint">
                                <span aria-hidden>✓</span>
                                ما تحتاج بطاقة دفع
                              </p>
                              )}
                            </div>
                          ) : (
                            <div className="mt-auto flex flex-col items-end gap-2 pt-2">
                              {listPrice && (
                                <span className="text-sm text-[#73799b] line-through">
                                  {listPrice} د.ع
                                </span>
                              )}
                              <p className="flex items-end justify-end gap-1">
                                <span className="text-[34px] font-medium tracking-tight text-white">
                                  {price}
                                </span>
                                <span className="pb-1 text-sm text-[#73799b]">
                                  د.ع {catalogue.label}
                                </span>
                              </p>
                              {catalogue.discountPercent > 0 && (
                                <span className="rounded-full bg-[#4f60f9]/20 px-2 py-0.5 text-[11px] font-bold text-[#9eb0ff]">
                                  خصم{" "}
                                  <bdi dir="ltr">{catalogue.discountPercent}%</bdi>
                                </span>
                              )}
                            </div>
                          )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <StepFooter
                submitLabel={noPaymentNeeded ? "متابعة — مجاناً" : "متابعة"}
                disabled={!formData.plan}
                onSubmit={handlePlanSelection}
                // After OTP the account exists — don't reopen the info form.
                onBack={signupInProgress ? undefined : () => setCurrentStep(2)}
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
                  {dueNow > 0 && quote
                    ? `المستحق اليوم ${dueToday}`
                    : "لن يُخصم أي مبلغ اليوم — تبدأ الفوترة بعد انتهاء التجربة المجانية"}
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
                              {method.logo ? (
                                <PaymentProviderLogo
                                  src={method.logo}
                                  className="size-7 rounded-md"
                                />
                              ) : (
                                <span
                                  aria-hidden
                                  className={`flex size-7 items-center justify-center rounded-md text-xs font-bold ${method.tint}`}
                                >
                                  {method.mark}
                                </span>
                              )}
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
                    : noPaymentNeeded
                      ? "متابعة — مجاناً"
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
              <div className="flex items-start gap-3">
                <BackIconButton onClick={() => setCurrentStep(noPaymentNeeded ? 3 : 4)} />
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-[28px] font-extrabold leading-tight text-white sm:text-[32px]">
                    خصّص متجرك
                  </h2>
                  <p className="text-sm leading-6 text-[#9aa1bd]">
                    آخر خطوة — يمكنك تغيير كل هذا لاحقاً من الإعدادات
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleWebsiteCustomization}
                noValidate
                className="flex flex-col gap-[22px]"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <Field
                    label="اسم المتجر"
                    htmlFor="storeName5"
                    error={storeNameError || undefined}
                  >
                    <TextInput
                      id="storeName5"
                      name="storeName"
                      value={formData.storeName}
                      onChange={handleInputChange}
                      placeholder="متجر البركة للأطعمة"
                      state={storeNameError ? "error" : "default"}
                    />
                  </Field>

                  <Field
                    label="رابط المتجر"
                    htmlFor="domain"
                    error={
                      domainChecked && domainAvailable === false
                        ? domainError || "هذا الرابط محجوز، جرّب رابطاً آخر"
                        : undefined
                    }
                  >
                    {/* The `.mel.iq` suffix is fixed chrome, not typed — the
                        field holds only the subdomain the merchant picks. It
                        is checked when the field loses focus. */}
                    <label
                      htmlFor="domain"
                      dir="ltr"
                      className={`flex h-[52px] w-full cursor-text items-center gap-1 rounded-[14px] bg-field px-4 text-sm transition-colors ${
                        domainChecked && domainAvailable
                          ? "border-[1.5px] border-mint"
                          : domainChecked && domainAvailable === false
                            ? "border-[1.5px] border-[#ff5252]"
                            : "border border-field-line focus-within:border-[1.5px] focus-within:border-brand-primary"
                      }`}
                    >
                      <input
                        id="domain"
                        name="domain"
                        dir="ltr"
                        value={formData.domain}
                        onChange={handleDomainChange}
                        onBlur={() => {
                          if (!domainChecked && formData.domain) void checkSubdomain();
                        }}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="albaraka"
                        className="min-w-0 flex-1 bg-transparent text-left text-frost placeholder:text-dim focus:outline-none"
                      />
                      {isCheckingDomain ? (
                        <Loader2 size={14} className="shrink-0 animate-spin text-muted" />
                      ) : (
                        domainChecked &&
                        domainAvailable && (
                          <span dir="rtl" className="shrink-0 px-2 text-xs font-bold text-mint">✓ متاح</span>
                        )
                      )}
                      <span className="shrink-0 font-semibold text-muted">
                        .mel.iq
                      </span>
                    </label>
                  </Field>
                </div>

                {/* Moved here from the account step, which they made long.
                    Governorate is saved as the store's location; both start
                    the AI prompt off when the merchant goes home. */}
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

                <div className="flex flex-col gap-2 text-right">
                  <span className="text-[13px] font-semibold leading-5 text-muted">
                    شعار المتجر
                  </span>
                  {formData.logo ? (
                    <div className="flex items-center gap-4 rounded-[18px] border border-field-line bg-field p-4">
                      <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        <img
                          src={formData.logo as string}
                          alt="شعار المتجر"
                          className="size-full object-contain p-1"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-frost">
                        {formData.logoFile?.name || "الشعار"}
                      </span>
                      <button
                        type="button"
                        aria-label="إزالة الشعار"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, logo: null, logoFile: null }))
                        }
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-frost hover:bg-white/[0.08]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    // The whole box is the file input: tap anywhere, or drop.
                    <label
                      htmlFor="logo-upload"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) readLogoFile(file);
                      }}
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-field-line bg-field px-4 py-7 text-center transition-colors hover:border-brand-primary/60 hover:bg-white/[0.03]"
                    >
                      <span className="flex size-12 items-center justify-center rounded-full bg-brand-primary/15 text-brand-primary">
                        <Upload size={22} />
                      </span>
                      <span className="text-[13px] font-semibold text-frost">
                        اسحب شعارك هنا أو اضغط للرفع
                      </span>
                      <span className="text-[11px] text-dim">
                        PNG / SVG / WebP · حتى 2MB · يُفضّل مربع
                      </span>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        onChange={handleLogoUpload}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                <StepFooter
                  submitLabel="إنشاء المتجر"
                  busy={creatingStore}
                  disabled={isCheckingDomain || !formData.domain}
                />
              </form>
            </div>
            </div>
          )}

          {currentStep === 6 && createdStore && (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0a0d1c]/90 p-6 sm:p-9">
              <CheckoutDone
                slug={createdStore.slug}
                storeName={createdStore.name}
                planName={formData.plan?.name}
                planNote={noPaymentNeeded ? "الشهر الأول ببلاش" : undefined}
                onHome={() => navigate("/", { replace: true, state: FOCUS_PROMPT_STATE })}
              />
            </div>
          )}
          </div>
        </div>
      </div>
    </CheckoutShell>
  );
}

export default Checkout;
