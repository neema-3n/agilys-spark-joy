import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { DepenseDialog } from '@/components/depenses/DepenseDialog';
import { DepenseSnapshot } from '@/components/depenses/DepenseSnapshot';
import { useDepenses } from '@/hooks/useDepenses';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import type { DepenseFormData } from '@/types/depense.types';

const Depenses = () => {
  const { depenses, isLoading, createDepense } = useDepenses();
  const { depenseId } = useParams<{ depenseId?: string }>();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateDepense = async (data: DepenseFormData) => {
    await createDepense(data);
    setIsDialogOpen(false);
  };

  const {
    snapshotId: snapshotDepenseId,
    snapshotItem: snapshotDepense,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: depenses,
    getId: (d) => d.id,
    initialId: depenseId,
    onNavigateToId: (id) => navigate(id ? `/app/depenses/${id}` : '/app/depenses'),
    onMissingId: () => navigate('/app/depenses', { replace: true }),
    isLoadingItems: isLoading,
  });

  const scrollProgress = useScrollProgress(!!snapshotDepenseId);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
      switch (type) {
        case 'engagement':
          navigate(`/app/engagements/${id}`);
          break;
        case 'reservation':
          navigate(`/app/reservations/${id}`);
          break;
        case 'ligne-budgetaire':
          navigate(`/app/budgets?ligneId=${id}`);
          break;
        case 'facture':
          navigate(`/app/factures/${id}`);
          break;
        case 'fournisseur':
          navigate(`/app/fournisseurs/${id}`);
          break;
        case 'projet':
          navigate(`/app/projets/${id}`);
          break;
      }
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion des Dépenses"
          description="Ordonnancement et liquidation des dépenses"
        />
        <p className="text-center text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isSnapshotOpen && (
        <PageHeader
          title="Gestion des Dépenses"
          description="Ordonnancement et liquidation des dépenses"
          scrollProgress={scrollProgress}
          actions={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle dépense
            </Button>
          }
        />
      )}

      {isSnapshotOpen && snapshotDepense ? (
        <div className="px-8 space-y-6">
          <DepenseSnapshot
            depense={snapshotDepense}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < depenses.length - 1}
            currentIndex={snapshotIndex}
            totalCount={depenses.length}
            onNavigateToEntity={handleNavigateToEntity}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="px-8 py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
      ) : (
        <>
          <DepenseStatsCards depenses={depenses} />
          <DepenseTable depenses={depenses} onViewDetails={handleOpenSnapshot} />
        </>
      )}
      
      <DepenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateDepense}
      />
    </div>
  );
};

export default Depenses;
