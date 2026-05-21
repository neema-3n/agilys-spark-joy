import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useMatch } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { FournisseurForm } from '@/components/fournisseurs/FournisseurForm';
import { FournisseurTable } from '@/components/fournisseurs/FournisseurTable';
import { FournisseurStats } from '@/components/fournisseurs/FournisseurStats';
import { FournisseurSnapshot } from '@/components/fournisseurs/FournisseurSnapshot';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { useSnapshotHandlers } from '@/hooks/useSnapshotHandlers';
import { useListSelection } from '@/hooks/useListSelection';
import { useClientPagination } from '@/hooks/useClientPagination';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { StatutFournisseur, CreateFournisseurInput, UpdateFournisseurInput } from '@/types/fournisseur.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

const Fournisseurs = () => {
  const { fournisseurId } = useParams<{ fournisseurId: string }>();
  const navigate = useNavigate();
  const { fournisseurs, stats, isLoading, create, update, delete: deleteFournisseur } = useFournisseurs();
  const isCreateRoute = !!useMatch('/app/fournisseurs/create');
  const isEditRoute = !!useMatch('/app/fournisseurs/:fournisseurId/edit');
  
  // États
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | StatutFournisseur>('tous');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFournisseurDirty, setIsFournisseurDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'tous' | 'personne_physique' | 'personne_morale'>('tous');
  const [engagementsMin, setEngagementsMin] = useState('');
  const [engagementsMax, setEngagementsMax] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const isMobile = useIsMobile();

  // Helper pour récupérer le fournisseur depuis l'ID
  const editingFournisseur = useMemo(
    () => (isEditRoute && fournisseurId ? fournisseurs.find((f) => f.id === fournisseurId) : undefined),
    [fournisseurs, fournisseurId, isEditRoute]
  );

  // Filtrage
  const filteredFournisseurs = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return fournisseurs
      .filter((f) => (statutFilter === 'tous' ? true : f.statut === statutFilter))
      .filter((f) => (typeFilter === 'tous' ? true : f.typeFournisseur === typeFilter))
      .filter((f) => (!engagementsMin ? true : f.nombreEngagements >= Number(engagementsMin)))
      .filter((f) => (!engagementsMax ? true : f.nombreEngagements <= Number(engagementsMax)))
      .filter((f) => (!montantMin ? true : f.montantTotalEngage >= Number(montantMin)))
      .filter((f) => (!montantMax ? true : f.montantTotalEngage <= Number(montantMax)))
      .filter((f) => {
        if (!searchLower) return true;
        return (
          f.code.toLowerCase().includes(searchLower) ||
          f.nom.toLowerCase().includes(searchLower) ||
          f.categorie?.toLowerCase().includes(searchLower) ||
          f.email?.toLowerCase().includes(searchLower) ||
          f.telephone?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [engagementsMax, engagementsMin, fournisseurs, montantMax, montantMin, searchTerm, statutFilter, typeFilter]);

  const activeAdvancedFiltersCount = [
    typeFilter !== 'tous',
    !!engagementsMin,
    !!engagementsMax,
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
  } = useClientPagination(filteredFournisseurs, {
    initialPageSize: 25,
    resetKey: [searchTerm, statutFilter, typeFilter, engagementsMin, engagementsMax, montantMin, montantMax].join('|'),
  });

  // Sélection batch
  const selectionIds = useMemo(() => paginatedItems.map((f) => f.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const hasSelection = selectedIds.size > 0;

  // Snapshot state
  const {
    snapshotId,
    snapshotItem: snapshotFournisseur,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: filteredFournisseurs,
    getId: (f) => f.id,
    initialId: fournisseurId,
    onNavigateToId: (id) => navigate(id ? `/app/fournisseurs/${id}` : '/app/fournisseurs'),
    onMissingId: () => navigate('/app/fournisseurs', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotId);

  // Handlers
  const handleCreate = useCallback(() => {
    navigate('/app/fournisseurs/create');
  }, [navigate]);

  const handleEdit = useCallback((id: string) => {
    navigate(`/app/fournisseurs/${id}/edit`);
  }, [navigate]);

  const handleSingleCancel = () => {
    if (editingFournisseur) {
      navigate(`/app/fournisseurs/${editingFournisseur.id}`);
      return;
    }

    navigate('/app/fournisseurs');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isFournisseurDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de fournisseur',
    overlayAriaLabel: 'Quitter le formulaire de fournisseur',
  });

  const handleSubmit = useCallback(
    async (data: CreateFournisseurInput | UpdateFournisseurInput) => {
      const fournisseur = editingFournisseur
        ? await update({ id: editingFournisseur.id, input: data as UpdateFournisseurInput })
        : await create(data as CreateFournisseurInput);
      navigate(`/app/fournisseurs/${fournisseur.id}`);
    },
    [editingFournisseur, update, create, navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFournisseur(id);
      if (snapshotId === id) {
        handleCloseSnapshot();
      }
      setDeleteId(null);
    },
    [deleteFournisseur, snapshotId, handleCloseSnapshot]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId) {
      handleDelete(deleteId);
    }
  }, [deleteId, handleDelete]);

  // Snapshot handlers
  const snapshotHandlers = useSnapshotHandlers({
    onEdit: () => {
      if (snapshotFournisseur) {
        handleEdit(snapshotFournisseur.id);
      }
    },
    onDelete: () => {
      if (snapshotFournisseur) {
        setDeleteId(snapshotFournisseur.id);
      }
    },
  });

  const handleExportFournisseurs = useCallback(() => {
    // Exporter tous les fournisseurs filtrés (CSV/Excel)
  }, []);

  const statutOptions: { value: 'tous' | StatutFournisseur; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'actif', label: 'Actifs' },
    { value: 'inactif', label: 'Inactifs' },
    { value: 'blackliste', label: 'Blacklistés' },
    { value: 'en_attente_validation', label: 'En attente' },
  ];

  const activeStatutLabel =
    statutOptions.find((option) => option.value === statutFilter)?.label || 'Tous';

  const resetAdvancedFilters = useCallback(() => {
    setTypeFilter('tous');
    setEngagementsMin('');
    setEngagementsMax('');
    setMontantMin('');
    setMontantMax('');
  }, []);

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        stickyHeader={false}
      />
    );
  }

  if ((isCreateRoute || isEditRoute) && isEditRoute && fournisseurId && !editingFournisseur) {
    return (
      <ListPageLoading
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        stickyHeader={false}
      />
    );
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={editingFournisseur ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          description="Gérez les informations administratives, commerciales et bancaires du fournisseur."
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              Retour aux fournisseurs
            </Button>
          }
        />

        <FournisseurForm
          fournisseur={editingFournisseur}
          onSubmit={handleSubmit}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsFournisseurDirty}
        />
      </div>
    );
  }

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Fournisseurs"
      description="Référentiel fournisseurs et suivi des contrats"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      }
    />
  );

  return (
    <>
      <style>{CTA_REVEAL_STYLES}</style>
      <div className="space-y-6">
      {!isSnapshotOpen && pageHeaderContent}

      <div className="space-y-6">
        {isSnapshotOpen && snapshotFournisseur ? (
          <FournisseurSnapshot
            fournisseur={snapshotFournisseur}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < filteredFournisseurs.length - 1}
            currentIndex={snapshotIndex}
            totalCount={filteredFournisseurs.length}
            onEdit={snapshotHandlers.onEdit}
            onDelete={snapshotFournisseur.nombreEngagements === 0 ? snapshotHandlers.onDelete : undefined}
          />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            <FournisseurStats stats={stats} />

            <ListLayout
              title="Liste des fournisseurs"
              description="Visualisez, filtrez et gérez votre référentiel fournisseurs"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau fournisseur
                  </Button>
                ) : undefined
              }
              toolbar={
                <ListToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par code, nom, catégorie..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Statut: {activeStatutLabel}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {statutOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setStatutFilter(option.value)}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>,
                    ...(!isMobile || hasSelection
                      ? [
                          <DropdownMenu key="batch-actions">
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline">Actions groupées</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem disabled={!hasSelection} onClick={() => clearSelection()}>
                                Effacer la sélection
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleExportFournisseurs}>
                                Exporter (tous les fournisseurs filtrés)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>,
                        ]
                      : []),
                    <AdvancedFiltersToggleButton
                      key="advanced-filters"
                      open={isAdvancedFiltersOpen}
                      onToggle={() => setIsAdvancedFiltersOpen((open) => !open)}
                      activeCount={activeAdvancedFiltersCount}
                    />,
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
                      <Label>Type</Label>
                      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tous">Tous les types</SelectItem>
                          <SelectItem value="personne_morale">Personne morale</SelectItem>
                          <SelectItem value="personne_physique">Personne physique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre d&apos;engagements</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min" value={engagementsMin} onChange={(event) => setEngagementsMin(event.target.value)} />
                        <Input type="number" placeholder="Max" value={engagementsMax} onChange={(event) => setEngagementsMax(event.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Montant engagé</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min" value={montantMin} onChange={(event) => setMontantMin(event.target.value)} />
                        <Input type="number" placeholder="Max" value={montantMax} onChange={(event) => setMontantMax(event.target.value)} />
                      </div>
                    </div>
                  </div>
                </AdvancedFiltersPanel>
              }
            >
              <FournisseurTable
                fournisseurs={paginatedItems}
                onViewDetails={handleOpenSnapshot}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteId(id)}
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
                    itemLabel="fournisseurs"
                    showKeyboardHint
                  />
                }
              />
            </ListLayout>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
};

export default Fournisseurs;
