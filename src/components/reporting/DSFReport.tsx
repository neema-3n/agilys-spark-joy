import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useRecettes } from '@/hooks/useRecettes';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const DSFReport = () => {
  const { depenses } = useDepenses();
  const { engagements } = useEngagements();
  const { recettes } = useRecettes();

  const formatMontant = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const depensesValidees = depenses.filter(d => d.statut !== 'annulee');
  const engagementsValides = engagements.filter(e => e.statut !== 'annule');
  const recettesValidees = recettes.filter(r => r.statut !== 'annulee');

  const totalDepenses = depensesValidees.reduce((sum, d) => sum + Number(d.montant), 0);
  const totalEngagements = engagementsValides.reduce((sum, e) => sum + Number(e.montant), 0);
  const totalRecettes = recettesValidees.reduce((sum, r) => sum + Number(r.montant), 0);
  const solde = totalRecettes - totalDepenses;

  const dsfData = [
    {
      categorie: 'Recettes',
      Montant: totalRecettes,
    },
    {
      categorie: 'Dépenses',
      Montant: totalDepenses,
    },
    {
      categorie: 'Engagements',
      Montant: totalEngagements,
    },
    {
      categorie: 'Solde',
      Montant: solde,
    },
  ];

  const chartConfig = {
    Montant: { label: 'Montant', color: 'hsl(var(--chart-1))' },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Recettes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMontant(totalRecettes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {recettesValidees.length} recettes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMontant(totalDepenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {depensesValidees.length} dépenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Engagements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMontant(totalEngagements)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {engagementsValides.length} engagements
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Solde</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMontant(solde)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recettes - Dépenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document de Synthèse Financière</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dsfData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categorie" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="Montant" fill="var(--color-Montant)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Indicateurs de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taux de Couverture</span>
                <span className="text-sm font-bold">
                  {totalDepenses > 0 ? ((totalRecettes / totalDepenses) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taux d'Engagement</span>
                <span className="text-sm font-bold">
                  {totalDepenses > 0 ? ((totalEngagements / totalDepenses) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Ratio Recettes/Engagements</span>
                <span className="text-sm font-bold">
                  {totalEngagements > 0 ? ((totalRecettes / totalEngagements) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé Exécutif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Situation budgétaire:</span>{' '}
                {solde >= 0 ? 'Excédentaire' : 'Déficitaire'}
              </p>
              <p>
                <span className="font-medium">Volume d'opérations:</span>{' '}
                {depensesValidees.length + recettesValidees.length + engagementsValides.length} opérations
              </p>
              <p>
                <span className="font-medium">Capacité de paiement:</span>{' '}
                {formatMontant(totalRecettes - totalDepenses)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
