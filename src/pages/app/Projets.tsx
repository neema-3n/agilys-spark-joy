import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjets } from '@/hooks/useProjets';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { projetsService } from '@/services/api/projets.service';
import { ProjetForm, type ProjetFormSubmitData } from '@/components/projets/ProjetForm';
import { ProjetsTable } from '@/components/projets/ProjetsTable';
import { ProjetStats } from '@/components/projets/ProjetStats';
import { ProjetSnapshot } from '@/components/projets/ProjetSnapshot';
import { Projet } from '@/types/projet.types';
import { useToast } from '@/hooks/use-toast';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { PaginationControls } from '@/components/lists/PaginationControls';
import { useClientPagination } from '@/hooks/useClientPagination';
import { useListSelection } from '@/hooks/useListSelection';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PrioriteProjet, StatutProjet } from '@/types/projet.types';
import { useReferentiels } from '@/hooks/useReferentiels';

const Projets = () => {
  const { toast } = useToast();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { projetId } = useParams<{ projetId: string }>();
  const { projets, isLoading, refetch } = useProjets();
  const isCreateRoute = !!useMatch('/app/projets/create');
  const isEditRoute = !!useMatch('/app/projets/:projetId/edit');
  const isDetailRoute = !!useMatch('/app/projets/:projetId');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projetToDelete, setProjetToDelete] = useState<Projet | null>(null);
  const [isProjetDirty, setIsProjetDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | StatutProjet>('tous');
  const [prioriteFilter, setPrioriteFilter] = useState<'toutes' | PrioriteProjet>('toutes');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [responsableFilter, setResponsableFilter] = useState('');
  const [typeProjetFilter, setTypeProjetFilter] = useState<'tous' | string>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [batchStatutDialogOpen, setBatchStatutDialogOpen] = useState(false);
  const [batchPrioriteDialogOpen, setBatchPrioriteDialogOpen] = useState(false);
  const [batchStatutValue, setBatchStatutValue] = useState<StatutProjet>('planifie');
  const [batchPrioriteValue, setBatchPrioriteValue] = useState<PrioriteProjet>('moyenne');
  const { data: typesProjet = [] } = useReferentiels('type_projet');
  const selectedProjet = useMemo(
    () => (projetId ? projets.find((projet) => projet.id === projetId) || null : null),
    [projets, projetId]
  );
  const filteredProjets = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return projets.filter((projet) => {
      const matchesSearch =
        !searchLower ||
        projet.code.toLowerCase().includes(searchLower) ||
        projet.nom.toLowerCase().includes(searchLower) ||
        projet.responsable?.toLowerCase().includes(searchLower);
      const matchesStatut = statutFilter === 'tous' || projet.statut === statutFilter;
      const matchesPriorite =
        prioriteFilter === 'toutes' || projet.priorite === prioriteFilter;
      const matchesResponsable =
        !responsableFilter.trim() ||
        projet.responsable?.toLowerCase().includes(responsableFilter.trim().toLowerCase());
      const matchesTypeProjet =
        typeProjetFilter === 'tous' || projet.typeProjet === typeProjetFilter;
      const matchesDateDebut = !dateDebut || projet.dateDebut >= dateDebut;
      const matchesDateFin = !dateFin || projet.dateFin <= dateFin;
      const matchesBudgetMin = !budgetMin || projet.budgetAlloue >= Number(budgetMin);
      const matchesBudgetMax = !budgetMax || projet.budgetAlloue <= Number(budgetMax);

      return (
        matchesSearch &&
        matchesStatut &&
        matchesPriorite &&
        matchesResponsable &&
        matchesTypeProjet &&
        matchesDateDebut &&
        matchesDateFin &&
        matchesBudgetMin &&
        matchesBudgetMax
      );
    });
  }, [
    budgetMax,
    budgetMin,
    dateDebut,
    dateFin,
    prioriteFilter,
    projets,
    responsableFilter,
    search,
    statutFilter,
    typeProjetFilter,
  ]);
  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredProjets, {
    initialPageSize: 25,
    resetKey: `${search}|${statutFilter}|${prioriteFilter}|${responsableFilter}|${typeProjetFilter}|${dateDebut}|${dateFin}|${budgetMin}|${budgetMax}`,
  });
  const selectionIds = useMemo(() => paginatedItems.map((projet) => projet.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);
  const selectedProjets = useMemo(
    () => paginatedItems.filter((projet) => selectedIds.has(projet.id)),
    [paginatedItems, selectedIds]
  );
  const activeAdvancedFiltersCount = [
    !!responsableFilter.trim(),
    typeProjetFilter !== 'tous',
    !!dateDebut,
    !!dateFin,
    !!budgetMin,
    !!budgetMax,
  ].filter(Boolean).length;
  const {
    snapshotItem: snapshotProjet,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot,
    closeSnapshot,
    navigateSnapshot,
  } = useSnapshotState({
    items: projets,
    getId: (item) => item.id,
    initialId: isDetailRoute ? projetId || null : null,
    onNavigateToId: (id) => navigate(id ? `/app/projets/${id}` : '/app/projets'),
    onMissingId: () => navigate('/app/projets', { replace: true }),
    isLoadingItems: isLoading,
  });

  const canEdit = hasAnyRole(['super_admin', 'admin_client', 'directeur_financier', 'chef_service']);
  const handleSingleCancel = useCallback(() => {
    navigate(selectedProjet ? `/app/projets/${selectedProjet.id}` : '/app/projets');
  }, [navigate, selectedProjet]);

  const handleCreate = () => {
    navigate('/app/projets/create');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isProjetDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de projet',
    overlayAriaLabel: 'Quitter le formulaire de projet',
  });

  const handleEdit = (projet: Projet) => {
    navigate(`/app/projets/${projet.id}/edit`);
  };

  const handleDeleteClick = (projet: Projet) => {
    setProjetToDelete(projet);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: ProjetFormSubmitData) => {
    try {
      if (selectedProjet) {
        const projet = await projetsService.update(selectedProjet.id, data);
        toast({
          title: 'Succès',
          description: 'Projet modifié avec succès',
        });
        navigate(`/app/projets/${projet.id}`);
      } else {
        const projet = await projetsService.create({
          ...data,
          clientId: currentClient!.id,
          exerciceId: currentExercice!.id,
        });
        toast({
          title: 'Succès',
          description: 'Projet créé avec succès',
        });
        navigate(`/app/projets/${projet.id}`);
      }
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!projetToDelete) return;

    try {
      await projetsService.delete(projetToDelete.id);
      toast({
        title: 'Succès',
        description: 'Projet supprimé avec succès',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer ce projet',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjetToDelete(null);
    }
  };

  const resetAdvancedFilters = useCallback(() => {
    setResponsableFilter('');
    setTypeProjetFilter('tous');
    setDateDebut('');
    setDateFin('');
    setBudgetMin('');
    setBudgetMax('');
  }, []);

  const handleBatchUpdateStatut = useCallback(async () => {
    if (selectedProjets.length === 0) return;
    await Promise.all(
      selectedProjets.map((projet) =>
        projetsService.update(projet.id, { statut: batchStatutValue })
      )
    );
    setBatchStatutDialogOpen(false);
    clearSelection();
    await refetch();
    toast({
      title: 'Statut mis à jour',
      description: `${selectedProjets.length} projet(s) mis à jour.`,
    });
  }, [batchStatutValue, clearSelection, refetch, selectedProjets, toast]);

  const handleBatchUpdatePriorite = useCallback(async () => {
    if (selectedProjets.length === 0) return;
    await Promise.all(
      selectedProjets.map((projet) =>
        projetsService.update(projet.id, { priorite: batchPrioriteValue })
      )
    );
    setBatchPrioriteDialogOpen(false);
    clearSelection();
    await refetch();
    toast({
      title: 'Priorité mise à jour',
      description: `${selectedProjets.length} projet(s) mis à jour.`,
    });
  }, [batchPrioriteValue, clearSelection, refetch, selectedProjets, toast]);

  if (isLoading) {
    return (
      <div>
        <div className="text-center text-muted-foreground">
          Chargement des projets...
        </div>
      </div>
    );
  }

  if ((isEditRoute || isDetailRoute) && projetId && !selectedProjet) {
    return <div className="text-center text-muted-foreground">Chargement du projet...</div>;
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={selectedProjet ? 'Modifier le projet' : 'Nouveau projet'}
          description="Structurez le suivi budgétaire et analytique du projet."
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux projets
            </Button>
          }
        />
        <ProjetForm
          projet={selectedProjet}
          onSubmit={handleSubmit}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsProjetDirty}
        />
      </div>
    );
  }

  if (isDetailRoute && isSnapshotLoading) {
    return <div className="text-center text-muted-foreground">Chargement du projet...</div>;
  }

  if (isDetailRoute && isSnapshotOpen && snapshotProjet) {
    return (
      <ProjetSnapshot
        projet={snapshotProjet}
        onClose={closeSnapshot}
        onNavigate={navigateSnapshot}
        hasPrev={snapshotIndex > 0}
        hasNext={snapshotIndex >= 0 && snapshotIndex < projets.length - 1}
        currentIndex={Math.max(snapshotIndex, 0)}
        totalCount={projets.length}
        onEdit={canEdit ? () => handleEdit(snapshotProjet) : undefined}
        onDelete={canEdit ? () => handleDeleteClick(snapshotProjet) : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projets & Analytique"
        description="Suivi financier multi-projet avec axe analytique"
        actions={
          canEdit ? (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          ) : undefined
        }
      />
      <ProjetStats />
      <ListLayout
        title="Portefeuille projets"
        description="Visualisez, filtrez et pilotez les projets rattachés à l'exercice actif."
        toolbar={
          <ListToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Rechercher par code, nom, responsable..."
            filters={[
              <Select key="statut" value={statutFilter} onValueChange={(value) => setStatutFilter(value as 'tous' | StatutProjet)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut: Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Statut: Tous</SelectItem>
                  <SelectItem value="planifie">Planifié</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="annule">Annulé</SelectItem>
                </SelectContent>
              </Select>,
              <Select key="priorite" value={prioriteFilter} onValueChange={(value) => setPrioriteFilter(value as 'toutes' | PrioriteProjet)}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Priorité: Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Priorité: Toutes</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="basse">Basse</SelectItem>
                </SelectContent>
              </Select>,
              <AdvancedFiltersToggleButton
                key="advanced-filters"
                open={isAdvancedFiltersOpen}
                onToggle={() => setIsAdvancedFiltersOpen((open) => !open)}
                activeCount={activeAdvancedFiltersCount}
              />,
              <DropdownMenu key="batch-actions">
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">Actions groupées</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={selectedIds.size === 0}
                    onClick={() => setBatchStatutDialogOpen(true)}
                  >
                    Modifier le statut
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={selectedIds.size === 0}
                    onClick={() => setBatchPrioriteDialogOpen(true)}
                  >
                    Modifier la priorité
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={selectedIds.size === 0} onClick={clearSelection}>
                    Effacer la sélection
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
                <Label htmlFor="projets-responsable-filter">Responsable</Label>
                <Input
                  id="projets-responsable-filter"
                  value={responsableFilter}
                  onChange={(event) => setResponsableFilter(event.target.value)}
                  placeholder="Filtrer par responsable"
                />
              </div>
              <div className="space-y-2">
                <Label>Type de projet</Label>
                <Select
                  value={typeProjetFilter}
                  onValueChange={(value) => setTypeProjetFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    {typesProjet.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {type.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projets-date-debut-filter">Date début</Label>
                <Input
                  id="projets-date-debut-filter"
                  type="date"
                  value={dateDebut}
                  onChange={(event) => setDateDebut(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projets-date-fin-filter">Date fin</Label>
                <Input
                  id="projets-date-fin-filter"
                  type="date"
                  value={dateFin}
                  onChange={(event) => setDateFin(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Budget alloué</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={budgetMin}
                    onChange={(event) => setBudgetMin(event.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={budgetMax}
                    onChange={(event) => setBudgetMax(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </AdvancedFiltersPanel>
        }
      >
        <ProjetsTable
          projets={paginatedItems}
          onView={openSnapshot}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          canEdit={canEdit}
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
              itemLabel="projets"
              isLoading={isLoading}
              showKeyboardHint
            />
          }
        />
      </ListLayout>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projetToDelete?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchStatutDialogOpen} onOpenChange={setBatchStatutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le statut des projets sélectionnés</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action mettra à jour le statut de {selectedIds.size} projet(s) sur la page courante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Statut cible</Label>
            <Select value={batchStatutValue} onValueChange={(value) => setBatchStatutValue(value as StatutProjet)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planifie">Planifié</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchUpdateStatut} disabled={selectedIds.size === 0}>
              Enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={batchPrioriteDialogOpen} onOpenChange={setBatchPrioriteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier la priorité des projets sélectionnés</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action mettra à jour la priorité de {selectedIds.size} projet(s) sur la page courante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Priorité cible</Label>
            <Select value={batchPrioriteValue} onValueChange={(value) => setBatchPrioriteValue(value as PrioriteProjet)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="haute">Haute</SelectItem>
                <SelectItem value="moyenne">Moyenne</SelectItem>
                <SelectItem value="basse">Basse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchUpdatePriorite} disabled={selectedIds.size === 0}>
              Enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projets;
