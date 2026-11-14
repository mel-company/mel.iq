import type React from "react";
import { Check } from "../icons";
import type { QuestionOption } from "../../api/endpoints/aiStoreGenerator.endpoints";

/**
 * The look question («أي شكل يناسب متجرك؟») as three small page sketches.
 *
 * Each sketch is drawn here, in SVG, so it stays sharp at any size and needs
 * no image files: a plain catalogue, a calm premium page, a loud colourful
 * one. The server marks the options with `wireframe`; the label under each
 * card is the option's own.
 */
export type WireframeKind = "simple" | "modern" | "vivid";

function SimpleSketch() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <rect width="120" height="150" fill="#f6f7f9" />
      <rect x="0" y="0" width="120" height="14" fill="#ffffff" />
      <rect x="86" y="5" width="26" height="4" rx="2" fill="#1f2937" />
      <rect x="8" y="5" width="8" height="4" rx="2" fill="#cbd5e1" />
      <rect x="20" y="5" width="8" height="4" rx="2" fill="#cbd5e1" />
      <rect x="8" y="20" width="104" height="22" rx="3" fill="#e5e7eb" />
      <rect x="62" y="27" width="42" height="4" rx="2" fill="#9ca3af" />
      <rect x="76" y="34" width="28" height="3" rx="1.5" fill="#cbd5e1" />
      {[0, 1, 2].map((c) =>
        [0, 1, 2].map((r) => (
          <g key={`${c}-${r}`}>
            <rect x={8 + c * 36} y={50 + r * 33} width="32" height="22" rx="2" fill="#ffffff" stroke="#e5e7eb" strokeWidth="0.8" />
            <rect x={14 + c * 36} y={74 + r * 33} width="20" height="2.5" rx="1.2" fill="#cbd5e1" />
            <rect x={22 + c * 36} y={78 + r * 33} width="12" height="2.5" rx="1.2" fill="#9ca3af" />
          </g>
        )),
      )}
    </svg>
  );
}

function ModernSketch() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wf-modern-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2c22" />
          <stop offset="1" stopColor="#14100d" />
        </linearGradient>
        <linearGradient id="wf-modern-shade" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="150" fill="#f4efe8" />
      <rect x="0" y="0" width="120" height="58" fill="url(#wf-modern-hero)" />
      <circle cx="30" cy="34" r="16" fill="#c8a165" opacity="0.35" />
      <rect x="0" y="0" width="120" height="58" fill="url(#wf-modern-shade)" />
      <rect x="84" y="5" width="28" height="3.5" rx="1.75" fill="#f4efe8" opacity="0.9" />
      <rect x="66" y="22" width="46" height="5" rx="1" fill="#f4efe8" />
      <rect x="78" y="30" width="34" height="5" rx="1" fill="#f4efe8" />
      <rect x="88" y="42" width="24" height="7" rx="3.5" fill="#c8a165" />
      <rect x="70" y="66" width="42" height="3.5" rx="1" fill="#3a2c22" />
      <rect x="8" y="76" width="50" height="40" rx="4" fill="#ded3c4" />
      <rect x="62" y="76" width="50" height="40" rx="4" fill="#cdbfab" />
      <rect x="40" y="120" width="18" height="2.5" rx="1.2" fill="#8a7a66" />
      <rect x="94" y="120" width="18" height="2.5" rx="1.2" fill="#8a7a66" />
      <rect x="8" y="130" width="104" height="14" rx="3" fill="#2b2119" />
      <rect x="78" y="135" width="28" height="3" rx="1.5" fill="#c8a165" />
    </svg>
  );
}

function VividSketch() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="wf-vivid-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
        <radialGradient id="wf-vivid-glow" cx="0.3" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="150" fill="#0b1026" />
      <rect x="84" y="5" width="28" height="3.5" rx="1.75" fill="#e2e8f0" />
      <rect x="8" y="4" width="14" height="6" rx="3" fill="#a3e635" />
      <rect x="6" y="16" width="108" height="48" rx="6" fill="url(#wf-vivid-hero)" />
      <circle cx="36" cy="40" r="20" fill="url(#wf-vivid-glow)" />
      <rect x="62" y="26" width="44" height="6" rx="1.5" fill="#ffffff" />
      <rect x="72" y="35" width="34" height="6" rx="1.5" fill="#ffffff" />
      <rect x="82" y="48" width="24" height="8" rx="4" fill="#a3e635" />
      {[
        ["#f472b6", 8],
        ["#a3e635", 36],
        ["#22d3ee", 64],
        ["#fbbf24", 92],
      ].map(([color, x]) => (
        <rect key={String(x)} x={Number(x)} y="70" width="20" height="7" rx="3.5" fill={String(color)} opacity="0.9" />
      ))}
      {[0, 1, 2].map((c) => (
        <g key={c}>
          <rect x={8 + c * 36} y="84" width="32" height="32" rx="4" fill="#161d3f" stroke={["#7c3aed", "#06b6d4", "#f472b6"][c]} strokeWidth="1" />
          <circle cx={24 + c * 36} cy="100" r="8" fill={["#7c3aed", "#06b6d4", "#f472b6"][c]} opacity="0.7" />
          <rect x={14 + c * 36} y="120" width="20" height="2.5" rx="1.2" fill="#64748b" />
          <rect x={26 + c * 36} y="124" width="8" height="2.5" rx="1.2" fill="#a3e635" />
        </g>
      ))}
      <rect x="8" y="132" width="104" height="12" rx="3" fill="#a3e635" />
      <rect x="78" y="136" width="28" height="3.5" rx="1.75" fill="#0b1026" />
    </svg>
  );
}

const SKETCH: Record<WireframeKind, () => React.ReactElement> = {
  simple: SimpleSketch,
  modern: ModernSketch,
  vivid: VividSketch,
};

export const isWireframeKind = (value: unknown): value is WireframeKind =>
  value === "simple" || value === "modern" || value === "vivid";

export function WireframeRow({
  options,
  chosen,
  onAnswer,
  labelledBy,
}: {
  options: QuestionOption[];
  chosen: string[];
  onAnswer: (value: string) => void;
  labelledBy: string;
}) {
  return (
    <div className="grid max-w-md grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((option) => {
        const active = chosen.includes(option.value);
        const Sketch = isWireframeKind(option.wireframe) ? SKETCH[option.wireframe] : SimpleSketch;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onAnswer(option.value)}
            className="group text-center outline-none"
          >
            <span
              className={`relative block aspect-[4/5] overflow-hidden rounded-xl transition-all duration-300 motion-reduce:transition-none ${active
                ? "ring-2 ring-[#00c8ff] shadow-[0_0_0_4px_rgba(0,200,255,0.10),0_0_24px_-6px_rgba(0,200,255,0.75)]"
                : "ring-1 ring-white/10 group-hover:-translate-y-0.5 group-hover:ring-white/30 group-focus-visible:ring-white/40"
                }`}
            >
              <Sketch />
              {active && (
                <span className="absolute end-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#00c8ff]">
                  <Check size={12} className="text-[#0b0f19]" />
                </span>
              )}
            </span>
            <span className={`mt-2 block text-xs font-medium ${active ? "text-white" : "text-white/70 group-hover:text-white"}`}>
              {option.label}
            </span>
            {option.hint && <span className="mt-0.5 block text-[10px] leading-tight text-white/40">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
