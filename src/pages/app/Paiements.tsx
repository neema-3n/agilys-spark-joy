import { useCallback, useMemo, useState } from 'react';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PaiementStats } from '@/components/paiements/PaiementStats';
import { PaiementTable } from '@/components/paiements/PaiementTable';
import { PaiementForm } from '@/components/paiements/PaiementForm';
import { PaiementSnapshot } from '@/components/paiements/PaiementSnapshot';
import { usePaiements } from '@/hooks/usePaiements';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { Card, CardContent } from '@/components/ui/card';
import type { PaiementFormData } from '@/types/paiement.types';

type PaiementLocationState = {
  initialDepenseId?: string;
};

export default function Paiements() {
  const navigate = useNavigate();
  const location = useLocation();
  const { paiementId } = useParams<{ paiementId?: string }>();
  const createMatch = useMatch('/app/paiements/create');
  const isCreateMode = !!createMatch;
  const { paiements, isLoading, annulerPaiement, createPaiement } = usePaiements();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'valide' | 'annule'>('tous');
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [selectedPaiementId, setSelectedPaiementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const initialDepenseId =
    isCreateMode && typeof (location.state as PaiementLocationState | null)?.initialDepenseId === 'string'
      ? ((location.state as PaiementLocationState).initialDepenseId ?? undefined)
      : undefined;

  const filteredPaiements = useMemo(() => {
    const searchLower = search.toLowerCase();
    return paiements
      .filter((p) => (statutFilter === 'tous' ? true : p.statut === statutFilter))
      .filter(
        (p) =>
          !search ||
          p.numero.toLowerCase().includes(searchLower) ||
          p.depense?.numero.toLowerCase().includes(searchLower) ||
          p.referencePaiement?.toLowerCase().includes(searchLower) ||
          p.depense?.fournisseur?.nom?.toLowerCase().includes(searchLower) ||
          p.beneficiaire?.toLowerCase().includes(searchLower) ||
          p.objet?.toLowerCase().includes(searchLower)
      )
      .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());
  }, [paiements, search, statutFilter]);

  const {
    snapshotId: snapshotPaiementId,
    snapshotItem: snapshotPaiement,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot,
    closeSnapshot,
    navigateSnapshot,
  } = useSnapshotState({
    items: paiements,
    getId: (p) => p.id,
    initialId: paiementId,
    onNavigateToId: (id) => navigate(id ? `/app/paiements/${id}` : '/app/paiements'),
    onMissingId: () => navigate('/app/paiements', { replace: true }),
    isLoadingItems: isLoading,
  });

  const scrollProgress = useScrollProgress(!!snapshotPaiementId);

  const handleAnnuler = useCallback((id: string) => {
    setSelectedPaiementId(id);
    setAnnulerDialogOpen(true);
  }, []);

  const handleConfirmAnnuler = useCallback(async () => {
    if (!selectedPaiementId || !motifAnnulation.trim()) return;

    await annulerPaiement({ id: selectedPaiementId, motif: motifAnnulation });
    setAnnulerDialogOpen(false);
    setSelectedPaiementId(null);
    setMotifAnnulation('');
  }, [annulerPaiement, motifAnnulation, selectedPaiementId]);

  const handleCreate = useCallback(() => {
    navigate('/app/paiements/create');
  }, [navigate]);

  const handleSingleSubmit = useCallback(
    async (data: PaiementFormData) => {
      const created = await createPaiement(data);
      navigate(`/app/paiements/${created.id}`);
    },
    [createPaiement, navigate]
  );

  const handleSingleCancel = useCallback(() => {
    if (initialDepenseId) {
      navigate(`/app/depenses/${initialDepenseId}`);
      return;
    }
    navigate('/app/paiements');
  }, [initialDepenseId, navigate]);

  const handleNavigateToEntity = useCallback(
    (type: string, id: string) => {
      switch (type) {
        case 'depense':
          navigate(`/app/depenses/${id}`);
          break;
        case 'fournisseur':
          navigate(`/app/fournisseurs/${id}`);
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
        title="Historique des Paiements"
        description="Consultation de tous les paiements effectués"
        stickyHeader={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {isCreateMode ? (
        <>
          <PageHeader
            title={initialDepenseId ? 'Nouveau paiement sur dépense' : 'Nouveau paiement direct'}
            description={
              initialDepenseId
                ? 'Enregistrez le paiement depuis la dépense sélectionnée.'
                : 'Créez un paiement dans un espace de travail dédié.'
            }
            sticky={false}
            actions={
              <Button variant="outline" onClick={handleSingleCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux paiements
              </Button>
            }
          />

          <Card>
            <CardContent className="pt-6">
              <PaiementForm
                key={`create-${initialDepenseId || 'direct'}`}
                initialDepenseId={initialDepenseId}
                onSubmit={handleSingleSubmit}
                onCancel={handleSingleCancel}
                submitLabel="Enregistrer le paiement"
                useScrollArea={false}
              />
            </CardContent>
          </Card>
        </>
      ) : isSnapshotOpen && snapshotPaiement ? (
        <PaiementSnapshot
          paiement={snapshotPaiement}
          onClose={closeSnapshot}
          onNavigate={navigateSnapshot}
          hasPrev={snapshotIndex > 0}
          hasNext={snapshotIndex < paiements.length - 1}
          currentIndex={snapshotIndex}
          totalCount={paiements.length}
          onAnnuler={snapshotPaiement.statut === 'valide' ? () => handleAnnuler(snapshotPaiement.id) : undefined}
          onNavigateToEntity={handleNavigateToEntity}
        />
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement du paiement...</div>
      ) : (
        <>
          <PageHeader
            title="Historique des Paiements"
            description="Consultation de tous les paiements effectués"
            sticky={false}
            scrollProgress={scrollProgress}
            actions={<Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Nouveau paiement direct</Button>}
          />

          <div className="space-y-6">
            <PaiementStats paiements={paiements} />

            <ListLayout
              title="Liste des paiements"
              description="Recherche et filtres sur l'historique des paiements"
              toolbar={
                <ListToolbar
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Rechercher par numéro, dépense ou référence..."
                  filters={[
                    <DropdownMenu key="statut">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Statut: {statutFilter === 'tous' ? 'Tous' : statutFilter}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[
                          { value: 'tous', label: 'Tous' },
                          { value: 'valide', label: 'Validé' },
                          { value: 'annule', label: 'Annulé' },
                        ].map((option) => (
                          <DropdownMenuItem key={option.value} onClick={() => setStatutFilter(option.value as typeof statutFilter)}>
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
              <PaiementTable
                paiements={filteredPaiements}
                onView={openSnapshot}
                onAnnuler={handleAnnuler}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-240px)] overflow-auto"
              />
            </ListLayout>
          </div>
        </>
      )}

      <AlertDialog open={annulerDialogOpen} onOpenChange={setAnnulerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce paiement</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera le paiement. Le montant payé de la dépense sera recalculé automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motif d'annulation *</label>
              <Textarea
                value={motifAnnulation}
                onChange={(e) => setMotifAnnulation(e.target.value)}
                placeholder="Indiquez le motif de l'annulation..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAnnuler} disabled={!motifAnnulation.trim()}>
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
