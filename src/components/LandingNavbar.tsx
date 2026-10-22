import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ExternalLink, LayoutDashboard, Menu, Sparkle, X } from "./icons";
import { useAuth } from "../contexts/AuthContext";
import { useStorefrontUrl } from "../hooks/useStorefrontUrl";
import { useHasStore } from "../hooks/useHasStore";
import { FOCUS_PROMPT_STATE } from "../utils/promptHandoff";
import { useScrollReveal } from "../hooks/useScrollReveal";
import FloatingThemeToggle from "./FloatingThemeToggle";
import SiteFooter from "./landing/SiteFooter";

/**
 * The redesigned marketing chrome.
 *
 * The landing page is one long page (about / features / pricing / …). Contact
 * is the only other marketing route (`/contact`); nav "تواصل معنا" goes there.
 */
const NAV_ITEMS = [
  { label: "من نحن", hash: "#about" },
  { label: "الميزات", hash: "#features" },
  { label: "الباقات", hash: "#pricing" },
  { label: "التطبيق", hash: "#download" },
  { label: "تواصل معنا", to: "/contact" },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

/** Section ids watched for the active-nav indicator (hash items only). */
const SECTION_FOR_INDEX = NAV_ITEMS.map((item) =>
  "hash" in item ? item.hash.replace("#", "") : "",
);

function navItemHref(item: NavItem): string {
  if ("to" in item) return item.to;
  return `/${item.hash}`;
}

function AuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading } = useAuth();
  const storefrontUrl = useStorefrontUrl();
  const { hasStore, loading: storesLoading } = useHasStore();

  if (loading || storesLoading) {
    return <div className="h-15 w-[187px] animate-pulse rounded-[18px] bg-glass" />;
  }

  if (user) {
    return (
      <>
        {storefrontUrl && (
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[18px] border border-hairline px-4 text-base text-frost transition-colors hover:bg-glass sm:w-[187px]"
          >
            <ExternalLink size={16} />
            زيارة متجري
          </a>
        )}
        {/* No store yet means an empty dashboard, so the slot points at the
            prompt that creates one instead. */}
        {hasStore ? (
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-[187px]"
          >
            <LayoutDashboard size={16} />
            لوحة التحكم
          </Link>
        ) : (
          <Link
            to="/"
            state={FOCUS_PROMPT_STATE}
            onClick={onNavigate}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-[187px]"
          >
            <Sparkle size={16} />
            أنشئ متجرك
          </Link>
        )}
      </>
    );
  }

  // Sign-up starts checkout (plan + account). Sign-in is phone + OTP only.
  return (
    <>
      <Link
        to="/checkout"
        onClick={onNavigate}
        className="flex h-15 w-full items-center justify-center rounded-[18px] border border-white/15 bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-[187px]"
      >
        أنشئ حساب الآن
      </Link>
      <Link
        to="/login"
        onClick={onNavigate}
        className="flex h-15 w-full items-center justify-center rounded-[18px] border border-hairline px-4 text-base text-frost transition-colors hover:bg-glass sm:w-[187px]"
      >
        تسجيل الدخول
      </Link>
    </>
  );
}

function LandingNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Which section is in view on `/`. On `/contact`, highlight تواصل معنا.
  useEffect(() => {
    if (location.pathname === "/contact") {
      setActiveIndex(NAV_ITEMS.findIndex((item) => "to" in item && item.to === "/contact"));
      return;
    }

    if (location.pathname !== "/") {
      setActiveIndex(0);
      return;
    }

    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = SECTION_FOR_INDEX.indexOf(entry.target.id);
          if (index < 0) return;
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        });
        setActiveIndex(visible.size === 0 ? 0 : Math.min(...visible));
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0 },
    );

    SECTION_FOR_INDEX.forEach((id) => {
      const el = id && document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  const handleNavigate = (index: number, item: NavItem) => (
    e: React.MouseEvent,
  ) => {
    setMobileOpen(false);
    setActiveIndex(index);

    if ("to" in item) return; // plain route — let the Link navigate

    if (location.pathname !== "/") return; // let the router take us home first

    e.preventDefault();
    document.querySelector(item.hash)?.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", item.hash);
  };

  /** The logo is the way back to the top, which no nav item covers. */
  const handleHome = (e: React.MouseEvent) => {
    setMobileOpen(false);
    if (location.pathname !== "/") return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.history.replaceState(null, "", "/");
  };

  return (
    // The frame draws the bar itself as transparent, but the page scrolls a
    // phone mockup and two card grids straight under it, which left the nav
    // labels unreadable. The bar therefore carries the page ground at low
    // opacity plus a blur — near-invisible over the hero, legible everywhere
    // else.
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-white px-4 dark:border-white/6 dark:bg-ink/70 dark:backdrop-blur-xl sm:px-6 lg:px-17.25">
      <div className="mx-auto flex max-w-400 items-center justify-between">
        {/* Desktop. RTL flow puts the first child on the right, which is where
            the design places the nav items and the logo. */}
        <nav className="hidden items-center lg:flex">
          <Link
            to="/"
            onClick={handleHome}
            aria-label="ميل — الصفحة الرئيسية"
            className="flex size-24 shrink-0 items-center justify-center"
          >
            {/* Light mode: mark is white, so invert to ink; dark keeps original. */}
            <img
              src="/images/landing/mel-mark.svg"
              alt=""
              aria-hidden
              width={52}
              height={52}
              className="size-[52px] brightness-0 dark:brightness-100"
            />
          </Link>

          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              to={navItemHref(item)}
              onClick={handleNavigate(i, item)}
              className={`text-nav flex h-14 w-28 items-center justify-center whitespace-nowrap py-2.5 transition-colors ${
                i === activeIndex
                  ? "text-frost"
                  : "text-frost/55 hover:text-frost"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AuthActions />
        </div>

        {/* Mobile bar. */}
        <div className="flex h-16 w-full items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="القائمة"
            aria-expanded={mobileOpen}
            className="p-2 text-frost/80 transition-colors hover:text-frost"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link
            to="/"
            onClick={handleHome}
            aria-label="ميل — الصفحة الرئيسية"
            className="shrink-0"
          >
            <img
              src="/images/landing/mel-mark.svg"
              alt=""
              aria-hidden
              width={36}
              height={36}
              className="size-9 brightness-0 dark:brightness-100"
            />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <nav className="mx-auto mb-4 mt-2 flex max-w-400 flex-col gap-1 rounded-3xl border border-hairline bg-white p-4 shadow-sm dark:bg-ink/90 dark:shadow-none dark:backdrop-blur-xl lg:hidden">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              to={navItemHref(item)}
              onClick={handleNavigate(i, item)}
              className={`text-nav rounded-xl px-3 py-2.5 transition-colors ${
                i === activeIndex
                  ? "bg-glass-strong text-frost"
                  : "text-frost/55 hover:bg-glass hover:text-frost"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
            <AuthActions onNavigate={() => setMobileOpen(false)} />
          </div>
        </nav>
      )}
    </header>
  );
}

export default LandingNavbar;

/**
 * The page ground shared by the landing page and the standalone marketing
 * routes: the near-black wash, the faint grid, and the fixed navbar.
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  useScrollReveal();

  return (
    <div className="min-h-screen bg-ink font-setar font-light text-frost">
      {/* No grid in light — especially loud on phones. Dark keeps the wash. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 hidden dark:block"
        style={{
          backgroundImage: `
            linear-gradient(rgba(149, 158, 254, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(149, 158, 254, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "109px 109px",
        }}
      />
      <FloatingThemeToggle />
      <LandingNavbar />
      <main className="relative">{children}</main>
      <SiteFooter />
    </div>
  );
}
