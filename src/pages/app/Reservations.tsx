import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { ReservationTable } from '@/components/reservations/ReservationTable';
import { ReservationStats } from '@/components/reservations/ReservationStats';
import { useReservations } from '@/hooks/useReservations';
import { useEngagements } from '@/hooks/useEngagements';
import { useToast } from '@/hooks/use-toast';
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
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    reservations,
    isLoading,
    createReservation,
    updateReservation,
    utiliserReservation,
    annulerReservation,
    deleteReservation,
  } = useReservations();

  const { annulerEngagement } = useEngagements();

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
    navigate(`/app/engagements?from_reservation=${reservation.id}`);
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
      // Annuler d'abord tous les engagements liés
      for (const engagement of engagements) {
        await annulerEngagement({ 
          id: engagement.id, 
          motif: 'Annulation automatique suite à la suppression de la réservation' 
        });
      }

      // Puis supprimer la réservation
      await deleteReservation(id);
      
      toast({
        title: 'Réservation supprimée',
        description: engagements.length > 0 
          ? `La réservation et ${engagements.length} engagement(s) ont été annulés puis supprimés.`
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Réservation de Crédits"
        description="Blocage préalable avec traçabilité complète"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle réservation
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
        <ReservationStats reservations={reservations} />

        <Card className="p-6">
          <ReservationTable
            reservations={reservations}
            onEdit={handleEdit}
            onCreerEngagement={handleCreerEngagement}
            onAnnuler={handleAnnuler}
            onDelete={handleDelete}
          />
        </Card>
      </div>

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        reservation={selectedReservation}
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
                    {eng.numero} - {eng.montant.toLocaleString()} FCFA ({eng.statut})
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
              <strong>Les engagements suivants seront annulés avant la suppression :</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                {pendingSuppression?.engagements.map((eng) => (
                  <li key={eng.id} className="text-sm">
                    {eng.numero} - {eng.montant.toLocaleString()} FCFA ({eng.statut})
                  </li>
                ))}
              </ul>
              <br />
              <strong className="text-destructive">Attention :</strong> Cette action est irréversible.
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
    </div>
  );
};

export default Reservations;
