import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useExercice } from '@/contexts/ExerciceContext';
import { useReportingAnalytique } from '@/hooks/useReportingAnalytique';
import type {
  ReportingAnalytiqueDimension,
  ReportingAnalytiqueExportFormat,
  ReportingAnalytiqueMeasure,
  ReportingAnalytiqueView
} from '@/types/reporting-analytique.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STORAGE_KEY = 'reporting-analytique-filters-v1';

const DIMENSIONS: Array<{ value: ReportingAnalytiqueDimension; label: string }> = [
  { value: 'periode', label: 'Periode' },
  { value: 'entite', label: 'Entite' },
  { value: 'axe-analytique', label: 'Axe analytique' },
  { value: 'composante-budgetaire', label: 'Composante budgetaire' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'statut', label: 'Statut' }
];

const MEASURES: Array<{ value: ReportingAnalytiqueMeasure; label: string }> = [
  { value: 'montant-depense', label: 'Montant depense' },
  { value: 'montant-paye', label: 'Montant paye' },
  { value: 'montant-engage', label: 'Montant engage' },
  { value: 'montant-budget-modifie', label: 'Budget modifie' },
  { value: 'count', label: 'Nombre de lignes' }
];

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

type StoredFilters = {
  rowDimension: ReportingAnalytiqueDimension;
  columnDimension: ReportingAnalytiqueDimension;
  measure: ReportingAnalytiqueMeasure;
  entite: string;
  axeAnalytique: string;
  composanteBudgetaire: string;
  fournisseurId: string;
  statut: string;
};

const getStoredFilters = (): StoredFilters | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredFilters>;
    if (!parsed.rowDimension || !parsed.columnDimension || !parsed.measure) {
      return null;
    }

    return {
      rowDimension: parsed.rowDimension,
      columnDimension: parsed.columnDimension,
      measure: parsed.measure,
      entite: parsed.entite ?? '',
      axeAnalytique: parsed.axeAnalytique ?? '',
      composanteBudgetaire: parsed.composanteBudgetaire ?? '',
      fournisseurId: parsed.fournisseurId ?? '',
      statut: parsed.statut ?? ''
    };
  } catch {
    return null;
  }
};

export const ReportingAnalytiqueReport = () => {
  const { currentExercice } = useExercice();

  const stored = getStoredFilters();

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [entite, setEntite] = useState(stored?.entite ?? '');
  const [axeAnalytique, setAxeAnalytique] = useState(stored?.axeAnalytique ?? '');
  const [composanteBudgetaire, setComposanteBudgetaire] = useState(stored?.composanteBudgetaire ?? '');
  const [fournisseurId, setFournisseurId] = useState(stored?.fournisseurId ?? '');
  const [statut, setStatut] = useState(stored?.statut ?? '');
  const [rowDimension, setRowDimension] = useState<ReportingAnalytiqueDimension>(stored?.rowDimension ?? 'axe-analytique');
  const [columnDimension, setColumnDimension] = useState<ReportingAnalytiqueDimension>(stored?.columnDimension ?? 'periode');
  const [measure, setMeasure] = useState<ReportingAnalytiqueMeasure>(stored?.measure ?? 'montant-depense');
  const [exportView, setExportView] = useState<ReportingAnalytiqueView>('tableau-croise');
  const [exportFormat, setExportFormat] = useState<ReportingAnalytiqueExportFormat>('csv');

  useEffect(() => {
    if (!currentExercice) {
      return;
    }

    if (!dateDebut) {
      setDateDebut(currentExercice.dateDebut);
    }

    if (!dateFin) {
      setDateFin(currentExercice.dateFin);
    }
  }, [currentExercice, dateDebut, dateFin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const payload: StoredFilters = {
      rowDimension,
      columnDimension,
      measure,
      entite,
      axeAnalytique,
      composanteBudgetaire,
      fournisseurId,
      statut
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [axeAnalytique, columnDimension, composanteBudgetaire, entite, fournisseurId, measure, rowDimension, statut]);

  const filters = useMemo(() => {
    if (!currentExercice || !dateDebut || !dateFin) {
      return null;
    }

    return {
      exerciceId: currentExercice.id,
      periode: `${dateDebut}:${dateFin}`,
      entite: entite.trim() || undefined,
      axeAnalytique: axeAnalytique.trim() || undefined,
      composanteBudgetaire: composanteBudgetaire.trim() || undefined,
      fournisseurId: fournisseurId.trim() || undefined,
      statut: statut.trim() || undefined,
      rowDimension,
      columnDimension,
      measure,
      page: 1,
      pageSize: 100
    };
  }, [axeAnalytique, columnDimension, composanteBudgetaire, currentExercice, dateDebut, dateFin, entite, fournisseurId, measure, rowDimension, statut]);

  const { tableau, dashboard, isLoading, error, launchExport, isExporting, exportState } = useReportingAnalytique(filters);

  const onExport = async () => {
    if (!filters) {
      return;
    }

    await launchExport({
      ...filters,
      view: exportView,
      format: exportFormat
    });
  };

  const hasData = Boolean((tableau?.rows.length ?? 0) > 0 || (dashboard?.topRows.length ?? 0) > 0);

  const chartData = dashboard?.chart.points.map((point) => ({
    label: point.key,
    value: point.total
  })) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres tableau croise et dashboard analytique</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date debut</label>
            <Input type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date fin</label>
            <Input type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut depense</label>
            <Input value={statut} onChange={(event) => setStatut(event.target.value)} placeholder="ordonnancee, validee..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Entite (UUID projet)</label>
            <Input value={entite} onChange={(event) => setEntite(event.target.value)} placeholder="Filtrer par entite" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Axe analytique (UUID action)</label>
            <Input value={axeAnalytique} onChange={(event) => setAxeAnalytique(event.target.value)} placeholder="Filtrer par axe" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Composante budgetaire</label>
            <Input
              value={composanteBudgetaire}
              onChange={(event) => setComposanteBudgetaire(event.target.value)}
              placeholder="SEC / PRG / ACT"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fournisseur (UUID)</label>
            <Input value={fournisseurId} onChange={(event) => setFournisseurId(event.target.value)} placeholder="Filtrer par fournisseur" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dimension lignes</label>
            <Select value={rowDimension} onValueChange={(value) => setRowDimension(value as ReportingAnalytiqueDimension)}>
              <SelectTrigger>
                <SelectValue placeholder="Dimension ligne" />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map((dimension) => (
                  <SelectItem key={dimension.value} value={dimension.value}>
                    {dimension.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Dimension colonnes</label>
            <Select value={columnDimension} onValueChange={(value) => setColumnDimension(value as ReportingAnalytiqueDimension)}>
              <SelectTrigger>
                <SelectValue placeholder="Dimension colonne" />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map((dimension) => (
                  <SelectItem key={dimension.value} value={dimension.value}>
                    {dimension.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mesure</label>
            <Select value={measure} onValueChange={(value) => setMeasure(value as ReportingAnalytiqueMeasure)}>
              <SelectTrigger>
                <SelectValue placeholder="Mesure" />
              </SelectTrigger>
              <SelectContent>
                {MEASURES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium">Export</label>
            <div className="flex flex-wrap gap-2">
              <Select value={exportView} onValueChange={(value) => setExportView(value as ReportingAnalytiqueView)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tableau-croise">Tableau croise</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ReportingAnalytiqueExportFormat)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={onExport} disabled={!filters || isExporting} className="gap-2">
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exporter
              </Button>
            </div>
            {exportState ? <p className="text-xs text-muted-foreground">Statut export: {exportState}</p> : null}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement analytique avance...
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && !hasData ? (
        <Alert>
          <AlertDescription>Aucune donnee analytique pour les filtres appliques.</AlertDescription>
        </Alert>
      ) : null}

      {dashboard ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total mesure</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(dashboard.kpis.totalMesure)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Volume lignes</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{dashboard.kpis.volumeLignes}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Budget modifie</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(dashboard.kpis.totalMontantBudgetModifie)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Montant paye</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(dashboard.kpis.totalMontantPaye)}</CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="tableau" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tableau">Tableau croise</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>

        <TabsContent value="tableau">
          <Card>
            <CardHeader>
              <CardTitle>Tableau croise multi-dimensions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tableau?.filters.rowDimension ?? 'Ligne'}</TableHead>
                    {(tableau?.columnKeys ?? []).map((columnKey) => (
                      <TableHead key={columnKey} className="text-right">{columnKey}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tableau?.rows ?? []).map((row) => (
                    <TableRow key={row.rowKey}>
                      <TableCell className="font-medium">{row.rowKey}</TableCell>
                      {row.values.map((value) => (
                        <TableCell key={`${row.rowKey}-${value.columnKey}`} className="text-right">
                          {formatMontant(value.value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top lignes ({dashboard?.filters.rowDimension})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatMontant(Number(value || 0))} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))" name="Mesure" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top colonnes ({dashboard?.filters.columnDimension})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colonne</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.topColumns ?? []).map((column) => (
                    <TableRow key={column.key}>
                      <TableCell>{column.key}</TableCell>
                      <TableCell className="text-right">{formatMontant(column.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle>Anomalies budget vs engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entite</TableHead>
                    <TableHead>Axe</TableHead>
                    <TableHead>Composante</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Ecart</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.anomalies ?? []).map((item, index) => (
                    <TableRow key={`${item.entite}-${item.axeAnalytique}-${index}`}>
                      <TableCell>{item.entite}</TableCell>
                      <TableCell>{item.axeAnalytique}</TableCell>
                      <TableCell>{item.composanteBudgetaire}</TableCell>
                      <TableCell>{item.statut}</TableCell>
                      <TableCell className="text-right">{formatMontant(item.ecart)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
