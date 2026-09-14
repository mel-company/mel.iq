import TrustBadge from "../TrustBadge";
import PromptComposer from "../ai/PromptComposer";

/**
 * The hero: the phone mockup on the left, the pitch and the composer on the
 * right, with the whole block collapsing to a single column on narrow
 * viewports (where the mockup moves below the composer rather than being
 * dropped — it is the only picture of the product above the fold).
 */
function HeroSection() {
  return (
    <section className="relative px-4 pb-10 pt-10 sm:px-6 lg:pt-16">
      {/* The grounds the Figma frame paints behind the hero: a deep indigo
          wash off the left shoulder and a violet bloom behind the composer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="animate-bloom absolute -start-1/4 top-0 size-[780px] rounded-full bg-[#1b1147]/60 blur-[160px]" />
        <div
          className="animate-bloom absolute start-1/2 top-1/3 size-[620px] -translate-x-1/2 rounded-full bg-[#3b2a8f]/25 blur-[150px]"
          style={{ animationDelay: "-9s" }}
        />
      </div>

      {/* RTL flow: the copy column comes first and so lands on the right,
          leaving the mockup on the left as the frame has it. */}
      <div className="relative mx-auto flex max-w-[1600px] flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex w-full flex-col items-center gap-10 lg:flex-1 lg:gap-12">
          {/* The hero is above the fold, so these reveal on mount rather than
              on scroll — the observer reports an intersection immediately.
              The delays turn that into a staggered entrance. */}
          <div className="flex w-full max-w-[791px] flex-col items-center gap-6">
            {/* `flex`, not a bare block: the badge's root is `inline-flex`,
                and a block wrapper would add a line box's baseline gap under
                it and nudge everything below down a few pixels. */}
            <div data-reveal className="flex">
              <TrustBadge />
            </div>
            <h1
              data-reveal
              className="text-display text-center"
              style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
            >
              أطلـق مـتجرك الالــكتروني
            </h1>
            <p
              data-reveal
              className="text-lede max-w-[720px] text-center"
              style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
            >
              بأقل من خمس دقائق, كل ما تحتاجه للبيع عبر الإنترنت بنظام ذكي
              وتصميم عصري، بدون أي تعقيدات برمجية وبأقل وقت أعدادات
            </p>
          </div>

          <div
            data-reveal
            className="w-full"
            style={{ "--reveal-delay": "270ms" } as React.CSSProperties}
          >
            <PromptComposer />
          </div>
        </div>

        {/* The mockup is decorative — the dashboard it shows is described by
            the features section below — so it is hidden from assistive tech
            rather than given a caption that repeats the page. */}
        <div
          data-reveal="zoom"
          className="w-full max-w-[420px] shrink-0 lg:w-[34%] lg:max-w-[560px]"
          style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
        >
          {/* The float lives on the image, not the revealing wrapper: the two
              would otherwise both be animating `translate`. */}
          <img
            src="/images/landing/hero-phone.png"
            alt=""
            aria-hidden
            width={658}
            height={781}
            draggable={false}
            className="animate-drift pointer-events-none block h-auto w-full select-none"
          />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
