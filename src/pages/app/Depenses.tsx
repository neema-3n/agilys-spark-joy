import { useCallback, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
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
import { useEngagements } from '@/hooks/useEngagements';
import { useFactures } from '@/hooks/useFactures';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import type { DepenseFormData } from '@/types/depense.types';
import { usePaiementsByDepense } from '@/hooks/usePaiements';
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
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
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
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { Input } from '@/components/ui/input';
import { useClientPagination } from '@/hooks/useClientPagination';

type DepensesLocationState = {
  initialEngagementId?: string;
  initialFactureId?: string;
};

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
  const location = useLocation();
  const createMatch = useMatch('/app/depenses/create');
  const editMatch = useMatch('/app/depenses/:depenseId/edit');
  const navigate = useNavigate();
  const [actionDepenseId, setActionDepenseId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [annulerMultipleDialogOpen, setAnnulerMultipleDialogOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isDepenseDirty, setIsDepenseDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<
    'tous' | 'brouillon' | 'validee' | 'ordonnancee' | 'payee' | 'annulee'
  >('tous');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'tous' | 'facture' | 'engagement'>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const isCreateMode = !!createMatch;
  const routeEditDepenseId = editMatch?.params.depenseId;
  const isEditMode = !!routeEditDepenseId;
  const isEditorMode = isCreateMode || isEditMode;
  const initialEngagementId =
    isCreateMode && typeof (location.state as DepensesLocationState | null)?.initialEngagementId === 'string'
      ? ((location.state as DepensesLocationState).initialEngagementId ?? undefined)
      : undefined;
  const initialFactureId =
    isCreateMode && typeof (location.state as DepensesLocationState | null)?.initialFactureId === 'string'
      ? ((location.state as DepensesLocationState).initialFactureId ?? undefined)
      : undefined;
  const { engagements, isLoading: isEngagementsLoading } = useEngagements();
  const { factures, isLoading: isFacturesLoading } = useFactures();

  const filteredDepenses = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    return depenses
      .filter((depense) => (statutFilter === 'tous' ? true : depense.statut === statutFilter))
      .filter((depense) => {
        if (sourceFilter === 'tous') return true;
        if (sourceFilter === 'facture') return !!depense.factureId;
        return !!depense.engagementId;
      })
      .filter((depense) => (!dateDebut ? true : depense.dateDepense >= dateDebut))
      .filter((depense) => (!dateFin ? true : depense.dateDepense <= dateFin))
      .filter((depense) => (!montantMin ? true : depense.montant >= Number(montantMin)))
      .filter((depense) => (!montantMax ? true : depense.montant <= Number(montantMax)))
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
  }, [dateDebut, dateFin, depenses, montantMax, montantMin, searchTerm, sourceFilter, statutFilter]);

  const activeAdvancedFiltersCount = [
    sourceFilter !== 'tous',
    !!dateDebut,
    !!dateFin,
    !!montantMin,
    !!montantMax,
  ].filter(Boolean).length;

  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredDepenses, {
    initialPageSize: 25,
    resetKey: [searchTerm, statutFilter, sourceFilter, dateDebut, dateFin, montantMin, montantMax].join('|'),
  });

  const selectionIds = useMemo(() => paginatedItems.map((depense) => depense.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const selectedDepenses = useMemo(
    () => paginatedItems.filter((depense) => selectedIds.has(depense.id)),
    [paginatedItems, selectedIds]
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
    navigate('/app/paiements/create', {
      state: { initialDepenseId: id },
    });
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

  const resetAdvancedFilters = useCallback(() => {
    setSourceFilter('tous');
    setDateDebut('');
    setDateFin('');
    setMontantMin('');
    setMontantMax('');
  }, []);

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

  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === initialEngagementId),
    [engagements, initialEngagementId]
  );
  const selectedFacture = useMemo(
    () => factures.find((facture) => facture.id === initialFactureId),
    [factures, initialFactureId]
  );
  const isWaitingForPreselection =
    (Boolean(initialEngagementId) && isEngagementsLoading && !selectedEngagement) ||
    (Boolean(initialFactureId) && isFacturesLoading && !selectedFacture);

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

  const handleSingleCancel = useCallback(() => {
    if (routeEditDepenseId) {
      navigate(`/app/depenses/${routeEditDepenseId}`);
      return;
    }
    if (initialFactureId) {
      navigate(`/app/factures/${initialFactureId}`);
      return;
    }
    if (initialEngagementId) {
      navigate(`/app/engagements/${initialEngagementId}`);
      return;
    }
    navigate('/app/depenses');
  }, [initialEngagementId, initialFactureId, navigate, routeEditDepenseId]);

  const { guard } = useFocusedEditorGuard({
    active: isEditorMode,
    dirty: isDepenseDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de dépense',
    overlayAriaLabel: 'Quitter le formulaire de dépense',
  });

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Dépenses"
        description="Ordonnancement et liquidation des dépenses"
        stickyHeader={false}
      />
    );
  }

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
      {guard}
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

          {isWaitingForPreselection ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Chargement des données source de la dépense...
              </p>
            </div>
          ) : isEditMode && !editingDepense ? (
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
                  key={`${isCreateMode ? 'create' : routeEditDepenseId || 'unknown'}-${initialEngagementId || 'none'}-${initialFactureId || 'none'}`}
                  depense={editingDepense}
                  preSelectedEngagement={selectedEngagement}
                  preSelectedFacture={selectedFacture}
                  onSubmit={handleSingleSubmit}
                  onCancel={handleSingleCancel}
                  onDirtyChange={setIsDepenseDirty}
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
                    <AdvancedFiltersToggleButton
                      key="advanced-filters"
                      open={isAdvancedFiltersOpen}
                      onToggle={() => setIsAdvancedFiltersOpen((open) => !open)}
                      activeCount={activeAdvancedFiltersCount}
                    />,
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
              advancedFilters={
                <AdvancedFiltersPanel
                  open={isAdvancedFiltersOpen}
                  onReset={resetAdvancedFilters}
                  resetDisabled={activeAdvancedFiltersCount === 0}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source</label>
                      <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tous">Toutes les sources</SelectItem>
                          <SelectItem value="facture">Issue de facture</SelectItem>
                          <SelectItem value="engagement">Issue d&apos;engagement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date début</label>
                      <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date fin</label>
                      <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Montant TTC</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min" value={montantMin} onChange={(e) => setMontantMin(e.target.value)} />
                        <Input type="number" placeholder="Max" value={montantMax} onChange={(e) => setMontantMax(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </AdvancedFiltersPanel>
              }
            >
              <DepenseTable
                depenses={paginatedItems}
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
                footer={
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={goToPage}
                    onPageSizeChange={setPageSize}
                    isLoading={isLoading}
                    itemLabel="dépenses"
                    showKeyboardHint
                  />
                }
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

      </div>
    </>
  );
};

export default Depenses;
