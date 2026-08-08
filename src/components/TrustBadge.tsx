import { Star } from "lucide-react";

const AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
];

function TrustBadge() {
  return (
    <div
      dir="ltr"
      className="inline-flex items-center gap-3 sm:gap-5 rounded-full border border-[#3b9eff]/20 bg-gradient-to-r from-[#312e81]/90 via-[#2563eb]/85 to-[#3b82f6]/90 backdrop-blur-sm px-4 sm:px-6 py-2.5 sm:py-3 mb-8 sm:mb-10 shadow-[0_0_28px_rgba(59,130,246,0.18)]"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-nav text-white leading-none">
          <span className="font-bold">4.8</span>
          <span className="font-light text-white/65"> / 5.0</span>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              className={
                i < 4
                  ? "fill-amber-400 text-amber-400"
                  : "fill-amber-400/30 text-amber-400/30"
              }
            />
          ))}
        </div>
      </div>

      <p dir="rtl" className="text-nav text-white/90 whitespace-nowrap hidden sm:block">
        أكثر من <span className="font-bold text-white">500</span> عميل يثق بنا
      </p>

      <div className="flex items-center shrink-0">
        {AVATARS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-[#2563eb] object-cover -ml-2.5 first:ml-0"
            style={{ zIndex: i + 1 }}
          />
        ))}
      </div>
    </div>
  );
}

export default TrustBadge;
