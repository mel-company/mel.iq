import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const rightLinks = [
  { label: "منصة ميل", to: "/", hash: "" },
  { label: "المميزات", to: "/", hash: "#features" },
  { label: "العملاء", to: "/", hash: "#customers" },
];

const leftLinks = [
  { label: "الباقات", to: "/pricing", hash: "" },
  { label: "من نحن", to: "/about", hash: "" },
  { label: "تواصل معنا", to: "/contact", hash: "", accent: true },
];

const allLinks = [...rightLinks, ...leftLinks];

function getActiveIndex(pathname: string, hash: string): number {
  if (pathname !== "/") {
    const idx = leftLinks.findIndex((l) => l.to === pathname);
    return idx >= 0 ? rightLinks.length + idx : 0;
  }
  if (hash === "#features") return 1;
  if (hash === "#customers") return 2;
  return 0;
}

type NavLinkItem = (typeof allLinks)[number] & { accent?: boolean };

function SlidingIndicator({
  activeLocalIndex,
  linkRefs,
  navRef,
}: {
  activeLocalIndex: number;
  linkRefs: React.MutableRefObject<(HTMLAnchorElement | null)[]>;
  navRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [style, setStyle] = useState({ width: 0, left: 0, opacity: 0 });

  const update = useCallback(() => {
    if (activeLocalIndex < 0) {
      setStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const el = linkRefs.current[activeLocalIndex];
    const nav = navRef.current;
    if (!el || !nav) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setStyle({
      left: elRect.left - navRect.left,
      width: elRect.width,
      opacity: 1,
    });
  }, [activeLocalIndex, linkRefs, navRef]);

  useLayoutEffect(() => {
    update();
  }, [update]);

  useEffect(() => {
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return (
    <div
      className="absolute top-0 bottom-0 rounded-lg bg-[#3b9eff]/12 border border-[#3b9eff]/15 pointer-events-none transition-all duration-300 ease-out"
      style={{
        width: style.width,
        left: style.left,
        opacity: style.opacity,
      }}
    >
      <div className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-linear-to-l from-[#3b9eff] to-[#06b6d4]" />
    </div>
  );
}

function NavGroup({
  links,
  startIndex,
  activeIndex,
  onNavigate,
}: {
  links: NavLinkItem[];
  startIndex: number;
  activeIndex: number;
  onNavigate: (index: number, hash: string, e: React.MouseEvent) => void;
}) {
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const localActive =
    activeIndex >= startIndex && activeIndex < startIndex + links.length
      ? activeIndex - startIndex
      : -1;

  return (
    <div ref={navRef} className="relative flex items-center">
      <SlidingIndicator
        activeLocalIndex={localActive}
        linkRefs={linkRefs}
        navRef={navRef}
      />
      {links.map((link, i) => {
        const globalIndex = startIndex + i;
        const href = link.hash ? `${link.to}${link.hash}` : link.to;
        const isActive = globalIndex === activeIndex;

        return (
          <Link
            key={link.label}
            ref={(el) => {
              linkRefs.current[i] = el;
            }}
            to={href}
            onClick={(e) => onNavigate(globalIndex, link.hash, e)}
            className={`relative z-10 px-4 py-2.5 text-nav whitespace-nowrap align-middle transition-colors duration-200 ${
              link.accent
                ? "text-[#00c8ff] hover:text-[#33d4ff]"
                : isActive
                  ? "text-white"
                  : "text-white/55 hover:text-white/85"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

function AuthAction({
  variant = "inline",
  onNavigate,
}: {
  variant?: "inline" | "block";
  onNavigate?: () => void;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className={`rounded-lg bg-white/5 animate-pulse ${
          variant === "inline" ? "h-10 w-32" : "h-10 w-full"
        }`}
      />
    );
  }

  const isDashboard = Boolean(user);
  const Icon = isDashboard ? LayoutDashboard : LogIn;

  return (
    <Link
      to={isDashboard ? "/dashboard" : "/login"}
      onClick={onNavigate}
      className={`flex items-center justify-center gap-2 rounded-lg text-nav whitespace-nowrap transition-all duration-200 ${
        variant === "inline" ? "px-4 py-2.5" : "w-full px-3 py-2.5"
      } ${
        isDashboard
          ? "bg-linear-to-l from-[#3b9eff] to-[#06b6d4] text-[#060b18] font-normal shadow-lg shadow-[#3b9eff]/20 hover:shadow-[#3b9eff]/35 hover:brightness-110"
          : "border border-[#3b9eff]/25 bg-[#3b9eff]/10 text-white/85 hover:text-white hover:bg-[#3b9eff]/20 hover:border-[#3b9eff]/45"
      }`}
    >
      <Icon size={16} />
      {isDashboard ? "لوحة التحكم" : "تسجيل الدخول"}
    </Link>
  );
}

function LandingNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    getActiveIndex(location.pathname, location.hash),
  );

  useEffect(() => {
    setActiveIndex(getActiveIndex(location.pathname, location.hash));
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (location.pathname !== "/") return;

    const sectionMap: { id: string; index: number }[] = [
      { id: "features", index: 1 },
      { id: "customers", index: 2 },
    ];

    const visible = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const match = sectionMap.find((s) => s.id === entry.target.id);
          if (!match) return;
          if (entry.isIntersecting) visible.add(match.index);
          else visible.delete(match.index);
        });

        if (visible.size === 0) {
          if (!location.hash) setActiveIndex(0);
          return;
        }

        setActiveIndex(Math.min(...visible));
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0 },
    );

    sectionMap.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname, location.hash]);

  const handleNavigate = (
    index: number,
    hash: string,
    e: React.MouseEvent,
  ) => {
    setActiveIndex(index);
    setMobileOpen(false);

    if (hash && location.pathname === "/") {
      e.preventDefault();
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      window.history.replaceState(null, "", hash);
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#060b18]/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center h-20">
          <div aria-hidden="true" />

          <div className="flex items-center justify-center">
            <NavGroup
              links={rightLinks}
              startIndex={0}
              activeIndex={activeIndex}
              onNavigate={handleNavigate}
            />

            <Link to="/" className="relative mx-5 shrink-0 group">
              <div className="absolute inset-0 rounded-full bg-[#3b9eff]/30 blur-xl scale-[2.2] opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-[52px] h-[52px] rounded-full bg-[#0a1628] border border-white/10 flex items-center justify-center shadow-lg shadow-[#3b9eff]/25">
                <img src="/logo.png" alt="ميل" className="h-7 w-auto" />
              </div>
            </Link>

            <NavGroup
              links={leftLinks}
              startIndex={rightLinks.length}
              activeIndex={activeIndex}
              onNavigate={handleNavigate}
            />
          </div>

          <div className="flex items-center justify-end">
            <AuthAction />
          </div>
        </div>

        <div className="flex lg:hidden items-center justify-between h-16">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-gray-300 hover:text-white"
            aria-label="القائمة"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" className="relative shrink-0">
            <div className="relative w-10 h-10 rounded-full bg-[#0a1628] border border-white/10 flex items-center justify-center">
              <img src="/logo.png" alt="ميل" className="h-5 w-auto" />
            </div>
          </Link>
          <AuthAction />
        </div>

        {mobileOpen && (
          <nav className="lg:hidden pb-4 flex flex-col gap-1 border-t border-white/10 pt-3">
            {allLinks.map((link, i) => {
              const href = link.hash ? `${link.to}${link.hash}` : link.to;
              const isAccent = "accent" in link && link.accent;
              return (
                <Link
                  key={link.label}
                  to={href}
                  onClick={(e) => handleNavigate(i, link.hash, e)}
                  className={`px-3 py-2.5 text-nav rounded-lg transition-colors ${
                    isAccent
                      ? "text-[#00c8ff]"
                      : i === activeIndex
                        ? "text-white bg-[#3b9eff]/15 border border-[#3b9eff]/20"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-1 border-t border-white/10">
              <AuthAction
                variant="block"
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default LandingNavbar;

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060b18] text-white font-setar font-light">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 158, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 158, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[#3b9eff]/10 rounded-full blur-[140px] pointer-events-none" />
      <LandingNavbar />
      <div className="relative pt-20">{children}</div>
    </div>
  );
}
