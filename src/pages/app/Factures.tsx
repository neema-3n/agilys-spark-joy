import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useFacturesPaginated } from '@/hooks/useFactures';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEngagements } from '@/hooks/useEngagements';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { FactureStats } from '@/components/factures/FactureStats';
import { FactureTable } from '@/components/factures/FactureTable';
import { FactureForm } from '@/components/factures/FactureForm';
import { FactureSnapshot } from '@/components/factures/FactureSnapshot';
import { CreateFactureInput, Facture, StatutFacture } from '@/types/facture.types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useListSelection } from '@/hooks/useListSelection';
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';
import { facturesService } from '@/services/api/factures.service';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function Factures() {
  const navigate = useNavigate();
  const location = useLocation();
  const { factureId } = useParams<{ factureId: string }>();
  const createMatch = useMatch('/app/factures/create');
  const editMatch = useMatch('/app/factures/:factureId/edit');
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const isCreateMode = !!createMatch;
  const routeEditFactureId = editMatch?.params.factureId;
  const isEditMode = !!routeEditFactureId;
  const isEditorMode = isCreateMode || isEditMode;
  type FacturesLocationState = {
    initialBonCommandeId?: string;
    initialEngagementId?: string;
  };
  const initialBonCommandeId =
    isCreateMode && typeof (location.state as FacturesLocationState | null)?.initialBonCommandeId === 'string'
      ? ((location.state as FacturesLocationState).initialBonCommandeId ?? undefined)
      : undefined;
  const initialEngagementId =
    isCreateMode && typeof (location.state as FacturesLocationState | null)?.initialEngagementId === 'string'
      ? ((location.state as FacturesLocationState).initialEngagementId ?? undefined)
      : undefined;
  
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [annulationFactureId, setAnnulationFactureId] = useState<string | undefined>();
  const [isFactureDirty, setIsFactureDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // Pagination côté serveur
  const {
    data: factures,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    goToPage,
    setPageSize,
    filters,
    setFilters,
    isLoading,
    isFetching,
    canGoNext,
    canGoPrevious,
    createFacture,
    updateFacture,
    deleteFacture,
    validerFacture,
    marquerPayee,
    annulerFacture,
  } = useFacturesPaginated();

  const [motifAnnulation, setMotifAnnulation] = useState('');

  const handleCreateDepenseFromFacture = useCallback(
    (facture: Facture) => {
      navigate('/app/depenses/create', {
        state: { initialFactureId: facture.id },
      });
    },
    [navigate]
  );

  // Récupérer les stats globales côté serveur
  const { data: stats } = useQuery({
    queryKey: ['factures-stats', currentClient?.id, currentExercice?.id],
    queryFn: async () => {
      if (!currentClient) return null;
      const { facturesService } = await import('@/services/api/factures.service');
      return facturesService.getStats(currentClient.id, currentExercice?.id);
    },
    enabled: !!currentClient,
  });

  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { engagements } = useEngagements();

  const routeEditingFactureFromList = useMemo(
    () => factures.find((facture) => facture.id === routeEditFactureId),
    [factures, routeEditFactureId]
  );

  const { data: routeEditingFacture, isLoading: isRouteEditingFactureLoading } = useQuery({
    queryKey: ['facture-editor', routeEditFactureId],
    queryFn: () => facturesService.getById(routeEditFactureId!),
    enabled: !!routeEditFactureId && !routeEditingFactureFromList,
  });

  const editorFacture = routeEditingFactureFromList || routeEditingFacture;

  const handleSearchChange = useCallback((value: string) => {
    setFilters({ ...filters, searchTerm: value || undefined });
  }, [filters, setFilters]);

  const handleStatutChange = useCallback((value: 'tous' | StatutFacture) => {
    const newFilters = { ...filters };
    if (value === 'tous') {
      delete newFilters.statut;
    } else {
      newFilters.statut = value;
    }
    setFilters(newFilters);
  }, [filters, setFilters]);

  const handleAdvancedFilterChange = useCallback(
    (key: 'fournisseurId' | 'dateDebut' | 'dateFin', value?: string) => {
      setFilters({
        ...filters,
        [key]: value || undefined,
      });
    },
    [filters, setFilters]
  );

  const resetAdvancedFilters = useCallback(() => {
    const newFilters = { ...filters };
    delete newFilters.fournisseurId;
    delete newFilters.dateDebut;
    delete newFilters.dateFin;
    setFilters(newFilters);
  }, [filters, setFilters]);

  const selectionIds = useMemo(
    () => factures.map((facture) => facture.id),
    [factures]
  );

  const {
    selectedIds,
    allSelected,
    clearSelection,
    toggleOne,
    toggleAll,
  } = useListSelection(selectionIds);

  const selectedFactures = useMemo(
    () => factures.filter((facture) => selectedIds.has(facture.id)),
    [factures, selectedIds]
  );

  const handleBatchValider = useCallback(async () => {
    const candidates = selectedFactures.filter((facture) => facture.statut === 'brouillon');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((facture) => validerFacture(facture.id)));
    clearSelection();
  }, [selectedFactures, validerFacture, clearSelection]);

  const handleBatchMarquerPayee = useCallback(async () => {
    const candidates = selectedFactures.filter((facture) => facture.statut === 'validee');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((facture) => marquerPayee(facture.id)));
    clearSelection();
  }, [selectedFactures, marquerPayee, clearSelection]);

  const hasSelection = selectedIds.size > 0;
  const hasBrouillonsSelected = selectedFactures.some((facture) => facture.statut === 'brouillon');
  const hasValideesSelected = selectedFactures.some((facture) => facture.statut === 'validee');

  const handleExportFactures = useCallback(() => {
    // Exporter toutes les factures filtrées (CSV/Excel) – brancher ici l'implémentation
    // Exemple : exportFactures(factures);
  }, [factures]);

  const {
    snapshotId: snapshotFactureId,
    snapshotItem: snapshotFacture,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: factures,
    getId: f => f.id,
    initialId: factureId,
    onNavigateToId: id => navigate(id ? `/app/factures/${id}` : '/app/factures'),
    onMissingId: () => navigate('/app/factures', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);

  // Gérer le scroll pour l'effet de disparition du header
  const scrollProgress = useScrollProgress(!!snapshotFactureId);

  // Récupérer les bons de commande réceptionnés
  const { data: bonsCommande = [] } = useQuery({
    queryKey: ['bons-commande-receptionnes', currentClient?.id, currentExercice?.id],
    queryFn: async () => {
      if (!currentClient) return [];
      
      let query = supabase
        .from('bons_commande')
        .select('id, numero, statut, fournisseur_id, engagement_id, ligne_budgetaire_id, projet_id, objet, montant')
        .eq('client_id', currentClient.id)
        .eq('statut', 'receptionne')
        .order('numero', { ascending: false });

      if (currentExercice) {
        query = query.eq('exercice_id', currentExercice.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentClient,
  });

  // Callbacks stables avec dépendances minimales
  const handleCreate = useCallback(() => {
    navigate('/app/factures/create');
  }, [navigate]);

  const handleEdit = useCallback((id: string) => {
    navigate(`/app/factures/${id}/edit`);
  }, [navigate]);

  const handleSingleSubmit = useCallback(async (data: CreateFactureInput) => {
    if (editorFacture) {
      const updated = await updateFacture({ id: editorFacture.id, facture: data });
      navigate(`/app/factures/${updated.id}`);
      return;
    }

    const created = await createFacture({ facture: data });
    navigate(`/app/factures/${created.id}`);
  }, [editorFacture, updateFacture, createFacture, navigate]);

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    // Générer le prochain numéro côté client (pattern FAC000001)
    const lastFacture = factures[0];
    if (!lastFacture) return 'FAC000001';
    
    const match = lastFacture.numero.match(/FAC(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `FAC${nextNumber.toString().padStart(6, '0')}`;
    }
    return 'FAC000001';
  }, [currentClient, currentExercice, factures]);

  const handleAnnuler = useCallback((id: string) => {
    setAnnulationFactureId(id);
    setMotifAnnulation('');
    setAnnulerDialogOpen(true);
  }, []);

  const handleConfirmAnnulation = useCallback(async () => {
    if (annulationFactureId && motifAnnulation.trim()) {
      await annulerFacture({ id: annulationFactureId, motif: motifAnnulation });
      setAnnulerDialogOpen(false);
      setAnnulationFactureId(undefined);
      setMotifAnnulation('');
    }
  }, [annulationFactureId, motifAnnulation, annulerFacture]);

  const handleNavigateToEntity = useCallback((type: string, id: string) => {
    switch (type) {
      case 'fournisseur':
        navigate(`/app/fournisseurs/${id}`);
        break;
      case 'bon-commande':
      case 'bonCommande':
        navigate(`/app/bons-commande/${id}`);
        break;
      case 'engagement':
        navigate(`/app/engagements/${id}`);
        break;
      case 'ligne-budgetaire':
      case 'ligneBudgetaire':
        navigate(`/app/budgets/${id}?tab=lignes`);
        break;
      case 'projet':
        navigate(`/app/projets/${id}`);
        break;
      }
  }, [navigate]);

  const handleSingleCancel = useCallback(() => {
    if (routeEditFactureId) {
      navigate(`/app/factures/${routeEditFactureId}`);
      return;
    }
    if (initialBonCommandeId) {
      navigate(`/app/bons-commande/${initialBonCommandeId}`);
      return;
    }
    if (initialEngagementId) {
      navigate(`/app/engagements/${initialEngagementId}`);
      return;
    }
    navigate('/app/factures');
  }, [initialBonCommandeId, initialEngagementId, navigate, routeEditFactureId]);

  const { guard } = useFocusedEditorGuard({
    active: isEditorMode,
    dirty: isFactureDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de facture',
    overlayAriaLabel: 'Quitter le formulaire de facture',
  });

  const editorHeader = isCreateMode
    ? {
        title: 'Nouvelle facture',
        description: 'Créez une facture fournisseur dans un espace de travail dédié.',
      }
    : {
        title: editorFacture ? `Modifier ${editorFacture.numero}` : 'Modifier la facture',
        description: 'Éditez la facture dans l’outlet sans revenir à la liste.',
      };

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Factures"
      description="Gérez les factures fournisseurs"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} ref={headerCtaRef}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Button>
        </div>
      }
    />
  );

  const statutOptions: { value: 'tous' | StatutFacture; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'validee', label: 'Validée' },
    { value: 'payee', label: 'Payée' },
    { value: 'annulee', label: 'Annulée' },
  ];

  const activeStatutLabel =
    statutOptions.find((option) => option.value === (filters.statut as StatutFacture || 'tous'))?.label || 'Tous';
  const activeAdvancedFiltersCount = [
    filters.fournisseurId,
    filters.dateDebut,
    filters.dateFin,
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Factures"
        description="Gérez les factures fournisseurs"
        stickyHeader={false}
      />
    );
  }

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
                Retour aux factures
              </Button>
            }
          />

          {isEditMode && !editorFacture && isRouteEditingFactureLoading ? (
            <div className="py-12 text-center text-muted-foreground">Chargement de la facture...</div>
          ) : isEditMode && !editorFacture ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Cette facture est introuvable ou n’est plus accessible depuis la page courante.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/app/factures')}>
                Retour à la liste
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <FactureForm
                  key={`${isCreateMode ? 'create' : routeEditFactureId || 'unknown'}-${initialBonCommandeId || 'none'}-${initialEngagementId || 'none'}`}
                  facture={editorFacture}
                  onSubmit={handleSingleSubmit}
                  onCancel={handleSingleCancel}
                  onDirtyChange={setIsFactureDirty}
                  fournisseurs={fournisseurs}
                  bonsCommande={bonsCommande}
                  engagements={engagements.filter((engagement) => engagement.statut === 'valide' || engagement.statut === 'engage')}
                  lignesBudgetaires={lignesBudgetaires.filter(lb => lb.statut === 'actif')}
                  projets={projets}
                  currentClientId={currentClient?.id || ''}
                  currentExerciceId={currentExercice?.id || ''}
                  onGenererNumero={handleGenererNumero}
                  initialBonCommandeId={initialBonCommandeId}
                  initialEngagementId={initialEngagementId}
                  submitLabel={editorFacture ? 'Enregistrer' : 'Créer la facture'}
                  useScrollArea={false}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
      {!isSnapshotOpen && pageHeaderContent}

      <div className="space-y-6">
        {isSnapshotOpen && snapshotFacture ? (
          <FactureSnapshot
            facture={snapshotFacture}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < factures.length - 1}
            currentIndex={snapshotIndex}
            totalCount={factures.length}
            onNavigateToEntity={handleNavigateToEntity}
            onValider={snapshotFacture.statut === 'brouillon' ? () => validerFacture(snapshotFacture.id) : undefined}
            onMarquerPayee={snapshotFacture.statut === 'validee' ? () => marquerPayee(snapshotFacture.id) : undefined}
            onAnnuler={snapshotFacture.statut !== 'annulee' && snapshotFacture.statut !== 'payee' ? () => handleAnnuler(snapshotFacture.id) : undefined}
            onEdit={snapshotFacture.statut === 'brouillon' ? () => handleEdit(snapshotFacture.id) : undefined}
            onCreerDepense={(snapshotFacture.statut === 'validee' || snapshotFacture.statut === 'payee') ? () => handleCreateDepenseFromFacture(snapshotFacture) : undefined}
          />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            {stats && <FactureStats factures={factures} stats={stats} />}

            <ListLayout
              title="Liste des factures"
              description="Visualisez, filtrez et gérez vos factures fournisseurs"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle facture
                  </Button>
                ) : undefined
              }
              toolbar={
                <ListToolbar
                  searchValue={(filters.searchTerm as string) || ''}
                  onSearchChange={handleSearchChange}
                  searchPlaceholder="Rechercher par numéro, objet, fournisseur..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Statut: {activeStatutLabel}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {statutOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleStatutChange(option.value)}
                          >
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
                    <DropdownMenu key="batch-actions">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Actions groupées
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!hasBrouillonsSelected}
                          onClick={handleBatchValider}
                        >
                          Valider les brouillons
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!hasValideesSelected}
                          onClick={handleBatchMarquerPayee}
                        >
                          Marquer comme payées
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!hasSelection} onClick={() => clearSelection()}>
                          Effacer la sélection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportFactures}>
                          Exporter (toutes les factures filtrées)
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
                      <Label>Fournisseur</Label>
                      <Select
                        value={(filters.fournisseurId as string) || 'all'}
                        onValueChange={(value) =>
                          handleAdvancedFilterChange('fournisseurId', value === 'all' ? undefined : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les fournisseurs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les fournisseurs</SelectItem>
                          {fournisseurs.map((fournisseur) => (
                            <SelectItem key={fournisseur.id} value={fournisseur.id}>
                              {fournisseur.nom} - {fournisseur.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date début</Label>
                      <Input
                        type="date"
                        value={(filters.dateDebut as string) || ''}
                        onChange={(event) =>
                          handleAdvancedFilterChange('dateDebut', event.target.value || undefined)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date fin</Label>
                      <Input
                        type="date"
                        value={(filters.dateFin as string) || ''}
                        onChange={(event) =>
                          handleAdvancedFilterChange('dateFin', event.target.value || undefined)
                        }
                      />
                    </div>
                  </div>
                </AdvancedFiltersPanel>
              }
            >
              <FactureTable
                factures={factures}
                onEdit={(facture) => handleEdit(facture.id)}
                onDelete={deleteFacture}
                onValider={validerFacture}
                onMarquerPayee={marquerPayee}
                onAnnuler={handleAnnuler}
                onCreerDepense={handleCreateDepenseFromFacture}
                onViewDetails={handleOpenSnapshot}
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
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={goToPage}
                    onPageSizeChange={setPageSize}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    itemLabel="factures"
                    showKeyboardHint
                  />
                }
              />
            </ListLayout>
          </>
        )}
      </div>

      <AlertDialog open={annulerDialogOpen} onOpenChange={setAnnulerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la facture</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez indiquer le motif d'annulation de cette facture.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motif">Motif d'annulation</Label>
            <Input
              id="motif"
              value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)}
              placeholder="Ex: Erreur de saisie, facture en double..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAnnulation}
              disabled={!motifAnnulation.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </>
      )}
      </div>
    </>
  );
}
