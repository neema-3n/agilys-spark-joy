import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
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
import { useSnapshotState } from '@/hooks/useSnapshotState';
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
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';

const BonsCommande = () => {
  const navigate = useNavigate();
  const { bonCommandeId } = useParams<{ bonCommandeId?: string }>();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [factureDialogOpen, setFactureDialogOpen] = useState(false);
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [receptionnerDialogOpen, setReceptionnerDialogOpen] = useState(false);
  const [editingBonCommandeId, setEditingBonCommandeId] = useState<string | undefined>();
  const [receptionBonCommandeId, setReceptionBonCommandeId] = useState<string | undefined>();
  const [annulationBonCommandeId, setAnnulationBonCommandeId] = useState<string | undefined>();
  const [factureBonCommandeId, setFactureBonCommandeId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule'>(
    'tous'
  );

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

  const editingBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === editingBonCommandeId),
    [bonsCommande, editingBonCommandeId]
  );

  const receptionBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === receptionBonCommandeId),
    [bonsCommande, receptionBonCommandeId]
  );

  const annulationBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === annulationBonCommandeId),
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

  const {
    snapshotId: snapshotBonCommandeId,
    snapshotItem: snapshotBonCommande,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: openBonCommandeSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: bonsCommande,
    getId: (bc) => bc.id,
    initialId: bonCommandeId,
    onNavigateToId: (id) => navigate(id ? `/app/bons-commande/${id}` : '/app/bons-commande'),
    onMissingId: () => navigate('/app/bons-commande', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotBonCommandeId);

  const filteredBonsCommande = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return bonsCommande
      .filter((bc) => (statutFilter === 'tous' ? true : bc.statut === statutFilter))
      .filter((bc) => {
        if (!searchLower) return true;
        return (
          bc.numero.toLowerCase().includes(searchLower) ||
          bc.objet.toLowerCase().includes(searchLower) ||
          bc.fournisseur?.nom.toLowerCase().includes(searchLower) ||
          bc.engagement?.numero?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => new Date(b.dateCommande).getTime() - new Date(a.dateCommande).getTime());
  }, [bonsCommande, searchTerm, statutFilter]);

  const handleEdit = useCallback((id: string) => {
    setEditingBonCommandeId(id);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingBonCommandeId(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        setEditingBonCommandeId(undefined);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (data: CreateBonCommandeInput | UpdateBonCommandeInput) => {
      if (editingBonCommandeId) {
        await updateBonCommande({ id: editingBonCommandeId, data: data as UpdateBonCommandeInput });
      } else {
        await createBonCommande(data as CreateBonCommandeInput);
      }
      setDialogOpen(false);
      setEditingBonCommandeId(undefined);
    },
    [editingBonCommandeId, createBonCommande, updateBonCommande]
  );

  const handleReceptionner = useCallback((id: string) => {
    setReceptionBonCommandeId(id);
    setReceptionnerDialogOpen(true);
  }, []);

  const handleReceptionnerConfirm = useCallback(
    async (dateLivraisonReelle: string) => {
      if (receptionBonCommandeId) {
        await receptionnerBonCommande({ id: receptionBonCommandeId, date: dateLivraisonReelle });
        setReceptionnerDialogOpen(false);
        setReceptionBonCommandeId(undefined);
      }
    },
    [receptionBonCommandeId, receptionnerBonCommande]
  );

  const handleAnnuler = useCallback((id: string) => {
    setAnnulationBonCommandeId(id);
    setAnnulerDialogOpen(true);
  }, []);

  const handleAnnulerConfirm = useCallback(
    async (motif: string) => {
      if (annulationBonCommandeId) {
        await annulerBonCommande({ id: annulationBonCommandeId, motif });
        setAnnulerDialogOpen(false);
        setAnnulationBonCommandeId(undefined);
      }
    },
    [annulationBonCommandeId, annulerBonCommande]
  );

  const handleCreateFacture = useCallback((id: string) => {
    setFactureBonCommandeId(id);
    setFactureDialogOpen(true);
  }, []);

  const handleSaveFacture = useCallback(
    async (data: CreateFactureInput) => {
      try {
        await createFacture({ facture: data, skipToast: true });
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
      }
    },
    [createFacture, navigate]
  );

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumero();
  }, [genererNumero]);

  const handleGenererNumeroFacture = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return await genererNumeroFacture({ clientId: currentClient.id, exerciceId: currentExercice.id });
  }, [currentClient, currentExercice, genererNumeroFacture]);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
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
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <ListPageLoading
        title="Bons de commande"
        description="Gestion et suivi des bons de commande"
        stickyHeader={false}
      />
    );
  }

  const pageHeaderContent = (
    <PageHeader
      title="Bons de commande"
      description="Gestion et suivi des bons de commande"
      sticky={false}
      scrollProgress={snapshotBonCommandeId ? scrollProgress : 0}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau bon de commande
        </Button>
      }
    />
  );

  const statutOptions: { value: typeof statutFilter; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'brouillon', label: 'Brouillon' },
    { value: 'valide', label: 'Validé' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'receptionne', label: 'Réceptionné' },
    { value: 'facture', label: 'Facturé' },
    { value: 'annule', label: 'Annulé' },
  ];

  const activeStatutLabel = statutOptions.find((option) => option.value === statutFilter)?.label || 'Tous';

  return (
    <div className="space-y-6">
      <style>{CTA_REVEAL_STYLES}</style>
      {!isSnapshotOpen && pageHeaderContent}

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
            onAnnuler={snapshotBonCommande.statut !== 'facture' && snapshotBonCommande.statut !== 'annule' ? () => handleAnnuler(snapshotBonCommande.id) : undefined}
            onCreateFacture={snapshotBonCommande.statut === 'receptionne' ? () => handleCreateFacture(snapshotBonCommande.id) : undefined}
            onNavigateToEntity={handleNavigateToEntity}
          />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            <BonCommandeStats bonsCommande={bonsCommande} />

            <ListLayout
              title="Liste des bons de commande"
              description="Visualisez, filtrez et gérez vos bons de commande"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau bon de commande
                  </Button>
                ) : undefined
              }
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
                          <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value)}>
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStatutFilter('tous')}>Réinitialiser</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>,
                  ]}
                />
              }
            >
              <BonCommandeTable
                bonsCommande={filteredBonsCommande}
                onEdit={handleEdit}
                onValider={validerBonCommande}
                onMettreEnCours={mettreEnCours}
                onReceptionner={handleReceptionner}
                onAnnuler={handleAnnuler}
                onDelete={deleteBonCommande}
                onCreateFacture={handleCreateFacture}
                onViewDetails={openBonCommandeSnapshot}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
              />
            </ListLayout>
          </>
        )}
      </div>

      <BonCommandeDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        bonCommande={editingBonCommande}
        fournisseurs={fournisseurs}
        lignesBudgetaires={lignesBudgetaires}
        projets={projets}
        engagements={engagements.filter((e) => e.statut === 'valide' || e.statut === 'engage')}
        onGenererNumero={handleGenererNumero}
        currentClientId={currentClient?.id || ''}
        currentExerciceId={currentExercice?.id || ''}
      />

      <ReceptionnerBCDialog
        open={receptionnerDialogOpen}
        onOpenChange={(open) => {
          setReceptionnerDialogOpen(open);
          if (!open) setReceptionBonCommandeId(undefined);
        }}
        bonCommande={receptionBonCommande}
        onConfirm={handleReceptionnerConfirm}
      />

      <AnnulerBCDialog
        open={annulerDialogOpen}
        onOpenChange={(open) => {
          setAnnulerDialogOpen(open);
          if (!open) setAnnulationBonCommandeId(undefined);
        }}
        bonCommande={annulationBonCommande}
        onConfirm={handleAnnulerConfirm}
      />

      <FactureDialog
        open={factureDialogOpen}
        onOpenChange={(open) => {
          setFactureDialogOpen(open);
          if (!open) setFactureBonCommandeId(undefined);
        }}
        bonCommande={bonsCommande.find((bc) => bc.id === factureBonCommandeId)}
        fournisseurs={fournisseurs}
        bonsCommande={bonsCommandeReceptionnes}
        lignesBudgetaires={lignesBudgetaires}
        projets={projets}
        engagements={engagements.filter((e) => e.statut === 'valide')}
        onSubmit={handleSaveFacture}
        onGenererNumero={handleGenererNumeroFacture}
      />
    </div>
  );
};

export default BonsCommande;
