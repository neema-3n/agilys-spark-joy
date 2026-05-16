import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-gradient-primary relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary-foreground">
            Prêt à Moderniser Votre Gestion Budgétaire ?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8">
            Rejoignez les administrations qui ont choisi AGILYS pour transformer 
            leur gestion budgétaire publique.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-glow group"
            >
              Demander une démo
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="outline-hero" 
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Mail className="w-4 h-4" />
              Contactez-nous
            </Button>
          </div>

          <p className="mt-8 text-sm text-primary-foreground/70">
            Essai gratuit de 30 jours • Aucune carte bancaire requise • Support dédié
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
