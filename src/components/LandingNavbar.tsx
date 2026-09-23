import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, LayoutDashboard, Menu, X } from "./icons";
import { useAuth } from "../contexts/AuthContext";
import { useStorefrontUrl } from "../hooks/useStorefrontUrl";
import { useScrollReveal } from "../hooks/useScrollReveal";
import SiteFooter from "./landing/SiteFooter";

/**
 * The redesigned marketing chrome.
 *
 * The landing page is now one long page holding the features, pricing and
 * contact blocks, so the nav items scroll to sections on `/` and fall back to
 * navigating there first when the visitor is on another route. The standalone
 * /pricing, /about and /contact pages still exist and still render inside
 * this shell.
 */
const NAV_ITEMS = [
  { label: "من نحن", hash: "#about" },
  { label: "الميزات", hash: "#features" },
  { label: "الباقات", hash: "#pricing" },
  { label: "تواصل معنا", hash: "#contact" },
];

/** Which nav item the current scroll position belongs to. */
const SECTION_FOR_INDEX = NAV_ITEMS.map((item) => item.hash.replace("#", ""));

function AuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user, loading } = useAuth();
  const storefrontUrl = useStorefrontUrl();

  if (loading) {
    return <div className="h-15 w-[187px] animate-pulse rounded-[18px] bg-white/5" />;
  }

  if (user) {
    return (
      <>
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex h-15 w-full items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-[187px]"
        >
          <LayoutDashboard size={16} />
          لوحة التحكم
        </Link>
        {storefrontUrl && (
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="flex h-15 w-full items-center justify-center gap-2 rounded-[18px] border border-white/15 px-4 text-base text-white transition-colors hover:bg-white/5 sm:w-[187px]"
          >
            <ExternalLink size={16} />
            زيارة متجري
          </a>
        )}
      </>
    );
  }

  // Sign-in and sign-up are the same phone-OTP flow, so both land on /login;
  // the design still shows them as two calls to action. The filled one comes
  // first so RTL puts it on the right, where the frame has it.
  return (
    <>
      <Link
        to="/login"
        onClick={onNavigate}
        className="flex h-15 w-full items-center justify-center rounded-[18px] border border-white/15 bg-[linear-gradient(90deg,#4f60f9_0%,#7569ff_100%)] px-4 text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-[187px]"
      >
        أنشئ حساب ألان
      </Link>
      <Link
        to="/login"
        onClick={onNavigate}
        className="flex h-15 w-full items-center justify-center rounded-[18px] border border-white/15 px-4 text-base text-white transition-colors hover:bg-white/5 sm:w-[187px]"
      >
        تسجيل الدخول
      </Link>
    </>
  );
}

function LandingNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Which section is in view, on the landing page only. Everywhere else the
  // indicator sits on "منصة ميل", since none of the anchors are present.
  useEffect(() => {
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

  const handleNavigate = (index: number, hash: string) => (
    e: React.MouseEvent,
  ) => {
    setMobileOpen(false);
    setActiveIndex(index);

    if (location.pathname !== "/") return; // let the router take us home first

    e.preventDefault();
    document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", hash);
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-ink/60 px-4 backdrop-blur-xl sm:px-6 lg:px-17.25">
      <div className="mx-auto flex max-w-400 items-center justify-between">
        {/* Desktop. RTL flow puts the first child on the right, which is where
            the design places the nav items and the logo. */}
        <nav className="hidden items-center gap-9.5 lg:flex">
          <Link
            to="/"
            onClick={handleHome}
            aria-label="ميل — الصفحة الرئيسية"
            className="flex size-24 shrink-0 items-center justify-center"
          >
            <img
              src="/images/landing/mel-mark.svg"
              alt=""
              aria-hidden
              width={52}
              height={52}
              className="size-[52px]"
            />
          </Link>

          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              to={`/${item.hash}`}
              onClick={handleNavigate(i, item.hash)}
              className={`text-nav flex h-14 w-28 items-center justify-center whitespace-nowrap py-2.5 transition-colors ${i === activeIndex ? "text-white" : "text-white/60 hover:text-white"
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
            className="p-2 text-white/80 transition-colors hover:text-white"
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
              className="size-9"
            />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <nav className="mx-auto mb-4 mt-2 flex max-w-400 flex-col gap-1 rounded-3xl bg-ink/80 p-4 lg:hidden">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.label}
              to={`/${item.hash}`}
              onClick={handleNavigate(i, item.hash)}
              className={`text-nav rounded-xl px-3 py-2.5 transition-colors ${i === activeIndex
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
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
    <div className="min-h-screen bg-ink font-setar font-light text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(149, 158, 254, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(149, 158, 254, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "109px 109px",
        }}
      />
      <LandingNavbar />
      <div className="relative pt-24 lg:pt-28">{children}</div>
      <SiteFooter />
    </div>
  );
}
