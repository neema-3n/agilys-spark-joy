import { AlertCircle, CheckCircle2, FileArchive, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExceptionAuditDossierPayload } from '@/types/tresorerie.types';

interface ExceptionAuditDossierCardProps {
  dossier?: ExceptionAuditDossierPayload;
  isLoading: boolean;
  errorMessage?: string;
}

const statusMeta: Record<
  ExceptionAuditDossierPayload['status'],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ready: { label: 'Ready', className: 'bg-blue-100 text-blue-700', icon: FileText },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700', icon: AlertCircle },
  go: { label: 'GO', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  no_go: { label: 'NO_GO', className: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export const ExceptionAuditDossierCard = ({ dossier, isLoading, errorMessage }: ExceptionAuditDossierCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier d'audit exportable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Préparation du dossier d'audit...</CardContent>
      </Card>
    );
  }

  if (!dossier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier d'audit exportable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {errorMessage ?? "Aucun dossier d'audit disponible pour ce scope."}
        </CardContent>
      </Card>
    );
  }

  const status = statusMeta[dossier.status];
  const StatusIcon = status.icon;
  const covered = dossier.coverage.filter((item) => item.status === 'covered').length;
  const partial = dossier.coverage.filter((item) => item.status === 'partial').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dossier d'audit exportable
          <Badge className={status.className}>
            <StatusIcon className="mr-1 h-3.5 w-3.5" />
            {status.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <div className="text-muted-foreground">Scope</div>
            <div className="font-medium">{dossier.scope.exerciceId}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Timeline</div>
            <div className="font-medium">{dossier.timeline.length} événement(s)</div>
          </div>
          <div>
            <div className="text-muted-foreground">Couverture</div>
            <div className="font-medium">
              {covered}/{dossier.coverage.length} couverts · {partial} partiels
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Durée génération</div>
            <div className="font-medium">{dossier.manifest.durationMs} ms</div>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 flex items-center gap-1 font-medium">
            <FileArchive className="h-4 w-4" /> Livrables
          </div>
          <div className="text-xs text-muted-foreground">
            ZIP: <code>{dossier.deliverables.archiveZipFileName}</code> · Index: <code>{dossier.deliverables.indexFileName}</code>
            {' '}· PDF strategy: <code>{dossier.deliverables.pdfStrategy}</code>
          </div>
        </div>

        {dossier.manifest.missingCritical.length > 0 ? (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <div className="mb-1 font-medium text-red-700">Preuves critiques manquantes</div>
            <ul className="list-disc space-y-1 pl-5 text-red-700">
              {dossier.manifest.missingCritical.map((item, index) => (
                <li key={`${item.section}-${index}`}>
                  {item.section}: {item.objective}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            Couverture critique complète pour ce scope.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
