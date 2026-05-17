import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { DepenseForm } from '@/components/depenses/DepenseForm';
import { DepenseSnapshot } from '@/components/depenses/DepenseSnapshot';
import { AnnulerDepenseDialog } from '@/components/depenses/AnnulerDepenseDialog';
import { AnnulerMultipleDepensesDialog } from '@/components/depenses/AnnulerMultipleDepensesDialog';
import { useDepenses } from '@/hooks/useDepenses';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import type { DepenseFormData } from '@/types/depense.types';
import { usePaiementsByDepense } from '@/hooks/usePaiements';
import { PaiementDialog } from '@/components/paiements/PaiementDialog';
import type { PaiementFormData } from '@/types/paiement.types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useListSelection } from '@/hooks/useListSelection';
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';

const Depenses = () => {
  const {
    depenses,
    isLoading,
    createDepense,
    updateDepense,
    validerDepense,
    ordonnancerDepense,
    annulerDepense,
    annulerMultipleDepenses,
    deleteDepense,
  } = useDepenses();
  
  const { depenseId } = useParams<{ depenseId?: string }>();
  const createMatch = useMatch('/app/depenses/create');
  const editMatch = useMatch('/app/depenses/:depenseId/edit');
  const navigate = useNavigate();
  const [actionDepenseId, setActionDepenseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [annulerMultipleDialogOpen, setAnnulerMultipleDialogOpen] = useState(false);
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<
    'tous' | 'brouillon' | 'validee' | 'ordonnancee' | 'payee' | 'annulee'
  >('tous');
  const isCreateMode = !!createMatch;
  const routeEditDepenseId = editMatch?.params.depenseId;
  const isEditMode = !!routeEditDepenseId;
  const isEditorMode = isCreateMode || isEditMode;

  const filteredDepenses = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    return depenses
      .filter((depense) => (statutFilter === 'tous' ? true : depense.statut === statutFilter))
      .filter((depense) => {
        if (!searchLower) return true;
        return (
          depense.numero.toLowerCase().includes(searchLower) ||
          depense.objet.toLowerCase().includes(searchLower) ||
          depense.beneficiaire?.toLowerCase().includes(searchLower) ||
          depense.fournisseur?.nom.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => new Date(b.dateDepense).getTime() - new Date(a.dateDepense).getTime());
  }, [depenses, statutFilter, searchTerm]);

  const selectionIds = useMemo(() => filteredDepenses.map((depense) => depense.id), [filteredDepenses]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const selectedDepenses = useMemo(
    () => filteredDepenses.filter((depense) => selectedIds.has(depense.id)),
    [filteredDepenses, selectedIds]
  );

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

  const { paiements: paiementsDepense, isLoading: isLoadingPaiements } = usePaiementsByDepense(
    snapshotDepenseId || ''
  );

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);

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

  const handleOpenEnregistrerPaiement = (id: string) => {
    setActionDepenseId(id);
    setPaiementDialogOpen(true);
  };

  const handleEnregistrerPaiement = async (data: PaiementFormData) => {
    // Géré directement par PaiementDialog via usePaiements
    setPaiementDialogOpen(false);
    setActionDepenseId(null);
  };

  const handleOpenAnnuler = (id: string) => {
    setActionDepenseId(id);
    setAnnulerDialogOpen(true);
  };

  const handleConfirmAnnuler = async (motif: string) => {
    if (!actionDepenseId) return;
    try {
      setIsSubmittingAction(true);
      await annulerDepense({ id: actionDepenseId, motif });
      setAnnulerDialogOpen(false);
      setActionDepenseId(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenDelete = useCallback((id: string) => {
    setActionDepenseId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleBatchValider = useCallback(async () => {
    const candidates = selectedDepenses.filter((depense) => depense.statut === 'brouillon');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((depense) => validerDepense(depense.id)));
    clearSelection();
  }, [selectedDepenses, validerDepense, clearSelection]);

  const handleBatchOrdonnancer = useCallback(async () => {
    const candidates = selectedDepenses.filter((depense) => depense.statut === 'validee');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((depense) => ordonnancerDepense(depense.id)));
    clearSelection();
  }, [selectedDepenses, ordonnancerDepense, clearSelection]);

  const handleOpenBatchAnnuler = useCallback(() => {
    const candidates = selectedDepenses.filter(
      (depense) => depense.statut !== 'annulee' && depense.statut !== 'payee'
    );
    if (candidates.length === 0) return;
    setAnnulerMultipleDialogOpen(true);
  }, [selectedDepenses]);

  const handleConfirmBatchAnnuler = useCallback(
    async (motif: string) => {
      const candidates = selectedDepenses.filter(
        (depense) => depense.statut !== 'annulee' && depense.statut !== 'payee'
      );
      if (candidates.length === 0) return;
      
      try {
        setIsSubmittingAction(true);
        const depenseIds = candidates.map(d => d.id);
        await annulerMultipleDepenses({ ids: depenseIds, motif });
        setAnnulerMultipleDialogOpen(false);
        clearSelection();
      } finally {
        setIsSubmittingAction(false);
      }
    },
    [selectedDepenses, annulerMultipleDepenses, clearSelection]
  );

  // Removed batch payment - use individual payments instead

  const handleExportDepenses = useCallback(() => {
    // Exporter toutes les dépenses filtrées (CSV/Excel) – brancher ici l'implémentation
    // Exemple : exportDepenses(filteredDepenses);
  }, [filteredDepenses]);

  const handleCreate = useCallback(() => {
    navigate('/app/depenses/create');
  }, [navigate]);

  const handleEdit = useCallback((id: string) => {
    navigate(`/app/depenses/${id}/edit`);
  }, [navigate]);

  const editingDepense = useMemo(
    () => depenses.find((depense) => depense.id === routeEditDepenseId),
    [depenses, routeEditDepenseId]
  );

  const handleSingleSubmit = useCallback(
    async (data: DepenseFormData) => {
      if (editingDepense) {
        const updated = await updateDepense({ id: editingDepense.id, updates: data });
        navigate(`/app/depenses/${updated.id}`);
        return;
      }

      const created = await createDepense(data);
      navigate(`/app/depenses/${created.id}`);
    },
    [createDepense, editingDepense, navigate, updateDepense]
  );

  const hasSelection = selectedIds.size > 0;
  const hasBrouillonsSelected = selectedDepenses.some((depense) => depense.statut === 'brouillon');
  const hasValideesSelected = selectedDepenses.some((depense) => depense.statut === 'validee');
  const hasAnnulablesSelected = selectedDepenses.some(
    (depense) => depense.statut !== 'annulee' && depense.statut !== 'payee'
  );

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
      <ListPageLoading
        title="Gestion des Dépenses"
        description="Ordonnancement et liquidation des dépenses"
        stickyHeader={false}
      />
    );
  }

  const handleSingleCancel = () => {
    if (routeEditDepenseId) {
      navigate(`/app/depenses/${routeEditDepenseId}`);
      return;
    }
    navigate('/app/depenses');
  };

  const editorHeader = isCreateMode
    ? {
        title: 'Nouvelle dépense',
        description: 'Créez une dépense dans un espace de travail dédié.',
      }
    : {
        title: editingDepense ? `Modifier ${editingDepense.numero}` : 'Modifier la dépense',
        description: 'Éditez la dépense dans l’outlet sans revenir à la liste.',
      };

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Dépenses"
      description="Ordonnancement et liquidation des dépenses"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle dépense
        </Button>
      }
    />
  );

  return (
    <>
      <style>{CTA_REVEAL_STYLES}</style>
      <div className="space-y-6">
      {isEditorMode ? (
        <>
          <PageHeader
            title={editorHeader.title}
            description={editorHeader.description}
            sticky={false}
            actions={
              <Button variant="outline" onClick={handleSingleCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux dépenses
              </Button>
            }
          />

          {isEditMode && !editingDepense ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Cette dépense est introuvable ou n&apos;est plus accessible depuis la page courante.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/app/depenses')}>
                Retour à la liste
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <DepenseForm
                  key={`${isCreateMode ? 'create' : routeEditDepenseId || 'unknown'}`}
                  depense={editingDepense}
                  onSubmit={handleSingleSubmit}
                  onCancel={handleSingleCancel}
                  submitLabel={editingDepense ? 'Enregistrer' : 'Créer la dépense'}
                  useScrollArea={false}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : isSnapshotOpen && snapshotDepense ? (
        <div className="space-y-6">
          <DepenseSnapshot
            depense={snapshotDepense}
            paiements={paiementsDepense}
            isLoadingPaiements={isLoadingPaiements}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < depenses.length - 1}
            currentIndex={snapshotIndex}
            totalCount={depenses.length}
            onNavigateToEntity={handleNavigateToEntity}
            onValider={handleValider}
            onOrdonnancer={handleOrdonnancer}
            onEnregistrerPaiement={handleOpenEnregistrerPaiement}
            onAnnuler={handleOpenAnnuler}
            onDelete={handleOpenDelete}
            onEdit={snapshotDepense.statut === 'brouillon' ? () => handleEdit(snapshotDepense.id) : undefined}
            disableActions={isSubmittingAction}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
      ) : (
        <>
          {!isSnapshotOpen && pageHeaderContent}
          <div className="space-y-6">
            <DepenseStatsCards depenses={depenses} />
            <ListLayout
              title="Liste des dépenses"
              description="Recherche, filtres et actions groupées sur les dépenses"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle dépense
                  </Button>
                ) : undefined
              }
              toolbar={
                <ListToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par numéro, objet, bénéficiaire..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[
                          { value: 'tous', label: 'Tous' },
                          { value: 'brouillon', label: 'Brouillon' },
                          { value: 'validee', label: 'Validée' },
                          { value: 'ordonnancee', label: 'Ordonnancée' },
                          { value: 'payee', label: 'Payée' },
                          { value: 'annulee', label: 'Annulée' },
                        ].map((option) => (
                          <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value as any)}>
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>,
                    <DropdownMenu key="batch">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Actions groupées
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!hasBrouillonsSelected} onClick={handleBatchValider}>
                          Valider les brouillons
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!hasValideesSelected} onClick={handleBatchOrdonnancer}>
                          Ordonnancer les validées
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          disabled={!hasAnnulablesSelected} 
                          onClick={handleOpenBatchAnnuler}
                          className="text-destructive focus:text-destructive"
                        >
                          Annuler les dépenses sélectionnées
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!hasSelection} onClick={clearSelection}>
                          Effacer la sélection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportDepenses}>
                          Exporter (toutes les dépenses filtrées)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>,
                  ]}
                />
              }
            >
              <DepenseTable
                depenses={filteredDepenses}
                onViewDetails={handleOpenSnapshot}
                onEdit={handleEdit}
                onValider={handleValider}
                onOrdonnancer={handleOrdonnancer}
                onEnregistrerPaiement={handleOpenEnregistrerPaiement}
                onAnnuler={handleOpenAnnuler}
                onDelete={handleOpenDelete}
                disableActions={isSubmittingAction}
                selection={{ selectedIds, allSelected, toggleOne, toggleAll }}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
              />
            </ListLayout>
          </div>
        </>
      )}

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

      <AnnulerDepenseDialog
        open={annulerDialogOpen}
        onOpenChange={setAnnulerDialogOpen}
        depenseId={actionDepenseId}
        depenseNumero={depenses.find(d => d.id === actionDepenseId)?.numero}
        onConfirm={handleConfirmAnnuler}
        isSubmitting={isSubmittingAction}
      />

      <AnnulerMultipleDepensesDialog
        open={annulerMultipleDialogOpen}
        onOpenChange={setAnnulerMultipleDialogOpen}
        depenses={selectedDepenses.filter(
          (depense) => depense.statut !== 'annulee' && depense.statut !== 'payee'
        )}
        onConfirm={handleConfirmBatchAnnuler}
        isSubmitting={isSubmittingAction}
      />

      {(() => {
        const depenseForPaiement = actionDepenseId 
          ? depenses.find(d => d.id === actionDepenseId)
          : null;
        
        // Vérifier que la dépense existe ET qu'elle est ordonnancée
        return depenseForPaiement && depenseForPaiement.statut === 'ordonnancee' ? (
          <PaiementDialog
            open={paiementDialogOpen}
            onOpenChange={setPaiementDialogOpen}
            onSubmit={handleEnregistrerPaiement}
            depenseId={actionDepenseId}
            montantRestant={depenseForPaiement.montant - depenseForPaiement.montantPaye}
            depenseNumero={depenseForPaiement.numero}
          />
        ) : null;
      })()}
      </div>
    </>
  );
};

export default Depenses;
