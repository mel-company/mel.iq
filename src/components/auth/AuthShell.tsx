import type { ReactNode } from "react";

/**
 * The ground the auth screens sit on: the page's near-black wash, the faint
 * grid the marketing pages use, and the cyan corner light the frames place
 * off the top-right.
 *
 * Separate from `MarketingShell` on purpose — these screens carry no navbar
 * and no footer, because a half-finished sign-in is not somewhere to offer
 * more navigation.
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

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}

export default AuthShell;
