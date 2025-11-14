import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EngagementDialog } from '@/components/engagements/EngagementDialog';
import { EngagementTable } from '@/components/engagements/EngagementTable';
import { EngagementStats } from '@/components/engagements/EngagementStats';
import { useEngagements } from '@/hooks/useEngagements';
import { useReservations } from '@/hooks/useReservations';
import { useToast } from '@/hooks/use-toast';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';

const Engagements = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | undefined>();
  const [selectedReservation, setSelectedReservation] = useState<ReservationCredit | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  // Gérer la création depuis une réservation via query param
  useEffect(() => {
    const reservationId = searchParams.get('from_reservation');
    if (reservationId && reservations.length > 0 && !dialogOpen) {
      const reservation = reservations.find(r => r.id === reservationId);
      if (reservation && reservation.statut === 'active') {
        setSelectedReservation(reservation);
        setDialogOpen(true);
        setSearchParams({});
      }
    }
  }, [searchParams, reservations, dialogOpen, setSearchParams]);

  const handleCreate = () => {
    setSelectedEngagement(undefined);
    setSelectedReservation(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (engagement: Engagement) => {
    setSelectedEngagement(engagement);
    setSelectedReservation(undefined);
    setDialogOpen(true);
  };

  const handleSave = async (data: EngagementFormData) => {
    try {
      if (selectedEngagement) {
        await updateEngagement({ id: selectedEngagement.id, updates: data });
        toast({
          title: 'Engagement modifié',
          description: 'L\'engagement a été modifié avec succès.',
        });
      } else if (selectedReservation) {
        await createEngagementFromReservation({ 
          reservationId: selectedReservation.id, 
          additionalData: data 
        });
        toast({
          title: 'Engagement créé',
          description: `L'engagement a été créé depuis la réservation ${selectedReservation.numero}.`,
        });
      } else {
        await createEngagement(data);
        toast({
          title: 'Engagement créé',
          description: 'L\'engagement a été créé avec succès.',
        });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleValider = async (id: string) => {
    if (!confirm('Confirmer la validation de cet engagement ?')) return;
    
    try {
      await validerEngagement(id);
      toast({
        title: 'Engagement validé',
        description: 'L\'engagement a été validé avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la validation.',
        variant: 'destructive',
      });
    }
  };

  const handleAnnuler = async (id: string, motif: string) => {
    try {
      await annulerEngagement({ id, motif });
      toast({
        title: 'Engagement annulé',
        description: 'L\'engagement a été annulé.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'annulation.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Confirmer la suppression de cet engagement ?')) return;
    
    try {
      await deleteEngagement(id);
      toast({
        title: 'Engagement supprimé',
        description: 'L\'engagement a été supprimé avec succès.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur de suppression',
        description: error.message || 'Une erreur est survenue lors de la suppression.',
        variant: 'destructive',
      });
    }
  };

  const handleCreerBonCommande = (engagement: Engagement) => {
    navigate(`/app/bons-commande?from_engagement=${engagement.id}`);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedEngagement(undefined);
      setSelectedReservation(undefined);
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
        title="Gestion des Engagements"
        description="Demandes, validations et suivi des engagements"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel engagement
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6">
        <EngagementStats engagements={engagements} />

        <Card className="p-6">
        <EngagementTable
          engagements={engagements}
          onEdit={handleEdit}
          onValider={handleValider}
          onAnnuler={handleAnnuler}
          onDelete={handleDelete}
          onCreerBonCommande={handleCreerBonCommande}
        />
        </Card>
      </div>

      <EngagementDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        engagement={selectedEngagement}
        reservation={selectedReservation}
      />
    </div>
  );
};

export default Engagements;
