import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { showNavigationToast } from '@/lib/navigation-toast';
import { useFactures } from '@/hooks/useFactures';
import { useDepenses } from '@/hooks/useDepenses';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEngagements } from '@/hooks/useEngagements';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { FactureStats } from '@/components/factures/FactureStats';
import { FactureTable } from '@/components/factures/FactureTable';
import { FactureDialog } from '@/components/factures/FactureDialog';
import { FactureSnapshot } from '@/components/factures/FactureSnapshot';
import { CreateDepenseFromFactureDialog } from '@/components/depenses/CreateDepenseFromFactureDialog';
import { CreateFactureInput, Facture } from '@/types/facture.types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Factures() {
  const navigate = useNavigate();
  const { factureId } = useParams<{ factureId: string }>();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  
  // États basés sur les IDs uniquement
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactureId, setEditingFactureId] = useState<string | undefined>();
  const [selectedBonCommandeId, setSelectedBonCommandeId] = useState<string | undefined>();
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [annulationFactureId, setAnnulationFactureId] = useState<string | undefined>();
  const [annulationMotif, setAnnulationMotif] = useState('');
  const [selectedFactureForDepense, setSelectedFactureForDepense] = useState<Facture | null>(null);
  
  // États pour le snapshot
  const [snapshotFactureId, setSnapshotFactureId] = useState<string | null>(null);
  
  const { factures, isLoading, createFacture, updateFacture, deleteFacture, genererNumero, validerFacture, marquerPayee, annulerFacture } = useFactures();
  const { createDepenseFromFacture } = useDepenses();
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { engagements } = useEngagements();

  // Helper pour récupérer la facture depuis l'ID (source unique de vérité)
  const editingFacture = useMemo(
    () => factures.find(f => f.id === editingFactureId),
    [factures, editingFactureId]
  );

  // Snapshot helpers
  const snapshotFacture = useMemo(
    () => factures.find(f => f.id === snapshotFactureId),
    [factures, snapshotFactureId]
  );

  const snapshotIndex = useMemo(
    () => factures.findIndex(f => f.id === snapshotFactureId),
    [factures, snapshotFactureId]
  );

  // Synchroniser l'URL avec le snapshot
  useEffect(() => {
    if (factureId && factures.length > 0 && !snapshotFactureId) {
      const facture = factures.find(f => f.id === factureId);
      if (facture) {
        setSnapshotFactureId(factureId);
      } else {
        // ID invalide, rediriger vers la liste
        navigate('/app/factures', { replace: true });
      }
    }
  }, [factureId, factures, snapshotFactureId, navigate]);

  // Récupérer les bons de commande réceptionnés
  const { data: bonsCommande = [] } = useQuery({
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
  const handleCreate = useCallback(() => {
    setEditingFactureId(undefined);
    setSelectedBonCommandeId(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingFactureId(undefined);
      setSelectedBonCommandeId(undefined);
    }
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingFactureId(id);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async (data: CreateFactureInput) => {
    if (editingFactureId) {
      await updateFacture({ id: editingFactureId, facture: data });
    } else {
      await createFacture({ facture: data });
    }
  }, [editingFactureId, updateFacture, createFacture]);

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumero({
      clientId: currentClient.id,
      exerciceId: currentExercice.id,
    });
  }, [currentClient, currentExercice, genererNumero]);

  const handleAnnuler = useCallback((id: string) => {
    setAnnulationFactureId(id);
    setMotifAnnulation('');
    setAnnulerDialogOpen(true);
  }, []);

  const handleConfirmAnnulation = useCallback(async () => {
    if (annulationFactureId && motifAnnulation.trim()) {
      await annulerFacture({ id: annulationFactureId, motif: motifAnnulation });
      setAnnulerDialogOpen(false);
      setAnnulationFactureId(undefined);
      setMotifAnnulation('');
    }
  }, [annulationFactureId, motifAnnulation, annulerFacture]);

  // Snapshot handlers
  const handleOpenSnapshot = useCallback((factureId: string) => {
    setSnapshotFactureId(factureId);
    navigate(`/app/factures/${factureId}`);
  }, [navigate]);

  const handleCloseSnapshot = useCallback(() => {
    setSnapshotFactureId(null);
    navigate('/app/factures');
  }, [navigate]);

  const handleNavigateSnapshot = useCallback((direction: 'prev' | 'next') => {
    if (snapshotIndex === -1) return;
    
    const newIndex = direction === 'prev' ? snapshotIndex - 1 : snapshotIndex + 1;
    if (newIndex >= 0 && newIndex < factures.length) {
      const newFacture = factures[newIndex];
      setSnapshotFactureId(newFacture.id);
      navigate(`/app/factures/${newFacture.id}`);
    }
  }, [snapshotIndex, factures, navigate]);

  const handleNavigateToEntity = useCallback((type: string, id: string) => {
    switch (type) {
      case 'fournisseur':
        navigate(`/app/fournisseurs/${id}`);
        break;
      case 'bonCommande':
        navigate(`/app/bons-commande/${id}`);
        break;
      case 'engagement':
        navigate(`/app/engagements/${id}`);
        break;
      case 'ligneBudgetaire':
        navigate(`/app/budgets?ligneId=${id}`);
        break;
      case 'projet':
        navigate(`/app/projets/${id}`);
        break;
    }
  }, [navigate]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Chargement...</div>;
  }

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Factures"
      description="Gérez les factures fournisseurs"
      sticky={!snapshotFactureId}
      actions={
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      {pageHeaderContent}

      <div className="px-8 space-y-6">
        {snapshotFactureId && snapshotFacture ? (
          <FactureSnapshot
            facture={snapshotFacture}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < factures.length - 1}
            currentIndex={snapshotIndex}
            totalCount={factures.length}
            onNavigateToEntity={handleNavigateToEntity}
            onValider={snapshotFacture.statut === 'brouillon' ? () => validerFacture(snapshotFacture.id) : undefined}
            onMarquerPayee={snapshotFacture.statut === 'validee' ? () => marquerPayee(snapshotFacture.id) : undefined}
            onAnnuler={snapshotFacture.statut !== 'annulee' && snapshotFacture.statut !== 'payee' ? () => handleAnnuler(snapshotFacture.id) : undefined}
            onEdit={snapshotFacture.statut === 'brouillon' ? () => { handleEdit(snapshotFacture.id); handleCloseSnapshot(); } : undefined}
            onCreerDepense={(snapshotFacture.statut === 'validee' || snapshotFacture.statut === 'payee') ? () => { setSelectedFactureForDepense(snapshotFacture); handleCloseSnapshot(); } : undefined}
          />
        ) : (
          <>
            <FactureStats factures={factures} />

            <FactureTable
              factures={factures}
              onEdit={(facture) => handleEdit(facture.id)}
              onDelete={deleteFacture}
              onValider={validerFacture}
              onMarquerPayee={marquerPayee}
              onAnnuler={handleAnnuler}
              onCreerDepense={(facture) => setSelectedFactureForDepense(facture)}
              onViewDetails={handleOpenSnapshot}
            />
          </>
        )}
      </div>

      <FactureDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        facture={editingFacture}
        onSubmit={handleSubmit}
        fournisseurs={fournisseurs}
        bonsCommande={bonsCommande}
        engagements={engagements.filter(e => e.statut === 'valide')}
        lignesBudgetaires={lignesBudgetaires.filter(lb => lb.statut === 'actif')}
        projets={projets}
        currentClientId={currentClient?.id || ''}
        currentExerciceId={currentExercice?.id || ''}
        onGenererNumero={handleGenererNumero}
        initialBonCommandeId={selectedBonCommandeId}
      />

      <AlertDialog open={annulerDialogOpen} onOpenChange={setAnnulerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la facture</AlertDialogTitle>
            <AlertDialogDescription>
              Veuillez indiquer le motif d'annulation de cette facture.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motif">Motif d'annulation</Label>
            <Input
              id="motif"
              value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)}
              placeholder="Ex: Erreur de saisie, facture en double..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAnnulation}
              disabled={!motifAnnulation.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateDepenseFromFactureDialog
        open={!!selectedFactureForDepense}
        onOpenChange={(open) => !open && setSelectedFactureForDepense(null)}
        facture={selectedFactureForDepense}
        onSave={async (data) => {
          try {
            const facture = selectedFactureForDepense;
            await createDepenseFromFacture(data);
            
            setSelectedFactureForDepense(null);
            
            showNavigationToast({
              title: 'Dépense créée',
              description: `La dépense a été créée depuis la facture ${facture?.numero || ''}.`,
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
}
