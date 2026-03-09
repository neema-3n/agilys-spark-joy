import { AlertCircle, CheckCircle2, FileSearch, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CloseoutDossierPayload } from '@/types/tresorerie.types';

interface CloseoutDossierCardProps {
  dossier?: CloseoutDossierPayload;
  isLoading: boolean;
}

const statusMeta: Record<
  CloseoutDossierPayload['status'],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  ready: { label: 'Ready', className: 'bg-blue-100 text-blue-700', icon: FileSearch },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700', icon: ShieldAlert },
  go: { label: 'GO', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  no_go: { label: 'NO_GO', className: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export const CloseoutDossierCard = ({ dossier, isLoading }: CloseoutDossierCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier de clôture et migration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Chargement du dossier...</CardContent>
      </Card>
    );
  }

  if (!dossier) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dossier de clôture et migration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Aucun dossier disponible pour cet exercice.</CardContent>
      </Card>
    );
  }

  const meta = statusMeta[dossier.status];
  const StatusIcon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dossier de clôture et migration
          <Badge className={meta.className}>
            <StatusIcon className="mr-1 h-3.5 w-3.5" />
            {meta.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Couverture</div>
            <div className="font-medium">
              {dossier.manifest.requirementsCoverage.covered}/{dossier.manifest.requirementsCoverage.total}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Décision reconciliation</div>
            <div className="font-medium">{dossier.reconciliation.decision ?? 'N/A'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Durée génération</div>
            <div className="font-medium">{dossier.manifest.durationMs} ms</div>
          </div>
        </div>

        {dossier.manifest.missingCritical.length > 0 ? (
          <div className="rounded border border-red-200 bg-red-50 p-3">
            <div className="mb-1 font-medium text-red-700">Preuves critiques manquantes</div>
            <ul className="list-disc space-y-1 pl-5 text-red-700">
              {dossier.manifest.missingCritical.map((item) => (
                <li key={item.requirementId}>
                  {item.requirementId}: {item.description}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            Aucune preuve critique manquante détectée.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
