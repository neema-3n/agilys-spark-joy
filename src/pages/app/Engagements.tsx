import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { EngagementFormData } from '@/types/engagement.types';
import type { CreateBonCommandeInput } from '@/types/bonCommande.types';

const Engagements = () => {
  const { engagementId } = useParams<{ engagementId?: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngagementId, setEditingEngagementId] = useState<string | undefined>();
  const [bonCommandeDialogOpen, setBonCommandeDialogOpen] = useState(false);
  const [engagementSourceId, setEngagementSourceId] = useState<string | null>(null);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionEngagementId, setActionEngagementId] = useState<string | null>(null);
  const [engagementForDepenseId, setEngagementForDepenseId] = useState<string | null>(null);
  const [annulationDialogOpen, setAnnulationDialogOpen] = useState(false);
  const [annulationEngagementId, setAnnulationEngagementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'brouillon' | 'valide' | 'engage' | 'liquide' | 'annule'>('tous');
  const navigate = useNavigate();
  const { toast } = useToast();

  const { engagements, isLoading, createEngagement, updateEngagement, validerEngagement, annulerEngagement, deleteEngagement } =
    useEngagements();
  const { createBonCommande, genererNumero } = useBonsCommande();
  const { createDepenseFromEngagement } = useDepenses();

  const filteredEngagements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return engagements
      .filter((engagement) => (statutFilter === 'tous' ? true : engagement.statut === statutFilter))
      .filter((engagement) => {
        if (!term) return true;
        return (
          engagement.numero.toLowerCase().includes(term) ||
          engagement.objet.toLowerCase().includes(term) ||
          engagement.fournisseur?.nom.toLowerCase().includes(term) ||
          engagement.beneficiaire?.toLowerCase().includes(term) ||
          engagement.reservationCredit?.numero?.toLowerCase().includes(term) ||
          engagement.ligneBudgetaire?.libelle?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }, [engagements, statutFilter, searchTerm]);

  const {
    snapshotId: snapshotEngagementId,
    snapshotItem: snapshotEngagement,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: engagements,
    getId: (e) => e.id,
    initialId: engagementId,
    onNavigateToId: (id) => navigate(id ? `/app/engagements/${id}` : '/app/engagements'),
    onMissingId: () => navigate('/app/engagements', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotEngagementId);

  const editingEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === editingEngagementId),
    [editingEngagementId, engagements]
  );

  const engagementSource = useMemo(
    () => engagements.find((engagement) => engagement.id === engagementSourceId),
    [engagementSourceId, engagements]
  );

  const engagementForDepense = useMemo(
    () => engagements.find((engagement) => engagement.id === engagementForDepenseId) || null,
    [engagementForDepenseId, engagements]
  );

  const handleCreate = useCallback(() => {
    setEditingEngagementId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((engagementId: string) => {
    setEditingEngagementId(engagementId);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingEngagementId(undefined);
    }
  }, []);

  const handleSave = useCallback(
    async (data: EngagementFormData) => {
      try {
        if (editingEngagementId) {
          await updateEngagement({ id: editingEngagementId, updates: data });
          toast({
            title: 'Engagement modifié',
            description: "L'engagement a été modifié avec succès.",
          });
        } else {
          await createEngagement(data);
          toast({
            title: 'Engagement créé',
            description: "L'engagement a été créé avec succès.",
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
    },
    [createEngagement, editingEngagementId, toast, updateEngagement]
  );

  const handleValider = useCallback((id: string) => {
    setActionEngagementId(id);
    setValidateDialogOpen(true);
  }, []);

  const confirmValider = useCallback(async () => {
    if (!actionEngagementId) return;

    try {
      await validerEngagement(actionEngagementId);
      toast({
        title: 'Engagement validé',
        description: "L'engagement a été validé avec succès.",
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
  }, [actionEngagementId, toast, validerEngagement]);

  const handleAnnulationRequest = useCallback((id: string) => {
    setAnnulationEngagementId(id);
    setMotifAnnulation('');
    setAnnulationDialogOpen(true);
  }, []);

  const handleAnnuler = useCallback(
    async (id: string, motif: string) => {
      try {
        await annulerEngagement({ id, motif });
        toast({
          title: 'Engagement annulé',
          description: "L'engagement a été annulé.",
        });
      } catch (error: any) {
        toast({
          title: "Erreur d'annulation",
          description: error.message || "Une erreur est survenue lors de l'annulation.",
          variant: 'destructive',
        });
      }
    },
    [annulerEngagement, toast]
  );

  const handleConfirmMotifAnnulation = useCallback(async () => {
    if (!annulationEngagementId || !motifAnnulation.trim()) return;
    await handleAnnuler(annulationEngagementId, motifAnnulation.trim());
    setAnnulationDialogOpen(false);
    setAnnulationEngagementId(null);
    setMotifAnnulation('');
  }, [annulationEngagementId, handleAnnuler, motifAnnulation]);

  const handleDelete = useCallback((id: string) => {
    setActionEngagementId(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!actionEngagementId) return;

    try {
      await deleteEngagement(actionEngagementId);
      toast({
        title: 'Engagement supprimé',
        description: "L'engagement a été supprimé avec succès.",
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
  }, [actionEngagementId, deleteEngagement, toast]);

  const handleCreerBonCommande = useCallback((engagementId: string) => {
    setEngagementSourceId(engagementId);
    setBonCommandeDialogOpen(true);
  }, []);

  const handleSaveBonCommande = useCallback(
    async (data: CreateBonCommandeInput) => {
      try {
        const engagement = engagements.find((e) => e.id === engagementSourceId);

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
    },
    [createBonCommande, engagements, engagementSourceId, navigate, toast]
  );

  const handleCreerDepense = useCallback((engagementId: string) => {
    setEngagementForDepenseId(engagementId);
  }, []);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
      const entityRoutes: Record<string, string> = {
        fournisseur: `/app/fournisseurs/${id}`,
        ligneBudgetaire: `/app/budgets/${id}?tab=lignes`,
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
          navigate,
        });
      }
    },
    [navigate]
  );

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
  }, [snapshotEngagementId, snapshotIndex, engagements.length, handleCloseSnapshot, handleNavigateSnapshot]);

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Engagements"
        description="Demandes, validations et suivi des engagements"
        stickyHeader={false}
      />
    );
  }

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Engagements"
      description="Demandes, validations et suivi des engagements"
      sticky={false}
      scrollProgress={snapshotEngagementId ? scrollProgress : 0}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel engagement
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <style>{CTA_REVEAL_STYLES}</style>
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
        onEdit={() => handleEdit(snapshotEngagement.id)}
        onValider={snapshotEngagement.statut === 'brouillon' ? () => handleValider(snapshotEngagement.id) : undefined}
        onCreerBonCommande={
          snapshotEngagement.statut === 'valide' ? () => handleCreerBonCommande(snapshotEngagement.id) : undefined
        }
        onCreerDepense={snapshotEngagement.statut === 'valide' ? () => handleCreerDepense(snapshotEngagement.id) : undefined}
        onAnnuler={
          snapshotEngagement.statut === 'brouillon' || snapshotEngagement.statut === 'valide'
            ? () => handleAnnulationRequest(snapshotEngagement.id)
            : undefined
        }
        onNavigateToEntity={handleNavigateToEntity}
      />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            <EngagementStats engagements={engagements} />

            <ListLayout
              title="Liste des engagements"
              description="Recherche, filtres et actions sur les engagements"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvel engagement
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
                        <Button variant="outline">Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[
                          { value: 'tous', label: 'Tous' },
                          { value: 'brouillon', label: 'Brouillon' },
                          { value: 'valide', label: 'Validé' },
                          { value: 'engage', label: 'Engagé' },
                          { value: 'liquide', label: 'Liquidé' },
                          { value: 'annule', label: 'Annulé' },
                        ].map((option) => (
                          <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value as any)}>
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
              <EngagementTable
                engagements={filteredEngagements}
                onEdit={handleEdit}
                onValider={handleValider}
                onAnnuler={handleAnnulationRequest}
                onDelete={handleDelete}
                onCreerBonCommande={handleCreerBonCommande}
                onCreerDepense={handleCreerDepense}
                onViewDetails={handleOpenSnapshot}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
              />
            </ListLayout>
          </>
        )}
      </div>

      <EngagementDialog open={dialogOpen} onOpenChange={handleDialogClose} onSave={handleSave} engagement={editingEngagement} />

      <BonCommandeDialog
        open={bonCommandeDialogOpen}
        onOpenChange={(open) => {
          setBonCommandeDialogOpen(open);
          if (!open) setEngagementSourceId(null);
        }}
        selectedEngagement={engagementSource}
        onSubmit={handleSaveBonCommande}
        onGenererNumero={genererNumero}
      />

      <AlertDialog
        open={annulationDialogOpen}
        onOpenChange={(open) => {
          setAnnulationDialogOpen(open);
          if (!open) {
            setAnnulationEngagementId(null);
            setMotifAnnulation('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler l&apos;engagement</AlertDialogTitle>
            <AlertDialogDescription>Veuillez indiquer le motif d&apos;annulation de cet engagement.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="motif-engagement">Motif d&apos;annulation</Label>
            <Input
              id="motif-engagement"
              value={motifAnnulation}
              onChange={(event) => setMotifAnnulation(event.target.value)}
              placeholder="Ex: réaffectation budgétaire, erreur de saisie..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmMotifAnnulation}
              disabled={!motifAnnulation.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l&apos;annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cet engagement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action confirmera l'engagement et permettra la création de bons de commande. L'engagement ne pourra plus être modifié
              après validation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmValider}>Valider l'engagement</AlertDialogAction>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateDepenseFromEngagementDialog
        open={!!engagementForDepense}
        onOpenChange={(open) => !open && setEngagementForDepenseId(null)}
        engagement={engagementForDepense}
        onSave={async (data) => {
          try {
            const engagement = engagementForDepense;
            await createDepenseFromEngagement(data);

            setEngagementForDepenseId(null);

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
