import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EngagementDialog } from '@/components/engagements/EngagementDialog';
import { EngagementTable } from '@/components/engagements/EngagementTable';
import { EngagementStats } from '@/components/engagements/EngagementStats';
import { BonCommandeDialog } from '@/components/bonsCommande/BonCommandeDialog';
import { useEngagements } from '@/hooks/useEngagements';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useToast } from '@/hooks/use-toast';
import { showNavigationToast } from '@/lib/navigation-toast';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';
import type { CreateBonCommandeInput } from '@/types/bonCommande.types';

const Engagements = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | undefined>();
  const [bonCommandeDialogOpen, setBonCommandeDialogOpen] = useState(false);
  const [engagementSourceId, setEngagementSourceId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    engagements,
    isLoading,
    createEngagement,
    updateEngagement,
    validerEngagement,
    annulerEngagement,
    deleteEngagement,
  } = useEngagements();

  const { createBonCommande, genererNumero } = useBonsCommande();

  const handleCreate = () => {
    setSelectedEngagement(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (engagement: Engagement) => {
    setSelectedEngagement(engagement);
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
    } catch (error: any) {
      toast({
        title: 'Erreur d\'annulation',
        description: error.message || 'Une erreur est survenue lors de l\'annulation.',
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
    setEngagementSourceId(engagement.id);
    setBonCommandeDialogOpen(true);
  };

  const handleSaveBonCommande = async (data: CreateBonCommandeInput) => {
    try {
      const engagement = engagements.find(e => e.id === engagementSourceId);
      
      await createBonCommande(data);
      
      setBonCommandeDialogOpen(false);
      setEngagementSourceId(null);
      
      showNavigationToast({
        title: 'Bon de commande créé',
        description: `Le BC a été créé depuis l'engagement ${engagement?.numero || ''}.`,
        targetPage: {
          name: 'Bons de Commande',
          path: '/app/bons-commande',
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

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedEngagement(undefined);
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

        <EngagementTable
          engagements={engagements}
          onEdit={handleEdit}
          onValider={handleValider}
          onAnnuler={handleAnnuler}
          onDelete={handleDelete}
          onCreerBonCommande={handleCreerBonCommande}
        />
      </div>

      <EngagementDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSave}
        engagement={selectedEngagement}
      />

      <BonCommandeDialog
        open={bonCommandeDialogOpen}
        onOpenChange={(open) => {
          setBonCommandeDialogOpen(open);
          if (!open) setEngagementSourceId(null);
        }}
        selectedEngagement={engagements.find(e => e.id === engagementSourceId)}
        onSubmit={handleSaveBonCommande}
        onGenererNumero={genererNumero}
      />
    </div>
  );
};

export default Engagements;
