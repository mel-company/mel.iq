/**
 * The label every section of the redesign is introduced by: a short violet
 * caption flanked by a hairline that fades outward into a glowing dot.
 *
 * Figma draws the two flanks as exported SVG strokes. They are a 72×1px
 * gradient rule plus a 5px blurred square, so they are reproduced in CSS
 * here — an <img> per flank would be four network requests for four
 * gradients, and would not recolour with the token.
 */
function Flank({ side }: { side: "start" | "end" }) {
  return (
    <span
      aria-hidden
      className="relative hidden h-[5px] w-[72px] shrink-0 items-center sm:flex"
    >
      <span
        className={`h-px w-full bg-gradient-to-r ${
          side === "start"
            ? "from-[#4f60fa]/70 to-transparent"
            : "from-transparent to-[#4f60fa]/70"
        }`}
      />
      <span
        className={`absolute size-[5px] rounded-full bg-[#4f60fa] blur-[1px] ${
          side === "start" ? "start-0" : "end-0"
        }`}
      />
    </span>
  );
}

/**
 * @param align  `center` for the sections whose heading is centred on the
 *               page, `start` for the one that sits in a column and keeps the
 *               label flush with the start edge of its paragraph — the right
 *               edge, under RTL.
 */
function SectionEyebrow({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`flex items-center gap-4 sm:gap-6 ${
        align === "center" ? "justify-center" : "justify-start"
      }`}
    >
      <Flank side="start" />
      <span className="text-eyebrow-label whitespace-nowrap">{children}</span>
      <Flank side="end" />
    </div>
  );
}

export default SectionEyebrow;
