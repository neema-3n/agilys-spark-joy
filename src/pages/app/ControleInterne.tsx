import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CloseoutDossierCard } from '@/components/controle-interne/CloseoutDossierCard';
import { ExceptionAuditDetail } from '@/components/controle-interne/ExceptionAuditDetail';
import { ExceptionAuditDossierCard } from '@/components/controle-interne/ExceptionAuditDossierCard';
import { ExceptionAuditTable } from '@/components/controle-interne/ExceptionAuditTable';
import { InternalControlActionPlans } from '@/components/controle-interne/InternalControlActionPlans';
import { OfflineSyncPanel } from '@/components/controle-interne/OfflineSyncPanel';
import { WorkflowExceptionsList } from '@/components/workflow-exceptions/WorkflowExceptionsList';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useControleInterneActionPlans,
  useControleInterneActionPlanEvents,
  useControleInterneMutations,
  useControleInterneWorkspace,
} from '@/hooks/useControleInterne';
import { useExceptionAudit, useExceptionAuditDetail, useExceptionAuditDossier, useCloseoutDossier } from '@/hooks/useTresorerie';
import { useWorkflowExceptions } from '@/hooks/useWorkflowExceptions';
import { isApiError } from '@/services/api/api-utils';
import type { InternalControlActionPlanStatus } from '@/types/controle-interne.types';
import type { TresorerieAuditEntry, TresorerieAuditFilters } from '@/types/tresorerie.types';

const ControleInterne = () => {
  const [filters, setFilters] = useState<TresorerieAuditFilters>({
    page: 1,
    pageSize: 20,
  });
  const [selected, setSelected] = useState<TresorerieAuditEntry | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

  const auditQuery = useExceptionAudit(filters);
  const detailQuery = useExceptionAuditDetail(
    selected ? { exceptionId: selected.id, correlationId: selected.correlationId } : {}
  );
  const closeoutDossierQuery = useCloseoutDossier();
  const exceptionAuditDossierQuery = useExceptionAuditDossier(filters);

  const workspaceQuery = useControleInterneWorkspace();
  const actionPlansQuery = useControleInterneActionPlans();
  const actionPlanEventsQuery = useControleInterneActionPlanEvents(selectedPlanId);
  const workflowExceptionsQuery = useWorkflowExceptions();
  const { createActionPlan, updateActionPlan, isMutating } = useControleInterneMutations();

  const canReadAudit = !isApiError(auditQuery.error) || auditQuery.error.statusCode !== 403;
  const dossierErrorMessage = exceptionAuditDossierQuery.error
    ? isApiError(exceptionAuditDossierQuery.error)
      ? exceptionAuditDossierQuery.error.message
      : 'Erreur lors de la préparation du dossier d audit.'
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle Interne"
        description="Workspace de supervision des écarts, exceptions et plans d action." 
      />

      <div className="space-y-6 px-8">
        {!canReadAudit ? (
          <Alert>
            <AlertTitle>Accès restreint</AlertTitle>
            <AlertDescription>
              La lecture de l audit nécessite la permission <code>referentiels:audit:read</code>.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Synthèse de supervision</CardTitle>
              </CardHeader>
              <CardContent>
                {workspaceQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Chargement de la synthèse...</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Écarts ouverts</p>
                      <p className="text-xl font-semibold">{workspaceQuery.data?.summary.openDiscrepancies ?? 0}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Exceptions actives</p>
                      <p className="text-xl font-semibold">{workspaceQuery.data?.summary.activeExceptions ?? 0}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Plans en retard</p>
                      <p className="text-xl font-semibold">{workspaceQuery.data?.summary.overdueActionPlans ?? 0}</p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Plans d action</p>
                      <p className="text-xl font-semibold">{workspaceQuery.data?.summary.totalActionPlans ?? 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <ExceptionAuditDossierCard
              dossier={exceptionAuditDossierQuery.data}
              isLoading={exceptionAuditDossierQuery.isLoading}
              errorMessage={dossierErrorMessage}
            />
            <CloseoutDossierCard dossier={closeoutDossierQuery.data} isLoading={closeoutDossierQuery.isLoading} />

            <Tabs defaultValue="ecarts" className="w-full">
              <TabsList>
                <TabsTrigger value="ecarts">Écarts</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
                <TabsTrigger value="plans">Plans d action</TabsTrigger>
                <TabsTrigger value="detail">Détail / preuves</TabsTrigger>
                <TabsTrigger value="offline-sync">Sync offline</TabsTrigger>
              </TabsList>

              <TabsContent value="ecarts" className="space-y-4">
                <ExceptionAuditTable
                  data={auditQuery.data}
                  isLoading={auditQuery.isLoading}
                  isFetching={auditQuery.isFetching}
                  filters={filters}
                  onFiltersChange={(next) => setFilters(next)}
                  onSelect={(entry) => setSelected(entry)}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Journal des signaux de contrôle</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workspaceQuery.data?.controlItems.length ? (
                      <div className="space-y-2">
                        {workspaceQuery.data.controlItems.map((item) => (
                          <div key={item.id} className="rounded-md border p-2">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-sm text-muted-foreground">{item.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucun signal de contrôle disponible.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="exceptions">
                <WorkflowExceptionsList
                  exceptions={workflowExceptionsQuery.exceptions}
                  isLoading={workflowExceptionsQuery.isLoading}
                />
              </TabsContent>

              <TabsContent value="plans">
                <InternalControlActionPlans
                  actionPlans={actionPlansQuery.data?.items ?? []}
                  isLoading={actionPlansQuery.isLoading}
                  isMutating={isMutating}
                  selectedPlanId={selectedPlanId}
                  events={actionPlanEventsQuery.data?.items ?? []}
                  isEventsLoading={actionPlanEventsQuery.isLoading}
                  onSelectPlan={(id) => setSelectedPlanId(id)}
                  onCreate={async (input) => {
                    await createActionPlan(input);
                  }}
                  onStatusUpdate={async (id, status: InternalControlActionPlanStatus, extra) => {
                    await updateActionPlan({
                      id,
                      input: {
                        status,
                        rejectionReason: extra?.rejectionReason,
                        reason: extra?.reason,
                      },
                    });
                  }}
                />
              </TabsContent>

              <TabsContent value="detail">
                <ExceptionAuditDetail
                  detail={detailQuery.data}
                  isLoading={detailQuery.isLoading || detailQuery.isFetching}
                />
              </TabsContent>

              <TabsContent value="offline-sync">
                <OfflineSyncPanel />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default ControleInterne;
