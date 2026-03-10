import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { useExercice } from '@/contexts/ExerciceContext';
import { useReportingExecutionTresorerie } from '@/hooks/useReportingExecutionTresorerie';
import type {
  ExecutionBudgetaireResponse,
  ReportingExecutionTresorerieExportFormat,
  ReportingExecutionTresorerieView,
  TresorerieResponse
} from '@/types/reporting-execution-tresorerie.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

const severityLabel: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'Critique',
  high: 'Elevee',
  medium: 'Moyenne',
  low: 'Faible'
};

const isExecutionBudgetaireResponse = (value: unknown): value is ExecutionBudgetaireResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ExecutionBudgetaireResponse>;
  return Array.isArray(candidate.rows) && typeof candidate.summary === 'object' && candidate.summary !== null;
};

const isTresorerieResponse = (value: unknown): value is TresorerieResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TresorerieResponse>;
  return (
    Array.isArray(candidate.journalFlux) &&
    Array.isArray(candidate.etatPaiements) &&
    Array.isArray(candidate.etatRapprochements) &&
    Array.isArray(candidate.alertes) &&
    typeof candidate.summary === 'object' &&
    candidate.summary !== null
  );
};

export const ReportingExecutionTresorerieReport = () => {
  const { currentExercice } = useExercice();

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [entite, setEntite] = useState('');
  const [axeAnalytique, setAxeAnalytique] = useState('');
  const [seuil, setSeuil] = useState('0');
  const [exportView, setExportView] = useState<ReportingExecutionTresorerieView>('execution-budgetaire');
  const [exportFormat, setExportFormat] = useState<ReportingExecutionTresorerieExportFormat>('csv');

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

  const filters = useMemo(() => {
    if (!currentExercice || !dateDebut || !dateFin) {
      return null;
    }

    return {
      exerciceId: currentExercice.id,
      periode: `${dateDebut}:${dateFin}`,
      entite: entite.trim() || undefined,
      axeAnalytique: axeAnalytique.trim() || undefined,
      seuil: Number.isFinite(Number(seuil)) ? Number(seuil) : 0,
      page: 1,
      pageSize: 100
    };
  }, [axeAnalytique, currentExercice, dateDebut, dateFin, entite, seuil]);

  const { execution, tresorerie, isLoading, error, launchExport, isExporting, exportState } = useReportingExecutionTresorerie(filters);
  const executionData = isExecutionBudgetaireResponse(execution) ? execution : null;
  const tresorerieData = isTresorerieResponse(tresorerie) ? tresorerie : null;

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

  const hasData = Boolean((executionData?.rows.length ?? 0) > 0 || (tresorerieData?.journalFlux.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres execution budgetaire et tresorerie</CardTitle>
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
            <label className="text-sm font-medium">Seuil alerte</label>
            <Input type="number" min={0} value={seuil} onChange={(event) => setSeuil(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Entite (UUID optionnel)</label>
            <Input value={entite} onChange={(event) => setEntite(event.target.value)} placeholder="Filtrer par entite" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Axe analytique (UUID optionnel)</label>
            <Input value={axeAnalytique} onChange={(event) => setAxeAnalytique(event.target.value)} placeholder="Filtrer par axe" />
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium">Export</label>
            <div className="flex flex-wrap gap-2">
              <Select value={exportView} onValueChange={(value) => setExportView(value as ReportingExecutionTresorerieView)}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="execution-budgetaire">Execution budgetaire</SelectItem>
                  <SelectItem value="tresorerie">Tresorerie</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ReportingExecutionTresorerieExportFormat)}>
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
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement execution+tresorerie...
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
          <AlertDescription>Aucune donnee trouvee pour la periode filtree.</AlertDescription>
        </Alert>
      ) : null}

      {executionData ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Budget modifie</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(executionData.summary.totalBudgetModifie)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total paye</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(executionData.summary.totalPaye)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ecart prevision/execution</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(executionData.summary.totalEcart)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Alertes seuil</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{executionData.summary.totalAlertes}</CardContent>
          </Card>
        </div>
      ) : null}

      {tresorerieData ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Position courante</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(tresorerieData.summary.positionCourante)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Projection solde</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(tresorerieData.summary.projectionSolde)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Alertes tresorerie</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{tresorerieData.summary.totalAlertes}</CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="execution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="execution">Execution budgetaire</TabsTrigger>
          <TabsTrigger value="tresorerie">Tresorerie operationnelle</TabsTrigger>
        </TabsList>

        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparaison prevision/execution par ligne</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    <TableHead>Composante</TableHead>
                    <TableHead>Axe</TableHead>
                    <TableHead className="text-right">Budget modifie</TableHead>
                    <TableHead className="text-right">Paye</TableHead>
                    <TableHead className="text-right">Ecart</TableHead>
                    <TableHead>Alerte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(executionData?.rows ?? []).map((row) => (
                    <TableRow key={row.ligneId}>
                      <TableCell className="font-medium">{row.ligneLibelle}</TableCell>
                      <TableCell>{row.composante}</TableCell>
                      <TableCell>{row.axeAnalytique}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.budgetModifie)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.paye)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.ecartPrevisionExecution)}</TableCell>
                      <TableCell>{row.alerteSeuil ? <Badge variant="destructive">Seuil depasse</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tresorerie" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertes tresorerie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(tresorerieData?.alertes ?? []).map((alerte) => (
                <div key={alerte.code} className="rounded border p-3 text-sm">
                  <p className="font-medium">
                    {alerte.code} - {severityLabel[alerte.severity]}
                  </p>
                  <p className="text-muted-foreground">{alerte.message}</p>
                </div>
              ))}
              {!tresorerieData?.alertes.length ? <p className="text-sm text-muted-foreground">Aucune alerte active.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Journal des flux</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Numero</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Libelle</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Rapprochement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tresorerieData?.journalFlux ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.dateOperation}</TableCell>
                      <TableCell>{row.numero}</TableCell>
                      <TableCell>{row.typeOperation}</TableCell>
                      <TableCell>{row.compte}</TableCell>
                      <TableCell>{row.libelle}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.montant)}</TableCell>
                      <TableCell>{row.rapproche ? 'Oui' : 'Non'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Etat paiements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Nombre</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tresorerieData?.etatPaiements ?? []).map((row) => (
                      <TableRow key={row.statut}>
                        <TableCell>{row.statut}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.montant)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Etat rapprochements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Nombre</TableHead>
                      <TableHead className="text-right">Ecart total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(tresorerieData?.etatRapprochements ?? []).map((row) => (
                      <TableRow key={row.statut}>
                        <TableCell>{row.statut}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.ecartTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
