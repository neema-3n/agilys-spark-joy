import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsCard } from '@/components/ui/stats-card';
import { useDashboardBudgetaire, type DashboardBudgetaireFilters } from '@/hooks/useDashboardBudgetaire';
import { AlertCircle, ArrowRight, DollarSign, Loader2, ShieldAlert, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const signalVariant: Record<string, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'outline',
};

const Dashboard = () => {
  const { currentClient, clients, setCurrentClient } = useClient();
  const { currentExercice, exercices, setCurrentExercice } = useExercice();

  const [pendingFilters, setPendingFilters] = useState<DashboardBudgetaireFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<DashboardBudgetaireFilters>({});

  const dashboard = useDashboardBudgetaire(appliedFilters);

  useEffect(() => {
    setPendingFilters({});
    setAppliedFilters({});
  }, [currentClient?.id, currentExercice?.id]);

  const kpiCards = useMemo(
    () => [
      {
        title: 'Budget modifie',
        value: currencyFormatter.format(dashboard.kpis.budgetModifie),
        trend: `${percentFormatter.format(dashboard.tauxExecution)}% execute`,
        trendUp: true,
        icon: DollarSign,
        color: 'text-primary',
      },
      {
        title: 'Montant engage',
        value: currencyFormatter.format(dashboard.kpis.engage),
        trend: `${percentFormatter.format(dashboard.tauxEngagement)}% engage`,
        trendUp: true,
        icon: TrendingUp,
        color: 'text-secondary',
      },
      {
        title: 'Montant paye',
        value: currencyFormatter.format(dashboard.kpis.paye),
        trend: `${percentFormatter.format(dashboard.tauxExecution)}% du budget modifie`,
        trendUp: dashboard.kpis.paye >= dashboard.kpis.engage * 0.5,
        icon: TrendingDown,
        color: 'text-accent',
      },
      {
        title: 'Disponible',
        value: currencyFormatter.format(dashboard.kpis.disponible),
        trend: `${dashboard.signals.length} signal(s) prioritaire(s)`,
        trendUp: dashboard.signals.length === 0,
        icon: ShieldAlert,
        color: dashboard.signals.length > 0 ? 'text-destructive' : 'text-primary',
      },
    ],
    [dashboard.kpis.budgetModifie, dashboard.kpis.disponible, dashboard.kpis.engage, dashboard.kpis.paye, dashboard.signals.length, dashboard.tauxEngagement, dashboard.tauxExecution]
  );

  const updatePendingFilter = (key: keyof DashboardBudgetaireFilters, rawValue: string) => {
    setPendingFilters((current) => {
      const value = rawValue.trim();
      if (!value) {
        const next = { ...current };
        delete next[key];
        return next;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  if (dashboard.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Tableau de bord budgetaire" description="Chargement du pilotage budgetaire consolide" />
        <div className="px-8 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tableau de bord budgetaire"
          description={`${currentClient?.nom ?? 'Tenant non defini'} - ${currentExercice?.libelle ?? 'Exercice non defini'}`}
        />
        <div className="px-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Impossible de charger le dashboard</AlertTitle>
            <AlertDescription>{dashboard.error.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord budgetaire"
        description={`${currentClient?.nom ?? 'Tenant non defini'} - ${currentExercice?.libelle ?? 'Exercice non defini'}`}
      />

      <div className="px-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtres de pilotage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-8">
              <div className="space-y-2">
                <Label htmlFor="dashboard-entite">Entite</Label>
                <Select
                  value={currentClient?.id}
                  onValueChange={(value) => {
                    const selectedClient = clients.find((client) => client.id === value) ?? null;
                    setCurrentClient(selectedClient);
                  }}
                >
                  <SelectTrigger id="dashboard-entite">
                    <SelectValue placeholder="Selectionner une entite" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-exercice">Exercice</Label>
                <Select
                  value={currentExercice?.id}
                  onValueChange={(value) => {
                    const selectedExercice = exercices.find((exercice) => exercice.id === value) ?? null;
                    setCurrentExercice(selectedExercice);
                  }}
                >
                  <SelectTrigger id="dashboard-exercice">
                    <SelectValue placeholder="Selectionner un exercice" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercices.map((exercice) => (
                      <SelectItem key={exercice.id} value={exercice.id}>
                        {exercice.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-periode">Periode</Label>
                <Input
                  id="dashboard-periode"
                  placeholder="AAAA-MM"
                  value={pendingFilters.periode ?? ''}
                  onChange={(event) => updatePendingFilter('periode', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-section">Section</Label>
                <Input
                  id="dashboard-section"
                  placeholder="SEC-..."
                  value={pendingFilters.sectionCode ?? ''}
                  onChange={(event) => updatePendingFilter('sectionCode', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-programme">Programme</Label>
                <Input
                  id="dashboard-programme"
                  placeholder="PRG-..."
                  value={pendingFilters.programmeCode ?? ''}
                  onChange={(event) => updatePendingFilter('programmeCode', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-action">Action</Label>
                <Input
                  id="dashboard-action"
                  placeholder="ACT-..."
                  value={pendingFilters.actionCode ?? ''}
                  onChange={(event) => updatePendingFilter('actionCode', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-enveloppe">Enveloppe</Label>
                <Input
                  id="dashboard-enveloppe"
                  placeholder="Code ou id enveloppe"
                  value={pendingFilters.enveloppeId ?? ''}
                  onChange={(event) => updatePendingFilter('enveloppeId', event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={() => setAppliedFilters({ ...pendingFilters })}>
                  Appliquer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signaux d'action prioritaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.signals.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Aucun blocage critique detecte</AlertTitle>
                <AlertDescription>
                  Les signaux de supervision et ecarts majeurs ne remontent pas de criticite immediate.
                </AlertDescription>
              </Alert>
            ) : (
              dashboard.signals.map((signal) => (
                <div key={signal.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{signal.title}</p>
                      <Badge variant={signalVariant[signal.severity] ?? 'outline'}>{signal.severity}</Badge>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={signal.sourcePath}>
                        {signal.sourceLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{signal.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card) => (
            <StatsCard
              key={card.title}
              title={card.title}
              value={card.value}
              icon={card.icon}
              trend={card.trend}
              trendUp={card.trendUp}
              color={card.color}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Execution par periode</CardTitle>
            </CardHeader>
            <CardContent>
              {!dashboard.hasData || dashboard.chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune donnee de periode disponible pour les filtres actifs.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={dashboard.chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="periode" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(value: number) => currencyFormatter.format(Number(value || 0))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="prevu" fill="hsl(var(--chart-1))" name="Prevu" />
                    <Bar dataKey="execute" fill="hsl(var(--chart-2))" name="Execute" />
                    <Bar dataKey="ecart" fill="hsl(var(--chart-5))" name="Ecart" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Axes sous tension</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.axesSousTension.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun axe en ecart significatif pour les filtres actifs.</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.axesSousTension.map((axe) => (
                    <div key={axe.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-foreground">{axe.label}</p>
                        <p className="text-xs text-muted-foreground">Periode {axe.periode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{currencyFormatter.format(axe.ecartMontant)}</p>
                        <p className="text-xs text-muted-foreground">{percentFormatter.format(axe.ecartTaux)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
