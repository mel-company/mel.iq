import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { MarketingShell } from "../components/LandingNavbar";
import SeoHead, {
  breadcrumbSchema,
  faqSchema,
  softwareApplicationSchema,
} from "../seo/SeoHead";
import { LANDING_FAQS } from "../seo/landingFaqs";
import HeroSection from "../components/landing/HeroSection";
import PartnerStrip from "../components/landing/PartnerStrip";

// Below-the-fold blocks stay out of the initial JS parse so desktop TBT
// and "unused JavaScript" stay down. Hero + partners paint first.
const GenerationHistory = lazy(() => import("../components/ai/GenerationHistory"));
const AboutSection = lazy(() => import("../components/landing/AboutSection"));
const BenefitsSection = lazy(() => import("../components/landing/BenefitsSection"));
const PlatformSection = lazy(() => import("../components/landing/PlatformSection"));
const FeaturesSection = lazy(() => import("../components/landing/FeaturesSection"));
const ProductShowcase = lazy(() => import("../components/landing/ProductShowcase"));
const PricingSection = lazy(() => import("../components/landing/PricingSection"));
const FaqSection = lazy(() => import("../components/landing/FaqSection"));
const AppDownloadSection = lazy(() => import("../components/landing/AppDownloadSection"));
const ContactSection = lazy(() => import("../components/landing/ContactSection"));

const LANDING_SCHEMAS = [
  softwareApplicationSchema(),
  faqSchema([...LANDING_FAQS]),
  breadcrumbSchema([{ name: "ميل", path: "/" }]),
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Mel IQ",
    url: "https://www.mel.iq/",
    inLanguage: "ar-IQ",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.mel.iq/guides",
      "query-input": "required name=search_term_string",
    },
  },
];

/**
 * The landing page, in the order the Figma frame stacks it: hero, partner
 * strip, the "about" manifesto with its stat bar, the benefits bento, the
 * platform and features blocks, the two product decks, pricing, the FAQ,
 * the app download CTA, and the contact block. The footer comes from
 * MarketingShell, which every marketing route shares.
 */
function Landing() {
  return (
    <MarketingShell>
      <SeoHead
        title="ميل IQ | منصة إنشاء المتاجر الإلكترونية في العراق"
        description="ميل IQ منصة عراقية متكاملة لإنشاء المتاجر الإلكترونية بسهولة. أنشئ متجرك، أدر الطلبات، واستقبل المدفوعات خلال دقائق. ابدأ الآن مجاناً."
        path="/"
        ogTitle="ميل IQ | أنشئ متجرك الإلكتروني في العراق"
        schemas={LANDING_SCHEMAS}
      />
      {/* `clip`, not `hidden`: `overflow-x: hidden` computes `overflow-y` to
          `auto`, which turns this wrapper into a scroll container and breaks
          the smooth scroll the nav anchors rely on. */}
      <div className="overflow-x-clip">
        <HeroSection />
        <PartnerStrip />

        <Suspense fallback={null}>
          {/* Only renders for merchants who already have stores. */}
          <GenerationHistory />

          <AboutSection />
          <BenefitsSection />
          <PlatformSection />
          <FeaturesSection />
          <ProductShowcase />
          <PricingSection />
          <FaqSection />
          <AppDownloadSection />
          <ContactSection />
        </Suspense>

        {/* SEO internal-link cluster — crawlable topical hub links. */}
        <section className="relative px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-[900px] text-right">
            <h2 className="mb-4 text-xl font-bold text-frost">
              أدلة التجارة الإلكترونية في العراق
            </h2>
            <p className="mb-6 text-sm text-muted">
              صفحات متخصصة تساعدك تفهم المتجر الإلكتروني، POS، الدفع، والمخزون في السوق العراقي.
            </p>
            <ul className="flex flex-wrap gap-2">
              {[
                ["/ecommerce-iraq", "متجر إلكتروني في العراق"],
                ["/create-online-store", "إنشاء متجر إلكتروني"],
                ["/pos-iraq", "نظام POS"],
                ["/zain-cash", "زين كاش للمتاجر"],
                ["/ai-ecommerce", "مساعد AI للمتاجر"],
                ["/guides", "كل الأدلة"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:border-brand-primary/40 hover:text-frost"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}

export default Landing;
