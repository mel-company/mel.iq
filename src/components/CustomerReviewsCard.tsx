import { Sparkles, Star, User } from "lucide-react";

function CardStarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.min(Math.max(rating - i, 0), 1) * 100;
        return (
          <span key={i} className="relative inline-flex w-5 h-5">
            <Star size={20} className="text-white/25 absolute inset-0" strokeWidth={1.5} />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill}%` }}
            >
              <Star
                size={20}
                className="fill-[#ff9800] text-[#ff9800]"
                strokeWidth={1.5}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function CustomerReviewsCard() {
  return (
    <div className="rotate-[12deg] rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-[#1a1b3a]/95 via-[#252647]/90 to-[#1e2040]/95 backdrop-blur-xl px-8 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 min-w-[200px]">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full bg-[#ff9800]/15 blur-2xl" />
        <div className="relative w-14 h-14 rounded-2xl border-2 border-[#ff9800] flex items-center justify-center">
          <User size={26} className="text-[#ff9800]" strokeWidth={1.75} />
          <Sparkles
            size={14}
            className="absolute -top-1.5 -right-1.5 text-[#ff9800] fill-[#ff9800]"
          />
        </div>
      </div>

      <p className="text-white font-semibold text-lg leading-none">آراء العملاء</p>

      <CardStarRating rating={3.5} />
    </div>
  );
}

export default CustomerReviewsCard;
