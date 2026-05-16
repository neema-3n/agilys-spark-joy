import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  CalendarDays, 
  Briefcase, 
  TrendingUp,
  BookmarkCheck,
  FileText,
  ShoppingCart,
  Users2,
  Receipt,
  CreditCard,
  Wallet2,
  BookOpen,
  ShieldCheck,
  BarChart3
} from "lucide-react";

const modules = [
  {
    icon: Building,
    title: "Structure Organisationnelle",
    description: "Gestion des unités budgétaires avec hiérarchie paramétrable",
    category: "Gestion"
  },
  {
    icon: CalendarDays,
    title: "Exercices Budgétaires",
    description: "Suivi des périodes et calendrier fiscal comptable",
    category: "Budget"
  },
  {
    icon: Briefcase,
    title: "Enveloppes & Financement",
    description: "Sources multiples avec suivi des consommations",
    category: "Budget"
  },
  {
    icon: TrendingUp,
    title: "Projets & Analytique",
    description: "Fiches projets avec indicateurs et reporting",
    category: "Analyse"
  },
  {
    icon: BookmarkCheck,
    title: "Réservation de Crédits",
    description: "Blocage préalable avec traçabilité complète",
    category: "Opérations"
  },
  {
    icon: FileText,
    title: "Engagements",
    description: "Gestion des engagements et conventions",
    category: "Opérations"
  },
  {
    icon: ShoppingCart,
    title: "Bons de Commande",
    description: "Création et suivi des validations",
    category: "Opérations"
  },
  {
    icon: Users2,
    title: "Fournisseurs",
    description: "Fiches complètes avec historique détaillé",
    category: "Gestion"
  },
  {
    icon: Receipt,
    title: "Factures",
    description: "Contrôle de conformité et archivage",
    category: "Opérations"
  },
  {
    icon: CreditCard,
    title: "Dépenses",
    description: "Vérification automatique des plafonds",
    category: "Opérations"
  },
  {
    icon: Wallet2,
    title: "Paiements",
    description: "Multi-modes avec écritures automatiques",
    category: "Opérations"
  },
  {
    icon: TrendingUp,
    title: "Suivi de Trésorerie",
    description: "Tableau de flux, prévisions et suivi des encaissements",
    category: "Trésorerie"
  },
  {
    icon: BookOpen,
    title: "Plan Comptable",
    description: "Import et structuration hiérarchique",
    category: "Comptabilité"
  },
  {
    icon: ShieldCheck,
    title: "Contrôle & Audit",
    description: "Checklist intégrée et suivi des anomalies",
    category: "Conformité"
  },
  {
    icon: BarChart3,
    title: "Reporting & DSF",
    description: "États standards et conformité SYSCOHADA",
    category: "Analyse"
  }
];

const Modules = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <Badge className="mb-4">15 Modules Intégrés</Badge>
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Modules Fonctionnels
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une couverture complète de tous les processus de gestion budgétaire publique.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module, index) => (
            <Card 
              key={index}
              className="p-5 hover:shadow-card-custom transition-all duration-300 bg-gradient-card border-border group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-primary transition-all duration-300">
                  <module.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{module.title}</h3>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{module.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{module.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Modules;
