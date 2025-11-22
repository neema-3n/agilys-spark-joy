import { useState, useCallback, useMemo } from 'react';
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
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { FactureStats } from '@/components/factures/FactureStats';
import { FactureTable } from '@/components/factures/FactureTable';
import { FactureDialog } from '@/components/factures/FactureDialog';
import { FactureSnapshot } from '@/components/factures/FactureSnapshot';
import { CreateDepenseFromFactureDialog } from '@/components/depenses/CreateDepenseFromFactureDialog';
import { CreateFactureInput, Facture, StatutFacture } from '@/types/facture.types';
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
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useListSelection } from '@/hooks/useListSelection';

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
  const [selectedFactureForDepense, setSelectedFactureForDepense] = useState<Facture | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | StatutFacture>('tous');

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

  const filteredFactures = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return factures
      .filter((facture) => (statutFilter === 'tous' ? true : facture.statut === statutFilter))
      .filter((facture) => {
        if (!searchLower) return true;

        return (
          facture.numero.toLowerCase().includes(searchLower) ||
          facture.objet?.toLowerCase().includes(searchLower) ||
          facture.fournisseur?.nom.toLowerCase().includes(searchLower) ||
          facture.bonCommande?.numero?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => new Date(b.dateFacture).getTime() - new Date(a.dateFacture).getTime());
  }, [factures, searchTerm, statutFilter]);

  const selectionIds = useMemo(
    () => filteredFactures.map((facture) => facture.id),
    [filteredFactures]
  );
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const selectedFactures = useMemo(
    () => filteredFactures.filter((facture) => selectedIds.has(facture.id)),
    [filteredFactures, selectedIds]
  );

  const handleBatchValider = useCallback(async () => {
    const candidates = selectedFactures.filter((facture) => facture.statut === 'brouillon');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((facture) => validerFacture(facture.id)));
    clearSelection();
  }, [selectedFactures, validerFacture, clearSelection]);

  const handleBatchMarquerPayee = useCallback(async () => {
    const candidates = selectedFactures.filter((facture) => facture.statut === 'validee');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((facture) => marquerPayee(facture.id)));
    clearSelection();
  }, [selectedFactures, marquerPayee, clearSelection]);

  const hasSelection = selectedIds.size > 0;
  const hasBrouillonsSelected = selectedFactures.some((facture) => facture.statut === 'brouillon');
  const hasValideesSelected = selectedFactures.some((facture) => facture.statut === 'validee');

  const handleExportFactures = useCallback(() => {
    // Exporter toutes les factures filtrées (CSV/Excel) – brancher ici l'implémentation
    // Exemple : exportFactures(filteredFactures);
  }, [filteredFactures]);

  const {
    snapshotId: snapshotFactureId,
    snapshotItem: snapshotFacture,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: factures,
    getId: f => f.id,
    initialId: factureId,
    onNavigateToId: id => navigate(id ? `/app/factures/${id}` : '/app/factures'),
    onMissingId: () => navigate('/app/factures', { replace: true }),
    isLoadingItems: isLoading,
  });

  // Gérer le scroll pour l'effet de disparition du header
  const scrollProgress = useScrollProgress(!!snapshotFactureId);

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
        navigate(`/app/budgets/${id}?tab=lignes`);
        break;
      case 'projet':
        navigate(`/app/projets/${id}`);
        break;
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Factures"
        description="Gérez les factures fournisseurs"
        stickyHeader={false}
      />
    );
  }

  const pageHeaderContent = (
    <PageHeader 
      title="Gestion des Factures"
      description="Gérez les factures fournisseurs"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle facture
        </Button>
      }
    />
  );

  const statutOptions: { value: 'tous' | StatutFacture; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'validee', label: 'Validée' },
    { value: 'payee', label: 'Payée' },
    { value: 'annulee', label: 'Annulée' },
  ];

  const activeStatutLabel =
    statutOptions.find((option) => option.value === statutFilter)?.label || 'Tous';

  return (
    <div className="space-y-6">
      {!isSnapshotOpen && pageHeaderContent}

      <div className="px-8 space-y-6">
        {isSnapshotOpen && snapshotFacture ? (
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
            onEdit={snapshotFacture.statut === 'brouillon' ? () => handleEdit(snapshotFacture.id) : undefined}
            onCreerDepense={(snapshotFacture.statut === 'validee' || snapshotFacture.statut === 'payee') ? () => setSelectedFactureForDepense(snapshotFacture) : undefined}
          />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            <FactureStats factures={factures} />

            <ListLayout
              title="Liste des factures"
              description="Visualisez, filtrez et gérez vos factures fournisseurs"
              toolbar={
                <ListToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par numéro, objet, fournisseur..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Statut: {activeStatutLabel}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {statutOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setStatutFilter(option.value)}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>,
                    <DropdownMenu key="batch-actions">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Actions groupées
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!hasBrouillonsSelected}
                          onClick={handleBatchValider}
                        >
                          Valider les brouillons
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!hasValideesSelected}
                          onClick={handleBatchMarquerPayee}
                        >
                          Marquer comme payées
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={!hasSelection} onClick={() => clearSelection()}>
                          Effacer la sélection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportFactures}>
                          Exporter (toutes les factures filtrées)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>,
                  ]}
                />
              }
            >
              <FactureTable
                factures={filteredFactures}
                onEdit={(facture) => handleEdit(facture.id)}
                onDelete={deleteFacture}
                onValider={validerFacture}
                onMarquerPayee={marquerPayee}
                onAnnuler={handleAnnuler}
                onCreerDepense={(facture) => setSelectedFactureForDepense(facture)}
                onViewDetails={handleOpenSnapshot}
                selection={{ selectedIds, allSelected, toggleOne, toggleAll }}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
              />
            </ListLayout>
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
