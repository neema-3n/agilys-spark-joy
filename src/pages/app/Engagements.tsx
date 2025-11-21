import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EngagementDialog } from '@/components/engagements/EngagementDialog';
import { EngagementTable } from '@/components/engagements/EngagementTable';
import { EngagementStats } from '@/components/engagements/EngagementStats';
import { EngagementSnapshot } from '@/components/engagements/EngagementSnapshot';
import { BonCommandeDialog } from '@/components/bonsCommande/BonCommandeDialog';
import { CreateDepenseFromEngagementDialog } from '@/components/depenses/CreateDepenseFromEngagementDialog';
import { useEngagements } from '@/hooks/useEngagements';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useDepenses } from '@/hooks/useDepenses';
import { useToast } from '@/hooks/use-toast';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { showNavigationToast } from '@/lib/navigation-toast';
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
import type { Engagement, EngagementFormData } from '@/types/engagement.types';
import type { CreateBonCommandeInput } from '@/types/bonCommande.types';

// Engagements page - manages engagement creation and lifecycle
const Engagements = () => {
  const { engagementId } = useParams<{ engagementId?: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | undefined>();
  const [bonCommandeDialogOpen, setBonCommandeDialogOpen] = useState(false);
  const [engagementSourceId, setEngagementSourceId] = useState<string | null>(null);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionEngagementId, setActionEngagementId] = useState<string | null>(null);
  const [selectedEngagementForDepense, setSelectedEngagementForDepense] = useState<Engagement | null>(null);
  const [snapshotEngagementId, setSnapshotEngagementId] = useState<string | null>(null);
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
  const { createDepenseFromEngagement } = useDepenses();

  // Synchronisation bidirectionnelle URL ↔ state
  useEffect(() => {
    if (engagementId && engagements.length > 0 && !snapshotEngagementId) {
      const engagement = engagements.find(e => e.id === engagementId);
      if (engagement) {
        setSnapshotEngagementId(engagementId);
      } else {
        navigate('/app/engagements', { replace: true });
      }
    }
  }, [engagementId, engagements, snapshotEngagementId, navigate]);

  // Gérer le scroll pour l'effet de disparition du header
  const scrollProgress = useScrollProgress(!!snapshotEngagementId);

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

  const handleValider = (id: string) => {
    setActionEngagementId(id);
    setValidateDialogOpen(true);
  };

  const confirmValider = async () => {
    if (!actionEngagementId) return;
    
    try {
      await validerEngagement(actionEngagementId);
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
    } finally {
      setValidateDialogOpen(false);
      setActionEngagementId(null);
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

  const handleDelete = (id: string) => {
    setActionEngagementId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!actionEngagementId) return;
    
    try {
      await deleteEngagement(actionEngagementId);
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
    } finally {
      setDeleteDialogOpen(false);
      setActionEngagementId(null);
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

  const handleCreerDepense = (engagement: Engagement) => {
    setSelectedEngagementForDepense(engagement);
  };

  const handleOpenSnapshot = useCallback((engagementId: string) => {
    setSnapshotEngagementId(engagementId);
    navigate(`/app/engagements/${engagementId}`);
  }, [navigate]);

  const handleCloseSnapshot = () => {
    setSnapshotEngagementId(null);
    navigate('/app/engagements');
  };

  const handleNavigateSnapshot = (direction: 'prev' | 'next') => {
    const currentIndex = engagements.findIndex(e => e.id === snapshotEngagementId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < engagements.length) {
      const newEngagement = engagements[newIndex];
      setSnapshotEngagementId(newEngagement.id);
      navigate(`/app/engagements/${newEngagement.id}`);
    }
  };

  const handleNavigateToEntity = (type: string, id: string) => {
    const entityRoutes: Record<string, string> = {
      fournisseur: `/app/fournisseurs/${id}`,
      ligneBudgetaire: `/app/budgets?ligne=${id}`,
      projet: `/app/projets/${id}`,
      reservationCredit: `/app/reservations/${id}`,
    };
    
    const route = entityRoutes[type];
    if (route) {
      navigate(route);
      showNavigationToast({
        title: `Navigation vers ${type}`,
        description: 'Vous avez été redirigé',
        targetPage: { name: type, path: route },
        navigate
      });
    }
  };

  const snapshotEngagement = useMemo(
    () => engagements.find(e => e.id === snapshotEngagementId),
    [engagements, snapshotEngagementId]
  );

  const snapshotIndex = useMemo(
    () => engagements.findIndex(e => e.id === snapshotEngagementId),
    [engagements, snapshotEngagementId]
  );
  const isSnapshotOpen = !!(snapshotEngagementId && snapshotEngagement);

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
  }, [snapshotEngagementId, snapshotIndex, engagements.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pageHeaderContent = (
    <PageHeader 
      title="Gestion des Engagements"
      description="Demandes, validations et suivi des engagements"
      scrollProgress={snapshotEngagementId ? scrollProgress : 0}
      actions={
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel engagement
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      {!isSnapshotOpen && pageHeaderContent}

      <div className="px-8 space-y-6">
        {isSnapshotOpen && snapshotEngagement ? (
          <EngagementSnapshot
            engagement={snapshotEngagement}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < engagements.length - 1}
            currentIndex={snapshotIndex}
            totalCount={engagements.length}
            onEdit={() => handleEdit(snapshotEngagement)}
            onValider={snapshotEngagement.statut === 'brouillon' ? () => handleValider(snapshotEngagement.id) : undefined}
            onCreerBonCommande={snapshotEngagement.statut === 'valide' ? () => handleCreerBonCommande(snapshotEngagement) : undefined}
            onCreerDepense={snapshotEngagement.statut === 'valide' ? () => handleCreerDepense(snapshotEngagement) : undefined}
          />
        ) : (
          <>
            <EngagementStats engagements={engagements} />

            <EngagementTable
              engagements={engagements}
              onEdit={handleEdit}
              onValider={handleValider}
              onAnnuler={handleAnnuler}
              onDelete={handleDelete}
              onCreerBonCommande={handleCreerBonCommande}
              onCreerDepense={(engagement) => setSelectedEngagementForDepense(engagement)}
              onViewDetails={handleOpenSnapshot}
            />
          </>
        )}
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

      <AlertDialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cet engagement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action confirmera l'engagement et permettra la création de bons de commande. 
              L'engagement ne pourra plus être modifié après validation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmValider}>
              Valider l'engagement
            </AlertDialogAction>
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
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateDepenseFromEngagementDialog
        open={!!selectedEngagementForDepense}
        onOpenChange={(open) => !open && setSelectedEngagementForDepense(null)}
        engagement={selectedEngagementForDepense}
        onSave={async (data) => {
          try {
            const engagement = selectedEngagementForDepense;
            await createDepenseFromEngagement(data);
            
            setSelectedEngagementForDepense(null);
            
            showNavigationToast({
              title: 'Dépense créée',
              description: `La dépense a été créée depuis l'engagement ${engagement?.numero || ''}.`,
              targetPage: {
                name: 'Dépenses',
                path: '/app/depenses',
              },
              navigate,
            });
          } catch (error) {
            console.error('Erreur création dépense:', error);
          }
        }}
      />
    </div>
  );
};

export default Engagements;
