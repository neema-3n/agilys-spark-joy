import { Card } from "@/components/ui/card";
import { 
  Building2, 
  Calendar, 
  Wallet, 
  LineChart, 
  FileCheck, 
  Shield,
  Users,
  Globe
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Multi-Tenant SaaS",
    description: "Chaque client dispose d'un environnement autonome avec ses propres paramètres et workflows."
  },
  {
    icon: Calendar,
    title: "Exercices Pluriannuels",
    description: "Gestion complète d'exercices budgétaires annuels ou pluriannuels avec suivi des périodes."
  },
  {
    icon: Wallet,
    title: "Enveloppes Multi-Sources",
    description: "Création et suivi d'enveloppes budgétaires avec sources de financement variées."
  },
  {
    icon: LineChart,
    title: "Suivi Analytique",
    description: "Projets et programmes suivis avec indicateurs clés et reporting détaillé."
  },
  {
    icon: FileCheck,
    title: "Workflow Complet",
    description: "Réservation, engagement, bon de commande, facture, dépense et paiement intégrés."
  },
  {
    icon: Shield,
    title: "Contrôle & Audit",
    description: "Interface dédiée avec checklist d'audit et conformité aux normes publiques."
  },
  {
    icon: Users,
    title: "RBAC Avancé",
    description: "Gestion des rôles et permissions par structure organisationnelle."
  },
  {
    icon: Globe,
    title: "Multi-Norme",
    description: "Support de SYSCOHADA, OHADA, DSF avec multi-langue et multi-devise."
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-gradient-card">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Une Solution Complète et Puissante
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AGILYS intègre tous les outils nécessaires pour une gestion budgétaire publique moderne et conforme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="p-6 hover:shadow-primary transition-all duration-300 hover:-translate-y-1 bg-card border-border"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
