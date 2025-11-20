import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { DepenseDialog } from '@/components/depenses/DepenseDialog';
import { DepenseSnapshot } from '@/components/depenses/DepenseSnapshot';
import { useDepenses } from '@/hooks/useDepenses';
import type { DepenseFormData } from '@/types/depense.types';

const Depenses = () => {
  const navigate = useNavigate();
  const { depenseId } = useParams<{ depenseId: string }>();
  const { depenses, isLoading, createDepense, validerDepense, ordonnancerDepense, marquerPayee, annulerDepense } = useDepenses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // États pour le snapshot
  const [snapshotDepenseId, setSnapshotDepenseId] = useState<string | null>(null);

  // Snapshot helpers
  const snapshotDepense = useMemo(
    () => depenses.find(d => d.id === snapshotDepenseId),
    [depenses, snapshotDepenseId]
  );

  const snapshotIndex = useMemo(
    () => depenses.findIndex(d => d.id === snapshotDepenseId),
    [depenses, snapshotDepenseId]
  );

  // Synchroniser l'URL avec le snapshot
  useEffect(() => {
    if (depenseId && depenses.length > 0 && !snapshotDepenseId) {
      const depense = depenses.find(d => d.id === depenseId);
      if (depense) {
        setSnapshotDepenseId(depenseId);
      } else {
        navigate('/app/depenses', { replace: true });
      }
    }
  }, [depenseId, depenses, snapshotDepenseId, navigate]);

  const handleCreateDepense = async (data: DepenseFormData) => {
    await createDepense(data);
    setIsDialogOpen(false);
  };

  // Snapshot handlers
  const handleOpenSnapshot = useCallback((depId: string) => {
    setSnapshotDepenseId(depId);
    navigate(`/app/depenses/${depId}`);
  }, [navigate]);

  const handleCloseSnapshot = useCallback(() => {
    setSnapshotDepenseId(null);
    navigate('/app/depenses');
  }, [navigate]);

  const handleNavigateSnapshot = useCallback((direction: 'prev' | 'next') => {
    if (snapshotIndex === -1) return;
    
    const newIndex = direction === 'prev' ? snapshotIndex - 1 : snapshotIndex + 1;
    if (newIndex >= 0 && newIndex < depenses.length) {
      const newDep = depenses[newIndex];
      setSnapshotDepenseId(newDep.id);
      navigate(`/app/depenses/${newDep.id}`);
    }
  }, [snapshotIndex, depenses, navigate]);

  const handleNavigateToEntity = useCallback((type: string, id: string) => {
    switch (type) {
      case 'fournisseur':
        navigate(`/app/fournisseurs/${id}`);
        break;
      case 'engagement':
        navigate(`/app/engagements/${id}`);
        break;
      case 'reservation':
        navigate(`/app/reservations/${id}`);
        break;
      case 'facture':
        navigate(`/app/factures/${id}`);
        break;
      case 'ligneBudgetaire':
        navigate(`/app/budgets?ligneId=${id}`);
        break;
      case 'projet':
        navigate(`/app/projets/${id}`);
        break;
    }
  }, [navigate]);

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
      <PageHeader
        title="Gestion des Dépenses"
        description="Ordonnancement et liquidation des dépenses"
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle dépense
          </Button>
        }
      />

      <div className="px-8 space-y-6">
        {snapshotDepenseId && snapshotDepense ? (
          <DepenseSnapshot
            depense={snapshotDepense}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < depenses.length - 1}
            currentIndex={snapshotIndex}
            totalCount={depenses.length}
            onNavigateToEntity={handleNavigateToEntity}
            onValider={snapshotDepense.statut === 'brouillon' ? () => validerDepense(snapshotDepense.id) : undefined}
            onOrdonnancer={snapshotDepense.statut === 'validee' ? () => ordonnancerDepense(snapshotDepense.id) : undefined}
            onMarquerPayee={snapshotDepense.statut === 'ordonnancee' ? () => marquerPayee(snapshotDepense.id) : undefined}
            onAnnuler={(snapshotDepense.statut === 'brouillon' || snapshotDepense.statut === 'validee') ? () => annulerDepense({ id: snapshotDepense.id, motif: 'Annulation' }) : undefined}
          />
        ) : (
          <>
            <DepenseStatsCards depenses={depenses} />
            <DepenseTable depenses={depenses} onOpenSnapshot={handleOpenSnapshot} />
          </>
        )}
      </div>
      
      <DepenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateDepense}
      />
    </div>
  );
};

export default Depenses;
