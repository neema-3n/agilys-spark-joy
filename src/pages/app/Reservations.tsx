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
import { useToast } from '@/hooks/use-toast';
import type { ReservationCredit } from '@/types/reservation.types';

const Reservations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationCredit | undefined>();
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
    try {
      await annulerReservation({ id, motif });
      toast({
        title: 'Réservation annulée',
        description: 'La réservation a été annulée.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation(id);
      toast({
        title: 'Réservation supprimée',
        description: 'La réservation a été supprimée avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        variant: 'destructive',
      });
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
    </div>
  );
};

export default Reservations;
