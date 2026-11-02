import { HeroSection } from "./_components/hero-section";
import { ValueSection } from "./_components/value-section";
import { OfferSection } from "./_components/offer-section";
import { FeaturesSection } from "./_components/features-section";
import { IntegrationSection } from "./_components/integration-section";
import { LuaSection } from "./_components/lua-section";
import { TrustSection } from "./_components/trust-section";
import { ContactSection } from "./_components/contact-section";
import { ClosingSection } from "./_components/closing-section";
import { SaiPlaySection } from "./_components/sai-play-section";

export default function WhySaiServerPage() {
    return (<div id="why-sai-server-page" className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-6">
      <HeroSection />
      <ValueSection />
      <OfferSection />
      <FeaturesSection />
      <SaiPlaySection />
      <IntegrationSection />
      <LuaSection />
      <TrustSection />
      <ContactSection />
      <ClosingSection />
    </div>);
}
