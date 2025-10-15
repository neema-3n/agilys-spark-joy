import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Modules from "@/components/Modules";
import Dashboard from "@/components/Dashboard";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <div id="features">
          <Features />
        </div>
        <div id="modules">
          <Modules />
        </div>
        <div id="dashboard">
          <Dashboard />
        </div>
        <div id="contact">
          <CTA />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
