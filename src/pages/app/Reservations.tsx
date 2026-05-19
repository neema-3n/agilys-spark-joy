import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ReservationForm } from '@/components/reservations/ReservationForm';
import { ReservationTable } from '@/components/reservations/ReservationTable';
import { ReservationStats } from '@/components/reservations/ReservationStats';
import { ReservationSnapshot } from '@/components/reservations/ReservationSnapshot';
import { useReservations } from '@/hooks/useReservations';
import { useEngagements } from '@/hooks/useEngagements';
import { useToast } from '@/hooks/use-toast';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { useClientPagination } from '@/hooks/useClientPagination';
import { useListSelection } from '@/hooks/useListSelection';
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
import type { ReservationCreditFormData } from '@/types/reservation.types';

const Reservations = () => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnnulation, setPendingAnnulation] = useState<{ id: string; motif: string; engagements: any[] } | null>(
    null
  );
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [pendingSuppression, setPendingSuppression] = useState<{ id: string; engagements: any[] } | null>(null);
  const [annulationDialogOpen, setAnnulationDialogOpen] = useState(false);
  const [annulationReservationId, setAnnulationReservationId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'brouillon' | 'active' | 'convertie' | 'annulee' | 'expiree'>('tous');
  const [isReservationDirty, setIsReservationDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId?: string }>();
  const isCreateRoute = !!useMatch('/app/reservations/create');
  const isEditRoute = !!useMatch('/app/reservations/:reservationId/edit');
  const { toast } = useToast();

  const { reservations, isLoading, createReservation, updateReservation, annulerReservation, deleteReservation } =
    useReservations();
  const { annulerEngagement, deleteEngagement } = useEngagements();

  const {
    snapshotId: snapshotReservationId,
    snapshotItem: snapshotReservation,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: reservations,
    getId: (r) => r.id,
    initialId: reservationId,
    onNavigateToId: (id) => navigate(id ? `/app/reservations/${id}` : '/app/reservations'),
    onMissingId: () => navigate('/app/reservations', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotReservationId);

  const filteredReservations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return reservations
      .filter((reservation) => (statutFilter === 'tous' ? true : reservation.statut === statutFilter))
      .filter((reservation) => (!dateDebut ? true : reservation.dateReservation >= dateDebut))
      .filter((reservation) => (!dateFin ? true : reservation.dateReservation <= dateFin))
      .filter((reservation) => (!montantMin ? true : reservation.montant >= Number(montantMin)))
      .filter((reservation) => (!montantMax ? true : reservation.montant <= Number(montantMax)))
      .filter((reservation) => {
        if (!term) return true;
        return (
          reservation.numero.toLowerCase().includes(term) ||
          reservation.objet.toLowerCase().includes(term) ||
          reservation.beneficiaire?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime());
  }, [dateDebut, dateFin, montantMax, montantMin, reservations, statutFilter, searchTerm]);

  const activeAdvancedFiltersCount = [!!dateDebut, !!dateFin, !!montantMin, !!montantMax].filter(Boolean).length;

  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredReservations, {
    initialPageSize: 25,
    resetKey: [searchTerm, statutFilter, dateDebut, dateFin, montantMin, montantMax].join('|'),
  });

  const selectionIds = useMemo(() => paginatedItems.map((reservation) => reservation.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const editingReservation = useMemo(
    () => (isEditRoute && reservationId ? reservations.find((reservation) => reservation.id === reservationId) : undefined),
    [isEditRoute, reservationId, reservations]
  );

  const handleCreate = useCallback(() => {
    navigate('/app/reservations/create');
  }, []);

  const handleEdit = useCallback((reservationId: string) => {
    navigate(`/app/reservations/${reservationId}/edit`);
  }, [navigate]);

  const handleSave = useCallback(
    async (data: ReservationCreditFormData) => {
      try {
        if (editingReservation) {
          const updated = await updateReservation({ id: editingReservation.id, updates: data });
          toast({
            title: 'Réservation modifiée',
            description: 'La réservation a été modifiée avec succès.',
          });
          navigate(`/app/reservations/${updated.id}`);
        } else {
          const created = await createReservation(data);
          toast({
            title: 'Réservation créée',
            description: 'La réservation a été créée avec succès.',
          });
          navigate(`/app/reservations/${created.id}`);
        }
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la sauvegarde.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [createReservation, editingReservation, navigate, toast, updateReservation]
  );

  const handleSingleCancel = useCallback(() => {
    if (editingReservation) {
      navigate(`/app/reservations/${editingReservation.id}`);
      return;
    }

    navigate('/app/reservations');
  }, [editingReservation, navigate]);

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isReservationDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de réservation',
    overlayAriaLabel: 'Quitter le formulaire de réservation',
  });

  const handleCreerEngagement = useCallback((reservationId: string) => {
    navigate('/app/engagements/create', {
      state: { initialReservationId: reservationId },
    });
  }, [navigate]);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
      switch (type) {
        case 'engagement':
          navigate(`/app/engagements/${id}`);
          break;
        case 'ligne-budgetaire':
          navigate(`/app/budgets/${id}?tab=lignes`);
          break;
        case 'projet':
          navigate(`/app/projets/${id}`);
          break;
      }
    },
    [navigate]
  );

  const executeAnnulation = useCallback(
    async (id: string, motif: string, engagements: any[]) => {
      try {
        for (const engagement of engagements) {
          await annulerEngagement({
            id: engagement.id,
            motif: `Annulation automatique suite à l'annulation de la réservation - ${motif}`,
          });
        }

        await annulerReservation({ id, motif });

        toast({
          title: 'Réservation annulée',
          description:
            engagements.length > 0
              ? `La réservation et ${engagements.length} engagement(s) ont été annulés.`
              : 'La réservation a été annulée.',
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: "Une erreur est survenue lors de l'annulation.",
          variant: 'destructive',
        });
      }
    },
    [annulerEngagement, annulerReservation, toast]
  );

  const handleAnnuler = useCallback(
    async (id: string, motif: string) => {
      const reservation = reservations.find((r) => r.id === id);
      const engagementsActifs = reservation?.engagements?.filter((eng) => eng.statut !== 'annule') || [];

      if (engagementsActifs.length > 0) {
        setPendingAnnulation({ id, motif, engagements: engagementsActifs });
        setConfirmDialogOpen(true);
      } else {
        await executeAnnulation(id, motif, []);
      }
    },
    [executeAnnulation, reservations]
  );

  const handleAnnulationRequest = useCallback((id: string) => {
    setAnnulationReservationId(id);
    setMotifAnnulation('');
    setAnnulationDialogOpen(true);
  }, []);

  const confirmCascadeAnnulation = useCallback(async () => {
    if (pendingAnnulation) {
      await executeAnnulation(pendingAnnulation.id, pendingAnnulation.motif, pendingAnnulation.engagements);
      setConfirmDialogOpen(false);
      setPendingAnnulation(null);
    }
  }, [executeAnnulation, pendingAnnulation]);

  const executeSuppression = useCallback(
    async (id: string, engagements: any[]) => {
      try {
        for (const engagement of engagements) {
          await deleteEngagement(engagement.id);
        }

        await deleteReservation(id);

        toast({
          title: 'Réservation supprimée',
          description:
            engagements.length > 0
              ? `La réservation et ${engagements.length} engagement(s) ont été supprimés.`
              : 'La réservation a été supprimée.',
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la suppression.',
          variant: 'destructive',
        });
      }
    },
    [deleteEngagement, deleteReservation, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const reservation = reservations.find((r) => r.id === id);
      const engagementsActifs = reservation?.engagements?.filter((eng) => eng.statut !== 'annule') || [];

      if (engagementsActifs.length > 0) {
        setPendingSuppression({ id, engagements: engagementsActifs });
        setConfirmDeleteDialogOpen(true);
      } else {
        await executeSuppression(id, []);
      }
    },
    [executeSuppression, reservations]
  );

  const confirmCascadeSuppression = useCallback(async () => {
    if (pendingSuppression) {
      await executeSuppression(pendingSuppression.id, pendingSuppression.engagements);
      setConfirmDeleteDialogOpen(false);
      setPendingSuppression(null);
    }
  }, [executeSuppression, pendingSuppression]);

  const handleAnnulerFromSnapshot = useCallback(
    (id: string) => {
      handleAnnulationRequest(id);
    },
    [handleAnnulationRequest]
  );

  const handleConfirmMotifAnnulation = useCallback(async () => {
    if (!annulationReservationId || !motifAnnulation.trim()) return;
    await handleAnnuler(annulationReservationId, motifAnnulation.trim());
    setAnnulationDialogOpen(false);
    setAnnulationReservationId(null);
    setMotifAnnulation('');
  }, [annulationReservationId, handleAnnuler, motifAnnulation]);

  const resetAdvancedFilters = useCallback(() => {
    setDateDebut('');
    setDateFin('');
    setMontantMin('');
    setMontantMax('');
  }, []);

  if (isLoading) {
    return (
      <ListPageLoading
        title="Réservation de Crédits"
        description="Blocage préalable avec traçabilité complète"
        stickyHeader={false}
      />
    );
  }

  if ((isCreateRoute || isEditRoute) && isEditRoute && reservationId && !editingReservation) {
    return (
      <ListPageLoading
        title="Réservation de Crédits"
        description="Blocage préalable avec traçabilité complète"
        stickyHeader={false}
      />
    );
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
          description="Créez ou modifiez une réservation de crédits dans un espace de travail dédié."
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux réservations
            </Button>
          }
        />

        <ReservationForm
          reservation={editingReservation}
          onSubmit={handleSave}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsReservationDirty}
        />
      </div>
    );
  }

  const pageHeaderContent = (
    <PageHeader
      title="Réservation de Crédits"
      description="Blocage préalable avec traçabilité complète"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réservation
        </Button>
      }
    />
  );

  return (
    <>
      <style>{CTA_REVEAL_STYLES}</style>
      <div className="space-y-6">
      {!isSnapshotOpen && pageHeaderContent}

      {isSnapshotOpen && snapshotReservation ? (
        <div className="space-y-6">
          <ReservationSnapshot
            reservation={snapshotReservation}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < reservations.length - 1}
            currentIndex={snapshotIndex}
            totalCount={reservations.length}
            onCreerEngagement={() => handleCreerEngagement(snapshotReservation.id)}
            onAnnuler={() => handleAnnulerFromSnapshot(snapshotReservation.id)}
            onNavigateToEntity={handleNavigateToEntity}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
      ) : (
        <div className="space-y-6">
          <ReservationStats reservations={reservations} />

          <ListLayout
            title="Liste des réservations"
            description="Recherche, filtres et actions sur les réservations de crédits"
            actions={
              !isHeaderCtaVisible ? (
                <Button onClick={handleCreate} className="sticky-cta-appear">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle réservation
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
                      <Button variant="outline">Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {[
                        { value: 'tous', label: 'Tous' },
                        { value: 'active', label: 'Active' },
                        { value: 'brouillon', label: 'Brouillon' },
                        { value: 'convertie', label: 'Convertie' },
                        { value: 'annulee', label: 'Annulée' },
                        { value: 'expiree', label: 'Expirée' },
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reservation-date-debut">Date début</Label>
                    <Input id="reservation-date-debut" type="date" value={dateDebut} onChange={(event) => setDateDebut(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation-date-fin">Date fin</Label>
                    <Input id="reservation-date-fin" type="date" value={dateFin} onChange={(event) => setDateFin(event.target.value)} />
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
            <ReservationTable
              reservations={paginatedItems}
              onEdit={handleEdit}
              onCreerEngagement={handleCreerEngagement}
              onAnnuler={handleAnnulationRequest}
              onDelete={handleDelete}
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
                  itemLabel="réservations"
                  showKeyboardHint
                />
              }
            />
          </ListLayout>
        </div>
      )}

      <AlertDialog
        open={annulationDialogOpen}
        onOpenChange={(open) => {
          setAnnulationDialogOpen(open);
          if (!open) {
            setAnnulationReservationId(null);
            setMotifAnnulation('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réservation</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez indiquer le motif d&apos;annulation de cette réservation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motif-reservation">Motif d&apos;annulation</Label>
            <Input
              id="motif-reservation"
              value={motifAnnulation}
              onChange={(event) => setMotifAnnulation(event.target.value)}
              placeholder="Ex: Réaffectation du budget, erreur de saisie..."
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

      <AlertDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) setPendingAnnulation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulation en cascade</AlertDialogTitle>
            <AlertDialogDescription>
              Cette réservation a {pendingAnnulation?.engagements.length} engagement(s) actif(s).
              <br />
              <br />
              <strong>Les engagements suivants seront également annulés :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {pendingAnnulation?.engagements.map((eng) => (
                  <li key={eng.id} className="text-sm">
                    {eng.numero} - {eng.montant.toLocaleString()} ({eng.statut})
                  </li>
                ))}
              </ul>
              <br />
              Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAnnulation(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCascadeAnnulation}>Confirmer l&apos;annulation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeleteDialogOpen}
        onOpenChange={(open) => {
          setConfirmDeleteDialogOpen(open);
          if (!open) setPendingSuppression(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suppression en cascade</AlertDialogTitle>
            <AlertDialogDescription>
              Cette réservation a {pendingSuppression?.engagements.length} engagement(s) actif(s).
              <br />
              <br />
              <strong>Les engagements suivants seront également supprimés (suppression définitive) :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {pendingSuppression?.engagements.map((eng) => (
                  <li key={eng.id} className="text-sm">
                    {eng.numero} - {eng.montant.toLocaleString()} ({eng.statut})
                  </li>
                ))}
              </ul>
              <br />
              <strong className="text-destructive">Attention :</strong> Cette action est irréversible. Les données seront
              perdues définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSuppression(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCascadeSuppression} className="bg-destructive hover:bg-destructive/90">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
};

export default Reservations;
