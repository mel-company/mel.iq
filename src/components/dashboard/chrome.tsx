/**
 * The chrome the merchant-facing pages share — the ground they sit on, the
 * shell their cards are cut from, and the pill that states a subscription.
 *
 * It lived inside `Dashboard` until the store management page was rebuilt in
 * the same language. Two copies of a bloom stack is the kind of thing that
 * drifts the first time somebody retunes one of them, and the two pages are a
 * click apart, so the drift would be visible.
 */

const R2_PUBLIC_BASE = "https://pub-f8707810144b47a6978976f94751bbc8.r2.dev";

/** Backend often returns a full signed/public URL; sometimes only the object key. */
export const resolveStoreLogoUrl = (logo?: string | null): string | null => {
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
export type StatusBadge = { text: string; dot: string; className: string };

export const STATUS_CONFIG = {
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

export const NEUTRAL_BADGE: StatusBadge = {
  text: "متجر",
  dot: "bg-brand-primary",
  className:
    "border-black/10 bg-black/5 text-[#3c4460] dark:border-white/12 dark:bg-white/5 dark:text-muted",
};

export const getStatusBadge = (status: string): StatusBadge =>
  STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
    ...NEUTRAL_BADGE,
    text: status,
  };

/** The pill itself, so the store card and the store's own header agree. */
export const StatusPill = ({
  badge,
  className = "",
}: {
  badge: StatusBadge;
  className?: string;
}) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className} ${className}`}
  >
    <span className={`size-1.5 rounded-full ${badge.dot}`} />
    {badge.text}
  </span>
);

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

export const PageGround = () => (
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
export const cardFrame =
  "rounded-3xl bg-gradient-to-b from-black/10 via-black/5 to-transparent p-px dark:from-white/14 dark:via-white/6 dark:to-white/[0.02]";
export const cardPanel =
  "rounded-3xl bg-white/80 backdrop-blur-xl dark:bg-[#0a0722]/85";
