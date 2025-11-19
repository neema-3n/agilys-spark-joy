import { useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFactures } from '@/hooks/useFactures';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEngagements } from '@/hooks/useEngagements';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { FactureStats } from '@/components/factures/FactureStats';
import { FactureTable } from '@/components/factures/FactureTable';
import { FactureDialog } from '@/components/factures/FactureDialog';
import { CreateFactureInput } from '@/types/facture.types';
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
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  
  // États basés sur les IDs uniquement
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFactureId, setEditingFactureId] = useState<string | undefined>();
  const [selectedBonCommandeId, setSelectedBonCommandeId] = useState<string | undefined>();
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [annulationFactureId, setAnnulationFactureId] = useState<string | undefined>();
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const {
    factures,
    isLoading,
    createFacture,
    updateFacture,
    deleteFacture,
    genererNumero,
    validerFacture,
    marquerPayee,
    annulerFacture,
  } = useFactures();

  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { engagements } = useEngagements();

  // Helper pour récupérer la facture depuis l'ID (source unique de vérité)
  const editingFacture = useMemo(
    () => factures.find(f => f.id === editingFactureId),
    [factures, editingFactureId]
  );

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Factures"
        description="Gérez les factures fournisseurs"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Button>
        }
      />

      <div className="px-8 space-y-6">
        <FactureStats factures={factures} />

        <FactureTable
          factures={factures}
          onEdit={(facture) => handleEdit(facture.id)}
          onDelete={deleteFacture}
          onValider={validerFacture}
          onMarquerPayee={marquerPayee}
          onAnnuler={handleAnnuler}
        />
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
    </div>
  );
}
