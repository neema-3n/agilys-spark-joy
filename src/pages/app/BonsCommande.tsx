import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useFactures } from '@/hooks/useFactures';
import { BonCommandeStats } from '@/components/bonsCommande/BonCommandeStats';
import { BonCommandeTable } from '@/components/bonsCommande/BonCommandeTable';
import { BonCommandeDialog } from '@/components/bonsCommande/BonCommandeDialog';
import { AnnulerBCDialog } from '@/components/bonsCommande/AnnulerBCDialog';
import { ReceptionnerBCDialog } from '@/components/bonsCommande/ReceptionnerBCDialog';
import { FactureDialog } from '@/components/factures/FactureDialog';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import { CreateFactureInput } from '@/types/facture.types';
import { useToast } from '@/hooks/use-toast';
import { showNavigationToast } from '@/lib/navigation-toast';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEngagements } from '@/hooks/useEngagements';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BonsCommande = () => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [receptionnerDialogOpen, setReceptionnerDialogOpen] = useState(false);
  const [factureDialogOpen, setFactureDialogOpen] = useState(false);
  const [selectedBonCommande, setSelectedBonCommande] = useState<BonCommande | undefined>();
  const [bonCommandeSourceId, setBonCommandeSourceId] = useState<string | null>(null);
  
  const {
    bonsCommande,
    isLoading,
    createBonCommande,
    updateBonCommande,
    deleteBonCommande,
    genererNumero,
    validerBonCommande,
    mettreEnCours,
    receptionnerBonCommande,
    annulerBonCommande,
  } = useBonsCommande();

  const { createFacture, genererNumero: genererNumeroFacture } = useFactures();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { engagements } = useEngagements();

  const { data: bonsCommandeReceptionnes = [] } = useQuery({
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

  const handleEdit = useCallback((bonCommande: BonCommande) => {
    setSelectedBonCommande(bonCommande);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedBonCommande(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedBonCommande(undefined);
    }
  }, []);

  const handleSubmit = useCallback(async (data: CreateBonCommandeInput | UpdateBonCommandeInput) => {
    if (selectedBonCommande) {
      await updateBonCommande({ id: selectedBonCommande.id, data });
    } else {
      await createBonCommande(data as CreateBonCommandeInput);
    }
  }, [selectedBonCommande, updateBonCommande, createBonCommande]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteBonCommande(id);
  }, [deleteBonCommande]);

  const handleValider = useCallback(async (id: string) => {
    await validerBonCommande(id);
  }, [validerBonCommande]);

  const handleMettreEnCours = useCallback(async (id: string) => {
    await mettreEnCours(id);
  }, [mettreEnCours]);

  const handleReceptionner = useCallback((bc: BonCommande) => {
    setSelectedBonCommande(bc);
    setReceptionnerDialogOpen(true);
  }, []);

  const handleReceptionnerConfirm = useCallback(async (dateLivraisonReelle: string) => {
    if (selectedBonCommande) {
      await receptionnerBonCommande({ id: selectedBonCommande.id, date: dateLivraisonReelle });
      setSelectedBonCommande(undefined);
    }
  }, [selectedBonCommande, receptionnerBonCommande]);

  const handleAnnuler = useCallback((bc: BonCommande) => {
    setSelectedBonCommande(bc);
    setAnnulerDialogOpen(true);
  }, []);

  const handleAnnulerConfirm = useCallback(async (motif: string) => {
    if (selectedBonCommande) {
      await annulerBonCommande({ id: selectedBonCommande.id, motif });
      setSelectedBonCommande(undefined);
    }
  }, [selectedBonCommande, annulerBonCommande]);

  const handleCreateFacture = useCallback((bonCommande: BonCommande) => {
    setSelectedBonCommande(bonCommande);
    setBonCommandeSourceId(bonCommande.id);
    setFactureDialogOpen(true);
  }, []);

  const handleSaveFacture = useCallback(async (data: CreateFactureInput) => {
    try {      
      await createFacture(data);
      
      const bcNumero = selectedBonCommande?.numero || '';
      setFactureDialogOpen(false);
      setBonCommandeSourceId(null);
      setSelectedBonCommande(undefined);
      
      showNavigationToast({
        title: 'Facture créée',
        description: `La facture a été créée depuis le BC ${bcNumero}.`,
        targetPage: {
          name: 'Factures',
          path: '/app/factures',
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
  }, [selectedBonCommande, createFacture, navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bons de Commande"
        description="Création et suivi des bons de commande"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau BC
          </Button>
        }
      />

      <div className="px-8 space-y-6">
        <BonCommandeStats bonsCommande={bonsCommande} />
        <BonCommandeTable
          bonsCommande={bonsCommande}
          onEdit={handleEdit}
          onValider={handleValider}
          onMettreEnCours={handleMettreEnCours}
          onReceptionner={handleReceptionner}
          onAnnuler={handleAnnuler}
          onDelete={handleDelete}
          onCreateFacture={handleCreateFacture}
        />
      </div>

      <BonCommandeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        bonCommande={selectedBonCommande}
        onSubmit={handleSubmit}
        onGenererNumero={genererNumero}
      />

      <FactureDialog
        open={factureDialogOpen}
        onOpenChange={(open) => {
          setFactureDialogOpen(open);
          if (!open) {
            setBonCommandeSourceId(null);
            setSelectedBonCommande(undefined);
          }
        }}
        onSubmit={handleSaveFacture}
        fournisseurs={fournisseurs}
        bonsCommande={bonsCommandeReceptionnes}
        engagements={engagements}
        lignesBudgetaires={lignesBudgetaires}
        projets={projets}
        currentClientId={currentClient?.id || ''}
        currentExerciceId={currentExercice?.id || ''}
        onGenererNumero={async () => {
          if (!currentClient || !currentExercice) return '';
          return genererNumeroFacture({ clientId: currentClient.id, exerciceId: currentExercice.id });
        }}
        initialBonCommandeId={bonCommandeSourceId || undefined}
      />

      <AnnulerBCDialog
        open={annulerDialogOpen}
        onOpenChange={setAnnulerDialogOpen}
        bonCommandeNumero={selectedBonCommande?.numero || ''}
        onConfirm={handleAnnulerConfirm}
      />

      <ReceptionnerBCDialog
        open={receptionnerDialogOpen}
        onOpenChange={setReceptionnerDialogOpen}
        bonCommandeNumero={selectedBonCommande?.numero || ''}
        onConfirm={handleReceptionnerConfirm}
      />
    </div>
  );
};

export default BonsCommande;
