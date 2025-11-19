import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Utiliser un seul état pour gérer tous les dialogs
  type DialogType = 'create' | 'edit' | 'annuler' | 'receptionner' | 'facture' | null;
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
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

  // Stabiliser genererNumero avec useRef pour éviter les boucles infinies
  const genererNumeroRef = useRef(genererNumero);
  useEffect(() => {
    genererNumeroRef.current = genererNumero;
  }, [genererNumero]);

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
    setOpenDialog('edit');
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedBonCommande(undefined);
    setOpenDialog('create');
  }, []);

  const handleDialogClose = useCallback(() => {
    setOpenDialog(null);
    setSelectedBonCommande(undefined);
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
    setOpenDialog('receptionner');
  }, []);

  const handleReceptionnerConfirm = useCallback(async (dateLivraisonReelle: string) => {
    if (selectedBonCommande) {
      await receptionnerBonCommande({ id: selectedBonCommande.id, date: dateLivraisonReelle });
      setOpenDialog(null);
      setSelectedBonCommande(undefined);
    }
  }, [selectedBonCommande, receptionnerBonCommande]);

  const handleAnnuler = useCallback((bc: BonCommande) => {
    setSelectedBonCommande(bc);
    setOpenDialog('annuler');
  }, []);

  const handleAnnulerConfirm = useCallback(async (motif: string) => {
    if (selectedBonCommande) {
      await annulerBonCommande({ id: selectedBonCommande.id, motif });
      setOpenDialog(null);
      setSelectedBonCommande(undefined);
    }
  }, [selectedBonCommande, annulerBonCommande]);

  const handleGenererNumero = useCallback(async () => {
    return genererNumeroRef.current();
  }, []);

  const handleCreateFacture = useCallback((bonCommande: BonCommande) => {
    setSelectedBonCommande(bonCommande);
    setBonCommandeSourceId(bonCommande.id);
    setOpenDialog('facture');
  }, []);

  const handleSaveFacture = useCallback(async (data: CreateFactureInput) => {
    try {      
      await createFacture(data);
      
      const bcNumero = selectedBonCommande?.numero || '';
      setOpenDialog(null);
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

      {(openDialog === 'create' || openDialog === 'edit') && (
        <BonCommandeDialog
          open={true}
          onOpenChange={handleDialogClose}
          bonCommande={selectedBonCommande}
          onSubmit={handleSubmit}
          onGenererNumero={handleGenererNumero}
        />
      )}

      {openDialog === 'facture' && (
        <FactureDialog
          open={true}
          onOpenChange={() => {
            setOpenDialog(null);
            setBonCommandeSourceId(null);
            setSelectedBonCommande(undefined);
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
      )}

      {openDialog === 'annuler' && (
        <AnnulerBCDialog
          open={true}
          onOpenChange={() => setOpenDialog(null)}
          bonCommandeNumero={selectedBonCommande?.numero || ''}
          onConfirm={handleAnnulerConfirm}
        />
      )}

      {openDialog === 'receptionner' && (
        <ReceptionnerBCDialog
          open={true}
          onOpenChange={() => setOpenDialog(null)}
          bonCommandeNumero={selectedBonCommande?.numero || ''}
          onConfirm={handleReceptionnerConfirm}
        />
      )}
    </div>
  );
};

export default BonsCommande;
