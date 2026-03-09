import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsCard } from '@/components/ui/stats-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { type AnalysesFilters, useAnalysesFinancieres } from '@/hooks/useAnalysesFinancieres';
import { serializeAnalysesFilters } from '@/lib/analyses-financieres';
import { exportAnalysesToCSV } from '@/lib/export-utils';
import { AlertCircle, BarChart3, Download, FolderKanban, Loader2, Scale, Target } from 'lucide-react';
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

const Analyses = () => {
  const { currentClient, clients, setCurrentClient } = useClient();
  const { currentExercice, exercices, setCurrentExercice } = useExercice();

  const [pendingFilters, setPendingFilters] = useState<AnalysesFilters>({});
  const [appliedFilters, setAppliedFilters] = useState<AnalysesFilters>({});

  const analyses = useAnalysesFinancieres(appliedFilters);

  const programmesOptions = useMemo(
    () => analyses.options.programmes.filter((item) => !pendingFilters.sectionId || item.section_id === pendingFilters.sectionId),
    [analyses.options.programmes, pendingFilters.sectionId]
  );

  const actionsOptions = useMemo(
    () => analyses.options.actions.filter((item) => !pendingFilters.programmeId || item.programme_id === pendingFilters.programmeId),
    [analyses.options.actions, pendingFilters.programmeId]
  );

  const onFilterChange = (key: keyof AnalysesFilters, rawValue: string) => {
    setPendingFilters((current) => {
      const nextValue = rawValue === 'all' ? undefined : rawValue;
      const next: AnalysesFilters = { ...current, [key]: nextValue };

      if (key === 'sectionId') {
        next.programmeId = undefined;
        next.actionId = undefined;
      }

      if (key === 'programmeId') {
        next.actionId = undefined;
      }

      return next;
    });
  };

  const onApplyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
  };

  const onResetFilters = () => {
    setPendingFilters({});
    setAppliedFilters({});
  };

  const onExport = () => {
    const exportedFilters = {
      tenant: currentClient?.nom ?? '',
      exercice: currentExercice?.libelle ?? '',
      ...serializeAnalysesFilters(appliedFilters),
    };

    exportAnalysesToCSV(analyses.exportRows, exportedFilters, `analyses-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (analyses.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analyses Financières" description="Analyse multi-axes projet, structure et budget" />
        <div className="px-8 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (analyses.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analyses Financières" description="Analyse multi-axes projet, structure et budget" />
        <div className="px-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Impossible de charger les analyses</AlertTitle>
            <AlertDescription>{analyses.error.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analyses Financières"
        description={`${currentClient?.nom ?? 'Tenant non defini'} - ${currentExercice?.libelle ?? 'Exercice non defini'}`}
      />

      <div className="px-4 md:px-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Filtres analytiques</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onResetFilters}>
                Reinitialiser
              </Button>
              <Button variant="secondary" onClick={onApplyFilters}>
                Appliquer
              </Button>
              <Button onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
              <div className="space-y-2">
                <Label htmlFor="analyse-entite">Entite</Label>
                <Select
                  value={currentClient?.id}
                  onValueChange={(value) => {
                    const selected = clients.find((item) => item.id === value) ?? null;
                    setCurrentClient(selected);
                    setPendingFilters({});
                    setAppliedFilters({});
                  }}
                >
                  <SelectTrigger id="analyse-entite">
                    <SelectValue placeholder="Entite" />
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
                <Label htmlFor="analyse-exercice">Exercice</Label>
                <Select
                  value={currentExercice?.id}
                  onValueChange={(value) => {
                    const selected = exercices.find((item) => item.id === value) ?? null;
                    setCurrentExercice(selected);
                    setPendingFilters({});
                    setAppliedFilters({});
                  }}
                >
                  <SelectTrigger id="analyse-exercice">
                    <SelectValue placeholder="Exercice" />
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
                <Label htmlFor="analyse-periode">Periode</Label>
                <Input
                  id="analyse-periode"
                  placeholder="AAAA-MM"
                  value={pendingFilters.periode ?? ''}
                  onChange={(event) => onFilterChange('periode', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analyse-projet">Projet</Label>
                <Select value={pendingFilters.projetId ?? 'all'} onValueChange={(value) => onFilterChange('projetId', value)}>
                  <SelectTrigger id="analyse-projet">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les projets</SelectItem>
                    {analyses.options.projets.map((projet) => (
                      <SelectItem key={projet.id} value={projet.id}>
                        {projet.code} - {projet.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="analyse-structure">Structure</Label>
                <Select value={pendingFilters.structureId ?? 'all'} onValueChange={(value) => onFilterChange('structureId', value)}>
                  <SelectTrigger id="analyse-structure">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les structures</SelectItem>
                    {analyses.options.structures.map((structure) => (
                      <SelectItem key={structure.id} value={structure.id}>
                        {structure.code} - {structure.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="analyse-section">Section</Label>
                <Select value={pendingFilters.sectionId ?? 'all'} onValueChange={(value) => onFilterChange('sectionId', value)}>
                  <SelectTrigger id="analyse-section">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sections</SelectItem>
                    {analyses.options.sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="analyse-programme">Programme</Label>
                <Select
                  value={pendingFilters.programmeId ?? 'all'}
                  onValueChange={(value) => onFilterChange('programmeId', value)}
                  disabled={!pendingFilters.sectionId}
                >
                  <SelectTrigger id="analyse-programme">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les programmes</SelectItem>
                    {programmesOptions.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="analyse-action">Action</Label>
                <Select
                  value={pendingFilters.actionId ?? 'all'}
                  onValueChange={(value) => onFilterChange('actionId', value)}
                  disabled={!pendingFilters.programmeId}
                >
                  <SelectTrigger id="analyse-action">
                    <SelectValue placeholder="Toutes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {actionsOptions.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Budget alloue"
            value={currencyFormatter.format(analyses.kpis.budgetAlloue)}
            icon={FolderKanban}
            trend={`${analyses.counts.projets} projet(s)`}
            trendUp
          />
          <StatsCard
            title="Montant engage"
            value={currencyFormatter.format(analyses.kpis.engage)}
            icon={BarChart3}
            trend={`${analyses.counts.engagements} engagement(s)`}
            trendUp
          />
          <StatsCard
            title="Montant paye"
            value={currencyFormatter.format(analyses.kpis.paye)}
            icon={Scale}
            trend={`${analyses.counts.factures} facture(s)`}
            trendUp={analyses.kpis.paye > 0}
          />
          <StatsCard
            title="Taux d'execution"
            value={`${percentFormatter.format(analyses.kpis.tauxExecution)}%`}
            icon={Target}
            trend={`${analyses.counts.axes} axe(s)`}
            trendUp={analyses.kpis.tauxExecution >= 50}
          />
        </div>

        <Tabs defaultValue="projets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projets">Projets</TabsTrigger>
            <TabsTrigger value="structures">Structures</TabsTrigger>
            <TabsTrigger value="axes">Axes budgetaires</TabsTrigger>
          </TabsList>

          <TabsContent value="projets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparatif par projet</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analyses.projetChartRows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => currencyFormatter.format(Number(value || 0))} />
                    <Legend />
                    <Bar dataKey="budgetAlloue" name="Budget alloue" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="engage" name="Engage" fill="hsl(var(--chart-3))" />
                    <Bar dataKey="paye" name="Paye" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="structures" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparatif par centre/structure</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analyses.structureChartRows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => currencyFormatter.format(Number(value || 0))} />
                    <Legend />
                    <Bar dataKey="budgetAlloue" name="Budget alloue" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="engage" name="Engage" fill="hsl(var(--chart-3))" />
                    <Bar dataKey="paye" name="Paye" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="axes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparatif par axe budgetaire</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analyses.axeChartRows}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => currencyFormatter.format(Number(value || 0))} />
                    <Legend />
                    <Bar dataKey="budgetAlloue" name="Budget alloue" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="engage" name="Engage" fill="hsl(var(--chart-3))" />
                    <Bar dataKey="paye" name="Paye" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Tableau detaille (vue exportable)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dimension</TableHead>
                  <TableHead>Libelle</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Engage</TableHead>
                  <TableHead className="text-right">Paye</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.exportRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Aucune donnee analytique disponible pour les filtres actifs.
                    </TableCell>
                  </TableRow>
                ) : (
                  analyses.exportRows.slice(0, 30).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="capitalize">{row.dimensionType}</TableCell>
                      <TableCell>{row.dimensionLabel}</TableCell>
                      <TableCell className="text-right">{currencyFormatter.format(row.budgetAlloue)}</TableCell>
                      <TableCell className="text-right">{currencyFormatter.format(row.engage)}</TableCell>
                      <TableCell className="text-right">{currencyFormatter.format(row.paye)}</TableCell>
                      <TableCell className="text-right">{currencyFormatter.format(row.disponible)}</TableCell>
                      <TableCell className="text-right">{percentFormatter.format(row.tauxExecution)}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analyses;
