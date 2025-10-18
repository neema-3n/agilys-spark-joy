import dashboardPreview from "@/assets/dashboard-preview.jpg";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const capabilities = [
  "Vue consolidée des budgets et dépenses",
  "Tableaux comparatifs multi-sources",
  "Alertes automatiques sur dépassements",
  "Reporting en temps réel",
  "Export multi-formats (Excel, JSON, DSF XML)",
  "Tableaux de bord personnalisables"
];

const Dashboard = () => {
  return (
    <section className="py-24 bg-gradient-hero">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-foreground">
              Tableaux de Bord Intelligents
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Des visualisations claires et des analyses puissantes pour une prise de décision éclairée.
            </p>

            <div className="space-y-4">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{capability}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="p-4 shadow-primary border-border overflow-hidden">
            <img 
              src={dashboardPreview} 
              alt="Tableau de bord intelligent avec visualisations et analyses budgétaires en temps réel" 
              width="768"
              height="480"
              className="w-full h-auto rounded-lg"
            />
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Dashboard;
