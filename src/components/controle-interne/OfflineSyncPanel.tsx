import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOfflineSyncQueueItems, useOfflineSyncSupervision, useRetryOfflineSyncItem } from '@/hooks/useOfflineSync';
import type { OfflineSyncStatus } from '@/types/offline-sync.types';

const statusLabel: Record<OfflineSyncStatus, string> = {
  queued: 'En file',
  syncing: 'Synchronisation',
  synced: 'Synchronisé',
  failed: 'Échec',
  conflict: 'Conflit',
};

const badgeVariant = (status: OfflineSyncStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'synced') {
    return 'default';
  }
  if (status === 'failed' || status === 'conflict') {
    return 'destructive';
  }
  if (status === 'syncing') {
    return 'secondary';
  }

  return 'outline';
};

export const OfflineSyncPanel = () => {
  const supervisionQuery = useOfflineSyncSupervision({ pageSize: 10 });
  const { items: localQueue, pruneSynced } = useOfflineSyncQueueItems();
  const retryMutation = useRetryOfflineSyncItem();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Synchronisation offline → online</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">En file</p>
            <p className="text-xl font-semibold">{supervisionQuery.data?.metrics.queued ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Conflits</p>
            <p className="text-xl font-semibold">{supervisionQuery.data?.metrics.conflict ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Retries</p>
            <p className="text-xl font-semibold">{supervisionQuery.data?.counters.retries ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">p95 reprise (ms)</p>
            <p className="text-xl font-semibold">{supervisionQuery.data?.metrics.p95RecoveryMs ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>File locale persistante</CardTitle>
          <Button variant="outline" size="sm" onClick={pruneSynced}>
            Nettoyer les éléments synchronisés
          </Button>
        </CardHeader>
        <CardContent>
          {localQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun item en file locale.</p>
          ) : (
            <div className="space-y-2">
              {localQueue.map((item) => (
                <div key={`${item.localId}-${item.operationType}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.operationType}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.entityType}:{item.entityId} • {item.correlationId}
                      </p>
                    </div>
                    <Badge variant={badgeVariant(item.status)}>{statusLabel[item.status]}</Badge>
                  </div>
                  {item.conflictMessage ? (
                    <p className="mt-2 text-xs text-destructive">{item.conflictMessage}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supervision backend</CardTitle>
        </CardHeader>
        <CardContent>
          {supervisionQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement de la supervision offline...</p>
          ) : (supervisionQuery.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun item backend pour ce scope.</p>
          ) : (
            <div className="space-y-2">
              {supervisionQuery.data?.items.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.operationType}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.entityType}:{item.entityId} • {item.correlationId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tentatives: {item.retryCount} • queuedAt: {new Date(item.queuedAt).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant(item.status)}>{statusLabel[item.status]}</Badge>
                      {(item.status === 'failed' || item.status === 'conflict') && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={retryMutation.isPending}
                          onClick={() => retryMutation.mutate({ id: item.id, reasonMessage: 'Relance manuelle supervision' })}
                        >
                          Relancer
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.conflictMessage ? (
                    <p className="mt-2 text-xs text-destructive">
                      {item.conflictCode ? `${item.conflictCode} - ` : ''}
                      {item.conflictMessage}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
