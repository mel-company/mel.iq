import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../icons";

/**
 * Checkout ground matching the Mel mockup: deep navy, soft violet bloom,
 * no heavy nested chrome — content floats on the atmosphere.
 */
function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060814] font-setar text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(149, 158, 254, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(149, 158, 254, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "96px 96px",
        }}
      />
      {/* Soft purple vignette — matches mockup atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(88,52,233,0.22),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 end-0 size-[560px] rounded-full bg-[#1b5c8f]/20 blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 start-0 size-[480px] rounded-full bg-[#4f60f9]/15 blur-[130px]"
      />

      <Link
        to="/"
        className="absolute top-5 start-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#9aa1bd] transition-colors hover:bg-white/10 hover:text-white sm:top-8 sm:start-8"
      >
        <ArrowRightIcon size={16} />
        الرئيسية
      </Link>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] items-start justify-center px-4 py-16 sm:px-6 lg:items-center lg:py-14">
        {children}
      </div>
    </div>
  );
}

export default CheckoutShell;
