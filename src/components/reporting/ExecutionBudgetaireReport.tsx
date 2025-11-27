import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const ExecutionBudgetaireReport = () => {
  const { lignes: lignesBudgetaires, isLoading } = useLignesBudgetaires();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const totaux = lignesBudgetaires.reduce(
    (acc, ligne) => ({
      initial: acc.initial + Number(ligne.montantInitial),
      modifie: acc.modifie + Number(ligne.montantModifie),
      engage: acc.engage + Number(ligne.montantEngage),
      paye: acc.paye + Number(ligne.montantPaye),
      disponible: acc.disponible + Number(ligne.disponible),
    }),
    { initial: 0, modifie: 0, engage: 0, paye: 0, disponible: 0 }
  );

  const tauxExecution = totaux.modifie > 0 ? (totaux.paye / totaux.modifie) * 100 : 0;
  const tauxEngagement = totaux.modifie > 0 ? (totaux.engage / totaux.modifie) * 100 : 0;

  const formatMontant = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const chartData = [
    {
      name: 'Budget',
      'Budget Initial': totaux.initial,
      'Budget Modifié': totaux.modifie,
      Engagé: totaux.engage,
      Payé: totaux.paye,
      Disponible: totaux.disponible,
    },
  ];

  const chartConfig = {
    'Budget Initial': { label: 'Budget Initial', color: 'hsl(var(--chart-1))' },
    'Budget Modifié': { label: 'Budget Modifié', color: 'hsl(var(--chart-2))' },
    Engagé: { label: 'Engagé', color: 'hsl(var(--chart-3))' },
    Payé: { label: 'Payé', color: 'hsl(var(--chart-4))' },
    Disponible: { label: 'Disponible', color: 'hsl(var(--chart-5))' },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Budget Modifié</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMontant(totaux.modifie)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Taux d'Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tauxEngagement.toFixed(1)}%</div>
            <Progress value={tauxEngagement} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Taux d'Exécution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tauxExecution.toFixed(1)}%</div>
            <Progress value={tauxExecution} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble de l'exécution</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Budget Initial" fill="var(--color-Budget Initial)" />
                <Bar dataKey="Budget Modifié" fill="var(--color-Budget Modifié)" />
                <Bar dataKey="Engagé" fill="var(--color-Engagé)" />
                <Bar dataKey="Payé" fill="var(--color-Payé)" />
                <Bar dataKey="Disponible" fill="var(--color-Disponible)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par ligne budgétaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lignesBudgetaires.slice(0, 10).map((ligne) => {
              const tauxExecLigne = ligne.montantModifie > 0 
                ? (ligne.montantPaye / ligne.montantModifie) * 100 
                : 0;
              
              return (
                <div key={ligne.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{ligne.libelle}</span>
                    <span>{tauxExecLigne.toFixed(1)}%</span>
                  </div>
                  <Progress value={tauxExecLigne} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Payé: {formatMontant(ligne.montantPaye)}</span>
                    <span>Budget: {formatMontant(ligne.montantModifie)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
