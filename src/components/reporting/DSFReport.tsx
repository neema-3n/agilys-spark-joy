import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useExercice } from '@/contexts/ExerciceContext';
import { useDsfReporting } from '@/hooks/useDsfReporting';
import type { DsfExportFormat, DsfReferentielVersion } from '@/types/dsf-reporting.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formatMontant = (value: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

export const DSFReport = () => {
  const { currentExercice } = useExercice();

  const [entiteId, setEntiteId] = useState('');
  const [referentielVersion, setReferentielVersion] = useState<DsfReferentielVersion>('OHADA-SYCEBNL-2025');
  const [exportFormat, setExportFormat] = useState<DsfExportFormat>('csv');

  const filters = useMemo(() => {
    if (!currentExercice?.id) {
      return null;
    }

    return {
      exerciceId: currentExercice.id,
      entiteId: entiteId.trim() || undefined,
      referentielVersion,
      includeWarnings: true
    };
  }, [currentExercice?.id, entiteId, referentielVersion]);

  const {
    validation,
    isValidationLoading,
    validationError,
    refreshValidation,
    launchExport,
    isExporting,
    exportState,
    exportStatus,
    exportError
  } = useDsfReporting(filters);

  const onExport = async () => {
    await launchExport({ format: exportFormat });
  };

  const hasBlocking = (validation?.blockingErrors.length ?? 0) > 0;
  const hasWarnings = (validation?.warnings.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parametres DSF OHADA/SYCEBNL</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exercice courant</label>
            <Input value={currentExercice?.label || 'Aucun exercice actif'} readOnly />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Referentiel</label>
            <Select
              value={referentielVersion}
              onValueChange={(value) => setReferentielVersion(value as DsfReferentielVersion)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Version referentiel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OHADA-SYCEBNL-2025">OHADA/SYCEBNL 2025</SelectItem>
                <SelectItem value="OHADA-SYCEBNL-2017">OHADA/SYCEBNL 2017</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Entite (UUID optionnel)</label>
            <Input
              value={entiteId}
              onChange={(event) => setEntiteId(event.target.value)}
              placeholder="Filtrer une entite (tenant scope)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Statut validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {validation?.status === 'conforme' ? 'Conforme' : validation ? 'Non conforme' : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ecritures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{validation?.summary.totalEcritures ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total debit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{formatMontant(validation?.summary.totalDebit ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{formatMontant(validation?.summary.totalCredit ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validation pre-export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void refreshValidation()} disabled={!filters || isValidationLoading} className="gap-2">
              {isValidationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Valider DSF
            </Button>

            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as DsfExportFormat)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLSX</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={onExport}
              disabled={!validation || validation.status !== 'conforme' || isExporting}
              className="gap-2"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter DSF
            </Button>

            {exportState ? <Badge variant="secondary">Statut export: {exportState}</Badge> : null}
            {exportStatus?.hash ? <Badge variant="outline">Hash: {exportStatus.hash.slice(0, 12)}...</Badge> : null}
          </div>

          {validationError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(validationError as Error).message}</AlertDescription>
            </Alert>
          ) : null}

          {exportError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{(exportError as Error).message}</AlertDescription>
            </Alert>
          ) : null}

          {hasBlocking ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                {validation?.blockingErrors.length} erreur(s) bloquante(s) detectee(s). Corrigez-les avant export.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasWarnings ? (
            <Alert>
              <TriangleAlert className="h-4 w-4" />
              <AlertDescription>{validation?.warnings.length} warning(s) detecte(s).</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {(validation?.diagnostics ?? []).map((diagnostic) => (
              <div key={`${diagnostic.code}-${diagnostic.message}`} className="rounded border p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={diagnostic.severity === 'blocking' ? 'destructive' : 'secondary'}>
                    {diagnostic.severity === 'blocking' ? 'Bloquant' : 'Warning'}
                  </Badge>
                  <span className="font-medium">{diagnostic.code}</span>
                </div>
                <p>{diagnostic.message}</p>
                <p className="text-muted-foreground">Action: {diagnostic.action}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Checklist conformite</p>
            {(validation?.checklist ?? []).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{item.label}</span>
                <Badge variant={item.ok ? 'secondary' : 'destructive'}>{item.ok ? 'OK' : 'KO'}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
