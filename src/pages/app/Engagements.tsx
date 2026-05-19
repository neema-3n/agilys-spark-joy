import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EngagementForm } from '@/components/engagements/EngagementForm';
import { EngagementTable } from '@/components/engagements/EngagementTable';
import { EngagementStats } from '@/components/engagements/EngagementStats';
import { EngagementSnapshot } from '@/components/engagements/EngagementSnapshot';
import { useEngagements } from '@/hooks/useEngagements';
import { useReservations } from '@/hooks/useReservations';
import { useToast } from '@/hooks/use-toast';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { showNavigationToast } from '@/lib/navigation-toast';
import { useSnapshotState } from '@/hooks/useSnapshotState';
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
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';
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
import { Card, CardContent } from '@/components/ui/card';
import type { EngagementFormData } from '@/types/engagement.types';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { useClientPagination } from '@/hooks/useClientPagination';
import { useListSelection } from '@/hooks/useListSelection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EngagementLocationState = {
  initialReservationId?: string;
};

const Engagements = () => {
  const { engagementId } = useParams<{ engagementId?: string }>();
  const createMatch = useMatch('/app/engagements/create');
  const editMatch = useMatch('/app/engagements/:engagementId/edit');
  const location = useLocation();
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionEngagementId, setActionEngagementId] = useState<string | null>(null);
  const [annulationDialogOpen, setAnnulationDialogOpen] = useState(false);
  const [annulationEngagementId, setAnnulationEngagementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'brouillon' | 'valide' | 'engage' | 'liquide' | 'annule'>('tous');
  const [isEngagementDirty, setIsEngagementDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'tous' | 'reservation' | 'direct'>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCreateMode = !!createMatch;
  const routeEditEngagementId = editMatch?.params.engagementId;
  const isEditMode = !!routeEditEngagementId;
  const isEditorMode = isCreateMode || isEditMode;
  const initialReservationId =
    isCreateMode && typeof (location.state as EngagementLocationState | null)?.initialReservationId === 'string'
      ? ((location.state as EngagementLocationState).initialReservationId ?? undefined)
      : undefined;

  const {
    engagements,
    isLoading,
    createEngagement,
    createEngagementFromReservation,
    updateEngagement,
    validerEngagement,
    annulerEngagement,
    deleteEngagement,
  } = useEngagements();
  const { reservations } = useReservations();

  const filteredEngagements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return engagements
      .filter((engagement) => (statutFilter === 'tous' ? true : engagement.statut === statutFilter))
      .filter((engagement) =>
        sourceFilter === 'tous' ? true : sourceFilter === 'reservation' ? !!engagement.reservationCreditId : !engagement.reservationCreditId
      )
      .filter((engagement) => (!dateDebut ? true : engagement.dateCreation >= dateDebut))
      .filter((engagement) => (!dateFin ? true : engagement.dateCreation <= dateFin))
      .filter((engagement) => (!montantMin ? true : engagement.montant >= Number(montantMin)))
      .filter((engagement) => (!montantMax ? true : engagement.montant <= Number(montantMax)))
      .filter((engagement) => {
        if (!term) return true;
        return (
          engagement.numero.toLowerCase().includes(term) ||
          engagement.objet.toLowerCase().includes(term) ||
          engagement.fournisseur?.nom.toLowerCase().includes(term) ||
          engagement.beneficiaire?.toLowerCase().includes(term) ||
          engagement.reservationCredit?.numero?.toLowerCase().includes(term) ||
          engagement.ligneBudgetaire?.libelle?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }, [dateDebut, dateFin, engagements, montantMax, montantMin, searchTerm, sourceFilter, statutFilter]);

  const activeAdvancedFiltersCount = [sourceFilter !== 'tous', !!dateDebut, !!dateFin, !!montantMin, !!montantMax].filter(Boolean).length;

  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredEngagements, {
    initialPageSize: 25,
    resetKey: [searchTerm, statutFilter, sourceFilter, dateDebut, dateFin, montantMin, montantMax].join('|'),
  });

  const selectionIds = useMemo(() => paginatedItems.map((engagement) => engagement.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);
  const selectedEngagements = useMemo(
    () => paginatedItems.filter((engagement) => selectedIds.has(engagement.id)),
    [paginatedItems, selectedIds]
  );
  const hasBrouillonsSelected = selectedEngagements.some((engagement) => engagement.statut === 'brouillon');

  const {
    snapshotId: snapshotEngagementId,
    snapshotItem: snapshotEngagement,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: engagements,
    getId: (e) => e.id,
    initialId: engagementId,
    onNavigateToId: (id) => navigate(id ? `/app/engagements/${id}` : '/app/engagements'),
    onMissingId: () => navigate('/app/engagements', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotEngagementId);

  const routeEditingEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === routeEditEngagementId),
    [engagements, routeEditEngagementId]
  );

  const selectedReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === initialReservationId),
    [reservations, initialReservationId]
  );

  const handleCreate = useCallback(() => {
    navigate('/app/engagements/create');
  }, [navigate]);

  const handleEdit = useCallback((engagementId: string) => {
    navigate(`/app/engagements/${engagementId}/edit`);
  }, [navigate]);

  const handleSingleSubmit = useCallback(
    async (data: EngagementFormData) => {
      if (routeEditingEngagement) {
        const updated = await updateEngagement({ id: routeEditingEngagement.id, updates: data });
        navigate(`/app/engagements/${updated.id}`);
        return;
      }

      if (initialReservationId) {
        const created = await createEngagementFromReservation({
          reservationId: initialReservationId,
          additionalData: data,
        });
        navigate(`/app/engagements/${created.id}`);
        return;
      }

      const created = await createEngagement(data);
      navigate(`/app/engagements/${created.id}`);
    },
    [routeEditingEngagement, updateEngagement, navigate, initialReservationId, createEngagementFromReservation, createEngagement]
  );

  const handleValider = useCallback((id: string) => {
    setActionEngagementId(id);
    setValidateDialogOpen(true);
  }, []);

  const confirmValider = useCallback(async () => {
    if (!actionEngagementId) return;

    try {
      await validerEngagement(actionEngagementId);
      toast({
        title: 'Engagement validé',
        description: "L'engagement a été validé avec succès.",
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la validation.',
        variant: 'destructive',
      });
    } finally {
      setValidateDialogOpen(false);
      setActionEngagementId(null);
    }
  }, [actionEngagementId, toast, validerEngagement]);

  const handleAnnulationRequest = useCallback((id: string) => {
    setAnnulationEngagementId(id);
    setMotifAnnulation('');
    setAnnulationDialogOpen(true);
  }, []);

  const handleAnnuler = useCallback(
    async (id: string, motif: string) => {
      try {
        await annulerEngagement({ id, motif });
        toast({
          title: 'Engagement annulé',
          description: "L'engagement a été annulé.",
        });
      } catch (error: any) {
        toast({
          title: "Erreur d'annulation",
          description: error.message || "Une erreur est survenue lors de l'annulation.",
          variant: 'destructive',
        });
      }
    },
    [annulerEngagement, toast]
  );

  const handleConfirmMotifAnnulation = useCallback(async () => {
    if (!annulationEngagementId || !motifAnnulation.trim()) return;
    await handleAnnuler(annulationEngagementId, motifAnnulation.trim());
    setAnnulationDialogOpen(false);
    setAnnulationEngagementId(null);
    setMotifAnnulation('');
  }, [annulationEngagementId, handleAnnuler, motifAnnulation]);

  const handleDelete = useCallback((id: string) => {
    setActionEngagementId(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!actionEngagementId) return;

    try {
      await deleteEngagement(actionEngagementId);
      toast({
        title: 'Engagement supprimé',
        description: "L'engagement a été supprimé avec succès.",
      });
    } catch (error: any) {
      toast({
        title: 'Erreur de suppression',
        description: error.message || 'Une erreur est survenue lors de la suppression.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setActionEngagementId(null);
    }
  }, [actionEngagementId, deleteEngagement, toast]);

  const handleCreerBonCommande = useCallback(
    (engagementId: string) => {
      navigate('/app/bons-commande/create', {
        state: { initialEngagementId: engagementId },
      });
    },
    [navigate]
  );

  const handleCreerFacture = useCallback((engagementId: string) => {
    navigate('/app/factures/create', {
      state: { initialEngagementId: engagementId },
    });
  }, [navigate]);

  const handleCreerDepense = useCallback((engagementId: string) => {
    navigate('/app/depenses/create', {
      state: { initialEngagementId: engagementId },
    });
  }, [navigate]);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
      const entityRoutes: Record<string, string> = {
        fournisseur: `/app/fournisseurs/${id}`,
        'ligne-budgetaire': `/app/budgets/${id}?tab=lignes`,
        ligneBudgetaire: `/app/budgets/${id}?tab=lignes`,
        projet: `/app/projets/${id}`,
        reservation: `/app/reservations/${id}`,
        reservationCredit: `/app/reservations/${id}`,
      };

      const route = entityRoutes[type];
      if (route) {
        navigate(route);
        showNavigationToast({
          title: `Navigation vers ${type}`,
          description: 'Vous avez été redirigé',
          targetPage: { name: type, path: route },
          navigate,
        });
      }
    },
    [navigate]
  );

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!snapshotEngagementId) return;

      if (e.key === 'Escape') {
        handleCloseSnapshot();
      } else if (e.key === 'ArrowLeft' && snapshotIndex > 0) {
        handleNavigateSnapshot('prev');
      } else if (e.key === 'ArrowRight' && snapshotIndex < engagements.length - 1) {
        handleNavigateSnapshot('next');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [snapshotEngagementId, snapshotIndex, engagements.length, handleCloseSnapshot, handleNavigateSnapshot]);

  const handleSingleCancel = useCallback(() => {
    if (routeEditEngagementId) {
      navigate(`/app/engagements/${routeEditEngagementId}`);
      return;
    }
    if (initialReservationId) {
      navigate(`/app/reservations/${initialReservationId}`);
      return;
    }
    navigate('/app/engagements');
  }, [initialReservationId, navigate, routeEditEngagementId]);

  const resetAdvancedFilters = useCallback(() => {
    setSourceFilter('tous');
    setDateDebut('');
    setDateFin('');
    setMontantMin('');
    setMontantMax('');
  }, []);

  const handleBatchValider = useCallback(async () => {
    const candidates = selectedEngagements.filter((engagement) => engagement.statut === 'brouillon');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((engagement) => validerEngagement(engagement.id)));
    clearSelection();
  }, [clearSelection, selectedEngagements, validerEngagement]);

  const { guard } = useFocusedEditorGuard({
    active: isEditorMode,
    dirty: isEngagementDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire d’engagement',
    overlayAriaLabel: 'Quitter le formulaire d’engagement',
  });

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Engagements"
        description="Demandes, validations et suivi des engagements"
        stickyHeader={false}
      />
    );
  }

  const editorHeader = isCreateMode
    ? {
        title: 'Nouvel engagement',
        description: selectedReservation
          ? `Créez un engagement à partir de la réservation ${selectedReservation.numero}.`
          : 'Créez un engagement dans un espace de travail dédié.',
      }
    : {
        title: routeEditingEngagement ? `Modifier ${routeEditingEngagement.numero}` : "Modifier l'engagement",
        description: "Éditez l'engagement directement dans l’outlet.",
      };

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Engagements"
      description="Demandes, validations et suivi des engagements"
      sticky={false}
      scrollProgress={snapshotEngagementId ? scrollProgress : 0}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel engagement
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
                  Retour aux engagements
                </Button>
              }
            />

            {isEditMode && !routeEditingEngagement ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Cet engagement est introuvable ou n&apos;est plus accessible depuis la page courante.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/app/engagements')}>
                  Retour à la liste
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <EngagementForm
                    key={`${isCreateMode ? 'create' : routeEditEngagementId || 'unknown'}-${initialReservationId || 'none'}`}
                    engagement={routeEditingEngagement}
                    selectedReservation={selectedReservation}
                    onSubmit={handleSingleSubmit}
                    onCancel={handleSingleCancel}
                    onDirtyChange={setIsEngagementDirty}
                  />
                </CardContent>
              </Card>
            )}
          </>
        ) : isSnapshotOpen && snapshotEngagement ? (
          <div className="space-y-6">
            <EngagementSnapshot
              engagement={snapshotEngagement}
              onClose={handleCloseSnapshot}
              onNavigate={handleNavigateSnapshot}
              hasPrev={snapshotIndex > 0}
              hasNext={snapshotIndex < engagements.length - 1}
              currentIndex={snapshotIndex}
              totalCount={engagements.length}
              onEdit={() => handleEdit(snapshotEngagement.id)}
              onValider={snapshotEngagement.statut === 'brouillon' ? () => handleValider(snapshotEngagement.id) : undefined}
              onCreerBonCommande={
                snapshotEngagement.statut === 'valide' ? () => handleCreerBonCommande(snapshotEngagement.id) : undefined
              }
              onCreerFacture={
                snapshotEngagement.statut === 'valide' || snapshotEngagement.statut === 'engage'
                  ? () => handleCreerFacture(snapshotEngagement.id)
                  : undefined
              }
              onCreerDepense={
                snapshotEngagement.statut === 'valide' || snapshotEngagement.statut === 'engage'
                  ? () => handleCreerDepense(snapshotEngagement.id)
                  : undefined
              }
              onAnnuler={
                snapshotEngagement.statut === 'brouillon' || snapshotEngagement.statut === 'valide'
                  ? () => handleAnnulationRequest(snapshotEngagement.id)
                  : undefined
              }
              onNavigateToEntity={handleNavigateToEntity}
            />
          </div>
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            {!isSnapshotOpen && pageHeaderContent}
            <EngagementStats engagements={engagements} />

            <ListLayout
              title="Liste des engagements"
              description="Recherche, filtres et actions sur les engagements"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel engagement
                  </Button>
                ) : undefined
              }
              toolbar={
                <ListToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par numéro, objet, fournisseur..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[
                          { value: 'tous', label: 'Tous' },
                          { value: 'brouillon', label: 'Brouillon' },
                          { value: 'valide', label: 'Validé' },
                          { value: 'engage', label: 'Engagé' },
                          { value: 'liquide', label: 'Liquidé' },
                          { value: 'annule', label: 'Annulé' },
                        ].map((option) => (
                          <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value as any)}>
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatutFilter('tous')}>Réinitialiser</DropdownMenuItem>
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
                        <Button variant="outline">Actions groupées</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!hasBrouillonsSelected} onClick={handleBatchValider}>
                          Valider les brouillons
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
                      <Label>Source</Label>
                      <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tous">Toutes les sources</SelectItem>
                          <SelectItem value="reservation">Depuis réservation</SelectItem>
                          <SelectItem value="direct">Sans réservation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="engagement-date-debut">Date début</Label>
                      <Input id="engagement-date-debut" type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="engagement-date-fin">Date fin</Label>
                      <Input id="engagement-date-fin" type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Montant</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min" value={montantMin} onChange={(event) => setMontantMin(event.target.value)} />
                        <Input type="number" placeholder="Max" value={montantMax} onChange={(event) => setMontantMax(event.target.value)} />
                      </div>
                    </div>
                  </div>
                </AdvancedFiltersPanel>
              }
            >
              <EngagementTable
                engagements={paginatedItems}
                onEdit={handleEdit}
                onValider={handleValider}
                onAnnuler={handleAnnulationRequest}
                onDelete={handleDelete}
                onCreerBonCommande={handleCreerBonCommande}
                onCreerFacture={handleCreerFacture}
                onCreerDepense={handleCreerDepense}
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
                    onPageChange={goToPage}
                    onPageSizeChange={setPageSize}
                    isLoading={isLoading}
                    itemLabel="engagements"
                    showKeyboardHint
                  />
                }
              />
            </ListLayout>
          </>
        )}
      </div>

      <AlertDialog
        open={annulationDialogOpen}
        onOpenChange={(open) => {
          setAnnulationDialogOpen(open);
          if (!open) {
            setAnnulationEngagementId(null);
            setMotifAnnulation('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler l&apos;engagement</AlertDialogTitle>
            <AlertDialogDescription>Veuillez indiquer le motif d&apos;annulation de cet engagement.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motif-engagement">Motif d&apos;annulation</Label>
            <Input
              id="motif-engagement"
              value={motifAnnulation}
              onChange={(event) => setMotifAnnulation(event.target.value)}
              placeholder="Ex: réaffectation budgétaire, erreur de saisie..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMotifAnnulation}
              disabled={!motifAnnulation.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cet engagement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action confirmera l'engagement et permettra la création de bons de commande. L'engagement ne pourra plus être modifié
              après validation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmValider}>Valider l'engagement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet engagement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'engagement et toutes ses données associées seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
};

export default Engagements;
