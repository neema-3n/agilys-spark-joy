import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { BonCommandeSnapshot } from '@/components/bonsCommande/BonCommandeSnapshot';
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
import { useScrollProgress } from '@/hooks/useScrollProgress';

const BonsCommande = () => {
  const navigate = useNavigate();
  const { bonCommandeId } = useParams<{ bonCommandeId?: string }>();
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
  const [snapshotBonCommandeId, setSnapshotBonCommandeId] = useState<string | null>(null);
  
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

  const snapshotBonCommande = useMemo(
    () => bonsCommande.find(bc => bc.id === snapshotBonCommandeId),
    [bonsCommande, snapshotBonCommandeId]
  );

  const snapshotIndex = useMemo(
    () => bonsCommande.findIndex(bc => bc.id === snapshotBonCommandeId),
    [bonsCommande, snapshotBonCommandeId]
  );

  const scrollProgress = useScrollProgress(!!snapshotBonCommandeId);
  const isSnapshotOpen = !!(snapshotBonCommandeId && snapshotBonCommande);

  useEffect(() => {
    if (bonCommandeId && bonsCommande.length > 0 && !snapshotBonCommandeId) {
      const bc = bonsCommande.find(item => item.id === bonCommandeId);
      if (bc) {
        setSnapshotBonCommandeId(bonCommandeId);
      } else {
        navigate('/app/bons-commande', { replace: true });
      }
    }
  }, [bonCommandeId, bonsCommande, snapshotBonCommandeId, navigate]);

  useEffect(() => {
    if (snapshotBonCommandeId && !bonsCommande.some(bc => bc.id === snapshotBonCommandeId)) {
      setSnapshotBonCommandeId(null);
    }
  }, [snapshotBonCommandeId, bonsCommande]);

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
      await createFacture({ facture: data, skipToast: true });
      // Fermer le dialog et afficher le toast de succès seulement si ça a réussi
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
      // L'erreur est déjà gérée par le hook useFactures qui affiche le message détaillé
      // Le dialog reste ouvert pour permettre la correction
      console.error('Erreur lors de la création de la facture:', error);
    }
  }, [createFacture, navigate]);

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumero();
  }, [genererNumero]);

  const handleGenererNumeroFacture = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumeroFacture({ clientId: currentClient.id, exerciceId: currentExercice.id });
  }, [currentClient, currentExercice, genererNumeroFacture]);

  const handleOpenSnapshot = useCallback((id: string) => {
    setSnapshotBonCommandeId(id);
    navigate(`/app/bons-commande/${id}`);
  }, [navigate]);

  const handleCloseSnapshot = useCallback(() => {
    setSnapshotBonCommandeId(null);
    navigate('/app/bons-commande');
  }, [navigate]);

  const handleNavigateSnapshot = useCallback((direction: 'prev' | 'next') => {
    if (snapshotIndex === -1) return;
    const newIndex = direction === 'prev' ? snapshotIndex - 1 : snapshotIndex + 1;
    if (newIndex >= 0 && newIndex < bonsCommande.length) {
      const target = bonsCommande[newIndex];
      setSnapshotBonCommandeId(target.id);
      navigate(`/app/bons-commande/${target.id}`);
    }
  }, [snapshotIndex, bonsCommande, navigate]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!snapshotBonCommandeId) return;
      if (event.key === 'Escape') {
        handleCloseSnapshot();
      } else if (event.key === 'ArrowLeft' && snapshotIndex > 0) {
        handleNavigateSnapshot('prev');
      } else if (event.key === 'ArrowRight' && snapshotIndex < bonsCommande.length - 1) {
        handleNavigateSnapshot('next');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [snapshotBonCommandeId, snapshotIndex, bonsCommande.length, handleCloseSnapshot, handleNavigateSnapshot]);

  const handleNavigateToEntity = useCallback((type: string, id: string) => {
    switch (type) {
      case 'fournisseur':
        navigate(`/app/fournisseurs/${id}`);
        break;
      case 'engagement':
        navigate(`/app/engagements/${id}`);
        break;
      case 'projet':
        navigate(`/app/projets/${id}`);
        break;
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isSnapshotOpen && (
        <PageHeader
          title="Gestion des Bons de Commande"
          description="Gérez les bons de commande et leurs statuts"
          scrollProgress={snapshotBonCommandeId ? scrollProgress : 0}
          actions={
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau BC
            </Button>
          }
        />
      )}

      <div className="px-8 space-y-6">
        {isSnapshotOpen && snapshotBonCommande ? (
          <BonCommandeSnapshot
            bonCommande={snapshotBonCommande}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < bonsCommande.length - 1}
            currentIndex={snapshotIndex}
            totalCount={bonsCommande.length}
            onEdit={() => handleEdit(snapshotBonCommande.id)}
            onValider={snapshotBonCommande.statut === 'brouillon' ? () => validerBonCommande(snapshotBonCommande.id) : undefined}
            onMettreEnCours={snapshotBonCommande.statut === 'valide' ? () => mettreEnCours(snapshotBonCommande.id) : undefined}
            onReceptionner={snapshotBonCommande.statut === 'en_cours' ? () => handleReceptionner(snapshotBonCommande.id) : undefined}
            onCreateFacture={snapshotBonCommande.statut === 'receptionne' ? () => handleCreateFacture(snapshotBonCommande.id) : undefined}
            onAnnuler={snapshotBonCommande.statut !== 'facture' && snapshotBonCommande.statut !== 'annule' ? () => handleAnnuler(snapshotBonCommande.id) : undefined}
            onNavigateToEntity={handleNavigateToEntity}
          />
        ) : (
          <>
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
              onViewDetails={handleOpenSnapshot}
            />
          </>
        )}
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
