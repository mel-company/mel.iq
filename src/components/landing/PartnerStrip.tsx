/**
 * "متاجر تنمو معنا كل يوم" over a scrolling rail of merchant logos.
 *
 * The logos are exported from Figma as SVGs. Three of the six are a mark and
 * a wordmark on separate layers, so those are composed from two files at the
 * proportions the frame gives them rather than flattened into one.
 */
type Logo = { src: string; mark?: string; width: number };

const LOGOS: Logo[] = [
  { src: "/images/landing/partner-1.svg", width: 68 },
  { src: "/images/landing/partner-2-type.svg", mark: "/images/landing/partner-2-mark.svg", width: 116 },
  { src: "/images/landing/partner-3.svg", width: 115 },
  { src: "/images/landing/partner-4-type.svg", mark: "/images/landing/partner-4-mark.svg", width: 114 },
  { src: "/images/landing/partner-5.svg", width: 120 },
  { src: "/images/landing/partner-6-type.svg", mark: "/images/landing/partner-6-mark.svg", width: 116 },
];

function LogoItem({ logo }: { logo: Logo }) {
  // A lockup: the mark occupies the leading ~24% of the box and the wordmark
  // the trailing ~70%, matching the insets on the Figma layers. Both are
  // given explicit heights so neither collapses inside the flex rail.
  if (logo.mark) {
    return (
      <div
        dir="ltr"
        className="flex h-7 shrink-0 items-center gap-1.5"
        style={{ width: logo.width }}
      >
        <img src={logo.mark} alt="" aria-hidden className="h-7 w-auto shrink-0" />
        <img src={logo.src} alt="" aria-hidden className="h-[15px] w-auto shrink-0" />
      </div>
    );
  }

  return (
    <img
      src={logo.src}
      alt=""
      aria-hidden
      className="h-[27px] shrink-0"
      style={{ width: logo.width }}
    />
  );
}

function PartnerStrip() {
  return (
    <section className="relative border-y border-white/[0.04] bg-ink-raised/40 py-8">
      <p data-reveal className="mb-6 text-center text-lg font-light text-white">
        متاجر تنمو معنا كل يوم
      </p>

      {/* `dir="ltr"` so the negative translate scrolls the next copy into
          view — under RTL the track is right-anchored and would drift away. */}
      <div
        dir="ltr"
        data-reveal
        className="marquee-mask marquee-host overflow-hidden"
        style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
      >
        <div className="marquee-track items-center gap-[53px]">
          {/* Rendered twice so the -50% translate lands on an identical frame.
              The duplicate is inert to assistive tech, like the originals. */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-[53px]">
              {LOGOS.map((logo) => (
                <LogoItem key={`${copy}-${logo.src}`} logo={logo} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PartnerStrip;
