import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useIntegrationLegacySupervision, useRemediateIntegrationEvent } from '@/hooks/useIntegrationLegacy';
import type {
  IntegrationEvent,
  IntegrationEventPriority,
  IntegrationEventSeverity,
  IntegrationEventStatus,
  IntegrationTreatmentStatus,
} from '@/types/integration-legacy.types';

const PRIORITIES: IntegrationEventPriority[] = ['P1', 'P2', 'P3'];
const TREATMENT_STATUSES: IntegrationTreatmentStatus[] = ['open', 'triaged', 'in_progress', 'resolved', 'closed'];
const EVENT_STATUSES: IntegrationEventStatus[] = ['failed', 'dead_letter', 'received', 'processed', 'replayed', 'acked', 'sent', 'queued'];
const SEVERITIES: IntegrationEventSeverity[] = ['critical', 'error', 'warning', 'info'];

const slaBadge = (risk: IntegrationEvent['atRiskSla']) => {
  if (risk === 'breach') {
    return { label: 'Hors SLA', variant: 'destructive' as const };
  }
  if (risk === 'detection') {
    return { label: 'Risque détection', variant: 'secondary' as const };
  }
  if (risk === 'recovery') {
    return { label: 'Risque reprise', variant: 'secondary' as const };
  }
  return { label: 'OK', variant: 'outline' as const };
};

export const IntegrationLegacyPanel = () => {
  const [status, setStatus] = useState<IntegrationEventStatus | ''>('failed');
  const [severity, setSeverity] = useState<IntegrationEventSeverity | ''>('');
  const [priority, setPriority] = useState<IntegrationEventPriority | ''>('');
  const [treatmentStatus, setTreatmentStatus] = useState<IntegrationTreatmentStatus | ''>('');
  const [owner, setOwner] = useState('');
  const [correlationId, setCorrelationId] = useState('');

  const filters = useMemo(
    () => ({
      status: status || undefined,
      severity: severity || undefined,
      priority: priority || undefined,
      treatmentStatus: treatmentStatus || undefined,
      owner: owner.trim() || undefined,
      correlationId: correlationId.trim() || undefined,
      pageSize: 10,
    }),
    [status, severity, priority, treatmentStatus, owner, correlationId]
  );

  const supervisionQuery = useIntegrationLegacySupervision(filters);
  const remediateMutation = useRemediateIntegrationEvent();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Supervision divergences d'intégration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Statut event</span>
              <select className="w-full rounded-md border bg-background p-2" value={status} onChange={(e) => setStatus(e.target.value as IntegrationEventStatus | '')}>
                <option value="">Tous</option>
                {EVENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Severity</span>
              <select className="w-full rounded-md border bg-background p-2" value={severity} onChange={(e) => setSeverity(e.target.value as IntegrationEventSeverity | '')}>
                <option value="">Toutes</option>
                {SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Priorité</span>
              <select className="w-full rounded-md border bg-background p-2" value={priority} onChange={(e) => setPriority(e.target.value as IntegrationEventPriority | '')}>
                <option value="">Toutes</option>
                {PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Statut traitement</span>
              <select
                className="w-full rounded-md border bg-background p-2"
                value={treatmentStatus}
                onChange={(e) => setTreatmentStatus(e.target.value as IntegrationTreatmentStatus | '')}
              >
                <option value="">Tous</option>
                {TREATMENT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Owner</span>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="ops@tenant" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Correlation ID</span>
              <Input value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} placeholder="corr-..." />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-semibold">{supervisionQuery.data?.pagination.total ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">P1</p>
              <p className="text-xl font-semibold">{supervisionQuery.data?.counters.byPriority.P1 ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">failed</p>
              <p className="text-xl font-semibold">{supervisionQuery.data?.counters.byStatus.failed ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">dead_letter</p>
              <p className="text-xl font-semibold">{supervisionQuery.data?.counters.byStatus.dead_letter ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items supervision</CardTitle>
        </CardHeader>
        <CardContent>
          {supervisionQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement de la supervision intégration...</p>
          ) : (supervisionQuery.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune divergence pour les filtres courants.</p>
          ) : (
            <div className="space-y-2">
              {supervisionQuery.data?.items.map((item) => {
                const risk = slaBadge(item.atRiskSla);
                const isPending = remediateMutation.isPending;

                return (
                  <div key={item.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {item.eventType} • {item.correlationId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.status} • {item.treatmentStatus} • {item.priority} • owner: {item.owner ?? 'n/a'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          detection: {item.detectionDelayMs ?? 0} ms • reprise: {item.recoveryDelayMs ?? 0} ms
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            remediateMutation.mutate({
                              eventId: item.id,
                              action: 'retry',
                              reasonCode: 'MANUAL_RETRY',
                              reasonMessage: 'Retry manuel depuis supervision',
                            })
                          }
                        >
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            remediateMutation.mutate({
                              eventId: item.id,
                              action: 'escalate',
                              priority: 'P1',
                              treatmentStatus: 'triaged',
                              reasonCode: 'MANUAL_ESCALATION',
                              reasonMessage: 'Escalade opérateur',
                            })
                          }
                        >
                          Escalader
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            remediateMutation.mutate({
                              eventId: item.id,
                              action: 'reconcile-manual',
                              treatmentStatus: 'resolved',
                              reasonCode: 'MANUAL_RECONCILIATION',
                              reasonMessage: 'Réconciliation manuelle',
                            })
                          }
                        >
                          Réconcilier
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
