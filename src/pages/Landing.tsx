import { MarketingShell } from "../components/LandingNavbar";
import GenerationHistory from "../components/ai/GenerationHistory";
import HeroSection from "../components/landing/HeroSection";
import PartnerStrip from "../components/landing/PartnerStrip";
import AboutSection from "../components/landing/AboutSection";
import BenefitsSection from "../components/landing/BenefitsSection";
import PlatformSection from "../components/landing/PlatformSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import ProductShowcase from "../components/landing/ProductShowcase";
import PricingSection from "../components/landing/PricingSection";
import FaqSection from "../components/landing/FaqSection";
import ContactSection from "../components/landing/ContactSection";

/**
 * The landing page, in the order the Figma frame stacks it: hero, partner
 * strip, the "about" manifesto with its stat bar, the benefits bento, the
 * platform and features blocks, the two product decks, pricing, the FAQ, and
 * the contact block. The footer comes from MarketingShell, which every
 * marketing route shares.
 */
function Landing() {
  return (
    <MarketingShell>
      {/* `clip`, not `hidden`: `overflow-x: hidden` computes `overflow-y` to
          `auto`, which turns this wrapper into a scroll container and breaks
          the smooth scroll the nav anchors rely on. */}
      <div className="overflow-x-clip">
        <HeroSection />
        <PartnerStrip />

        {/* Only renders for merchants who already have stores. */}
        <GenerationHistory />

        <AboutSection />
        <BenefitsSection />
        <PlatformSection />
        <FeaturesSection />
        <ProductShowcase />
        <PricingSection />
        <FaqSection />
        <ContactSection />
      </div>
    </MarketingShell>
  );
}

export default Landing;
