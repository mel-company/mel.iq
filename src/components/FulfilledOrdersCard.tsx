import { Check, Package, TrendingUp } from "lucide-react";

function FulfilledOrdersCard() {
  return (
    <div className="rotate-[-10deg] rounded-[2rem] border border-white/[0.06] bg-[#2d2a43] px-7 py-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4 w-[200px] sm:w-[220px]">
      <div className="relative flex items-center justify-center w-[4.5rem] h-[4.5rem] rounded-full bg-white/[0.06]">
        <Package size={34} className="text-[#2dd4bf]" strokeWidth={1.5} />
        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#2d2a43] flex items-center justify-center">
          <Check size={14} className="text-[#2dd4bf]" strokeWidth={3} />
        </div>
      </div>

      <p className="text-white text-nav text-center leading-snug">الطلبات المحققة</p>

      <div className="flex items-end justify-between w-full gap-3">
        <span className="text-[#2dd4bf] text-sm font-medium inline-flex items-center gap-0.5 pb-1">
          12.6%
          <TrendingUp size={15} strokeWidth={2.5} />
        </span>
        <span className="text-[2.75rem] font-bold text-white leading-none">12</span>
      </div>
    </div>
  );
}

export default FulfilledOrdersCard;
