import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
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
import type { ReservationCredit } from '@/types/reservation.types';

const Reservations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationCredit | undefined>();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAnnulation, setPendingAnnulation] = useState<{ id: string; motif: string; engagements: any[] } | null>(null);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [pendingSuppression, setPendingSuppression] = useState<{ id: string; engagements: any[] } | null>(null);
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [reservationSourceId, setReservationSourceId] = useState<string | null>(null);
  const [selectedReservationForDepense, setSelectedReservationForDepense] = useState<ReservationCredit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'active' | 'utilisee' | 'annulee' | 'expiree'>('tous');
  const navigate = useNavigate();
  const { reservationId } = useParams<{ reservationId?: string }>();
  const { toast } = useToast();
  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([statutFilter]);
  
  const {
    reservations,
    isLoading,
    createReservation,
    updateReservation,
    utiliserReservation,
    annulerReservation,
    deleteReservation,
  } = useReservations();

  const { createEngagementFromReservation, annulerEngagement, deleteEngagement } = useEngagements();
  const { createDepenseFromReservation } = useDepenses();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();

  const handleCreate = () => {
    setSelectedReservation(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (reservation: ReservationCredit) => {
    setSelectedReservation(reservation);
    setDialogOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedReservation) {
        await updateReservation({ id: selectedReservation.id, updates: data });
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
  };

  const handleCreerEngagement = (reservation: ReservationCredit) => {
    setReservationSourceId(reservation.id);
    setEngagementDialogOpen(true);
  };

  const handleCreerDepenseUrgence = (reservation: ReservationCredit) => {
    setSelectedReservationForDepense(reservation);
  };

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

  // Synchroniser l'URL avec l'état du snapshot
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
    isLoadingItems: isLoading,
  });

  const scrollProgress = useScrollProgress(!!snapshotReservationId);

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

  const handleSaveEngagement = async (data: any) => {
    try {
      const reservation = reservations.find(r => r.id === reservationSourceId);
      
      await createEngagementFromReservation({ 
        reservationId: reservationSourceId!,
        additionalData: data 
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
  };

  const handleAnnuler = async (id: string, motif: string) => {
    // Trouver la réservation et vérifier les engagements actifs
    const reservation = reservations.find(r => r.id === id);
    const engagementsActifs = reservation?.engagements?.filter(
      e => e.statut !== 'annule'
    ) || [];

    if (engagementsActifs.length > 0) {
      // Afficher le dialogue de confirmation
      setPendingAnnulation({ id, motif, engagements: engagementsActifs });
      setConfirmDialogOpen(true);
    } else {
      // Annulation directe sans engagements
      await executeAnnulation(id, motif, []);
    }
  };

  const executeAnnulation = async (id: string, motif: string, engagements: any[]) => {
    try {
      // Annuler d'abord tous les engagements liés
      for (const engagement of engagements) {
        await annulerEngagement({ 
          id: engagement.id, 
          motif: `Annulation automatique suite à l'annulation de la réservation - ${motif}` 
        });
      }

      // Puis annuler la réservation
      await annulerReservation({ id, motif });
      
      toast({
        title: 'Réservation annulée',
        description: engagements.length > 0 
          ? `La réservation et ${engagements.length} engagement(s) ont été annulés.`
          : 'La réservation a été annulée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'annulation.',
        variant: 'destructive',
      });
    }
  };

  const handleAnnulerFromSnapshot = useCallback(
    (id: string) => {
      const motif = prompt("Motif d'annulation :");
      if (motif) {
        handleAnnuler(id, motif);
      }
    },
    [handleAnnuler]
  );

  const confirmCascadeAnnulation = async () => {
    if (pendingAnnulation) {
      await executeAnnulation(
        pendingAnnulation.id, 
        pendingAnnulation.motif, 
        pendingAnnulation.engagements
      );
      setConfirmDialogOpen(false);
      setPendingAnnulation(null);
    }
  };

  const handleDelete = async (id: string) => {
    // Trouver la réservation et vérifier les engagements actifs
    const reservation = reservations.find(r => r.id === id);
    const engagementsActifs = reservation?.engagements?.filter(
      e => e.statut !== 'annule'
    ) || [];

    if (engagementsActifs.length > 0) {
      // Afficher le dialogue de confirmation de suppression
      setPendingSuppression({ id, engagements: engagementsActifs });
      setConfirmDeleteDialogOpen(true);
    } else {
      // Suppression directe sans engagements
      await executeSuppression(id, []);
    }
  };

  const executeSuppression = async (id: string, engagements: any[]) => {
    try {
      // Supprimer d'abord tous les engagements liés
      for (const engagement of engagements) {
        await deleteEngagement(engagement.id);
      }

      // Puis supprimer la réservation
      await deleteReservation(id);
      
      toast({
        title: 'Réservation supprimée',
        description: engagements.length > 0 
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
  };

  const confirmCascadeSuppression = async () => {
    if (pendingSuppression) {
      await executeSuppression(
        pendingSuppression.id, 
        pendingSuppression.engagements
      );
      setConfirmDeleteDialogOpen(false);
      setPendingSuppression(null);
    }
  };

  if (isLoading) {
    return (
      <ListPageLoading
        title="Réservation de Crédits"
        description="Blocage préalable avec traçabilité complète"
        stickyHeader={false}
      />
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <style>{CTA_REVEAL_STYLES}</style>
      {!isSnapshotOpen && (
        <PageHeader
          title="Réservation de Crédits"
          description="Blocage préalable avec traçabilité complète"
          scrollProgress={scrollProgress}
          actions={
            <Button onClick={handleCreate} ref={headerCtaRef}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Button>
          }
        />
      )}

      {isSnapshotOpen && snapshotReservation ? (
        <div className={`flex-1 overflow-y-auto p-8 ${isSnapshotOpen ? 'pt-0' : 'pt-6'} space-y-6`}>
          <ReservationSnapshot
            reservation={snapshotReservation}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < reservations.length - 1}
            currentIndex={snapshotIndex}
            totalCount={reservations.length}
            onCreerEngagement={() => handleCreerEngagement(snapshotReservation)}
            onCreerDepenseUrgence={() => handleCreerDepenseUrgence(snapshotReservation)}
            onAnnuler={() => handleAnnulerFromSnapshot(snapshotReservation.id)}
            onNavigateToEntity={handleNavigateToEntity}
          />
        </div>
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-6">
          <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement du snapshot...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 pt-0 space-y-6">
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
                      <Button variant="outline">
                        Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {[
                        { value: 'tous', label: 'Tous' },
                        { value: 'active', label: 'Active' },
                        { value: 'utilisee', label: 'Utilisée' },
                        { value: 'annulee', label: 'Annulée' },
                        { value: 'expiree', label: 'Expirée' },
                      ].map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setStatutFilter(option.value as any)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setStatutFilter('tous')}>
                        Réinitialiser
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>,
                ]}
              />
            }
          >
            <div className="space-y-6 p-6 pt-2">
              <ReservationStats reservations={reservations} />

              <ReservationTable
                reservations={filteredReservations}
                onEdit={handleEdit}
                onCreerEngagement={handleCreerEngagement}
                onAnnuler={handleAnnuler}
                onDelete={handleDelete}
                onCreerDepenseUrgence={handleCreerDepenseUrgence}
                onViewDetails={handleOpenSnapshot}
              />
            </div>
          </ListLayout>
        </div>
      )}

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        reservation={selectedReservation}
      />

      <EngagementDialog
        open={engagementDialogOpen}
        onOpenChange={(open) => {
          setEngagementDialogOpen(open);
          if (!open) setReservationSourceId(null);
        }}
        onSave={handleSaveEngagement}
        reservation={reservations.find(r => r.id === reservationSourceId)}
      />

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annulation en cascade</AlertDialogTitle>
            <AlertDialogDescription>
              Cette réservation a {pendingAnnulation?.engagements.length} engagement(s) actif(s).
              <br /><br />
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
            <AlertDialogCancel onClick={() => setPendingAnnulation(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCascadeAnnulation}>
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suppression en cascade</AlertDialogTitle>
            <AlertDialogDescription>
              Cette réservation a {pendingSuppression?.engagements.length} engagement(s) actif(s).
              <br /><br />
              <strong>Les engagements suivants seront également supprimés (suppression définitive) :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {pendingSuppression?.engagements.map((eng) => (
                  <li key={eng.id} className="text-sm">
                    {eng.numero} - {eng.montant.toLocaleString()} ({eng.statut})
                  </li>
                ))}
              </ul>
              <br />
              <strong className="text-destructive">Attention :</strong> Cette action est irréversible. Les données seront perdues définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSuppression(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCascadeSuppression} className="bg-destructive hover:bg-destructive/90">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateDepenseUrgenceFromReservationDialog
        open={!!selectedReservationForDepense}
        onOpenChange={(open) => !open && setSelectedReservationForDepense(null)}
        reservation={selectedReservationForDepense}
        onSave={async (data) => {
          try {
            const reservation = selectedReservationForDepense;
            await createDepenseFromReservation(data);
            
            setSelectedReservationForDepense(null);
            
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
