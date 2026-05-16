import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBackground} 
          alt="Système de gestion budgétaire moderne pour collectivités publiques" 
          width="1504"
          height="846"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-accent/80 to-primary/90" />
      </div>

      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Content */}
      <div className="container relative z-10 px-4 mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20">
            <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">
              Solution SaaS Multi-Tenant
            </span>
          </div>

          {/* Main Title */}
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Gestion Budgétaire Publique
            <span className="block mt-2 bg-gradient-to-r from-primary-foreground to-primary-foreground/80 bg-clip-text text-transparent">
              Nouvelle Génération
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-8 text-lg text-primary-foreground/90 md:text-xl max-w-2xl mx-auto">
            AGILYS transforme la gestion budgétaire publique avec une plateforme complète 
            conforme aux normes SYSCOHADA, OHADA et DSF.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="hero" size="lg" className="group">
              Démarrer une démo
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="outline-hero" size="lg">
              Découvrir les fonctionnalités
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-primary-foreground/20">
            <div>
              <div className="text-4xl font-bold text-primary-foreground">16+</div>
              <div className="text-sm text-primary-foreground/80 mt-1">Modules Intégrés</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-foreground">100%</div>
              <div className="text-sm text-primary-foreground/80 mt-1">Conforme Audit</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary-foreground">Multi</div>
              <div className="text-sm text-primary-foreground/80 mt-1">Tenant SaaS</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
