import { useCallback, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useEngagements } from '@/hooks/useEngagements';
import { BonCommandeStats } from '@/components/bonsCommande/BonCommandeStats';
import { BonCommandeTable } from '@/components/bonsCommande/BonCommandeTable';
import { AnnulerBCDialog } from '@/components/bonsCommande/AnnulerBCDialog';
import { ReceptionnerBCDialog } from '@/components/bonsCommande/ReceptionnerBCDialog';
import { BonCommandeSnapshot } from '@/components/bonsCommande/BonCommandeSnapshot';
import { BonCommandeForm } from '@/components/bonsCommande/BonCommandeForm';
import { CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
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
import { Card, CardContent } from '@/components/ui/card';

type BonsCommandeLocationState = {
  initialEngagementId?: string;
};

const BonsCommande = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bonCommandeId } = useParams<{ bonCommandeId?: string }>();
  const createMatch = useMatch('/app/bons-commande/create');
  const editMatch = useMatch('/app/bons-commande/:bonCommandeId/edit');
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const isCreateMode = !!createMatch;
  const routeEditBonCommandeId = editMatch?.params.bonCommandeId;
  const isEditMode = !!routeEditBonCommandeId;
  const isEditorMode = isCreateMode || isEditMode;
  const initialEngagementId =
    isCreateMode && typeof (location.state as BonsCommandeLocationState | null)?.initialEngagementId === 'string'
      ? ((location.state as BonsCommandeLocationState).initialEngagementId ?? undefined)
      : undefined;

  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [receptionnerDialogOpen, setReceptionnerDialogOpen] = useState(false);
  const [receptionBonCommandeId, setReceptionBonCommandeId] = useState<string | undefined>();
  const [annulationBonCommandeId, setAnnulationBonCommandeId] = useState<string | undefined>();
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
  const { engagements } = useEngagements();

  const routeEditingBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === routeEditBonCommandeId),
    [bonsCommande, routeEditBonCommandeId]
  );

  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === initialEngagementId),
    [engagements, initialEngagementId]
  );

  const receptionBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === receptionBonCommandeId),
    [bonsCommande, receptionBonCommandeId]
  );

  const annulationBonCommande = useMemo(
    () => bonsCommande.find((bc) => bc.id === annulationBonCommandeId),
    [bonsCommande, annulationBonCommandeId]
  );

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

  const handleCreate = useCallback(() => {
    navigate('/app/bons-commande/create');
  }, [navigate]);

  const handleEdit = useCallback(
    (id: string) => {
      navigate(`/app/bons-commande/${id}/edit`);
    },
    [navigate]
  );

  const handleSingleSubmit = useCallback(
    async (data: CreateBonCommandeInput | UpdateBonCommandeInput) => {
      if (routeEditingBonCommande) {
        const updated = await updateBonCommande({ id: routeEditingBonCommande.id, data: data as UpdateBonCommandeInput });
        navigate(`/app/bons-commande/${updated.id}`);
        return;
      }

      const created = await createBonCommande(data as CreateBonCommandeInput);
      navigate(`/app/bons-commande/${created.id}`);
    },
    [routeEditingBonCommande, updateBonCommande, createBonCommande, navigate]
  );

  const handleSingleCancel = useCallback(() => {
    if (routeEditBonCommandeId) {
      navigate(`/app/bons-commande/${routeEditBonCommandeId}`);
      return;
    }
    if (initialEngagementId) {
      navigate(`/app/engagements/${initialEngagementId}`);
      return;
    }
    navigate('/app/bons-commande');
  }, [initialEngagementId, navigate, routeEditBonCommandeId]);

  const handleReceptionner = useCallback((id: string) => {
    setReceptionBonCommandeId(id);
    setReceptionnerDialogOpen(true);
  }, []);

  const handleReceptionnerConfirm = useCallback(
    async (dateLivraisonReelle: string) => {
      if (!receptionBonCommandeId) return;
      await receptionnerBonCommande({ id: receptionBonCommandeId, date: dateLivraisonReelle });
      setReceptionnerDialogOpen(false);
      setReceptionBonCommandeId(undefined);
    },
    [receptionBonCommandeId, receptionnerBonCommande]
  );

  const handleAnnuler = useCallback((id: string) => {
    setAnnulationBonCommandeId(id);
    setAnnulerDialogOpen(true);
  }, []);

  const handleAnnulerConfirm = useCallback(
    async (motif: string) => {
      if (!annulationBonCommandeId) return;
      await annulerBonCommande({ id: annulationBonCommandeId, motif });
      setAnnulerDialogOpen(false);
      setAnnulationBonCommandeId(undefined);
    },
    [annulationBonCommandeId, annulerBonCommande]
  );

  const handleCreateFacture = useCallback(
    (id: string) => {
      navigate('/app/factures/create', {
        state: { initialBonCommandeId: id },
      });
    },
    [navigate]
  );

  const handleGenererNumero = useCallback(async () => {
    if (!currentClient || !currentExercice) return '';
    return genererNumero();
  }, [currentClient, currentExercice, genererNumero]);

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
        default:
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

  const editorHeader = isCreateMode
    ? {
        title: 'Nouveau bon de commande',
        description: selectedEngagement
          ? `Créez un bon de commande à partir de l'engagement ${selectedEngagement.numero}.`
          : 'Créez un bon de commande dans un espace de travail dédié.',
      }
    : {
        title: routeEditingBonCommande ? `Modifier ${routeEditingBonCommande.numero}` : 'Modifier le bon de commande',
        description: 'Éditez le bon de commande directement dans l’outlet.',
      };

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
    <>
      <style>{CTA_REVEAL_STYLES}</style>
      <div className="space-y-6">
        {isEditorMode ? (
          <>
            <PageHeader
              title={editorHeader.title}
              description={editorHeader.description}
              sticky={false}
              actions={
                <Button variant="outline" onClick={handleSingleCancel}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour aux bons de commande
                </Button>
              }
            />

            {isEditMode && !routeEditingBonCommande ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Ce bon de commande est introuvable ou n&apos;est plus accessible depuis la page courante.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/app/bons-commande')}>
                  Retour à la liste
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <BonCommandeForm
                    key={`${isCreateMode ? 'create' : routeEditBonCommandeId || 'unknown'}-${initialEngagementId || 'none'}`}
                    bonCommande={routeEditingBonCommande}
                    selectedEngagement={selectedEngagement}
                    onSubmit={handleSingleSubmit}
                    onCancel={handleSingleCancel}
                    onGenererNumero={handleGenererNumero}
                    submitLabel={routeEditingBonCommande ? 'Enregistrer' : 'Créer le bon de commande'}
                    useScrollArea={false}
                  />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {!isSnapshotOpen && pageHeaderContent}

            <div className="space-y-6">
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
                  onAnnuler={
                    snapshotBonCommande.statut !== 'facture' && snapshotBonCommande.statut !== 'annule'
                      ? () => handleAnnuler(snapshotBonCommande.id)
                      : undefined
                  }
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

            <ReceptionnerBCDialog
              open={receptionnerDialogOpen}
              onOpenChange={(open) => {
                setReceptionnerDialogOpen(open);
                if (!open) setReceptionBonCommandeId(undefined);
              }}
              bonCommandeNumero={receptionBonCommande?.numero || ''}
              onConfirm={handleReceptionnerConfirm}
            />

            <AnnulerBCDialog
              open={annulerDialogOpen}
              onOpenChange={(open) => {
                setAnnulerDialogOpen(open);
                if (!open) setAnnulationBonCommandeId(undefined);
              }}
              bonCommandeNumero={annulationBonCommande?.numero || ''}
              onConfirm={handleAnnulerConfirm}
            />
          </>
        )}
      </div>
    </>
  );
};

export default BonsCommande;
