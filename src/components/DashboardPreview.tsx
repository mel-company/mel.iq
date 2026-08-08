import FulfilledOrdersCard from "./FulfilledOrdersCard";

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[1100px] px-2 sm:px-0">
      <div className="absolute top-[18%] -left-3 sm:-left-8 z-20 hidden md:block">
        <FulfilledOrdersCard />
      </div>

      <div className="absolute top-[55%] -right-2 sm:-right-6 z-20 hidden lg:block">
        <div className="rotate-[6deg] rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#1a1b3a]/95 to-[#252647]/90 backdrop-blur-xl px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] min-w-[180px] text-center">
          <p className="text-sm text-white/60 mb-1">إجمالي المنتجات</p>
          <p className="text-3xl font-bold text-white leading-none">1,521</p>
        </div>
      </div>

      <div className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-white/[0.1] shadow-[0_40px_100px_rgba(0,0,0,0.65)] bg-[#eef4f9] ring-1 ring-white/[0.06]">
        <img
          src="/images/dashboard-preview.png"
          alt="لوحة تحكم ميل — إدارة المنتجات، الفئات، والطلبات"
          className="w-full h-auto block select-none pointer-events-none"
          draggable={false}
          loading="lazy"
        />
      </div>
    </div>
  );
}

export default DashboardPreview;
