import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { ReservationTable } from '@/components/reservations/ReservationTable';
import { ReservationStats } from '@/components/reservations/ReservationStats';
import { EngagementDialog } from '@/components/engagements/EngagementDialog';
import { ReservationSnapshot } from '@/components/reservations/ReservationSnapshot';
import { useReservations } from '@/hooks/useReservations';
import { useEngagements } from '@/hooks/useEngagements';
import { useDepenses } from '@/hooks/useDepenses';
import { useToast } from '@/hooks/use-toast';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { showNavigationToast } from '@/lib/navigation-toast';
import { CreateDepenseUrgenceFromReservationDialog } from '@/components/depenses/CreateDepenseUrgenceFromReservationDialog';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | undefined>();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnnulation, setPendingAnnulation] = useState<{ id: string; motif: string; engagements: any[] } | null>(
    null
  );
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [pendingSuppression, setPendingSuppression] = useState<{ id: string; engagements: any[] } | null>(null);
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [reservationSourceId, setReservationSourceId] = useState<string | null>(null);
  const [reservationForDepenseId, setReservationForDepenseId] = useState<string | null>(null);
  const [annulationDialogOpen, setAnnulationDialogOpen] = useState(false);
  const [annulationReservationId, setAnnulationReservationId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'active' | 'utilisee' | 'annulee' | 'expiree'>('tous');
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId?: string }>();
  const { toast } = useToast();

  const { reservations, isLoading, createReservation, updateReservation, annulerReservation, deleteReservation } =
    useReservations();
  const { createEngagementFromReservation, annulerEngagement, deleteEngagement } = useEngagements();
  const { createDepenseFromReservation } = useDepenses();

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
      .filter((reservation) => {
        if (!term) return true;
        return (
          reservation.numero.toLowerCase().includes(term) ||
          reservation.objet.toLowerCase().includes(term) ||
          reservation.beneficiaire?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.dateReservation).getTime() - new Date(a.dateReservation).getTime());
  }, [reservations, statutFilter, searchTerm]);

  const editingReservation = useMemo(
    () => reservations.find((reservation) => reservation.id === editingReservationId),
    [editingReservationId, reservations]
  );

  const reservationSource = useMemo(
    () => reservations.find((reservation) => reservation.id === reservationSourceId),
    [reservationSourceId, reservations]
  );

  const reservationForDepense = useMemo(
    () => reservations.find((reservation) => reservation.id === reservationForDepenseId) || null,
    [reservationForDepenseId, reservations]
  );

  const handleCreate = useCallback(() => {
    setEditingReservationId(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingReservationId(undefined);
    }
  }, []);

  const handleEdit = useCallback((reservationId: string) => {
    setEditingReservationId(reservationId);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(
    async (data: ReservationCreditFormData) => {
      try {
        if (editingReservationId) {
          await updateReservation({ id: editingReservationId, updates: data });
          toast({
            title: 'Réservation modifiée',
            description: 'La réservation a été modifiée avec succès.',
          });
        } else {
          await createReservation(data);
          toast({
            title: 'Réservation créée',
            description: 'La réservation a été créée avec succès.',
          });
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
    [createReservation, editingReservationId, toast, updateReservation]
  );

  const handleCreerEngagement = useCallback((reservationId: string) => {
    setReservationSourceId(reservationId);
    setEngagementDialogOpen(true);
  }, []);

  const handleCreerDepenseUrgence = useCallback((reservationId: string) => {
    setReservationForDepenseId(reservationId);
  }, []);

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

  const handleSaveEngagement = useCallback(
    async (data: any) => {
      try {
        const reservation = reservations.find((r) => r.id === reservationSourceId);

        await createEngagementFromReservation({
          reservationId: reservationSourceId!,
          additionalData: data,
        });

        setEngagementDialogOpen(false);
        setReservationSourceId(null);

        showNavigationToast({
          title: 'Engagement créé',
          description: `L'engagement a été créé depuis la réservation ${reservation?.numero || ''}.`,
          targetPage: {
            name: 'Engagements',
            path: '/app/engagements',
          },
          navigate,
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Une erreur est survenue lors de la création.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [createEngagementFromReservation, navigate, reservationSourceId, reservations, toast]
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

  if (isLoading) {
    return (
      <ListPageLoading
        title="Réservation de Crédits"
        description="Blocage préalable avec traçabilité complète"
        stickyHeader={false}
      />
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
    <div className="space-y-6">
      <style>{CTA_REVEAL_STYLES}</style>
      {!isSnapshotOpen && pageHeaderContent}

      {isSnapshotOpen && snapshotReservation ? (
        <div className="px-8 space-y-6">
          <ReservationSnapshot
            reservation={snapshotReservation}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < reservations.length - 1}
            currentIndex={snapshotIndex}
            totalCount={reservations.length}
            onCreerEngagement={() => handleCreerEngagement(snapshotReservation.id)}
            onCreerDepenseUrgence={() => handleCreerDepenseUrgence(snapshotReservation.id)}
            onAnnuler={() => handleAnnulerFromSnapshot(snapshotReservation.id)}
            onNavigateToEntity={handleNavigateToEntity}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="px-8 py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
      ) : (
        <div className="px-8 space-y-6">
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
                        { value: 'utilisee', label: 'Utilisée' },
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
                ]}
              />
            }
          >
            <ReservationTable
              reservations={filteredReservations}
              onEdit={handleEdit}
              onCreerEngagement={handleCreerEngagement}
              onAnnuler={handleAnnulationRequest}
              onDelete={handleDelete}
              onCreerDepenseUrgence={handleCreerDepenseUrgence}
              onViewDetails={handleOpenSnapshot}
              stickyHeader
              stickyHeaderOffset={0}
              scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
            />
          </ListLayout>
        </div>
      )}

      <ReservationDialog open={dialogOpen} onOpenChange={handleDialogOpenChange} onSave={handleSave} reservation={editingReservation} />

      <EngagementDialog
        open={engagementDialogOpen}
        onOpenChange={(open) => {
          setEngagementDialogOpen(open);
          if (!open) setReservationSourceId(null);
        }}
        onSave={handleSaveEngagement}
        reservation={reservationSource}
      />

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

      <CreateDepenseUrgenceFromReservationDialog
        open={!!reservationForDepense}
        onOpenChange={(open) => !open && setReservationForDepenseId(null)}
        reservation={reservationForDepense}
        onSave={async (data) => {
          try {
            const reservation = reservationForDepense;
            await createDepenseFromReservation(data);

            setReservationForDepenseId(null);

            showNavigationToast({
              title: 'Dépense urgente créée',
              description: `La dépense d'urgence a été créée depuis la réservation ${reservation?.numero || ''}.`,
              targetPage: {
                name: 'Dépenses',
                path: '/app/depenses',
              },
              navigate,
            });
          } catch (error) {
            console.error('Erreur création dépense urgente:', error);
          }
        }}
      />
    </div>
  );
};

export default Reservations;
