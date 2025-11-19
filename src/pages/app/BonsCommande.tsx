import { useState, useCallback, useMemo } from 'react';
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
import { CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
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
  
  // États basés sur les IDs uniquement
  const [dialogOpen, setDialogOpen] = useState(false);
  const [factureDialogOpen, setFactureDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [receptionnerDialogOpen, setReceptionnerDialogOpen] = useState(false);
  
  const [editingBonCommandeId, setEditingBonCommandeId] = useState<string | undefined>();
  const [receptionBonCommandeId, setReceptionBonCommandeId] = useState<string | undefined>();
  const [annulationBonCommandeId, setAnnulationBonCommandeId] = useState<string | undefined>();
  const [factureBonCommandeId, setFactureBonCommandeId] = useState<string | undefined>();
  
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

  // Helpers pour récupérer les objets depuis les IDs (source unique de vérité)
  const editingBonCommande = useMemo(
    () => bonsCommande.find(bc => bc.id === editingBonCommandeId),
    [bonsCommande, editingBonCommandeId]
  );

  const receptionBonCommande = useMemo(
    () => bonsCommande.find(bc => bc.id === receptionBonCommandeId),
    [bonsCommande, receptionBonCommandeId]
  );

  const annulationBonCommande = useMemo(
    () => bonsCommande.find(bc => bc.id === annulationBonCommandeId),
    [bonsCommande, annulationBonCommandeId]
  );

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

  // Callbacks stables avec dépendances minimales
  const handleEdit = useCallback((id: string) => {
    setEditingBonCommandeId(id);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingBonCommandeId(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditingBonCommandeId(undefined);
  }, []);

  const handleSubmit = useCallback(async (data: CreateBonCommandeInput | UpdateBonCommandeInput) => {
    if (editingBonCommandeId) {
      await updateBonCommande({ id: editingBonCommandeId, data: data as UpdateBonCommandeInput });
    } else {
      await createBonCommande(data as CreateBonCommandeInput);
    }
    setDialogOpen(false);
    setEditingBonCommandeId(undefined);
  }, [editingBonCommandeId, createBonCommande, updateBonCommande]);

  const handleReceptionner = useCallback((id: string) => {
    setReceptionBonCommandeId(id);
    setReceptionnerDialogOpen(true);
  }, []);

  const handleReceptionnerConfirm = useCallback(async (dateLivraisonReelle: string) => {
    if (receptionBonCommandeId) {
      await receptionnerBonCommande({ id: receptionBonCommandeId, date: dateLivraisonReelle });
      setReceptionnerDialogOpen(false);
      setReceptionBonCommandeId(undefined);
    }
  }, [receptionBonCommandeId, receptionnerBonCommande]);

  const handleAnnuler = useCallback((id: string) => {
    setAnnulationBonCommandeId(id);
    setAnnulerDialogOpen(true);
  }, []);

  const handleAnnulerConfirm = useCallback(async (motif: string) => {
    if (annulationBonCommandeId) {
      await annulerBonCommande({ id: annulationBonCommandeId, motif });
      setAnnulerDialogOpen(false);
      setAnnulationBonCommandeId(undefined);
    }
  }, [annulationBonCommandeId, annulerBonCommande]);

  const handleCreateFacture = useCallback((id: string) => {
    setFactureBonCommandeId(id);
    setFactureDialogOpen(true);
  }, []);

  const handleSaveFacture = useCallback(async (data: CreateFactureInput) => {
    try {
      await createFacture(data);
      setFactureDialogOpen(false);
      setFactureBonCommandeId(undefined);
      
      showNavigationToast({
        title: 'Facture créée',
        description: 'La facture a été créée avec succès.',
        targetPage: {
          name: 'Factures',
          path: '/app/factures',
        },
        navigate,
      });
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création de la facture.',
      });
      throw error;
    }
  }, [createFacture, navigate, toast]);

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumero();
  }, [genererNumero]);

  const handleGenererNumeroFacture = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumeroFacture({ clientId: currentClient.id, exerciceId: currentExercice.id });
  }, [currentClient, currentExercice, genererNumeroFacture]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Bons de Commande"
        description="Gérez les bons de commande et leurs statuts"
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
          onEdit={(bc) => handleEdit(bc.id)}
          onDelete={(id) => deleteBonCommande(id)}
          onValider={(id) => validerBonCommande(id)}
          onMettreEnCours={(id) => mettreEnCours(id)}
          onReceptionner={(bc) => handleReceptionner(bc.id)}
          onAnnuler={(bc) => handleAnnuler(bc.id)}
          onCreateFacture={(bc) => handleCreateFacture(bc.id)}
        />
      </div>

      <BonCommandeDialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
        bonCommande={editingBonCommande}
        onSubmit={handleSubmit}
        onGenererNumero={handleGenererNumero}
      />

      <ReceptionnerBCDialog
        open={receptionnerDialogOpen}
        onOpenChange={setReceptionnerDialogOpen}
        bonCommandeNumero={receptionBonCommande?.numero || ''}
        onConfirm={handleReceptionnerConfirm}
      />

      <AnnulerBCDialog
        open={annulerDialogOpen}
        onOpenChange={setAnnulerDialogOpen}
        bonCommandeNumero={annulationBonCommande?.numero || ''}
        onConfirm={handleAnnulerConfirm}
      />

      <FactureDialog
        open={factureDialogOpen}
        onOpenChange={setFactureDialogOpen}
        facture={undefined}
        onSubmit={handleSaveFacture}
        fournisseurs={fournisseurs}
        bonsCommande={bonsCommandeReceptionnes}
        engagements={engagements.filter(e => e.statut === 'valide')}
        lignesBudgetaires={lignesBudgetaires.filter(lb => lb.statut === 'actif')}
        projets={projets}
        currentClientId={currentClient?.id || ''}
        currentExerciceId={currentExercice?.id || ''}
        onGenererNumero={handleGenererNumeroFacture}
        initialBonCommandeId={factureBonCommandeId}
      />
    </div>
  );
};

export default BonsCommande;
