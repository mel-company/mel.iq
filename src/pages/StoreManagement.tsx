import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useFetchStores, useUpdateStore } from "@/api/wrappers/store.wrappers";
import DomainSettingsFields from "@/components/DomainSettingsFields";
import BringYourOwnDomain from "@/components/BringYourOwnDomain";
import {
  getStoreDomainInputValue,
  getStoreDomainType,
  normalizePlatformSlug,
  useDomainCheck,
} from "@/hooks/useDomainCheck";
import {
  formatUsd,
  getDomainPurchasePricing,
} from "@/utils/domainPricing";
import {
  useFetchSubscriptions,
  useRenewSubscription,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
} from "@/api/wrappers/subscription.wrapper";
import {
  useInitPlatformPayment,
  usePlatformPaymentStatus,
  useSubscriptionQuote,
} from "@/api/wrappers/platform-payment.wrapper";
import {
  quoteDue,
  quoteExplanation,
  quoteNextCharge,
} from "@/utils/subscription-quote";
import {
  useFetchAllPlans,
  useFetchStorePlans,
  usePlanEntitlements,
} from "@/api/wrappers/plan.wrappers";
import type {
  LockedFeature,
  PlanFeatureKey,
} from "@/api/endpoints/plan.endpoint";
import { PlanUpgradeGate } from "@/components/PlanUpgradeGate";
import { featureLabel, isFeatureLocked } from "@/utils/planUpgrade";
import {
  AlertCircle,
  ArrowRightIcon,
  Check,
  Clock,
  CreditCard,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Minus,
  Rocket,
  RotateCcw,
  Share2,
  ShieldCheck,
  Store as StoreIcon,
  Tiktok,
  Trash2,
  X,
  XTwitter,
  type IconProps,
} from "@/components/icons";
import {
  cardFrame,
  cardPanel,
  getStatusBadge,
  PageGround,
  resolveStoreLogoUrl,
  StatusPill,
} from "@/components/dashboard/chrome";
import { toast } from "sonner";
import type { PlatformPaymentProvider } from "@/api/endpoints/platform-payment.endpoint";
import PaymentProviderPicker, {
  paymentProviderLabel,
} from "@/components/PaymentProviderPicker";

type DomainPath = "subdomain" | "buy" | "owned";
type ManageTab = "overview" | "domain" | "subscription" | "social";
type IconComponent = (props: IconProps) => React.ReactNode;

const MANAGE_TABS: {
  id: ManageTab;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
    { id: "overview", label: "نظرة عامة", icon: LayoutGrid },
    { id: "domain", label: "الدومين", icon: Globe },
    { id: "subscription", label: "الاشتراك", icon: CreditCard },
    { id: "social", label: "السوشيال", icon: Share2 },
  ];

const RENEWAL_RETURN_KEY = "mel_renewal_return";
const CHANGE_PLAN_RETURN_KEY = "mel_change_plan_return";
const DOMAIN_PURCHASE_RETURN_KEY = "mel_domain_purchase_return";
const LAST_PAYMENT_ID_KEY = "mel_last_platform_payment_id";

const LOCKED_FEATURE_ORDER: PlanFeatureKey[] = [
  "ai_editor",
  "team_users",
  "mobile_app",
];

// Types
interface Store {
  id: string;
  name: string;
  domain?: string;
  customDomain?: string | null;
  /** Public storefront URL from API, e.g. https://mystore.mel.iq */
  storeUrl?: string;
  is_deleted?: boolean;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  x?: string | null;
  logo?: string | null;
}

interface Subscription {
  id: string;
  storeId: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
  start_at?: string;
  end_at?: string;
  planId?: string;
  plan?: {
    id?: string;
    name: string;
    is_free?: boolean;
    monthly_price?: number;
    yearly_price?: number;
  };
}

interface TimeRemaining {
  expired: boolean;
  text: string;
  daysLeft?: number;
}

// Utils
const normalizeApiResponse = <T,>(data: any): T[] => {
  if (!data) return [];
  const normalized = data?.data || data?.stores || data?.subscriptions || data;
  return Array.isArray(normalized) ? normalized : [];
};

const getTimeRemaining = (endDate?: string): TimeRemaining | null => {
  if (!endDate) return null;

  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { expired: true, text: "منتهي" };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return {
      expired: false,
      text: `${days} يوم متبقي`,
      daysLeft: days,
    };
  }

  if (hours > 0) {
    return {
      expired: false,
      text: `${hours} ساعة متبقية`,
      daysLeft: 0,
    };
  }

  return {
    expired: false,
    text: `${minutes} دقيقة متبقية`,
    daysLeft: 0,
  };
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "غير محدد";

  try {
    return new Date(dateString).toLocaleDateString("ar-IQ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "تاريخ غير صالح";
  }
};

/** The bare host, for the places the chrome shows a URL rather than links it. */
const hostOf = (url?: string | null): string =>
  url?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

const isBasicPlan = (planName?: string): boolean => {
  if (!planName) return false;
  const plan = planName.toLowerCase();
  return (
    plan.includes("أولى") || plan.includes("first") || plan.includes("basic")
  );
};

/* ---------------------------------------------------------------------------
 * The page's own language
 *
 * Named rather than spelled out at each site, because the page is four tabs
 * and three dialogs of the same handful of surfaces, and the previous version
 * drifted precisely where they were retyped: five greens for one "confirm",
 * three greys for one "secondary".
 *
 * Both themes are carried, as `Dashboard` does — the two pages are a click
 * apart and have to agree, and the dashboard routes being dark-only today is
 * a routing decision, not a reason to let the light half rot.
 * ------------------------------------------------------------------------ */
const ink = {
  heading: "text-[#0b1020] dark:text-frost",
  body: "text-[#5b6178] dark:text-muted",
  faint: "text-[#8a90a8] dark:text-dim",
};
const hairline = "border-black/8 dark:border-white/8";
/** A field, a tile, a list row: the one ground that sits on the card. */
const inset =
  "border border-black/8 bg-black/[0.02] dark:border-white/8 dark:bg-white/[0.03]";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-gradient-to-l from-brand-violet to-brand-indigo text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] hover:opacity-90`;
const btnGhost = `${btnBase} border border-black/10 bg-black/[0.03] text-[#0b1020] hover:bg-black/[0.06] dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10`;
const btnMint = `${btnBase} border border-mint/35 bg-mint/12 text-[#00795a] hover:bg-mint/20 dark:text-mint`;
const btnAmber = `${btnBase} border border-amber/35 bg-amber/12 text-[#a35400] hover:bg-amber/20 dark:text-amber`;
const btnDanger = `${btnBase} border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 text-[#b62347] hover:bg-[#ff5c7a]/18 dark:text-[#ff8da3]`;
const btnDangerSolid = `${btnBase} bg-[#e5254f] text-white hover:bg-[#c81d42] dark:bg-[#ff5c7a] dark:text-[#2b0410] dark:hover:bg-[#ff7d94]`;

const fieldWrap =
  "flex h-[52px] w-full items-center gap-2.5 rounded-2xl border border-black/10 bg-black/[0.02] px-4 transition-colors focus-within:border-brand-indigo dark:border-field-line dark:bg-field dark:focus-within:border-brand-primary";
const fieldInput =
  "min-w-0 flex-1 bg-transparent text-sm text-[#0b1020] outline-none placeholder:text-[#a9adbe] dark:text-frost dark:placeholder:text-dim";

const fieldClass =
  "h-[52px] w-full rounded-2xl border border-black/10 bg-black/[0.02] px-4 text-sm text-[#0b1020] outline-none transition-colors placeholder:text-[#a9adbe] focus:border-brand-indigo dark:border-field-line dark:bg-field dark:text-frost dark:placeholder:text-dim dark:focus:border-brand-primary";

/** The gradient chip that heads a section and marks a selection. */
const GradientChip = ({
  icon: Icon,
  size = 36,
  iconSize = 17,
}: {
  icon: IconComponent;
  size?: number;
  iconSize?: number;
}) => (
  <span
    style={{ width: size, height: size }}
    className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-brand-indigo to-brand-violet text-white shadow-[0_12px_28px_-14px_rgba(79,96,249,0.95)]"
  >
    <Icon size={iconSize} />
  </span>
);

/**
 * The tab bar.
 *
 * The active pill is one element that travels to the tab you picked, rather
 * than a gradient switched on under whichever button is selected. That needs
 * the button's geometry, because the tabs are text-width and Arabic labels do
 * not agree with the English ones about how wide that is — so it is measured
 * in a layout effect, before paint, and a `ResizeObserver` re-measures when the
 * strip reflows or a font finishes loading.
 *
 * Its own component so those hooks are never reached conditionally: the page
 * returns a skeleton and a not-found state before it renders any of this.
 */
const ManageTabs = ({
  active,
  onChange,
}: {
  active: ManageTab;
  onChange: (tab: ManageTab) => void;
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef(new Map<ManageTab, HTMLButtonElement>());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current.get(active);
      if (!el) return;
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };

    measure();

    // The first measurement is taken against whatever font is on screen, and
    // Setar XS loads with `font-display: swap` — so the labels reflow a moment
    // later and the pill is left 10px short of the tab it belongs to. Both the
    // buttons and the strip are observed, and the font's own promise is waited
    // on, because the swap can land before the observer is attached.
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    tabRefs.current.forEach((el) => observer.observe(el));

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [active]);

  // On a narrow viewport the strip scrolls, and the tab that was just chosen
  // can sit off the edge of it.
  useEffect(() => {
    tabRefs.current
      .get(active)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <nav className="mx-auto max-w-7xl px-4 pb-4 pt-4 sm:px-6 lg:px-8">
      <div
        className={`no-scrollbar overflow-x-auto rounded-2xl p-1 ${inset} sm:w-fit`}
      >
        {/* The track is positioned and the scroller is not, so the pill and the
            buttons share one coordinate space. With the pill's offsetParent as
            the scroll container itself they do not: under RTL an overflowing
            strip puts the content origin at the right, and `left: 0` and
            `offsetLeft` then disagree by the whole scrollable width — which is
            invisible on a desktop, where the strip is `w-fit` and never
            scrolls. */}
        <div ref={listRef} className="relative flex w-max gap-1">
          {pill && (
            <span
              aria-hidden
              className="tab-pill absolute inset-y-0 left-0 rounded-xl bg-gradient-to-l from-brand-violet to-brand-indigo shadow-[0_12px_28px_-16px_rgba(79,96,249,0.95)]"
              style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
            />
          )}

          {MANAGE_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              ref={(el) => {
                if (el) tabRefs.current.set(id, el);
                else tabRefs.current.delete(id);
              }}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active === id ? "page" : undefined}
              className={`relative z-10 inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors duration-300 ${
                active === id
                  ? "text-white"
                  : `${ink.body} hover:text-[#0b1020] dark:hover:text-frost`
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

/* ---------------------------------------------------------------------------
 * The storefront preview
 *
 * The frame is about 700px wide, and at that width a storefront renders its
 * *phone* layout — one column under a bottom tab bar. So a merchant checking
 * the design they just published was shown the one they were not looking for.
 *
 * The iframe is therefore given a real desktop viewport and scaled down to fit
 * the column. Small, but it is the right picture.
 * ------------------------------------------------------------------------ */
const PREVIEW_VIEWPORT = { width: 1280, height: 800 };

/**
 * Taken off the left edge so the storefront's own scrollbar falls outside the
 * clip. Left, because every published storefront is `<html dir="rtl">` and
 * that is the side the browser puts it on — the iframe is laid out this much
 * wider than the window it is seen through, so nothing is cropped.
 */
const PREVIEW_SCROLLBAR_GUTTER = 18;

const StorePreviewFrame = ({ url, title }: { url: string; title: string }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => setScale(host.clientWidth / PREVIEW_VIEWPORT.width);
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      // The aspect ratio holds the height before the width has been measured,
      // so the card does not resize under the merchant on first paint.
      style={{
        aspectRatio: `${PREVIEW_VIEWPORT.width} / ${PREVIEW_VIEWPORT.height}`,
      }}
      className="relative w-full overflow-hidden bg-ink"
    >
      {scale > 0 && (
        <iframe
          src={url}
          title={title}
          allow="fullscreen"
          className="absolute top-0 origin-top-left border-0"
          style={{
            left: -PREVIEW_SCROLLBAR_GUTTER * scale,
            width: PREVIEW_VIEWPORT.width + PREVIEW_SCROLLBAR_GUTTER,
            height: PREVIEW_VIEWPORT.height,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
};

const SectionCard = ({
  title,
  description,
  icon,
  action,
  children,
  bodyClassName = "p-6",
  className = "",
}: {
  title?: string;
  description?: string;
  icon?: IconComponent;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}) => (
  <section className={`${cardFrame} ${className}`}>
    <div className={`${cardPanel} overflow-hidden`}>
      {(title || description) && (
        <div
          className={`flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5 ${hairline}`}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && <GradientChip icon={icon} />}
            <div className="min-w-0">
              {title && (
                <h2 className={`text-base font-bold ${ink.heading}`}>
                  {title}
                </h2>
              )}
              {description && (
                <p className={`mt-1 text-sm leading-6 ${ink.body}`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  </section>
);

const StatTile = ({
  label,
  value,
  hint,
  icon: Icon,
  ltr = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: IconComponent;
  ltr?: boolean;
}) => (
  <div className={`rounded-2xl p-4 backdrop-blur-xl ${inset}`}>
    <div className="flex items-center gap-1">
      {Icon && <Icon size={20} className={ink.faint} />}
      <p className={`text-xs font-semibold ${ink.body}`}>{label}</p>
    </div>
    {/* An LTR value still starts at the page's own edge: left-aligning it in a
        wide tile strands it under nothing, a column away from its label. */}
    <div
      dir={ltr ? "ltr" : undefined}
      className={`mt-2 truncate text-sm font-bold ${ink.heading} ${ltr ? "text-right" : ""
        }`}
    >
      {value}
    </div>
    {hint && <p className={`mt-1 truncate text-xs ${ink.faint}`}>{hint}</p>}
  </div>
);

/**
 * A card the merchant picks between: a domain path, a renewal term, a plan.
 *
 * One component for all three because they were three different-looking
 * controls doing one job — a black outline here, a green one there, a violet
 * one in the third dialog.
 */
const ChoiceCard = ({
  selected,
  disabled,
  onClick,
  className = "",
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={`relative rounded-2xl border p-4 text-right transition-all disabled:cursor-not-allowed disabled:opacity-55 ${selected
      ? "border-brand-indigo/55 bg-brand-indigo/8 dark:border-brand-primary/45 dark:bg-brand-primary/8"
      : `${hairline} bg-black/[0.02] hover:border-brand-indigo/30 dark:bg-white/[0.02] dark:hover:border-white/20`
      } ${className}`}
  >
    {children}
    {selected && (
      <span className="absolute top-3 end-3 flex size-5 items-center justify-center rounded-full bg-gradient-to-b from-brand-indigo to-brand-violet text-white">
        <Check size={12} />
      </span>
    )}
  </button>
);

/**
 * The dialog shell.
 *
 * The three dialogs were each built from scratch — a different header, a
 * different close button, a different pair of footer buttons — so they looked
 * like three products. The entrance uses the keyframes `index.css` already
 * defines for the AI dialogs, which honour `prefers-reduced-motion`.
 */
const Modal = ({
  title,
  tone = "default",
  wide = false,
  onClose,
  children,
}: {
  title: string;
  tone?: "default" | "danger";
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={title}
    className="fixed inset-0 z-50 flex animate-[modal-fade_160ms_ease-out] items-center justify-center bg-[#05030f]/70 p-4 backdrop-blur-sm"
  >
    <div
      className={`${cardFrame} w-full animate-[modal-rise_200ms_ease-out] ${wide ? "max-w-4xl" : "max-w-md"
        }`}
    >
      <div className={`${cardPanel} max-h-[88vh] overflow-y-auto`}>
        <div
          className={`sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-6 py-5 backdrop-blur-xl ${hairline} bg-white/85 dark:bg-[#0a0722]/90`}
        >
          <h2
            className={`text-lg font-bold ${tone === "danger"
              ? "text-[#b62347] dark:text-[#ff8da3]"
              : ink.heading
              }`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className={`rounded-xl p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${ink.body}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  </div>
);

/** The row that closes a dialog: confirm on the right, dismiss beside it. */
const ModalFooter = ({ children }: { children: React.ReactNode }) => (
  <div className={`mt-6 flex flex-wrap justify-end gap-3 border-t pt-5 ${hairline}`}>
    {children}
  </div>
);

const SubscriptionPanel = ({
  subscription,
  isPlanBasic,
  lockedFeatures,
  upgradePlanName,
  onRenew,
  onPause,
  onResume,
  onCancel,
  onUpgrade,
  isPending,
}: {
  subscription: Subscription | null;
  isPlanBasic: boolean;
  /** As the server sends it: objects, not strings. See `isFeatureLocked`. */
  lockedFeatures?: Array<LockedFeature | string>;
  upgradePlanName?: string;
  onRenew: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onUpgrade: () => void;
  isPending: {
    renew: boolean;
    pause: boolean;
    resume: boolean;
    cancel: boolean;
    upgrade: boolean;
  };
}) => {
  if (!subscription) {
    return (
      <div
        className={`flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center ${hairline}`}
      >
        <GradientChip icon={CreditCard} size={56} iconSize={24} />
        <p className={`mt-5 text-base font-bold ${ink.heading}`}>
          لا يوجد اشتراك نشط
        </p>
        <p className={`mt-1.5 text-sm ${ink.body}`}>
          هذا المتجر غير مرتبط باشتراك حالياً
        </p>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining(subscription.end_at);
  const statusBadge = getStatusBadge(subscription.status);
  /** Urgency, on the one number the merchant is actually scanning for. */
  const remainingTone = timeRemaining?.expired
    ? "text-[#b62347] dark:text-[#ff8da3]"
    : (timeRemaining?.daysLeft ?? 0) <= 7
      ? "text-[#a35400] dark:text-amber"
      : "text-[#00795a] dark:text-mint";

  const lockedOrdered = LOCKED_FEATURE_ORDER.filter((f) =>
    isFeatureLocked(lockedFeatures, f),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="الحالة"
          icon={ShieldCheck}
          value={<StatusPill badge={statusBadge} />}
        />
        <StatTile
          label="الخطة"
          icon={CreditCard}
          value={subscription.plan?.name || "غير محدد"}
        />
        <StatTile
          label="الوقت المتبقي"
          icon={Clock}
          value={
            <span className={remainingTone}>{timeRemaining?.text || "—"}</span>
          }
        />
        <StatTile
          label="تاريخ البدء"
          icon={Clock}
          value={formatDate(subscription.start_at)}
        />
        <StatTile
          label="تاريخ الانتهاء"
          icon={Clock}
          value={formatDate(subscription.end_at)}
        />
      </div>

      {lockedOrdered.length > 0 && (
        <div className="space-y-3">
          <p className={`text-xs font-bold ${ink.body}`}>ميزات مقفلة في خطتك</p>
          {lockedOrdered.map((feature) => (
            <PlanUpgradeGate
              key={feature}
              feature={feature}
              requiredPlanName={upgradePlanName || "MEL PLUS"}
              message={`${featureLabel(feature)} غير مشمول في خطتك الحالية.`}
              onUpgradeClick={onUpgrade}
              className="border-black/8 dark:border-white/10 [&_.text-frost]:text-[#0b1020] dark:[&_.text-frost]:text-frost [&_.text-muted]:text-[#5b6178] dark:[&_.text-muted]:text-muted [&_.text-dim]:text-[#8a90a8] dark:[&_.text-dim]:text-dim"
            />
          ))}
        </div>
      )}

      {isPlanBasic ? (
        <div className={`rounded-2xl p-5 ${inset}`}>
          <p className={`text-sm font-bold ${ink.heading}`}>الخطة الأولى</p>
          <p className={`mt-1.5 text-sm leading-6 ${ink.body}`}>
            الترقية والتجديد غير متاحين في هذه الخطة
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className={`mb-3 text-xs font-bold ${ink.body}`}>
              إجراءات الاشتراك
            </p>
            <div className="flex flex-wrap gap-2.5">
              {subscription.status === "ACTIVE" && (
                <>
                  <button
                    onClick={onRenew}
                    disabled={isPending.renew}
                    className={btnMint}
                  >
                    <RotateCcw size={16} />
                    {isPending.renew ? "جاري..." : "تجديد"}
                  </button>
                  <button
                    onClick={onUpgrade}
                    disabled={isPending.upgrade}
                    className={btnPrimary}
                  >
                    <Rocket size={16} />
                    {isPending.upgrade ? "جاري..." : "ترقية الخطة"}
                  </button>
                  <button
                    onClick={onPause}
                    disabled={isPending.pause}
                    className={btnAmber}
                  >
                    <Minus size={16} />
                    {isPending.pause ? "جاري..." : "إيقاف مؤقت"}
                  </button>
                </>
              )}

              {subscription.status === "INACTIVE" && (
                <button
                  onClick={onResume}
                  disabled={isPending.resume}
                  className={btnMint}
                >
                  <RotateCcw size={16} />
                  {isPending.resume ? "جاري..." : "استئناف"}
                </button>
              )}

              {(subscription.status === "CANCELLED" ||
                subscription.status === "EXPIRED") && (
                  <button
                    onClick={onUpgrade}
                    disabled={isPending.upgrade}
                    className={btnPrimary}
                  >
                    <Rocket size={16} />
                    {isPending.upgrade ? "جاري..." : "ترقية / تجديد"}
                  </button>
                )}
            </div>
          </div>

          {(subscription.status === "ACTIVE" ||
            subscription.status === "INACTIVE") && (
              <div className="rounded-2xl border border-[#ff5c7a]/25 bg-[#ff5c7a]/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-[#b62347] dark:text-[#ff8da3]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#b62347] dark:text-[#ff8da3]">
                      منطقة الخطر
                    </p>
                    <p className={`mt-1 text-sm leading-6 ${ink.body}`}>
                      إلغاء الاشتراك يحذف المتجر. يمكن استرجاعه خلال 30 يوم.
                    </p>
                    <button
                      onClick={onCancel}
                      disabled={isPending.cancel}
                      className={`${btnDanger} mt-4`}
                    >
                      <Trash2 size={16} />
                      {isPending.cancel
                        ? "جاري..."
                        : "إلغاء الاشتراك وحذف المتجر"}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="dark relative min-h-screen">
    <PageGround />
    <div className="relative">
      <div className={`border-b ${hairline}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className={`size-11 animate-pulse rounded-2xl ${inset}`} />
          <div className="space-y-2">
            <div className={`h-5 w-44 animate-pulse rounded-lg ${inset}`} />
            <div className={`h-3 w-28 animate-pulse rounded-md ${inset}`} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-[86px] animate-pulse rounded-2xl ${inset}`} />
          ))}
        </div>
        <div className={cardFrame}>
          <div className={`${cardPanel} p-6`}>
            <div className={`h-[26rem] animate-pulse rounded-2xl ${inset}`} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StoreNotFound = ({ onBack }: { onBack: () => void }) => (
  <div className="dark relative flex min-h-screen items-center justify-center px-4">
    <PageGround />
    <div className={`${cardFrame} relative w-full max-w-md`}>
      <div className={`${cardPanel} flex flex-col items-center px-6 py-14 text-center`}>
        <span className="flex size-20 items-center justify-center rounded-3xl border border-[#ff5c7a]/30 bg-[#ff5c7a]/10 text-[#b62347] dark:text-[#ff8da3]">
          <AlertCircle size={34} />
        </span>
        <h2 className={`mt-6 text-xl font-bold ${ink.heading}`}>
          المتجر غير موجود
        </h2>
        <p className={`mt-2 max-w-xs text-sm leading-7 ${ink.body}`}>
          الرابط الذي فتحته لا يشير إلى متجر في حسابك
        </p>
        <button onClick={onBack} className={`${btnPrimary} mt-7`}>
          <ArrowRightIcon size={16} />
          العودة للوحة التحكم
        </button>
      </div>
    </div>
  </div>
);

// Main Component
function StoreManagement() {
  const params = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // التأكد من أن storeId موجود وصحيح (إزالة أي domain إذا كان موجوداً)
  const storeId = params.storeId?.split("/")[0] || params.storeId;

  const { data: storesData, isLoading: storesLoading, refetch: refetchStores } = useFetchStores();
  const {
    data: subscriptionsData,
    isLoading: subscriptionsLoading,
    refetch: refetchSubscriptions,
  } = useFetchSubscriptions({ storeId });

  const returnPaymentId = searchParams.get("paymentId");
  const { data: returnPayment } = usePlatformPaymentStatus(
    returnPaymentId,
    Boolean(returnPaymentId),
  );
  const returnStatus = returnPayment?.status;
  const handledReturnRef = useRef<string | null>(null);

  // After the gateway: land here with ?paymentId= — status comes from the API.
  useEffect(() => {
    if (!returnPaymentId) return;
    if (handledReturnRef.current === returnPaymentId) return;
    if (
      returnStatus !== "PAID" &&
      returnStatus !== "FAILED" &&
      returnStatus !== "EXPIRED"
    ) {
      return;
    }

    handledReturnRef.current = returnPaymentId;

    const domainReturnRaw = sessionStorage.getItem(DOMAIN_PURCHASE_RETURN_KEY);
    const domainReturn = domainReturnRaw
      ? (JSON.parse(domainReturnRaw) as { storeId?: string; domain?: string })
      : null;
    const isDomainPurchase = Boolean(domainReturn?.domain);
    const isChangePlan = Boolean(sessionStorage.getItem(CHANGE_PLAN_RETURN_KEY));

    if (returnStatus === "PAID") {
      if (isDomainPurchase) {
        toast.success("تم الدفع بنجاح! سيتم تسجيل الدومين وربطه بمتجرك.");
        void refetchStores();
      } else if (isChangePlan) {
        toast.success("تم الدفع بنجاح وتمت ترقية الخطة");
        void refetchSubscriptions();
      } else {
        toast.success("تم الدفع بنجاح وتم تجديد الاشتراك");
        void refetchSubscriptions();
      }
    } else {
      toast.error(
        isDomainPurchase
          ? "فشلت عملية دفع الدومين. حاول مرة أخرى."
          : isChangePlan
            ? "فشلت عملية ترقية الخطة. حاول مرة أخرى."
            : "فشلت عملية الدفع. حاول مرة أخرى.",
      );
    }

    sessionStorage.removeItem(RENEWAL_RETURN_KEY);
    sessionStorage.removeItem(CHANGE_PLAN_RETURN_KEY);
    sessionStorage.removeItem(DOMAIN_PURCHASE_RETURN_KEY);
    sessionStorage.removeItem(LAST_PAYMENT_ID_KEY);

    const next = new URLSearchParams(searchParams);
    next.delete("paymentId");
    next.delete("result");
    next.delete("status");
    setSearchParams(next, { replace: true });
  }, [
    returnPaymentId,
    returnStatus,
    searchParams,
    setSearchParams,
    refetchSubscriptions,
    refetchStores,
  ]);

  const renewMutation = useRenewSubscription();
  const initPaymentMutation = useInitPlatformPayment();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();
  const cancelMutation = useCancelSubscription();
  const updateStoreMutation = useUpdateStore();
  const { data: plansData } = useFetchAllPlans();
  const { data: storePlansData } = useFetchStorePlans(storeId, Boolean(storeId));
  const { data: entitlements } = usePlanEntitlements(
    storeId,
    Boolean(storeId),
  );

  const {
    domain,
    domainType,
    domainChecked,
    domainAvailable,
    isCheckingDomain,
    dynadotResult,
    setDomain,
    setDomainType,
    handleDomainChange,
    handleDomainTypeChange,
    checkDomain,
    resetCheck,
  } = useDomainCheck();

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Renew modal state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [paymentProvider, setPaymentProvider] =
    useState<PlatformPaymentProvider | null>(null);

  // Cancel/Delete store modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleteStoreName, setDeleteStoreName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ManageTab>("overview");
  const [domainPath, setDomainPath] = useState<DomainPath>("subdomain");

  const stores = useMemo(() => {
    const normalized = normalizeApiResponse<Store>(storesData);
    return normalized.filter((store) => !store.is_deleted);
  }, [storesData]);

  const store = useMemo(
    () => stores.find((s) => s.id === storeId),
    [stores, storeId]
  );

  // Social media form state
  const [socialMedia, setSocialMedia] = useState({
    instagram: "",
    facebook: "",
    tiktok: "",
    x: "",
  });

  const subscription = useMemo(() => {
    const normalized = normalizeApiResponse<Subscription>(subscriptionsData);
    return normalized[0] || null;
  }, [subscriptionsData]);

  /**
   * What the chosen renewal actually costs, asked of the server each time the
   * duration changes.
   *
   * The modal offered 1, 6 and 12 months and a free-text box and named no price
   * at all, so a merchant chose a term without being told what it came to — and
   * the amount is not derivable here anyway, because the intro ladder lives on
   * their subscription.
   */
  const renewDuration = customDuration
    ? parseInt(customDuration)
    : selectedDuration;
  const renewPlanId = subscription?.plan?.id || subscription?.planId || null;
  const renewQuote = useSubscriptionQuote(
    showRenewModal &&
      renewPlanId &&
      storeId &&
      // Only the server's own bounds. An earlier version also demanded a
      // multiple of 12 above 12 months, which suppressed the quote for 13–23 —
      // durations that bill monthly and are perfectly priceable. The merchant
      // typed 13 into the box and the price went blank.
      renewDuration >= 1 &&
      renewDuration <= 24
      ? {
          type: "RENEWAL",
          planId: String(renewPlanId),
          storeId,
          durationMonths: renewDuration,
          billingPeriod: renewDuration % 12 === 0 ? "YEARLY" : "MONTHLY",
        }
      : null,
  );

  /**
   * Whether this renewal needs a gateway at all.
   *
   * Hiding the picker is not enough on its own — `handleConfirmRenew` refuses
   * without a provider, so a free renewal would have been blocked by a control
   * that was no longer on screen. Both read this.
   *
   * Defaults to "yes" until the quote arrives: offering a payment method that
   * turns out to be unnecessary is recoverable, demanding none and then needing
   * one is not.
   */
  const renewNeedsPayment =
    renewQuote.data === undefined ? true : renewQuote.data.amount > 0;

  /** The same question for the plan the upgrade modal has selected. */
  const upgradeQuote = useSubscriptionQuote(
    showUpgradeModal && selectedPlanId && storeId
      ? {
          type: "CHANGE_PLAN",
          planId: selectedPlanId,
          storeId,
          billingPeriod: "MONTHLY",
        }
      : null,
  );

  /** As `renewNeedsPayment`, for the plan the upgrade modal has selected. */
  const upgradeNeedsPayment =
    upgradeQuote.data === undefined ? true : upgradeQuote.data.amount > 0;

  const storeUrl =
    store?.storeUrl ||
    (store?.customDomain
      ? `https://${store.customDomain.replace(/^https?:\/\//, "")}`
      : store?.domain
        ? `https://${normalizePlatformSlug(store.domain)}.mel.iq`
        : undefined);
  const isLoading = storesLoading || subscriptionsLoading;
  const isPlanBasic = isBasicPlan(subscription?.plan?.name);

  // Update social media state when store changes
  useEffect(() => {
    if (store) {
      setSocialMedia({
        instagram: store.instagram || "",
        facebook: store.facebook || "",
        tiktok: store.tiktok || "",
        x: store.x || "",
      });

      setDomain(getStoreDomainInputValue(store));
      setDomainType(getStoreDomainType(store));
      resetCheck();
    }
  }, [store, setDomain, setDomainType, resetCheck]);

  const handleRenew = () => {
    setPaymentProvider(null);
    setShowRenewModal(true);
  };

  const handleConfirmRenew = () => {
    if (!subscription?.id) return;

    const duration = customDuration
      ? parseInt(customDuration)
      : selectedDuration;

    if (!duration || duration < 1) {
      toast.error("الرجاء اختيار عدد أشهر صحيح");
      return;
    }

    // Matches the server's cap, so the refusal is readable here instead of
    // arriving as a validation error on a number this form asked for.
    if (duration > 24) {
      toast.error("أقصى مدة للتجديد 24 شهراً");
      return;
    }

    const planId = subscription.plan?.id || subscription.planId;
    const isFree =
      subscription.plan?.is_free === true ||
      !(Number(subscription.plan?.monthly_price) > 0);

    if (!isFree) {
      if (!planId || !storeId) {
        toast.error("تعذر تحديد الخطة للتجديد");
        return;
      }
      // Only when money is actually moving. A renewal the intro month covers
      // needs no gateway, and the picker is hidden for it — demanding one here
      // would block it behind a control that is not on screen.
      if (renewNeedsPayment && !paymentProvider) {
        toast.error("الرجاء اختيار طريقة الدفع");
        return;
      }

      sessionStorage.setItem(
        RENEWAL_RETURN_KEY,
        JSON.stringify({ storeId, durationMonths: duration }),
      );

      initPaymentMutation.mutate(
        {
          type: "RENEWAL",
          planId,
          storeId,
          // Omitted for a renewal with nothing to pay — the server resolves its
          // own default and then never opens a transaction.
          provider: paymentProvider ?? undefined,
          durationMonths: duration,
          /**
           * Only a whole number of years bills yearly.
           *
           * This was `duration >= 12`, and the yearly price is flat per
           * payment — so 13 to 24 months all cost one year, and the box below
           * this modal's presets lets the merchant type the number. The server
           * now refuses the combination outright; sending the period that
           * matches the months is what keeps every duration purchasable, with
           * 13–23 billed monthly (dearer than a year, which is correct — they
           * are not buying a year).
           */
          billingPeriod: duration % 12 === 0 ? "YEARLY" : "MONTHLY",
          returnBaseUrl: `${window.location.origin}/store/${storeId}/manage`,
        },
        {
          onSuccess: (data) => {
            const redirectUrl = data?.redirectUrl;
            const paymentId = data?.id;

            /**
             * Already settled, with no gateway page — and on this surface the
             * term has **already been extended**.
             *
             * A renewal priced at 0 IQD (the subscription has not claimed its
             * intro month) is written `PAID` and fulfilled server-side before
             * this callback runs. Reporting «تعذر بدء عملية الدفع» told the
             * merchant their renewal had failed on the one path where it had
             * definitely succeeded, and left them pressing the button again.
             */
            if (data?.status === "PAID") {
              sessionStorage.removeItem(RENEWAL_RETURN_KEY);
              toast.success(
                Number(data?.amount) > 0
                  ? "تم الدفع بنجاح وتم تجديد الاشتراك"
                  : "تم تجديد الاشتراك — لا مبلغ مستحق",
              );
              setShowRenewModal(false);
              setSelectedDuration(1);
              setCustomDuration("");
              setPaymentProvider(null);
              void refetchSubscriptions();
              return;
            }

            if (!redirectUrl) {
              sessionStorage.removeItem(RENEWAL_RETURN_KEY);
              toast.error("تعذر بدء عملية الدفع");
              return;
            }
            if (paymentId) {
              sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
            }
            window.location.href = redirectUrl;
          },
          onError: (error: any) => {
            sessionStorage.removeItem(RENEWAL_RETURN_KEY);
            toast.error(
              error?.response?.data?.message || "حدث خطأ في بدء الدفع",
            );
            console.error("Error initiating renewal payment:", error);
          },
        },
      );
      return;
    }

    renewMutation.mutate(
      { id: subscription.id, durationMonths: duration },
      {
        onSuccess: () => {
          toast.success(
            `تم تجديد الاشتراك بنجاح لمدة ${duration} ${duration === 1 ? "شهر" : "أشهر"
            }`,
          );
          setShowRenewModal(false);
          setSelectedDuration(1);
          setCustomDuration("");
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || "حدث خطأ في تجديد الاشتراك",
          );
          console.error("Error renewing subscription:", error);
        },
      },
    );
  };

  const handlePause = () => {
    if (subscription?.id) {
      pauseMutation.mutate(subscription.id, {
        onSuccess: () => {
          toast.success("تم إيقاف الاشتراك بنجاح");
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في إيقاف الاشتراك");
          console.error("Error pausing subscription:", error);
        },
      });
    }
  };

  const handleResume = () => {
    if (subscription?.id) {
      resumeMutation.mutate(subscription.id, {
        onSuccess: () => {
          toast.success("تم استئناف الاشتراك بنجاح");
        },
        onError: (error: any) => {
          toast.error("حدث خطأ في استئناف الاشتراك");
          console.error("Error resuming subscription:", error);
        },
      });
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!subscription?.id || !store) return;

    if (deleteStoreName.trim() !== store.name.trim()) {
      toast.error("اسم المتجر غير متطابق. الرجاء إدخال الاسم الصحيح.");
      return;
    }

    cancelMutation.mutate(subscription.id, {
      onSuccess: () => {
        toast.success(
          "تم إلغاء الاشتراك. يبقى المتجر يعمل حتى نهاية المدة المدفوعة.",
        );
        setShowCancelModal(false);
        setDeleteStoreName("");
        // Stay here and show the new state. It navigated away because it
        // believed the store had been deleted; the store is still running, and
        // the panel the merchant is standing in front of is where the end date
        // and the renew button are.
        void refetchSubscriptions();
      },
      onError: (error: any) => {
        toast.error("حدث خطأ في إلغاء الاشتراك");
        console.error("Error cancelling subscription:", error);
      },
    });
  };

  const handleUpgrade = () => {
    setPaymentProvider(null);
    const preferred =
      entitlements?.upgradeTo?.planId ||
      // `.data`, not `.plans` — `/plan/store-plans` answers `{ currentPlan, data }`
      // and the old spelling was silently undefined on every read.
      storePlansData?.data?.find(
        (p) =>
          String(p.code || p.name || "")
            .toUpperCase()
            .includes("PLUS"),
      )?.id ||
      null;
    setSelectedPlanId(preferred);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = () => {
    if (!subscription?.id || !selectedPlanId) {
      toast.error("الرجاء اختيار خطة للترقية");
      return;
    }
    if (!storeId) {
      toast.error("تعذر تحديد المتجر");
      return;
    }
    // Only when money is moving — a plan change the intro month covers opens no
    // transaction, and its picker is hidden.
    if (upgradeNeedsPayment && !paymentProvider) {
      toast.error("الرجاء اختيار طريقة الدفع");
      return;
    }

    /**
     * Every plan change goes through CHANGE_PLAN, including one that costs
     * nothing.
     *
     * There used to be a branch here for a zero-priced target that called
     * `PUT /subscription/:id` — **a route that has never existed**. The server
     * has `system/:id` (operator) and `change-plan/:planId` (store token); this
     * page holds a user token and so can reach neither, and the call 404s. It
     * was unreachable while the catalogue had no zero-priced plan, and an
     * operator can create one from the admin dashboard, so it was a live 404
     * waiting for that.
     *
     * CHANGE_PLAN handles it correctly now: a period that prices to nothing is
     * written `PAID`, the plan is applied, and the `status === "PAID"` branch
     * below takes it. One path, and the server decides whether money moves.
     */
    sessionStorage.setItem(
      CHANGE_PLAN_RETURN_KEY,
      JSON.stringify({ storeId, planId: selectedPlanId }),
    );

    initPaymentMutation.mutate(
      {
        type: "CHANGE_PLAN",
        planId: selectedPlanId,
        storeId,
        billingPeriod: "MONTHLY",
        provider: paymentProvider ?? undefined,
        returnBaseUrl: `${window.location.origin}/store/${storeId}/manage`,
      },
      {
        onSuccess: (data) => {
          const redirectUrl = data?.redirectUrl;
          const paymentId = data?.id;

          /**
           * Settled with no gateway page, and the plan has already changed:
           * `fulfill` writes the new `planId` before this returns. Calling that
           * a failure left the merchant on the old plan as far as they knew,
           * while the store had moved to the new one.
           */
          if (data?.status === "PAID") {
            sessionStorage.removeItem(CHANGE_PLAN_RETURN_KEY);
            toast.success(
              Number(data?.amount) > 0
                ? "تم الدفع بنجاح وتمت ترقية الخطة"
                : "تمت ترقية الخطة — لا مبلغ مستحق",
            );
            setShowUpgradeModal(false);
            setSelectedPlanId(null);
            setPaymentProvider(null);
            void refetchSubscriptions();
            return;
          }

          if (!redirectUrl) {
            toast.error("تعذر بدء عملية الدفع");
            sessionStorage.removeItem(CHANGE_PLAN_RETURN_KEY);
            return;
          }
          if (paymentId) {
            sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
          }
          window.location.href = redirectUrl;
        },
        onError: (error: any) => {
          sessionStorage.removeItem(CHANGE_PLAN_RETURN_KEY);
          toast.error(
            error?.response?.data?.message || "حدث خطأ في بدء دفع الترقية",
          );
          console.error("Error initiating change-plan payment:", error);
        },
      },
    );
  };

  const handleSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSocialMedia({
      ...socialMedia,
      [e.target.name]: e.target.value,
    });
  };

  const handleDomainSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeId || !store) return;

    const normalizedDomain = domain.trim().toLowerCase();
    const isCustomPurchase = domainPath === "buy";
    const customDomainAlreadyLinked =
      (store.customDomain || "").trim().toLowerCase() === normalizedDomain;

    if (isCustomPurchase) {
      if (customDomainAlreadyLinked) {
        toast.info("هذا الدومين المخصص مربوط بالفعل");
        return;
      }
    } else {
      const originalSlug = normalizePlatformSlug(store.domain);
      if (normalizedDomain === originalSlug) {
        toast.info("لم يتم تغيير الدومين");
        return;
      }
    }

    if (!domainChecked || domainAvailable !== true) {
      toast.error("الرجاء التحقق من توفر الدومين أولاً");
      return;
    }

    if (domainPath === "buy") {
      const pricing = getDomainPurchasePricing(dynadotResult?.price);
      if (!pricing) {
        toast.error("تعذر حساب سعر الدومين. أعد التحقق من التوفر.");
        return;
      }

      if (!paymentProvider) {
        toast.error("الرجاء اختيار طريقة الدفع");
        return;
      }

      sessionStorage.setItem(
        DOMAIN_PURCHASE_RETURN_KEY,
        JSON.stringify({ storeId, domain: normalizedDomain }),
      );

      initPaymentMutation.mutate(
        {
          type: "DOMAIN_REGISTRATION",
          storeId,
          domain: normalizedDomain,
          provider: paymentProvider,
          returnBaseUrl: `${window.location.origin}/store/${storeId}/manage`,
        },
        {
          onSuccess: (data) => {
            const redirectUrl = data?.redirectUrl;
            const paymentId = data?.id;
            if (!redirectUrl) {
              toast.error("تعذر بدء عملية الدفع");
              return;
            }
            if (paymentId) {
              sessionStorage.setItem(LAST_PAYMENT_ID_KEY, String(paymentId));
            }
            window.location.href = redirectUrl;
          },
          onError: (error: any) => {
            sessionStorage.removeItem(DOMAIN_PURCHASE_RETURN_KEY);
            console.error("Error initiating domain payment:", error);
            toast.error(
              error?.response?.data?.message ||
              "تعذر بدء الدفع. حاول مرة أخرى.",
            );
          },
        },
      );
      return;
    }

    updateStoreMutation.mutate(
      {
        id: storeId,
        data: {
          domain: normalizePlatformSlug(domain),
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث دومين المنصة بنجاح");
          resetCheck();
          void refetchStores();
        },
        onError: (error: any) => {
          console.error("Error updating platform domain:", error);
          toast.error(
            error?.response?.data?.message || "حدث خطأ في تحديث الدومين",
          );
        },
      },
    );
  };

  const handleSocialMediaSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (storeId) {
      updateStoreMutation.mutate(
        {
          id: storeId,
          data: {
            instagram: socialMedia.instagram || null,
            facebook: socialMedia.facebook || null,
            tiktok: socialMedia.tiktok || null,
            x: socialMedia.x || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("تم تحديث حسابات الوسائط الاجتماعية بنجاح");
          },
          onError: (error) => {
            console.error("Error updating social media:", error);
            toast.error("حدث خطأ في تحديث حسابات الوسائط الاجتماعية");
          },
        }
      );
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (!store) return <StoreNotFound onBack={() => navigate("/dashboard")} />;

  const normalizedDomainInput = domain.trim().toLowerCase();
  const customDomainAlreadyLinked =
    (store.customDomain || "").trim().toLowerCase() === normalizedDomainInput;
  const subdomainChanged =
    normalizedDomainInput !== normalizePlatformSlug(store.domain).toLowerCase();

  const canPurchaseCustomDomain =
    domainPath === "buy" &&
    domainChecked &&
    domainAvailable === true &&
    !customDomainAlreadyLinked &&
    getDomainPurchasePricing(dynadotResult?.price) != null;

  const canUpdateSubdomain =
    domainPath === "subdomain" &&
    subdomainChanged &&
    domainChecked &&
    domainAvailable === true;

  const canSaveDomain = canPurchaseCustomDomain || canUpdateSubdomain;
  const isSavingDomain =
    updateStoreMutation.isPending || initPaymentMutation.isPending;
  const domainPricing =
    domainPath === "buy" ? getDomainPurchasePricing(dynadotResult?.price) : null;

  const platformSlug = normalizePlatformSlug(store.domain);
  const platformUrl = platformSlug ? `https://${platformSlug}.mel.iq` : null;
  const dashboardUrl = platformSlug
    ? `https://dash.${platformSlug}.mel.iq`
    : null;
  const logoUrl = resolveStoreLogoUrl(store.logo);
  const subscriptionBadge = subscription
    ? getStatusBadge(subscription.status)
    : null;

  /** How far through its term the subscription is, for the overview meter. */
  const termProgress = (() => {
    const start = new Date(subscription?.start_at || "").getTime();
    const end = new Date(subscription?.end_at || "").getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return null;
    }
    return Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
  })();
  const termRemaining = subscription
    ? getTimeRemaining(subscription.end_at)
    : null;

  const quickLinks: { label: string; url: string; icon: IconComponent }[] = [];
  if (storeUrl) quickLinks.push({ label: "المتجر", url: storeUrl, icon: StoreIcon });
  if (platformUrl)
    quickLinks.push({ label: "منصة MEL", url: platformUrl, icon: Globe });
  if (dashboardUrl)
    quickLinks.push({
      label: "لوحة التحكم",
      url: dashboardUrl,
      icon: LayoutDashboard,
    });

  /** Path 3 (bring-your-own domain) — locked for this release. */
  const OWNED_DOMAIN_ENABLED = false;

  const domainPaths: {
    id: DomainPath;
    title: string;
    subtitle: string;
    icon: IconComponent;
    disabled?: boolean;
    badge?: string;
  }[] = [
      {
        id: "subdomain",
        title: "دومين فرعي",
        subtitle: "storename.mel.iq",
        icon: Globe,
      },
      {
        id: "buy",
        title: "شراء من Mel",
        subtitle: "example.com عبر Dynadot",
        icon: CreditCard,
      },
      {
        id: "owned",
        title: "عندي دومين جاهز",
        subtitle: OWNED_DOMAIN_ENABLED ? "ربط دومين موجود" : "قريباً",
        icon: ShieldCheck,
        disabled: !OWNED_DOMAIN_ENABLED,
        badge: OWNED_DOMAIN_ENABLED ? undefined : "قريباً",
      },
    ];

  const socialFields: {
    name: "instagram" | "facebook" | "tiktok" | "x";
    label: string;
    placeholder: string;
    icon: IconComponent;
  }[] = [
      {
        name: "instagram",
        label: "Instagram",
        placeholder: "https://instagram.com/username",
        icon: Instagram,
      },
      {
        name: "facebook",
        label: "Facebook",
        placeholder: "https://facebook.com/username",
        icon: Facebook,
      },
      {
        name: "tiktok",
        label: "TikTok",
        placeholder: "https://tiktok.com/@username",
        icon: Tiktok as unknown as IconComponent,
      },
      {
        name: "x",
        label: "X (Twitter)",
        placeholder: "https://x.com/username",
        icon: XTwitter as unknown as IconComponent,
      },
    ];

  const renewalTerms = [
    { months: 1, label: "شهر واحد", hint: "تجديد شهري" },
    { months: 6, label: "6 أشهر", hint: "نصف سنة" },
    { months: 12, label: "سنة كاملة", hint: "12 شهر" },
  ];

  return (
    // `dark` on the page itself, not just the route: the management screen is
    // designed against the dark ground and has no light half worth reaching.
    // `ThemeContext` forces it too, but that is a routing decision, and this
    // page should not come out half-lit if the route list ever changes.
    <div className="dark relative min-h-screen">
      <PageGround />

      {returnPaymentId &&
        returnStatus !== "PAID" &&
        returnStatus !== "FAILED" &&
        returnStatus !== "EXPIRED" && (
          <div className="fixed inset-0 z-50 flex animate-[modal-fade_160ms_ease-out] items-center justify-center bg-[#05030f]/70 p-4 backdrop-blur-sm">
            <div className={`${cardFrame} w-full max-w-xs`}>
              <div className={`${cardPanel} flex flex-col items-center gap-4 px-8 py-9`}>
                <Loader2
                  size={30}
                  className="animate-spin text-brand-indigo dark:text-brand-primary"
                />
                <p className={`text-sm font-bold ${ink.heading}`}>
                  جاري التحقق من الدفع...
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="relative">
        {/* Header. Glass over the drifting ground rather than an opaque bar,
            so the blooms stay visible behind it as the page scrolls. */}
        <header
          className={`sticky top-0 z-30 border-b bg-white/70 backdrop-blur-xl ${hairline} dark:bg-ink/70`}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className={`shrink-0 rounded-xl border p-2.5 transition-colors ${hairline} ${ink.body} hover:bg-black/5 dark:hover:bg-white/10`}
                aria-label="العودة للوحة التحكم"
              >
                <ArrowRightIcon size={18} />
              </button>

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={store.name}
                  className={`size-11 shrink-0 rounded-2xl border object-cover ${hairline}`}
                />
              ) : (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-brand-indigo to-brand-violet text-lg font-bold text-white shadow-[0_14px_32px_-16px_rgba(79,96,249,0.95)]">
                  {store.name?.trim().charAt(0) || "؟"}
                </span>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    className={`truncate text-xl font-bold ${ink.heading} sm:text-2xl`}
                  >
                    {store.name}
                  </h1>
                  {subscriptionBadge && <StatusPill badge={subscriptionBadge} />}
                </div>
                <p
                  dir={storeUrl ? "ltr" : undefined}
                  className={`truncate text-xs ${ink.faint} ${storeUrl ? "text-right" : ""}`}
                >
                  {hostOf(storeUrl) || "إدارة المتجر"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {storeUrl && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnGhost}
                >
                  <ExternalLink size={16} />
                  فتح المتجر
                </a>
              )}
              {dashboardUrl && (
                <a
                  href={dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnPrimary}
                >
                  <LayoutDashboard size={16} />
                  الداشبورد
                </a>
              )}
            </div>
          </div>

          <ManageTabs active={activeTab} onChange={setActiveTab} />
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          {/* Quick stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="رابط المتجر"
              icon={StoreIcon}
              ltr
              value={hostOf(storeUrl) || "—"}
              hint="الرابط العام للزوار"
            />
            <StatTile
              label="دومين المنصة"
              icon={Globe}
              ltr
              value={platformSlug ? `${platformSlug}.mel.iq` : "—"}
              hint="الدومين الافتراضي على MEL"
            />
            <StatTile
              label="الدومين المخصص"
              icon={ShieldCheck}
              ltr={Boolean(store.customDomain)}
              value={store.customDomain || "غير مربوط"}
              hint={
                store.customDomain
                  ? "يعرض بدل دومين المنصة"
                  : "يمكن ربطه من تبويب الدومين"
              }
            />
            <StatTile
              label="الخطة"
              icon={CreditCard}
              value={subscription?.plan?.name || "—"}
              hint={
                subscription ? termRemaining?.text || "—" : "لا يوجد اشتراك"
              }
            />
          </div>

          {/* Keyed on the tab: replacing a panel replays its entrance.
              Without the key React reconciles the two and the new section
              simply appears in place of the old one. */}
          <div key={activeTab} className="panel-in">
            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <SectionCard
                    title="معاينة المتجر"
                    description="عرض مباشر لصفحة المتجر الحالية"
                    icon={LayoutGrid}
                    action={
                      storeUrl ? (
                        <a
                          href={storeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={btnGhost}
                        >
                          <ExternalLink size={15} />
                          فتح
                        </a>
                      ) : undefined
                    }
                  >
                    {storeUrl ? (
                      // Browser chrome around the embed, so the frame reads as a
                      // preview of a site rather than part of this page.
                      <div className={`overflow-hidden rounded-2xl border ${hairline}`}>
                        <div
                          className={`flex items-center gap-3 border-b px-3 py-2.5 ${hairline} bg-black/[0.02] dark:bg-white/[0.03]`}
                        >
                          <span className="flex shrink-0 gap-1.5">
                            <span className="size-2.5 rounded-full bg-[#ff5c7a]/60" />
                            <span className="size-2.5 rounded-full bg-amber/60" />
                            <span className="size-2.5 rounded-full bg-mint/60" />
                          </span>
                          <span
                            dir="ltr"
                            className={`min-w-0 flex-1 truncate rounded-lg bg-black/[0.03] px-3 py-1 text-center text-[11px] dark:bg-white/[0.05] ${ink.faint}`}
                          >
                            {hostOf(storeUrl)}
                          </span>
                        </div>
                        <StorePreviewFrame
                          url={storeUrl}
                          title={`معاينة ${store.name}`}
                        />
                      </div>
                    ) : (
                      <div
                        className={`flex h-120 flex-col items-center justify-center rounded-2xl border border-dashed ${hairline}`}
                      >
                        <GradientChip icon={Globe} size={56} iconSize={24} />
                        <p className={`mt-5 text-sm font-bold ${ink.heading}`}>
                          لا يوجد رابط للمتجر بعد
                        </p>
                        <p className={`mt-1.5 text-sm ${ink.body}`}>
                          اربط دوميناً من تبويب الدومين
                        </p>
                      </div>
                    )}
                  </SectionCard>
                </div>

                <div className="space-y-6">
                  <SectionCard title="روابط سريعة" icon={ExternalLink}>
                    <div className="space-y-2.5">
                      {quickLinks.map((link) => (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`group flex items-center gap-3 rounded-2xl p-3 transition-colors ${inset} hover:border-brand-indigo/30 hover:bg-black/[0.04] dark:hover:border-white/20 dark:hover:bg-white/[0.06]`}
                        >
                          <span
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] transition-colors group-hover:bg-gradient-to-b group-hover:from-brand-indigo group-hover:to-brand-violet group-hover:text-white dark:bg-white/[0.06] ${ink.body}`}
                          >
                            <link.icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm font-bold ${ink.heading}`}
                            >
                              {link.label}
                            </span>
                            <span
                              dir="ltr"
                              className={`block truncate text-right text-xs ${ink.faint}`}
                            >
                              {hostOf(link.url)}
                            </span>
                          </span>
                          <ExternalLink
                            size={15}
                            className={`shrink-0 ${ink.faint}`}
                          />
                        </a>
                      ))}
                      {quickLinks.length === 0 && (
                        <p className={`text-sm ${ink.body}`}>
                          لا توجد روابط متاحة بعد
                        </p>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="ملخص الاشتراك" icon={CreditCard}>
                    {subscription ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm ${ink.body}`}>الحالة</span>
                          {subscriptionBadge && (
                            <StatusPill badge={subscriptionBadge} />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm ${ink.body}`}>الخطة</span>
                          <span className={`text-sm font-bold ${ink.heading}`}>
                            {subscription.plan?.name || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm ${ink.body}`}>ينتهي</span>
                          <span className={`text-sm font-bold ${ink.heading}`}>
                            {formatDate(subscription.end_at)}
                          </span>
                        </div>

                        {/* The term as a bar: "45 يوم متبقي" is a number to read,
                            this is a length to glance at. */}
                        {termProgress !== null && (
                          <div className="space-y-2 pt-1">
                            <div
                              className={`h-1.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/8`}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-l from-brand-violet to-brand-indigo transition-[width] duration-500"
                                style={{ width: `${termProgress}%` }}
                              />
                            </div>
                            <p className={`flex items-center gap-1.5 text-xs ${ink.faint}`}>
                              <Clock size={13} />
                              {termRemaining?.text || "—"}
                            </p>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveTab("subscription")}
                          className={`${btnGhost} w-full`}
                        >
                          إدارة الاشتراك
                        </button>
                      </div>
                    ) : (
                      <p className={`text-sm ${ink.body}`}>لا يوجد اشتراك نشط</p>
                    )}
                  </SectionCard>
                </div>
              </div>
            )}

            {/* Tab: Domain */}
            {activeTab === "domain" && (
              <div className="mx-auto max-w-3xl">
                <SectionCard
                  title="إعدادات الدومين"
                  description="اختر المسار المناسب: دومين MEL أو شراء دومين جديد"
                  icon={Globe}
                >
                  <div className="mb-6 grid gap-3 sm:grid-cols-2">
                    <StatTile
                      label="دومين المنصة"
                      ltr
                      value={`${platformSlug || "—"}.mel.iq`}
                    />
                    <StatTile
                      label="الدومين المخصص"
                      ltr={Boolean(store.customDomain)}
                      value={store.customDomain || "غير مربوط"}
                    />
                  </div>

                  <div className="mb-6 grid gap-3 sm:grid-cols-3">
                    {domainPaths.map((path) => (
                      <ChoiceCard
                        key={path.id}
                        selected={!path.disabled && domainPath === path.id}
                        disabled={path.disabled}
                        onClick={() => {
                          if (path.disabled) return;
                          setDomainPath(path.id);
                          if (path.id !== "owned") {
                            handleDomainTypeChange(
                              path.id === "buy" ? "custom" : "subdomain",
                            );
                          }
                        }}
                      >
                        {path.badge && (
                          <span className="absolute top-3 start-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted">
                            {path.badge}
                          </span>
                        )}
                        <path.icon
                          size={18}
                          className={
                            !path.disabled && domainPath === path.id
                              ? "text-brand-indigo dark:text-brand-primary"
                              : ink.faint
                          }
                        />
                        <div className={`mt-3 text-sm font-bold ${ink.heading}`}>
                          {path.title}
                        </div>
                        <div
                          dir={path.id === "owned" ? "rtl" : "ltr"}
                          className={`mt-1 text-right text-xs ${ink.faint}`}
                        >
                          {path.subtitle}
                        </div>
                      </ChoiceCard>
                    ))}
                  </div>

                  {OWNED_DOMAIN_ENABLED && domainPath === "owned" ? (
                    <BringYourOwnDomain />
                  ) : (
                    <form onSubmit={handleDomainSubmit} className="space-y-5">
                      <DomainSettingsFields
                        variant="management"
                        inputNamePrefix="manage-"
                        hideTypePicker
                        domain={domain}
                        domainType={domainPath === "buy" ? "custom" : "subdomain"}
                        domainChecked={domainChecked}
                        domainAvailable={domainAvailable}
                        isCheckingDomain={isCheckingDomain}
                        dynadotResult={dynadotResult}
                        onDomainChange={handleDomainChange}
                        onDomainTypeChange={(type) => {
                          setDomainPath(type === "custom" ? "buy" : "subdomain");
                          handleDomainTypeChange(type);
                        }}
                        onCheck={checkDomain}
                      />
                      {domainPath === "buy" && (
                        <PaymentProviderPicker
                          value={paymentProvider}
                          onChange={setPaymentProvider}
                          disabled={isSavingDomain}
                        />
                      )}
                      <button
                        type="submit"
                        disabled={
                          !canSaveDomain ||
                          isSavingDomain ||
                          (domainPath === "buy" && !paymentProvider)
                        }
                        className={`${btnPrimary} w-full`}
                      >
                        {isSavingDomain ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            جاري التحويل لصفحة الدفع...
                          </>
                        ) : domainPath === "buy" && domainPricing ? (
                          `الدفع عبر ${paymentProviderLabel(paymentProvider)} — ${formatUsd(domainPricing.totalUsd)}`
                        ) : (
                          "حفظ دومين المنصة"
                        )}
                      </button>
                    </form>
                  )}
                </SectionCard>
              </div>
            )}

            {/* Tab: Subscription */}
            {activeTab === "subscription" && (
              <SectionCard
                title="الاشتراك والفوترة"
                description="إدارة الخطة، التجديد، والترقية"
                icon={CreditCard}
              >
                <SubscriptionPanel
                  subscription={subscription}
                  isPlanBasic={isPlanBasic}
                  lockedFeatures={entitlements?.locked}
                  upgradePlanName={
                    entitlements?.upgradeTo?.planName || "MEL PLUS"
                  }
                  onRenew={handleRenew}
                  onPause={handlePause}
                  onResume={handleResume}
                  onCancel={handleCancel}
                  onUpgrade={handleUpgrade}
                  isPending={{
                    renew:
                      renewMutation.isPending || initPaymentMutation.isPending,
                    pause: pauseMutation.isPending,
                    resume: resumeMutation.isPending,
                    cancel: cancelMutation.isPending,
                    upgrade:
                      initPaymentMutation.isPending,
                  }}
                />
              </SectionCard>
            )}

            {/* Tab: Social */}
            {activeTab === "social" && (
              <div className="mx-auto max-w-3xl">
                <SectionCard
                  title="حسابات الوسائط الاجتماعية"
                  description="تظهر روابط حساباتك في صفحة المتجر"
                  icon={Share2}
                >
                  <form onSubmit={handleSocialMediaSubmit} className="space-y-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {socialFields.map((field) => (
                        <div key={field.name}>
                          <label
                            htmlFor={`social-${field.name}`}
                            className={`mb-2 block text-[13px] font-bold ${ink.body}`}
                          >
                            {field.label}
                          </label>
                          <div className={fieldWrap}>
                            <field.icon
                              size={17}
                              className={`shrink-0 ${ink.faint}`}
                            />
                            <span
                              aria-hidden
                              className="h-[22px] w-px shrink-0 bg-black/10 dark:bg-field-line"
                            />
                            <input
                              id={`social-${field.name}`}
                              type="url"
                              dir="ltr"
                              name={field.name}
                              value={socialMedia[field.name]}
                              onChange={handleSocialMediaChange}
                              placeholder={field.placeholder}
                              className={`${fieldInput} text-right`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={updateStoreMutation.isPending}
                      className={`${btnPrimary} w-full`}
                    >
                      {updateStoreMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        "حفظ حسابات السوشيال"
                      )}
                    </button>
                  </form>
                </SectionCard>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Renew Modal */}
      {showRenewModal && (
        <Modal
          title="تجديد الاشتراك"
          onClose={() => {
            setShowRenewModal(false);
            setSelectedDuration(1);
            setCustomDuration("");
            setPaymentProvider(null);
          }}
        >
          <p className={`text-sm ${ink.body}`}>اختر مدة التجديد:</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {renewalTerms.map((term) => (
              <ChoiceCard
                key={term.months}
                selected={selectedDuration === term.months && !customDuration}
                onClick={() => {
                  setSelectedDuration(term.months);
                  setCustomDuration("");
                }}
              >
                <div className={`text-sm font-bold ${ink.heading}`}>
                  {term.label}
                </div>
                <div className={`mt-1 text-xs ${ink.faint}`}>{term.hint}</div>
              </ChoiceCard>
            ))}
          </div>

          <div className="mt-5">
            <label
              htmlFor="renew-custom-months"
              className={`mb-2 block text-[13px] font-bold ${ink.body}`}
            >
              أو أدخل عدد أشهر مخصص:
            </label>
            <input
              id="renew-custom-months"
              type="number"
              min="1"
              // The server's own ceiling (`InitPlatformPaymentDto`). Without it
              // a merchant could type 36 and get an unreadable validation 400
              // back from a field that had invited the number.
              max="24"
              value={customDuration}
              onChange={(e) => {
                setCustomDuration(e.target.value);
                if (e.target.value) {
                  setSelectedDuration(0);
                }
              }}
              placeholder="مثال: 3 أو 4"
              className={fieldClass}
            />
          </div>

          {/* What that choice costs. The modal used to name no price at all,
              and the amount is not derivable here: the intro ladder lives on
              the subscription, not on the plan. */}
          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-frost">
                {renewQuote.isLoading ? "..." : quoteDue(renewQuote.data)}
              </span>
              <span className={ink.body}>المستحق الآن</span>
            </div>
            {quoteExplanation(renewQuote.data) && (
              <p className={`mt-2 text-xs leading-5 ${ink.faint}`}>
                {quoteExplanation(renewQuote.data)}
              </p>
            )}
            {quoteNextCharge(renewQuote.data) && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={ink.faint}>
                  {quoteNextCharge(renewQuote.data)}
                </span>
                <span className={ink.faint}>ينتهي الاشتراك في</span>
              </div>
            )}
          </div>

          {renewNeedsPayment && (
            <div className="mt-5">
              <PaymentProviderPicker
                value={paymentProvider}
                onChange={setPaymentProvider}
                disabled={
                  renewMutation.isPending || initPaymentMutation.isPending
                }
              />
            </div>
          )}

          <ModalFooter>
            <button
              onClick={() => {
                setShowRenewModal(false);
                setSelectedDuration(1);
                setCustomDuration("");
                setPaymentProvider(null);
              }}
              className={btnGhost}
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmRenew}
              disabled={
                renewMutation.isPending ||
                initPaymentMutation.isPending ||
                (!customDuration && selectedDuration === 0) ||
                (subscription?.plan?.is_free !== true &&
                  Number(subscription?.plan?.monthly_price) > 0 &&
                  !paymentProvider)
              }
              className={btnPrimary}
            >
              {renewMutation.isPending || initPaymentMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري...
                </>
              ) : paymentProvider ? (
                `ادفع عبر ${paymentProviderLabel(paymentProvider)}`
              ) : (
                "تأكيد التجديد"
              )}
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <Modal
          title="ترقية الاشتراك"
          wide
          onClose={() => {
            setShowUpgradeModal(false);
            setSelectedPlanId(null);
            setPaymentProvider(null);
          }}
        >
          <p className={`text-sm ${ink.body}`}>
            اختر الخطة التي تريد الترقية إليها. الترقية إلى MEL PLUS تُفعَّل بعد
            إتمام الدفع.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {(() => {
              const fromStore = storePlansData?.data;
              const fromPublic = Array.isArray(plansData)
                ? plansData
                : (plansData as any)?.data || (plansData as any)?.plans || [];
              const plans = (fromStore?.length ? fromStore : fromPublic) as any[];
              return plans
                .filter((plan: any) => plan.enabled !== false)
                .map((plan: any) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isCurrentPlan =
                    subscription?.plan?.id === plan.id ||
                    subscription?.plan?.name === plan.name;
                  return (
                    <ChoiceCard
                      key={plan.id}
                      selected={isSelected}
                      disabled={isCurrentPlan}
                      onClick={() => !isCurrentPlan && setSelectedPlanId(plan.id)}
                      className="!p-6"
                    >
                      {isCurrentPlan && (
                        <span
                          className={`absolute top-3 end-3 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${hairline} ${ink.body}`}
                        >
                          الخطة الحالية
                        </span>
                      )}
                      {plan.most_popular && !isCurrentPlan && !isSelected && (
                        <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-gradient-to-l from-brand-violet to-brand-indigo px-3 py-1 text-[11px] font-bold text-white">
                          الأكثر شعبية
                        </span>
                      )}

                      <h3 className={`text-lg font-bold ${ink.heading}`}>
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className={`mt-1.5 text-sm leading-6 ${ink.body}`}>
                          {plan.description}
                        </p>
                      )}
                      <p className="mt-4 flex items-baseline gap-1.5">
                        <span className={`text-3xl font-extrabold ${ink.heading}`}>
                          {plan.monthly_price
                            ? plan.monthly_price.toLocaleString("en-IQ")
                            : "0"}
                        </span>
                        <span className={`text-sm ${ink.body}`}>د.ع</span>
                        <span className={`text-xs ${ink.faint}`}>/شهرياً</span>
                      </p>
                    </ChoiceCard>
                  );
                });
            })()}
          </div>

          {/* The cards above show each plan's catalogue price; this is what the
              selected one costs *this* merchant today, which the ladder on their
              subscription decides. */}
          {selectedPlanId && (
            <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-frost">
                  {upgradeQuote.isLoading ? "..." : quoteDue(upgradeQuote.data)}
                </span>
                <span className={ink.body}>المستحق الآن</span>
              </div>
              {quoteExplanation(upgradeQuote.data) && (
                <p className={`mt-2 text-xs leading-5 ${ink.faint}`}>
                  {quoteExplanation(upgradeQuote.data)}
                </p>
              )}
            </div>
          )}

          {upgradeNeedsPayment && (
            <div className="mt-6">
              <PaymentProviderPicker
                value={paymentProvider}
                onChange={setPaymentProvider}
                disabled={
                  initPaymentMutation.isPending
                }
              />
            </div>
          )}

          <ModalFooter>
            <button
              onClick={() => {
                setShowUpgradeModal(false);
                setSelectedPlanId(null);
                setPaymentProvider(null);
              }}
              className={btnGhost}
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmUpgrade}
              disabled={
                !selectedPlanId ||
                (upgradeNeedsPayment && !paymentProvider) ||
                initPaymentMutation.isPending
              }
              className={btnPrimary}
            >
              {initPaymentMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري...
                </>
              ) : upgradeNeedsPayment && paymentProvider ? (
                `ادفع ${quoteDue(upgradeQuote.data)} عبر ${paymentProviderLabel(paymentProvider)}`
              ) : (
                <>
                  <Rocket size={16} />
                  تأكيد الترقية
                </>
              )}
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* Cancel/Delete Store Modal */}
      {showCancelModal && (
        <Modal
          title="إلغاء الاشتراك"
          tone="danger"
          onClose={() => {
            setShowCancelModal(false);
            setDeleteStoreName("");
          }}
        >
          <div className="rounded-2xl border border-[#ff5c7a]/25 bg-[#ff5c7a]/[0.06] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-[#b62347] dark:text-[#ff8da3]"
              />
              <div>
                {/* Four claims used to stand here and three of them were not
                    true. `PUT /subscription/:id/cancel` sets the status to
                    CANCELLED and does nothing else: the store is not deleted,
                    there is no restore path anywhere in the platform, and no job
                    purges anything after 30 days. A merchant typed their store
                    name expecting a deletion and got a cancelled subscription
                    with a live store still serving customers. */}
                <p className="text-sm font-bold text-[#b62347] dark:text-[#ff8da3]">
                  تحذير: سيتم إلغاء اشتراك المتجر
                </p>
                <ul className={`mt-2 list-inside list-disc space-y-1 text-xs leading-6 ${ink.body}`}>
                  <li>سيتوقف التجديد ولن تتم محاسبتك مرة أخرى</li>
                  <li>
                    يبقى المتجر يعمل حتى{" "}
                    {subscription?.end_at
                      ? formatDate(subscription.end_at)
                      : "نهاية المدة المدفوعة"}
                  </li>
                  <li>بعد ذلك ينتهي الاشتراك وتتوقف مزايا باقتك</li>
                  <li>المتجر وبياناته لا تُحذف — الحذف إجراء منفصل</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="delete-store-name"
              className={`mb-2 block text-[13px] font-bold ${ink.body}`}
            >
              للتأكيد، يرجى كتابة اسم المتجر:{" "}
              <span className={`font-bold ${ink.heading}`}>{store?.name}</span>
            </label>
            <input
              id="delete-store-name"
              type="text"
              value={deleteStoreName}
              onChange={(e) => setDeleteStoreName(e.target.value)}
              placeholder="أدخل اسم المتجر هنا"
              className={`${fieldClass} focus:border-[#e5254f] dark:focus:border-[#ff5c7a]`}
            />
          </div>

          <div className={`mt-5 rounded-2xl p-4 ${inset}`}>
            <p className={`text-sm leading-6 ${ink.body}`}>
              <strong className={ink.heading}>ملاحظة:</strong> يمكنك إعادة
              تفعيل الاشتراك في أي وقت بالدفع من جديد. لحذف المتجر وبياناته
              نهائياً تواصل مع{" "}
              <a
                href="mailto:support@mel.iq"
                className="font-bold text-brand-indigo underline-offset-4 hover:underline dark:text-brand-primary"
              >
                دعم العملاء
              </a>
              .
            </p>
          </div>

          <ModalFooter>
            <button
              onClick={() => {
                setShowCancelModal(false);
                setDeleteStoreName("");
              }}
              className={btnGhost}
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={
                !deleteStoreName ||
                deleteStoreName.trim() !== store?.name?.trim() ||
                cancelMutation.isPending
              }
              className={btnDangerSolid}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  تأكيد الحذف
                </>
              )}
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

export default StoreManagement;
