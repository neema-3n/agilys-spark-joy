import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { useExercice } from '@/contexts/ExerciceContext';
import { useReportingFournisseurs } from '@/hooks/useReportingFournisseurs';
import type {
  ReportingFournisseursAgingBucket,
  ReportingFournisseursExportFormat,
  ReportingFournisseursView
} from '@/types/reporting-fournisseurs.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AGING_OPTIONS: Array<{ value: ReportingFournisseursAgingBucket; label: string }> = [
  { value: 'J0-30', label: 'J0-30' },
  { value: 'J31-60', label: 'J31-60' },
  { value: 'J61-90', label: 'J61-90' },
  { value: 'J90+', label: 'J90+' }
];

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

export const ReportingFournisseursReport = () => {
  const { currentExercice } = useExercice();

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [entite, setEntite] = useState('');
  const [fournisseurId, setFournisseurId] = useState('all');
  const [statut, setStatut] = useState('all');
  const [agingBucket, setAgingBucket] = useState('all');
  const [exportView, setExportView] = useState<ReportingFournisseursView>('etat-dettes-fournisseurs');
  const [exportFormat, setExportFormat] = useState<ReportingFournisseursExportFormat>('csv');

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
    if (!dateDebut || !dateFin) {
      return null;
    }

    return {
      periode: `${dateDebut}:${dateFin}`,
      entite: entite.trim() || undefined,
      fournisseurId: fournisseurId !== 'all' ? fournisseurId : undefined,
      statut: statut !== 'all' ? statut : undefined,
      agingBucket: agingBucket !== 'all' ? (agingBucket as ReportingFournisseursAgingBucket) : undefined,
      page: 1,
      pageSize: 100
    };
  }, [agingBucket, dateDebut, dateFin, entite, fournisseurId, statut]);

  const { dettes, avances, isLoading, error, launchExport, isExporting, exportState } = useReportingFournisseurs(filters);

  const fournisseurOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();

    for (const row of dettes?.rows ?? []) {
      map.set(row.fournisseurId, {
        id: row.fournisseurId,
        label: `${row.fournisseurCode} - ${row.fournisseurNom}`
      });
    }

    for (const row of avances?.rows ?? []) {
      map.set(row.fournisseurId, {
        id: row.fournisseurId,
        label: `${row.fournisseurCode} - ${row.fournisseurNom}`
      });
    }

    return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [avances?.rows, dettes?.rows]);

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

  const hasData = Boolean((dettes?.rows.length ?? 0) > 0 || (avances?.rows.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres etat dettes fournisseurs / avances</CardTitle>
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
            <label className="text-sm font-medium">Entite (UUID optionnel)</label>
            <Input value={entite} onChange={(event) => setEntite(event.target.value)} placeholder="Filtrer par entite" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fournisseur</label>
            <Select value={fournisseurId} onValueChange={setFournisseurId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les fournisseurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les fournisseurs</SelectItem>
                {fournisseurOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Statut</label>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="validee">Validee</SelectItem>
                <SelectItem value="ordonnancee">Ordonnancee</SelectItem>
                <SelectItem value="payee">Payee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Aging bucket (dettes)</label>
            <Select value={agingBucket} onValueChange={setAgingBucket}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les buckets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les buckets</SelectItem>
                {AGING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-sm font-medium">Export</label>
            <div className="flex flex-wrap gap-2">
              <Select value={exportView} onValueChange={(value) => setExportView(value as ReportingFournisseursView)}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etat-dettes-fournisseurs">Etat dettes fournisseurs</SelectItem>
                  <SelectItem value="etat-avances-regularisations">Etat avances regularisations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ReportingFournisseursExportFormat)}>
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
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des rapports fournisseurs...
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
          <AlertDescription>Aucune donnee fournisseur trouvee pour la periode filtree.</AlertDescription>
        </Alert>
      ) : null}

      {dettes || avances ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dettes - Montant total</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(dettes?.summary.totalMontant ?? 0)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dettes - Reste a payer</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(dettes?.summary.totalResteOuEcart ?? 0)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Avances - Ecart net</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(avances?.summary.totalResteOuEcart ?? 0)}</CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="dettes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dettes">Etat dettes fournisseurs</TabsTrigger>
          <TabsTrigger value="avances">Etat avances regularisations</TabsTrigger>
        </TabsList>

        <TabsContent value="dettes">
          <Card>
            <CardHeader>
              <CardTitle>Dettes fournisseurs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead>Facture</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-right">Paye</TableHead>
                    <TableHead className="text-right">Reste</TableHead>
                    <TableHead>Regularisation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dettes?.rows ?? []).map((row) => (
                    <TableRow key={row.factureId}>
                      <TableCell className="font-medium">{row.fournisseurCode} - {row.fournisseurNom}</TableCell>
                      <TableCell>{row.factureNumero}</TableCell>
                      <TableCell>{row.agingBucket} ({row.joursRetard}j)</TableCell>
                      <TableCell className="text-right">{formatMontant(row.montantFacture)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.montantPaye)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.resteAPayer)}</TableCell>
                      <TableCell>{row.statutRegularisation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avances">
          <Card>
            <CardHeader>
              <CardTitle>Avances et regularisations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fournisseur</TableHead>
                    <TableHead className="text-right">Avance initiale</TableHead>
                    <TableHead className="text-right">Consommation</TableHead>
                    <TableHead className="text-right">Ecart</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Depenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(avances?.rows ?? []).map((row) => (
                    <TableRow key={row.fournisseurId}>
                      <TableCell className="font-medium">{row.fournisseurCode} - {row.fournisseurNom}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.avanceInitiale)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.consommation)}</TableCell>
                      <TableCell className="text-right">{formatMontant(row.ecart)}</TableCell>
                      <TableCell>{row.statutRegularisation}</TableCell>
                      <TableCell className="text-right">{row.depensesCount}</TableCell>
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
