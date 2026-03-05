import PublicLayout from "@/components/public/PublicLayout";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Modules from "@/components/Modules";
import Dashboard from "@/components/Dashboard";
import CTA from "@/components/CTA";

const Index = () => {
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
