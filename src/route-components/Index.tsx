import PublicLayout from "@/components/public/PublicLayout";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Modules from "@/components/Modules";
import Dashboard from "@/components/Dashboard";
import CTA from "@/components/CTA";
import { useTrackPublicPageView } from "@/hooks/useTrackPublicPageView";
import { usePublicSeo } from "@/hooks/usePublicSeo";

const Index = () => {
  useTrackPublicPageView("/");
  usePublicSeo({
    title: "AGILYS | Pilotage budgetaire public",
    description:
      "AGILYS centralise planification budgetaire, execution des depenses et audit des decisions pour les organisations publiques.",
    path: "/",
  });

  return (
    <PublicLayout>
      <main>
        <Hero />
        <div>
          <Features />
        </div>
        <div>
          <Modules />
        </div>
        <div>
          <Dashboard />
        </div>
        <div>
          <CTA />
        </div>
      </main>
    </PublicLayout>
  );
};

export default Index;
