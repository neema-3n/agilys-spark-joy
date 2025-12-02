import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { FournisseurDialog } from '@/components/fournisseurs/FournisseurDialog';
import { FournisseurTable } from '@/components/fournisseurs/FournisseurTable';
import { FournisseurStats } from '@/components/fournisseurs/FournisseurStats';
import { FournisseurSnapshot } from '@/components/fournisseurs/FournisseurSnapshot';
import { ListPageLoading } from '@/components/lists/ListPageLoading';
import { ListLayout } from '@/components/lists/ListLayout';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { CTA_REVEAL_STYLES, useHeaderCtaReveal } from '@/hooks/useHeaderCtaReveal';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { useSnapshotHandlers } from '@/hooks/useSnapshotHandlers';
import { useListSelection } from '@/hooks/useListSelection';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { Fournisseur, StatutFournisseur } from '@/types/fournisseur.types';
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

const Fournisseurs = () => {
  const { fournisseurId } = useParams<{ fournisseurId: string }>();
  const navigate = useNavigate();
  const { fournisseurs, stats, isLoading, create, update, delete: deleteFournisseur } = useFournisseurs();
  
  // États
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFournisseurId, setEditingFournisseurId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | StatutFournisseur>('tous');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Helper pour récupérer le fournisseur depuis l'ID
  const editingFournisseur = useMemo(
    () => fournisseurs.find((f) => f.id === editingFournisseurId),
    [fournisseurs, editingFournisseurId]
  );

  // Filtrage
  const filteredFournisseurs = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();

    return fournisseurs
      .filter((f) => (statutFilter === 'tous' ? true : f.statut === statutFilter))
      .filter((f) => {
        if (!searchLower) return true;
        return (
          f.code.toLowerCase().includes(searchLower) ||
          f.nom.toLowerCase().includes(searchLower) ||
          f.categorie?.toLowerCase().includes(searchLower) ||
          f.email?.toLowerCase().includes(searchLower) ||
          f.telephone?.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [fournisseurs, searchTerm, statutFilter]);

  // Sélection batch
  const selectionIds = useMemo(
    () => filteredFournisseurs.map((f) => f.id),
    [filteredFournisseurs]
  );
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);

  const selectedFournisseurs = useMemo(
    () => filteredFournisseurs.filter((f) => selectedIds.has(f.id)),
    [filteredFournisseurs, selectedIds]
  );

  const hasSelection = selectedIds.size > 0;

  // Snapshot state
  const {
    snapshotId,
    snapshotItem: snapshotFournisseur,
    snapshotIndex,
    isSnapshotOpen,
    isSnapshotLoading,
    openSnapshot: handleOpenSnapshot,
    closeSnapshot: handleCloseSnapshot,
    navigateSnapshot: handleNavigateSnapshot,
  } = useSnapshotState({
    items: filteredFournisseurs,
    getId: (f) => f.id,
    initialId: fournisseurId,
    onNavigateToId: (id) => navigate(id ? `/app/fournisseurs/${id}` : '/app/fournisseurs'),
    onMissingId: () => navigate('/app/fournisseurs', { replace: true }),
    isLoadingItems: isLoading,
  });

  const { headerCtaRef, isHeaderCtaVisible } = useHeaderCtaReveal([isSnapshotOpen]);
  const scrollProgress = useScrollProgress(!!snapshotId);

  // Handlers
  const handleCreate = useCallback(() => {
    setEditingFournisseurId(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingFournisseurId(undefined);
    }
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingFournisseurId(id);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (data: any) => {
      if (editingFournisseurId) {
        await update({ id: editingFournisseurId, input: data });
      } else {
        await create(data);
      }
      setDialogOpen(false);
      setEditingFournisseurId(undefined);
    },
    [editingFournisseurId, update, create]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFournisseur(id);
      if (snapshotId === id) {
        handleCloseSnapshot();
      }
      setDeleteId(null);
    },
    [deleteFournisseur, snapshotId, handleCloseSnapshot]
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteId) {
      handleDelete(deleteId);
    }
  }, [deleteId, handleDelete]);

  // Snapshot handlers
  const snapshotHandlers = useSnapshotHandlers({
    onEdit: () => {
      if (snapshotFournisseur) {
        handleEdit(snapshotFournisseur.id);
      }
    },
    onDelete: () => {
      if (snapshotFournisseur) {
        setDeleteId(snapshotFournisseur.id);
      }
    },
  });

  const handleExportFournisseurs = useCallback(() => {
    // Exporter tous les fournisseurs filtrés (CSV/Excel)
  }, [filteredFournisseurs]);

  if (isLoading) {
    return (
      <ListPageLoading
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        stickyHeader={false}
      />
    );
  }

  const pageHeaderContent = (
    <PageHeader
      title="Gestion des Fournisseurs"
      description="Référentiel fournisseurs et suivi des contrats"
      scrollProgress={scrollProgress}
      sticky={false}
      actions={
        <Button onClick={handleCreate} ref={headerCtaRef}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      }
    />
  );

  const statutOptions: { value: 'tous' | StatutFournisseur; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'actif', label: 'Actifs' },
    { value: 'inactif', label: 'Inactifs' },
    { value: 'blackliste', label: 'Blacklistés' },
    { value: 'en_attente_validation', label: 'En attente' },
  ];

  const activeStatutLabel =
    statutOptions.find((option) => option.value === statutFilter)?.label || 'Tous';

  return (
    <div className="space-y-6">
      <style>{CTA_REVEAL_STYLES}</style>
      {!isSnapshotOpen && pageHeaderContent}

      <div className="px-8 space-y-6">
        {isSnapshotOpen && snapshotFournisseur ? (
          <FournisseurSnapshot
            fournisseur={snapshotFournisseur}
            onClose={handleCloseSnapshot}
            onNavigate={handleNavigateSnapshot}
            hasPrev={snapshotIndex > 0}
            hasNext={snapshotIndex < filteredFournisseurs.length - 1}
            currentIndex={snapshotIndex}
            totalCount={filteredFournisseurs.length}
            onEdit={snapshotHandlers.onEdit}
            onDelete={snapshotFournisseur.nombreEngagements === 0 ? snapshotHandlers.onDelete : undefined}
          />
        ) : isSnapshotOpen && isSnapshotLoading ? (
          <div className="py-12 text-center text-muted-foreground">Chargement du snapshot...</div>
        ) : (
          <>
            <FournisseurStats stats={stats} />

            <ListLayout
              title="Liste des fournisseurs"
              description="Visualisez, filtrez et gérez votre référentiel fournisseurs"
              actions={
                !isHeaderCtaVisible ? (
                  <Button onClick={handleCreate} className="sticky-cta-appear">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau fournisseur
                  </Button>
                ) : undefined
              }
              toolbar={
                <ListToolbar
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Rechercher par code, nom, catégorie..."
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
                        <Button variant="outline">Actions groupées</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!hasSelection} onClick={() => clearSelection()}>
                          Effacer la sélection
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExportFournisseurs}>
                          Exporter (tous les fournisseurs filtrés)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>,
                  ]}
                />
              }
            >
              <FournisseurTable
                fournisseurs={filteredFournisseurs}
                onViewDetails={handleOpenSnapshot}
                onEdit={(f) => handleEdit(f.id)}
                onDelete={(id) => setDeleteId(id)}
                selection={{ selectedIds, allSelected, toggleOne, toggleAll }}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
              />
            </ListLayout>
          </>
        )}
      </div>

      {/* Dialog */}
      <FournisseurDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        fournisseur={editingFournisseur}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fournisseurs;
