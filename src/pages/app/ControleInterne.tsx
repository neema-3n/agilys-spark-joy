import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CloseoutDossierCard } from '@/components/controle-interne/CloseoutDossierCard';
import { ExceptionAuditDossierCard } from '@/components/controle-interne/ExceptionAuditDossierCard';
import { ExceptionAuditDetail } from '@/components/controle-interne/ExceptionAuditDetail';
import { ExceptionAuditTable } from '@/components/controle-interne/ExceptionAuditTable';
import { useCloseoutDossier, useExceptionAudit, useExceptionAuditDetail, useExceptionAuditDossier } from '@/hooks/useTresorerie';
import { isApiError } from '@/services/api/api-utils';
import type { TresorerieAuditEntry, TresorerieAuditFilters } from '@/types/tresorerie.types';

const ControleInterne = () => {
  const [filters, setFilters] = useState<TresorerieAuditFilters>({
    page: 1,
    pageSize: 20,
  });
  const [selected, setSelected] = useState<TresorerieAuditEntry | null>(null);

  const auditQuery = useExceptionAudit(filters);
  const detailQuery = useExceptionAuditDetail(
    selected ? { exceptionId: selected.id, correlationId: selected.correlationId } : {}
  );
  const closeoutDossierQuery = useCloseoutDossier();
  const exceptionAuditDossierQuery = useExceptionAuditDossier(filters);

  const canReadAudit = !isApiError(auditQuery.error) || auditQuery.error.statusCode !== 403;
  const dossierErrorMessage = exceptionAuditDossierQuery.error
    ? isApiError(exceptionAuditDossierQuery.error)
      ? exceptionAuditDossierQuery.error.message
      : 'Erreur lors de la préparation du dossier d’audit.'
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle Interne"
        description="Journal d’audit des exceptions cash et supervision de conformité."
      />

      <div className="px-8 space-y-6">
        {!canReadAudit ? (
          <Alert>
            <AlertTitle>Accès restreint</AlertTitle>
            <AlertDescription>
              La lecture de l’audit nécessite la permission <code>referentiels:audit:read</code>.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ExceptionAuditDossierCard
              dossier={exceptionAuditDossierQuery.data}
              isLoading={exceptionAuditDossierQuery.isLoading}
              errorMessage={dossierErrorMessage}
            />
            <CloseoutDossierCard dossier={closeoutDossierQuery.data} isLoading={closeoutDossierQuery.isLoading} />
            <ExceptionAuditTable
              data={auditQuery.data}
              isLoading={auditQuery.isLoading}
              isFetching={auditQuery.isFetching}
              filters={filters}
              onFiltersChange={(next) => setFilters(next)}
              onSelect={(entry) => setSelected(entry)}
            />
            <ExceptionAuditDetail
              detail={detailQuery.data}
              isLoading={detailQuery.isLoading || detailQuery.isFetching}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ControleInterne;
