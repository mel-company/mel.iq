import { Link } from "react-router-dom";
import { ChevronsDown } from "lucide-react";
import { MarketingShell } from "../components/LandingNavbar";
import TrustBadge from "../components/TrustBadge";
import CustomerReviewsCard from "../components/CustomerReviewsCard";
import DashboardPreview from "../components/DashboardPreview";
import PromptComposer from "../components/ai/PromptComposer";
import GenerationHistory from "../components/ai/GenerationHistory";

function Landing() {
  return (
    <MarketingShell>
      <div className="overflow-x-hidden">
        <section className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 pb-12">
          <div className="max-w-3xl mx-auto text-center w-full">
            <TrustBadge />

            <h1 className="mb-8">
              <div
                dir="ltr"
                className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-5 sm:mb-7"
              >
                <div className="relative w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0 overflow-hidden">
                  <img
                    src="/images/hero-tagline.png"
                    alt=""
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[220%] w-auto max-w-none select-none pointer-events-none"
                    aria-hidden
                  />
                </div>
                <span className="relative inline-block text-hero-tagline px-3 sm:px-5 py-1">
                  <span
                    className="absolute inset-y-0 -inset-x-1 -z-10 rounded-md bg-[#1e1b4b]/70"
                    aria-hidden
                  />
                  بأقل من خمس دقائق
                </span>
              </div>
              <span className="block text-hero-title text-4xl sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem] leading-[1.12]">
                أطلق متجرك الالكتروني
              </span>
            </h1>

            <p className="text-hero-sub max-w-lg mx-auto mb-10 sm:mb-12">
              كل ما تحتاجه للبيع عبر الإنترنت بنظام ذكي وتصميم عصري،
              <br className="hidden sm:block" />
              {" "}بدون أي تعقيدات برمجية وبأقل وقت إعدادات
            </p>

            <PromptComposer />

            <div className="mt-16 sm:mt-20 flex flex-col items-center gap-3">
              <span className="text-sm text-white/35 font-light">
                اسحب للأسفل لمعرفة المزيد
              </span>
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector("#features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                aria-label="اسحب للأسفل"
              >
                <ChevronsDown size={16} className="text-white/45" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-6 right-2 sm:bottom-10 sm:right-6 lg:right-12 z-10 hidden md:block pointer-events-none">
            <CustomerReviewsCard />
          </div>
        </section>

        {/* سجل الإنشاء — يظهر فقط لمن لديه متاجر سابقة */}
        <GenerationHistory />

        {/* المميزات — معاينة لوحة التحكم */}
        <section
          id="features"
          className="relative -mt-16 sm:-mt-24 pb-24 sm:pb-32 px-4 sm:px-6"
        >
          <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14">
            <h2 className="text-hero-title text-2xl sm:text-3xl md:text-4xl mb-3">
              المميزات
            </h2>
            <p className="text-hero-sub max-w-xl mx-auto">
              لوحة تحكم كاملة لإدارة المنتجات، الفئات، المخزون، والمبيعات من مكان واحد
            </p>
          </div>
          <DashboardPreview />
        </section>

        <section id="customers" className="relative py-20 px-4 sm:px-6 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">انضم لأكثر من 500 تاجر</h2>
            <p className="text-gray-400 mb-8">
              آلاف المتاجر العراقية تعتمد على ميل لبيع منتجاتها أونلاين
            </p>
            <Link
              to="/checkout"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-[#3b9eff]/60 text-[#3b9eff] font-medium hover:bg-[#3b9eff]/10 transition-colors"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}

export default Landing;
