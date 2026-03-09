import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { useExercice } from '@/contexts/ExerciceContext';
import { useReportingComptable } from '@/hooks/useReportingComptable';
import type { ReportingComptableExportFormat, ReportingComptableView } from '@/types/reporting-comptable.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

export const ReportingComptableReport = () => {
  const { currentExercice } = useExercice();

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [compteId, setCompteId] = useState<string>('all');
  const [entiteId, setEntiteId] = useState('');
  const [axeId, setAxeId] = useState('');
  const [exportView, setExportView] = useState<ReportingComptableView>('balance');
  const [exportFormat, setExportFormat] = useState<ReportingComptableExportFormat>('csv');

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
      dateDebut,
      dateFin,
      compteId: compteId !== 'all' ? compteId : undefined,
      entiteId: entiteId.trim() || undefined,
      axeId: axeId.trim() || undefined,
      page: 1,
      pageSize: 100
    };
  }, [axeId, compteId, dateDebut, dateFin, entiteId]);

  const { report, isLoading, error, launchExport, isExporting, exportState } = useReportingComptable(filters);

  const onExport = async () => {
    if (!filters) {
      return;
    }

    await launchExport({
      view: exportView,
      format: exportFormat
    });
  };

  const hasData = Boolean(report && (report.balance.rows.length > 0 || report.grandLivre.rows.length > 0));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtres reporting comptable</CardTitle>
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
            <label className="text-sm font-medium">Compte (optionnel)</label>
            <Select value={compteId} onValueChange={setCompteId}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les comptes</SelectItem>
                {report?.balance.rows.map((row) => (
                  <SelectItem key={row.compteId} value={row.compteId}>
                    {row.numero} - {row.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Entite (UUID optionnel)</label>
            <Input value={entiteId} onChange={(event) => setEntiteId(event.target.value)} placeholder="Filtrer par entite" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Axe (UUID optionnel)</label>
            <Input value={axeId} onChange={(event) => setAxeId(event.target.value)} placeholder="Filtrer par axe" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Export</label>
            <div className="flex gap-2">
              <Select value={exportView} onValueChange={(value) => setExportView(value as ReportingComptableView)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="grand-livre">Grand livre</SelectItem>
                  <SelectItem value="fiche-compte">Fiche compte</SelectItem>
                </SelectContent>
              </Select>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ReportingComptableExportFormat)}>
                <SelectTrigger>
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
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des rapports comptables...
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
          <AlertDescription>Aucune ecriture comptable trouvee pour la periode filtree.</AlertDescription>
        </Alert>
      ) : null}

      {report ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Debit</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(report.integrity.totalDebit)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Credit</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(report.integrity.totalCredit)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ecart</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{formatMontant(report.integrity.ecart)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Integrite</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{report.integrity.isBalanced ? 'OK' : 'A verifier'}</CardContent>
          </Card>
        </div>
      ) : null}

      {report ? (
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="grand-livre">Grand livre</TabsTrigger>
            <TabsTrigger value="fiche-compte">Fiche compte</TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle>Balance comptable</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead>Libelle</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Solde</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.balance.rows.map((row) => (
                      <TableRow key={row.compteId}>
                        <TableCell className="font-medium">{row.numero}</TableCell>
                        <TableCell>{row.libelle}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.debit)}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.credit)}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.solde)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grand-livre">
            <Card>
              <CardHeader>
                <CardTitle>Grand livre</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Piece</TableHead>
                      <TableHead>Ligne</TableHead>
                      <TableHead>Libelle</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.grandLivre.rows.map((row) => (
                      <TableRow key={`${row.ecritureId}-${row.numeroLigne}`}>
                        <TableCell>{row.dateEcriture}</TableCell>
                        <TableCell>{row.numeroPiece}</TableCell>
                        <TableCell>{row.numeroLigne}</TableCell>
                        <TableCell>{row.libelle}</TableCell>
                        <TableCell>{row.debitCompteNumero}</TableCell>
                        <TableCell>{row.creditCompteNumero}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.montant)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fiche-compte">
            <Card>
              <CardHeader>
                <CardTitle>
                  Fiche compte {report.ficheCompte.compteNumero} - {report.ficheCompte.compteLibelle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded border p-3 text-sm">
                    <p className="text-muted-foreground">Solde ouverture</p>
                    <p className="font-semibold">{formatMontant(report.ficheCompte.soldeOuverture)}</p>
                  </div>
                  <div className="rounded border p-3 text-sm">
                    <p className="text-muted-foreground">Total debit</p>
                    <p className="font-semibold">{formatMontant(report.ficheCompte.totalDebit)}</p>
                  </div>
                  <div className="rounded border p-3 text-sm">
                    <p className="text-muted-foreground">Total credit</p>
                    <p className="font-semibold">{formatMontant(report.ficheCompte.totalCredit)}</p>
                  </div>
                  <div className="rounded border p-3 text-sm">
                    <p className="text-muted-foreground">Solde cloture</p>
                    <p className="font-semibold">{formatMontant(report.ficheCompte.soldeCloture)}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Piece</TableHead>
                      <TableHead>Ligne</TableHead>
                      <TableHead>Libelle</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Solde cumule</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.ficheCompte.mouvements.map((row) => (
                      <TableRow key={`${row.ecritureId}-${row.numeroLigne}`}>
                        <TableCell>{row.dateEcriture}</TableCell>
                        <TableCell>{row.numeroPiece}</TableCell>
                        <TableCell>{row.numeroLigne}</TableCell>
                        <TableCell>{row.libelle}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.debit)}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.credit)}</TableCell>
                        <TableCell className="text-right">{formatMontant(row.soldeCumule)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
};
