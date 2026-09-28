import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../icons";

/**
 * The ground the auth screens sit on: the page's near-black wash, the faint
 * grid the marketing pages use, and the cyan corner light the frames place
 * off the top-right.
 *
 * Separate from `MarketingShell` on purpose — these screens carry no navbar
 * and no footer. A home link stays so the merchant can leave without the
 * browser back button.
 */
function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink font-setar text-white">
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
      {/* The "Light" ellipse — a 759px cyan bloom hanging off the top-right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[383px] end-[-120px] size-[759px] rounded-full bg-[#1b5c8f]/25 blur-[180px]"
      />

      <Link
        to="/"
        className="absolute top-5 start-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted transition-colors hover:bg-white/10 hover:text-frost sm:top-8 sm:start-8"
      >
        <ArrowRightIcon size={16} />
        الرئيسية
      </Link>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}

export default AuthShell;
