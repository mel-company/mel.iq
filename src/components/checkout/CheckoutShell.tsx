import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "../icons";

function HomeLink() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#9aa1bd] transition-colors hover:bg-white/10 hover:text-white"
    >
      <ArrowRightIcon size={16} />
      الرئيسية
    </Link>
  );
}

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

      {/* Phone: the home link and the logo share one row at the top. */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-5 sm:px-6 lg:hidden">
        <HomeLink />
        <span className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold text-white">منصة ميل</span>
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(233.96deg,#b657ff_23.8%,#00bfff_76.3%)]">
            <img
              src="/images/landing/mel-mark.svg"
              alt=""
              aria-hidden
              width={40}
              height={40}
              className="size-10"
            />
          </span>
        </span>
      </div>

      {/* Desktop: the brand rail carries the logo, so the link floats alone. */}
      <div className="absolute top-8 start-8 z-10 hidden lg:block">
        <HomeLink />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1280px] lg:min-h-screen items-start justify-center px-4 pb-16 pt-6 sm:px-6 lg:items-center lg:py-14">
        {children}
      </div>
    </div>
  );
}

export default CheckoutShell;
