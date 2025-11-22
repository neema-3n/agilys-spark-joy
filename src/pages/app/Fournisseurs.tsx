import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { FournisseurDialog } from '@/components/fournisseurs/FournisseurDialog';
import { FournisseurTable } from '@/components/fournisseurs/FournisseurTable';
import { FournisseurStats } from '@/components/fournisseurs/FournisseurStats';
import { FournisseurSnapshot } from '@/components/fournisseurs/FournisseurSnapshot';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { useSnapshotHandlers } from '@/hooks/useSnapshotHandlers';
import { useListSelection } from '@/hooks/useListSelection';
import { Fournisseur, StatutFournisseur } from '@/types/fournisseur.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const Fournisseurs = () => {
  const { fournisseurId } = useParams<{ fournisseurId: string }>();
  const navigate = useNavigate();
  const { fournisseurs, stats, isLoading, create, update, delete: deleteFournisseur } = useFournisseurs();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | undefined>();
  const [activeView, setActiveView] = useState<'stats' | 'list'>('stats');
  const [statutFilter, setStatutFilter] = useState<StatutFournisseur | 'tous'>('tous');

  // Header CTA reveal
  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal();

  // Filtrage par statut
  const filteredFournisseurs = useMemo(() => {
    if (statutFilter === 'tous') return fournisseurs;
    return fournisseurs.filter((f) => f.statut === statutFilter);
  }, [fournisseurs, statutFilter]);

  // Sélection batch
  const selection = useListSelection(filteredFournisseurs.map((f) => f.id));

  // Snapshot state
  const {
    snapshotId,
    snapshotItem: snapshotFournisseur,
    snapshotIndex,
    openSnapshot,
    closeSnapshot,
    navigateSnapshot,
    isSnapshotOpen,
  } = useSnapshotState({
    items: filteredFournisseurs,
    getId: (f) => f.id,
    initialId: fournisseurId,
    onNavigateToId: (id) => {
      if (id) {
        navigate(`/app/fournisseurs/${id}`, { replace: true });
      } else {
        navigate('/app/fournisseurs', { replace: true });
      }
    },
  });

  // Handlers
  const handleCreate = async (data: any) => {
    await create(data);
    setDialogOpen(false);
  };

  const handleEdit = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setDialogOpen(true);
    // Le snapshot reste ouvert intentionnellement
  };

  const handleUpdate = async (data: any) => {
    if (selectedFournisseur) {
      await update({ id: selectedFournisseur.id, input: data });
      setDialogOpen(false);
      setSelectedFournisseur(undefined);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFournisseur(id);
    if (snapshotId === id) {
      closeSnapshot();
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedFournisseur(undefined);
    }
  };

  const handleViewDetails = (id: string) => {
    openSnapshot(id);
  };

  // Snapshot handlers (ne ferment pas le snapshot)
  const snapshotHandlers = useSnapshotHandlers({
    onEdit: () => {
      if (snapshotFournisseur) {
        handleEdit(snapshotFournisseur);
      }
    },
    onDelete: () => {
      if (snapshotFournisseur) {
        handleDelete(snapshotFournisseur.id);
      }
    },
  });

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        stickyHeader
      />
    );
  }

  const hasSelection = selection.selectedArray.length > 0;
  const hasPrev = snapshotIndex > 0;
  const hasNext = snapshotIndex < filteredFournisseurs.length - 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        sticky
        actions={
          <Button ref={headerCtaRef} onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        }
      />

      <div className="px-8 space-y-6">
        {/* Barre d'outils avec filtre statut */}
        <div className="flex items-center gap-4">
          <Button
            variant={activeView === 'stats' ? 'default' : 'outline'}
            onClick={() => setActiveView('stats')}
            size="sm"
          >
            Vue d'ensemble
          </Button>
          <Button
            variant={activeView === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveView('list')}
            size="sm"
          >
            Liste complète
          </Button>

          <div className="flex-1" />

          <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actifs</SelectItem>
              <SelectItem value="inactif">Inactifs</SelectItem>
              <SelectItem value="blackliste">Blacklistés</SelectItem>
              <SelectItem value="en_attente_validation">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Vue d'ensemble */}
        {activeView === 'stats' && (
          <div className="space-y-6">
            <FournisseurStats stats={stats} />

            {stats && stats.topFournisseurs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Fournisseurs par montant engagé</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.topFournisseurs.map((f, index) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(f.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{f.nom}</div>
                            <div className="text-sm text-muted-foreground">
                              {f.nombreEngagements} engagement{f.nombreEngagements > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {new Intl.NumberFormat('fr-FR', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(f.montantTotal)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Liste complète */}
        {activeView === 'list' && (
          <FournisseurTable
            fournisseurs={filteredFournisseurs}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selection={selection}
            stickyHeader
            stickyHeaderOffset={120}
          />
        )}
      </div>

      {/* Snapshot */}
      <Sheet open={isSnapshotOpen} onOpenChange={(open) => !open && closeSnapshot()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {snapshotFournisseur && (
            <FournisseurSnapshot
              fournisseur={snapshotFournisseur}
              onClose={closeSnapshot}
              onNavigate={navigateSnapshot}
              hasPrev={hasPrev}
              hasNext={hasNext}
              currentIndex={snapshotIndex + 1}
              totalCount={filteredFournisseurs.length}
              onEdit={snapshotHandlers.onEdit}
              onDelete={snapshotHandlers.onDelete}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog */}
      <FournisseurDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={selectedFournisseur ? handleUpdate : handleCreate}
        fournisseur={selectedFournisseur}
      />
    </div>
  );
};

export default Fournisseurs;
