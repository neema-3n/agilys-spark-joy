import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListTable, type ListColumn } from '@/components/lists/ListTable';
import { Badge } from '@/components/ui/badge';
import { PrevisionsTresorerie } from '@/components/tresorerie/PrevisionsTresorerie';
import { TresorerieRiskBadge } from '@/components/tresorerie/TresorerieRiskBadge';
import { TresorerieStats } from '@/components/tresorerie/TresorerieStats';
import { formatCurrency } from '@/lib/utils';
import type { TresorerieSupervision, TresorerieSupervisionAlert } from '@/types/tresorerie.types';

interface TresorerieSupervisionPanelProps {
  supervision?: TresorerieSupervision;
  isLoading: boolean;
  error?: Error | null;
}

const alertColumns: ListColumn<TresorerieSupervisionAlert>[] = [
  {
    id: 'niveau',
    header: 'Niveau',
    render: (item) => <TresorerieRiskBadge severity={item.severity} />,
  },
  {
    id: 'alerte',
    header: 'Alerte',
    render: (item) => (
      <div className="space-y-1">
        <div className="font-medium">{item.label}</div>
        <div className="text-xs text-muted-foreground">{item.message}</div>
      </div>
    ),
  },
  {
    id: 'code',
    header: 'Code',
    render: (item) => <Badge variant="secondary">{item.code}</Badge>,
  },
  {
    id: 'valeur',
    header: 'Valeur',
    align: 'right',
    render: (item) => <span className="tabular-nums">{formatCurrency(item.value)}</span>,
  },
];

export const TresorerieSupervisionPanel = ({ supervision, isLoading, error }: TresorerieSupervisionPanelProps) => {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de la supervision...</p>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Supervision indisponible</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!supervision) {
    return <p className="text-sm text-muted-foreground">Aucune donnée de supervision disponible.</p>;
  }

  const mappedStats = {
    soldeActuel: supervision.currentPosition,
    totalEncaissements: Math.max(supervision.currentPosition, 0),
    totalDecaissements: supervision.pendingDisbursements + supervision.remainingCommitments,
    soldePrevisionnel: supervision.shortTermProjection,
    variationMensuelle: -Math.max(supervision.projectedGap, 0),
    encaissementsMoisEnCours: supervision.activeExceptions,
    decaissementsMoisEnCours: supervision.expiredExceptions,
  };

  return (
    <div className="space-y-6">
      <TresorerieStats stats={mappedStats} />

      <div className="grid gap-4 md:grid-cols-2">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Rapprochements en attente</AlertTitle>
          <AlertDescription>{supervision.pendingReconciliations} workflow(s) à arbitrer ou valider.</AlertDescription>
        </Alert>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Écarts qualifiés</AlertTitle>
          <AlertDescription>{supervision.qualifiedDiscrepancies} écart(s) restent visibles pour l’audit.</AlertDescription>
        </Alert>
      </div>

      <PrevisionsTresorerie
        previsions={[
          {
            periode: new Date(supervision.generatedAt).toISOString().slice(0, 7),
            encaissementsPrevus: supervision.currentPosition,
            decaissementsPrevus: supervision.projectedExposure,
            soldePrevisionnel: supervision.shortTermProjection,
          },
        ]}
      />

      <ListLayout
        title="Journal des alertes cash"
        description="Alertes déterministes calculées côté backend et liées au contexte de trésorerie."
      >
        <ListTable
          items={supervision.alerts}
          columns={alertColumns}
          getRowId={(item) => item.key}
          emptyMessage="Aucune alerte active sur la période."
        />
      </ListLayout>
    </div>
  );
};
