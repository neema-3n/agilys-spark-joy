import { useCallback, useState } from 'react';
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
import type { DepenseFormData, ModePaiement } from '@/types/depense.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Depenses = () => {
  const {
    depenses,
    isLoading,
    createDepense,
    validerDepense,
    ordonnancerDepense,
    marquerPayee,
    annulerDepense,
    deleteDepense,
  } = useDepenses();
  const { depenseId } = useParams<{ depenseId?: string }>();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionDepenseId, setActionDepenseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payForm, setPayForm] = useState<{
    datePaiement: string;
    modePaiement: ModePaiement | '';
    referencePaiement: string;
  }>({
    datePaiement: new Date().toISOString().split('T')[0],
    modePaiement: '',
    referencePaiement: '',
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

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
          navigate(`/app/budgets/${id}?tab=lignes`);
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

  const handleValider = useCallback(
    async (id: string) => {
      try {
        setIsSubmittingAction(true);
        await validerDepense(id);
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [validerDepense]
  );

  const handleOrdonnancer = useCallback(
    async (id: string) => {
      try {
        setIsSubmittingAction(true);
        await ordonnancerDepense(id);
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [ordonnancerDepense]
  );

  const handleOpenMarquerPayee = (id: string) => {
    setActionDepenseId(id);
    setPayForm({
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: '',
      referencePaiement: '',
    });
    setPayDialogOpen(true);
  };

  const handleMarquerPayee = async () => {
    if (!actionDepenseId || !payForm.datePaiement || !payForm.modePaiement) return;
    try {
      setIsSubmittingAction(true);
      await marquerPayee({
        id: actionDepenseId,
        datePaiement: payForm.datePaiement,
        modePaiement: payForm.modePaiement,
        referencePaiement: payForm.referencePaiement || undefined,
      });
      setPayDialogOpen(false);
      setActionDepenseId(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenAnnuler = (id: string) => {
    setActionDepenseId(id);
    setMotifAnnulation('');
    setAnnulerDialogOpen(true);
  };

  const handleConfirmAnnuler = async () => {
    if (!actionDepenseId || motifAnnulation.trim().length < 3) return;
    try {
      setIsSubmittingAction(true);
      await annulerDepense({ id: actionDepenseId, motif: motifAnnulation });
      setAnnulerDialogOpen(false);
      setActionDepenseId(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setActionDepenseId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!actionDepenseId) return;
    try {
      setIsSubmittingAction(true);
      await deleteDepense(actionDepenseId);
      setDeleteDialogOpen(false);
      setActionDepenseId(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

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
            onValider={handleValider}
            onOrdonnancer={handleOrdonnancer}
            onMarquerPayee={handleOpenMarquerPayee}
            onAnnuler={handleOpenAnnuler}
            onDelete={handleOpenDelete}
            disableActions={isSubmittingAction}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="px-8 py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
      ) : (
        <>
          <DepenseStatsCards depenses={depenses} />
          <DepenseTable
            depenses={depenses}
            onViewDetails={handleOpenSnapshot}
            onValider={handleValider}
            onOrdonnancer={handleOrdonnancer}
            onMarquerPayee={handleOpenMarquerPayee}
            onAnnuler={handleOpenAnnuler}
            onDelete={handleOpenDelete}
            disableActions={isSubmittingAction}
          />
        </>
      )}
      
      <DepenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateDepense}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la dépense</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Voulez-vous vraiment supprimer cette dépense ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmittingAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={annulerDialogOpen} onOpenChange={setAnnulerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la dépense</AlertDialogTitle>
            <AlertDialogDescription>
              Indiquez le motif d&apos;annulation pour tracer cette action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-sm">Motif</Label>
            <Input
              value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)}
              placeholder="Motif d'annulation"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAnnuler}
              disabled={isSubmittingAction || motifAnnulation.trim().length < 3}
            >
              Annuler la dépense
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marquer comme payée</AlertDialogTitle>
            <AlertDialogDescription>
              Renseignez les informations de paiement pour clôturer la dépense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 px-1">
            <div className="space-y-1">
              <Label>Date de paiement</Label>
              <Input
                type="date"
                value={payForm.datePaiement}
                onChange={(e) =>
                  setPayForm((prev) => ({ ...prev, datePaiement: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Mode de paiement</Label>
              <Select
                value={payForm.modePaiement}
                onValueChange={(value) =>
                  setPayForm((prev) => ({ ...prev, modePaiement: value as ModePaiement }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="carte">Carte</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Référence (optionnel)</Label>
              <Input
                value={payForm.referencePaiement}
                onChange={(e) =>
                  setPayForm((prev) => ({ ...prev, referencePaiement: e.target.value }))
                }
                placeholder="Référence de paiement"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarquerPayee}
              disabled={
                isSubmittingAction || !payForm.datePaiement || !payForm.modePaiement
              }
            >
              Valider le paiement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Depenses;
