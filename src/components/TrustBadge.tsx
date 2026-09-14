import { Star } from "./icons";

/** Exported from the Figma frame — the five faces are photographs, not avatars
 *  we can synthesise, so they ship as assets. */
const AVATARS = [
  "/images/landing/avatar-1.png",
  "/images/landing/avatar-2.png",
  "/images/landing/avatar-3.png",
  "/images/landing/avatar-4.png",
  "/images/landing/avatar-5.png",
];

const RATING = 4.5;

/**
 * A star filled to a fraction of its width.
 *
 * The design's fifth star is a half — drawing it as either full or empty is
 * the difference between "4.8" being illustrated and being contradicted.
 */
function RatingStar({ fill }: { fill: number }) {
  return (
    <span className="relative inline-flex size-[18px] shrink-0">
      <Star size={18} className="absolute inset-0 text-white/20" strokeWidth={1.5} />
      <span
        className="absolute inset-0 overflow-hidden"
        // The bar grows from the left in both directions: a star is not a
        // bidirectional glyph, and mirroring it under RTL would fill the
        // wrong half.
        style={{ width: `${fill * 100}%`, direction: "ltr" }}
      >
        <Star size={18} className="fill-amber text-amber" strokeWidth={1.5} />
      </span>
    </span>
  );
}

function TrustBadge() {
  return (
    <div
      // The pill reads left-to-right in the design — rating, then faces — so
      // it opts out of the page's RTL flow while its caption opts back in.
      dir="ltr"
      className="inline-flex items-center gap-5 rounded-full border border-white/10 py-3 pl-6 pr-3 backdrop-blur-sm sm:gap-6"
    >
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1">
          <p className="whitespace-nowrap leading-none text-white">
            <span className="text-sm font-bold">4.8</span>
            <span className="text-xs text-white/25"> / 5.0</span>
          </p>
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <RatingStar key={i} fill={Math.min(Math.max(RATING - i, 0), 1)} />
            ))}
          </div>
        </div>
        <p dir="rtl" className="whitespace-nowrap text-sm text-white/50">
          أكثر من <span className="font-bold text-white">500 عميل</span> يثق بنا
        </p>
      </div>

      <div className="flex shrink-0 items-center">
        {AVATARS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            width={38}
            height={38}
            aria-hidden
            className="size-[38px] shrink-0 rounded-full object-cover -mr-5 last:mr-0"
            style={{ zIndex: AVATARS.length - i }}
          />
        ))}
      </div>
    </div>
  );
}

export default TrustBadge;
