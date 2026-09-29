import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeApiResponse,
  resolveDashboardUrl,
  resolveStorefrontUrl,
} from "../utils/storeUrls";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import {
  useMe,
  useLogout,
  useValidateToStorefront,
} from "@/api/wrappers/auth.wrappers";
import { useFetchStores } from "@/api/wrappers/store.wrappers";
import { toast } from "sonner";
import { subscriptionKeys } from "@/api/wrappers/subscription.wrapper";
import { subscriptionAPI } from "@/api/endpoints/subscription.endpoint";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Plus,
  Settings,
  Store as StoreIcon,
} from "@/components/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight } from "@hugeicons/core-free-icons";

// Types
interface Store {
  id: string;
  name: string;
  logo?: string;
  domain?: string;
  customDomain?: string | null;
  /** Public storefront URL from API, e.g. https://mystore.mel.iq */
  storeUrl?: string;
  /**
   * Signed URL of a photograph of this store's active AI-generated design,
   * captured from the real storefront when the generation finished. Absent
   * for a store built from a template, and while a capture is still running.
   */
  thumbnail?: string | null;
  is_deleted?: boolean;
}

interface Subscription {
  id: string;
  storeId: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "EXPIRED";
  start_at?: string;
  end_at?: string;
  plan?: {
    name: string;
  };
}

interface TimeRemaining {
  expired: boolean;
  text: string;
  daysLeft?: number;
}

// Utils
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

const R2_PUBLIC_BASE =
  "https://pub-f8707810144b47a6978976f94751bbc8.r2.dev";

/** Backend often returns a full signed/public URL; sometimes only the object key. */
const resolveStoreLogoUrl = (logo?: string | null): string | null => {
  if (!logo || logo === "placeholder") return null;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  return `${R2_PUBLIC_BASE}/${logo.replace(/^\//, "")}`;
};

/**
 * Subscription state as a pill.
 *
 * Each entry carries its own dot colour because the pill is mostly ground and
 * hairline — the dot is what is actually read at a glance across a grid of
 * cards, and a single accent colour for all four states would say nothing.
 */
const STATUS_CONFIG = {
  ACTIVE: {
    text: "نشط",
    dot: "bg-mint",
    className:
      "border-mint/30 bg-mint/10 text-[#00795a] dark:bg-mint/12 dark:text-mint",
  },
  INACTIVE: {
    text: "متوقف",
    dot: "bg-amber",
    className:
      "border-amber/35 bg-amber/10 text-[#a35400] dark:bg-amber/12 dark:text-amber",
  },
  CANCELLED: {
    text: "ملغي",
    dot: "bg-[#ff5c7a]",
    className:
      "border-[#ff5c7a]/35 bg-[#ff5c7a]/10 text-[#b62347] dark:bg-[#ff5c7a]/12 dark:text-[#ff8da3]",
  },
  EXPIRED: {
    text: "منتهي",
    dot: "bg-ash",
    className:
      "border-black/10 bg-black/5 text-[#5b6178] dark:border-white/12 dark:bg-white/5 dark:text-ash",
  },
} as const;

const NEUTRAL_BADGE = {
  text: "متجر",
  dot: "bg-brand-primary",
  className:
    "border-black/10 bg-black/5 text-[#3c4460] dark:border-white/12 dark:bg-white/5 dark:text-muted",
};

const getStatusBadge = (status: string) =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    ...NEUTRAL_BADGE,
    text: status,
  };

/* ---------------------------------------------------------------------------
 * The page ground
 *
 * The dashboard used to be a flat white/black sheet, which read as a different
 * product from the marketing pages it is reached through. This is the same
 * construction `MarketingShell` paints — a deep ground, a 109px grid, blurred
 * blooms that drift — with a light-theme counterpart, because unlike the
 * landing page this route still honours the navbar's theme toggle.
 *
 * `fixed`, so the blooms stay put while the store grid scrolls past them, and
 * left at `z-auto` so it paints under every `relative` block below it and
 * under the navbar's own `z-50`.
 * ------------------------------------------------------------------------ */
const GRID_LINES = (rgba: string) => `
  linear-gradient(${rgba} 1px, transparent 1px),
  linear-gradient(90deg, ${rgba} 1px, transparent 1px)
`;

const PageGround = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 overflow-hidden bg-[#f5f6fd] dark:bg-ink"
  >
    <div
      className="absolute inset-0 dark:hidden"
      style={{
        backgroundImage: GRID_LINES("rgba(79, 96, 249, 0.05)"),
        backgroundSize: "109px 109px",
      }}
    />
    <div
      className="absolute inset-0 hidden dark:block"
      style={{
        backgroundImage: GRID_LINES("rgba(149, 158, 254, 0.025)"),
        backgroundSize: "109px 109px",
      }}
    />

    <div className="animate-bloom absolute -top-56 -start-40 size-[760px] rounded-full bg-brand-indigo/12 blur-[170px] dark:bg-[#1b1147]/70" />
    <div
      className="animate-bloom absolute -top-48 start-1/4 size-[620px] rounded-full bg-brand-secondary/10 blur-[150px] dark:bg-[#3b2a8f]/22"
      style={{ animationDelay: "-9s" }}
    />
    <div
      className="animate-bloom absolute -bottom-56 -end-56 size-[560px] rounded-full bg-brand-primary/8 blur-[180px] dark:bg-[#5834e9]/12"
      style={{ animationDelay: "-14s" }}
    />
  </div>
);

/** The card shell, shared by a real store card and its loading stand-in, so
 *  the skeleton has the same frame, radius and ground as the thing it stands
 *  in for rather than a grey box that pops when the data lands. */
const cardFrame =
  "rounded-3xl bg-gradient-to-b from-black/10 via-black/5 to-transparent p-px dark:from-white/14 dark:via-white/6 dark:to-white/[0.02]";
const cardPanel =
  "rounded-3xl bg-white/80 backdrop-blur-xl dark:bg-[#0a0722]/85";

// Components
const LoadingSkeleton = () => (
  <div className="relative min-h-screen">
    <PageGround />

    <div className="relative">
      <div className="border-b border-black/5 dark:border-white/6">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-12 w-44 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cardFrame}>
              <div className={`${cardPanel} space-y-4 p-5`}>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <Skeleton className="h-60 w-full rounded-2xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-11 flex-1 rounded-2xl" />
                  <Skeleton className="h-11 flex-1 rounded-2xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ onCreateStore }: { onCreateStore: () => void }) => (
  <div className={cardFrame}>
    <div className={`${cardPanel} flex flex-col items-center px-6 py-16 text-center`}>
      <span className="flex size-20 items-center justify-center rounded-3xl bg-gradient-to-b from-brand-indigo to-brand-violet text-white shadow-[0_18px_45px_-20px_rgba(79,96,249,0.9)]">
        <StoreIcon size={34} />
      </span>
      <h3 className="mt-6 text-xl font-bold text-[#0b1020] dark:text-frost">
        لا يوجد متاجر
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-[#5b6178] dark:text-muted">
        ابدأ بإنشاء متجرك الأول الآن
      </p>
      <button
        onClick={onCreateStore}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-l from-brand-violet to-brand-indigo px-8 py-3 text-sm font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90"
      >
        <Plus size={18} />
        إنشاء متجر جديد
      </button>
    </div>
  </div>
);

const StoreCard = ({
  store,
  subscription,
  onManage,
}: {
  store: Store;
  subscription: Subscription | null;
  onManage: () => void;
}) => {
  const openStoreMutation = useValidateToStorefront();
  const [copied, setCopied] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const timeRemaining = subscription?.end_at
    ? getTimeRemaining(subscription.end_at)
    : null;
  const statusBadge = subscription
    ? getStatusBadge(subscription.status)
    : NEUTRAL_BADGE;

  const domainOnly =
    store.domain
      ?.trim()
      .replace(/^https?:\/\//, "")
      .replace(/^dash\./, "")
      .replace(/\.mel\.iq$/i, "")
      .split("/")[0]
      ?.split(".")[0] || "";
  const storefrontUrl = resolveStorefrontUrl(store);
  const dashboardUrl = resolveDashboardUrl(store);

  const handleOpenDashboard = () => {
    if (!domainOnly) return;

    // Open immediately on click so Safari treats it as a user gesture.
    const newWindow = window.open("", "_blank");

    openStoreMutation.mutate(
      { store: domainOnly },
      {
        onSuccess: (data: any) => {
          const redirectUrl =
            data?.redirectUrl ||
            data?.data?.redirectUrl ||
            dashboardUrl;
          if (!redirectUrl) {
            newWindow?.close();
            toast.error("تعذر فتح الداشبورد. حاول مرة أخرى.");
            return;
          }
          if (newWindow && !newWindow.closed) {
            newWindow.location.href = redirectUrl;
            return;
          }
          window.location.href = redirectUrl;
        },
        onError: (error: any) => {
          newWindow?.close();
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            "حدث خطأ في فتح الداشبورد";
          toast.error(errorMessage);
          console.error("Error opening dashboard:", error);
        },
      },
    );
  };

  const handleOpenStorefront = () => {
    if (!storefrontUrl) {
      toast.error("رابط المتجر غير متوفر حالياً.");
      return;
    }
    window.open(storefrontUrl, "_blank", "noopener,noreferrer");
  };

  /** The dashboard URL is the one a merchant hands to a colleague, so it is
   *  worth a copy button rather than a select-and-drag out of a link. */
  const handleCopyUrl = async () => {
    if (!dashboardUrl) return;
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  const logoUrl = resolveStoreLogoUrl(store.logo);
  const monogram = store.name?.trim().charAt(0) || "؟";
  const thumbnailUrl = thumbnailFailed ? null : store.thumbnail?.trim() || null;

  return (
    <article
      className={`${cardFrame} group relative transition duration-300 hover:-translate-y-1 hover:from-brand-indigo/45 hover:via-brand-secondary/25 dark:hover:from-brand-secondary/45 dark:hover:via-brand-indigo/25`}
    >
      <div className={`${cardPanel} flex h-full flex-col gap-4 p-5 shadow-[0_18px_50px_-32px_rgba(16,24,64,0.45)] transition-shadow duration-300 group-hover:shadow-[0_26px_70px_-34px_rgba(79,96,249,0.55)] dark:shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)]`}>
        {/* Identity */}
        <div className="flex items-start gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="size-12 shrink-0 rounded-2xl border border-black/8 object-cover dark:border-white/10"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-brand-indigo to-brand-violet text-lg font-bold text-white">
              {monogram}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-[#0b1020] dark:text-frost">
              {store.name}
            </h3>

            {dashboardUrl && (
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  dir="ltr"
                  onClick={handleOpenDashboard}
                  disabled={openStoreMutation.isPending}
                  className="min-w-0 truncate text-xs text-brand-indigo transition-colors hover:text-brand-violet disabled:opacity-60 dark:text-muted dark:hover:text-brand-primary"
                >
                  {hostOf(dashboardUrl)}
                </button>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  aria-label="نسخ رابط لوحة التحكم"
                  className="shrink-0 rounded-lg p-1 text-[#8a90a8] transition-colors hover:bg-black/5 hover:text-[#0b1020] dark:text-ash dark:hover:bg-white/10 dark:hover:text-frost"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            )}
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge.className}`}
          >
            <span className={`size-1.5 rounded-full ${statusBadge.dot}`} />
            {statusBadge.text}
          </span>
        </div>

        {/* Preview.
            The still is preferred over the live embed: it is one image request
            against a full storefront load per card, it is the desktop design
            rather than the mobile layout an iframe this narrow renders, and it
            cannot scroll, focus or navigate under the pointer. It is a
            photograph of the design *as generated*, though — nothing
            re-captures it after the merchant edits — so the embed stays as the
            answer for a store that has no generation behind it, and for one
            whose picture will not load.

            Either way it is a picture, not a place to browse: the iframe takes
            no pointer events and the button laid over both carries the frame's
            one action. */}
        {thumbnailUrl || storefrontUrl ? (
          <div className="overflow-hidden rounded-2xl border border-black/8 bg-[#eef1fa] transition-colors group-hover:border-brand-indigo/30 dark:border-white/8 dark:bg-[#07061c]">
            <div className="flex items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/6">
              <span className="flex gap-1">
                <span className="size-1.5 rounded-full bg-black/15 dark:bg-white/20" />
                <span className="size-1.5 rounded-full bg-black/15 dark:bg-white/20" />
                <span className="size-1.5 rounded-full bg-black/15 dark:bg-white/20" />
              </span>
              <span
                dir="ltr"
                className="min-w-0 flex-1 truncate text-[11px] text-[#8a90a8] dark:text-ash"
              >
                {hostOf(storefrontUrl) || hostOf(dashboardUrl)}
              </span>
            </div>

            {/* 3:2, which is the capture's own 1200x800 — so the still is
                shown whole, and a card falling back to the embed is still the
                same height as the ones beside it. */}
            <div className="relative aspect-[3/2]">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  // A signed URL that has expired renders as a broken-image
                  // glyph, which is worse than the embed it replaced.
                  onError={() => setThumbnailFailed(true)}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              ) : (
                // `scrolling="no"`: the storefront brings its own scrollbar,
                // which is inert behind `pointer-events-none` and reads as a
                // stray strip down the edge of the preview.
                <iframe
                  src={storefrontUrl ?? undefined}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  title={`معاينة ${store.name}`}
                  loading="lazy"
                  scrolling="no"
                  tabIndex={-1}
                />
              )}

            </div>
          </div>
        ) : (
          <div className="flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/12 text-[#8a90a8] dark:border-white/12 dark:text-ash">
            <StoreIcon size={26} />
            <span className="text-xs">المعاينة غير متوفرة</span>
          </div>
        )}

        {/* Subscription. Fetched all along and never shown — the card used to
            print a static "متجر" chip beside data that answered the merchant's
            actual question. */}
        {(timeRemaining || subscription?.plan?.name) && (
          <div className="flex items-center justify-between gap-3 text-xs">
            {timeRemaining ? (
              <span
                title={`ينتهي في ${formatDate(subscription?.end_at)}`}
                className={`inline-flex items-center gap-1.5 ${timeRemaining.expired
                  ? "text-[#b62347] dark:text-[#ff8da3]"
                  : "text-[#5b6178] dark:text-muted"
                  }`}
              >
                <Clock size={13} />
                {timeRemaining.text}
              </span>
            ) : (
              <span />
            )}

            {subscription?.plan?.name && (
              <span className="truncate rounded-full border border-black/8 px-2.5 py-0.5 text-[#5b6178] dark:border-white/10 dark:text-muted">
                {subscription.plan.name}
              </span>
            )}
          </div>
        )}

        {/* Actions.
            Three destinations, one button each. They used to be two buttons
            over three destinations, with a modal in between asking which of
            two the merchant meant — a question the card has room to answer
            outright, and one that made visiting a store a two-click job.

            The two that leave the platform carry an external-link mark; the
            settings button stays here, so it does not. `items-stretch` (the
            flex default) is what keeps the icon button the same height as the
            two beside it without pinning a number to any of them. */}
        <div className="mt-auto flex gap-2 pt-1">
          {domainOnly && (
            <button
              onClick={handleOpenDashboard}
              disabled={openStoreMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-l from-brand-violet to-brand-indigo px-3 py-2.5 text-sm font-bold text-white shadow-[0_14px_35px_-18px_rgba(79,96,249,0.95)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LayoutDashboard size={16} />
              {openStoreMutation.isPending ? "جاري الفتح..." : "لوحة التحكم"}
            </button>
          )}

          <button
            onClick={handleOpenStorefront}
            disabled={!storefrontUrl}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 text-sm font-semibold text-[#0b1020] transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/12 dark:bg-white/5 dark:text-frost dark:hover:bg-white/10"
          >
            <ExternalLink size={16} />
            زيارة المتجر
          </button>

          <button
            onClick={onManage}
            aria-label={`إعدادات ${store.name}`}
            title="إعدادات المتجر"
            className="flex shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03] px-3 text-[#5b6178] transition-colors hover:bg-black/[0.06] hover:text-[#0b1020] dark:border-white/12 dark:bg-white/5 dark:text-muted dark:hover:bg-white/10 dark:hover:text-frost"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

    </article>
  );
};

// Main Component
function Dashboard() {
  const { user, logout: logoutFromAuth } = useAuth();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  const { data: me, isLoading: meLoading, isError } = useMe();
  const { data: storesData, isLoading: storesLoading } = useFetchStores();

  // Normalize and filter stores
  const stores = useMemo(() => {
    const normalized = normalizeApiResponse<Store>(storesData);
    return normalized.filter((store) => !store.is_deleted);
  }, [storesData]);

  // Fetch subscriptions for all stores
  const subscriptionQueries = useQueries({
    queries: stores.map((store) => ({
      queryKey: subscriptionKeys.list({ storeId: store.id }),
      queryFn: () => subscriptionAPI.fetchAll({ storeId: store.id }),
      enabled: !!store.id,
    })),
  });

  // Merge all subscriptions
  const subscriptions = useMemo(() => {
    const allSubscriptions: Subscription[] = [];
    subscriptionQueries.forEach((query) => {
      if (query.data) {
        const subs = normalizeApiResponse<Subscription>(query.data);
        allSubscriptions.push(...subs);
      }
    });
    return allSubscriptions;
  }, [subscriptionQueries]);

  const getStoreSubscription = useCallback(
    (store: Store): Subscription | null => {
      return subscriptions.find((s) => s.storeId === store.id) || null;
    },
    [subscriptions],
  );

  // Redirect only when /auth/me actually fails (401) — not when data is briefly empty
  useEffect(() => {
    if (!meLoading && isError) {
      navigate("/login", { replace: true });
    }
  }, [meLoading, isError, navigate]);

  const displayUser = me || user;
  const displayName =
    displayUser?.username || displayUser?.name || "صاحب المتجر";

  const isLoading = meLoading || storesLoading || (!displayUser && !isError);
  const subscriptionsLoading = subscriptionQueries.some((q) => q.isLoading);

  const handleCreateNewStore = useCallback(() => {
    navigate("/checkout", {
      state: {
        skipToStep: 3,
        userInfo: { name: displayName },
      },
    });
  }, [navigate, displayName]);

  const handleLogout = useCallback(() => {
    logoutFromAuth();
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    logoutMutation.mutate(undefined, {
      onSettled: () => navigate("/"),
    });
  }, [logoutFromAuth, logoutMutation, navigate]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    // `clip`, not `hidden`: `overflow-x: hidden` computes `overflow-y` to
    // `auto`, which would turn the page into its own scroll container under a
    // sticky navbar.
    <div className="relative min-h-screen overflow-x-clip">
      <PageGround />

      {/* Header. Transparent over the ground rather than the opaque bar it
          used to be, which would have covered the blooms it now sits on. */}
      <header className="relative bg-white/25 dark:bg-black/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-[#0b1020] dark:text-frost flex items-center gap-1.5">
              <a href="/" className="p-1.5 rounded-xl opacity-70 hover:opacity-100 transition-all hover:bg-white/10 dark:hover:bg-white/5 border border-slate-400 dark:border-slate-700">
                <HugeiconsIcon icon={ArrowRight} size={24} />
              </a>
              مرحباً، {displayName}
            </h1>
            <button
              onClick={handleCreateNewStore}
              className="inline-flex items-center gap-1 rounded-2xl bg-linear-to-l from-brand-violet to-brand-indigo px-6 py-3 text-base font-bold text-white shadow-[0_16px_40px_-18px_rgba(79,96,249,0.9)] transition-opacity hover:opacity-90"
            >
              متجر جديد
              <Plus size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-[#0b1020] dark:text-frost">
            متاجري ({stores.length})
          </h2>

        </div>

        {stores.length === 0 ? (
          <EmptyState onCreateStore={handleCreateNewStore} />
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store: Store) => {
              // التأكد من أن store.id موجود وصحيح
              if (!store.id) return null;

              return (
                <StoreCard
                  key={store.id}
                  store={store}
                  subscription={
                    getStoreSubscription(store) as Subscription | null
                  }
                  onManage={() => {
                    // التأكد من أن الرابط صحيح
                    const path = `/store/${encodeURIComponent(
                      store.id,
                    )}/manage`;
                    navigate(path);
                  }}
                />
              );
            })}
          </div>
        )}

        {subscriptionsLoading && (
          <div className="mt-6 text-center text-sm text-[#8a90a8] dark:text-ash">
            جاري تحميل معلومات الاشتراكات...
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
