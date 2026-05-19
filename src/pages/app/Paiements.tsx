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
import { PaginationControls } from '@/components/lists/PaginationControls';
import {
  AdvancedFiltersPanel,
  AdvancedFiltersToggleButton,
} from '@/components/lists/AdvancedFiltersPanel';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { useSnapshotState } from '@/hooks/useSnapshotState';
import { Card, CardContent } from '@/components/ui/card';
import type { PaiementFormData } from '@/types/paiement.types';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
import { useListSelection } from '@/hooks/useListSelection';
import { useClientPagination } from '@/hooks/useClientPagination';
import { Input } from '@/components/ui/input';
import { useDepenses } from '@/hooks/useDepenses';

type PaiementLocationState = {
  initialDepenseId?: string;
};

export default function Paiements() {
  const navigate = useNavigate();
  const location = useLocation();
  const { paiementId } = useParams<{ paiementId?: string }>();
  const createMatch = useMatch('/app/paiements/create');
  const editMatch = useMatch('/app/paiements/:paiementId/edit');
  const isCreateMode = !!createMatch;
  const isEditMode = !!editMatch;
  const { paiements, isLoading, annulerPaiement, createPaiement, updatePaiement, validerPaiement } =
    usePaiements();
  const { depenses, isLoading: isDepensesLoading } = useDepenses();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<'tous' | 'brouillon' | 'valide' | 'annule'>('tous');
  const [annulerDialogOpen, setAnnulerDialogOpen] = useState(false);
  const [selectedPaiementId, setSelectedPaiementId] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [isPaiementDirty, setIsPaiementDirty] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [modeFilter, setModeFilter] = useState<'tous' | 'virement' | 'cheque' | 'especes' | 'carte' | 'autre'>('tous');
  const [sourceFilter, setSourceFilter] = useState<'tous' | 'depense'>('tous');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const initialDepenseId =
    (isCreateMode || isEditMode) &&
    typeof (location.state as PaiementLocationState | null)?.initialDepenseId === 'string'
      ? ((location.state as PaiementLocationState).initialDepenseId ?? undefined)
      : undefined;
  const selectedDepense = useMemo(
    () => depenses.find((item) => item.id === initialDepenseId),
    [depenses, initialDepenseId]
  );
  const isWaitingForPreselection =
    Boolean(initialDepenseId) && isDepensesLoading && !selectedDepense;
  const editingPaiement = useMemo(
    () => (isEditMode ? paiements.find((item) => item.id === paiementId) : undefined),
    [isEditMode, paiementId, paiements]
  );

  const filteredPaiements = useMemo(() => {
    const searchLower = search.toLowerCase();
    return paiements
      .filter((p) => (statutFilter === 'tous' ? true : p.statut === statutFilter))
      .filter((p) => (modeFilter === 'tous' ? true : p.modePaiement === modeFilter))
      .filter((p) => (sourceFilter === 'tous' ? true : !!p.depenseId))
      .filter((p) => (!dateDebut ? true : p.datePaiement >= dateDebut))
      .filter((p) => (!dateFin ? true : p.datePaiement <= dateFin))
      .filter((p) => (!montantMin ? true : p.montant >= Number(montantMin)))
      .filter((p) => (!montantMax ? true : p.montant <= Number(montantMax)))
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
  }, [dateDebut, dateFin, modeFilter, montantMax, montantMin, paiements, search, sourceFilter, statutFilter]);

  const activeAdvancedFiltersCount = [
    modeFilter !== 'tous',
    sourceFilter !== 'tous',
    !!dateDebut,
    !!dateFin,
    !!montantMin,
    !!montantMax,
  ].filter(Boolean).length;

  const {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    paginatedItems,
    goToPage,
    setPageSize,
  } = useClientPagination(filteredPaiements, {
    initialPageSize: 25,
    resetKey: [search, statutFilter, modeFilter, sourceFilter, dateDebut, dateFin, montantMin, montantMax].join('|'),
  });

  const selectionIds = useMemo(() => paginatedItems.map((paiement) => paiement.id), [paginatedItems]);
  const { selectedIds, allSelected, toggleOne, toggleAll, clearSelection } = useListSelection(selectionIds);
  const selectedPaiements = useMemo(
    () => paginatedItems.filter((paiement) => selectedIds.has(paiement.id)),
    [paginatedItems, selectedIds]
  );
  const hasBrouillonsSelected = selectedPaiements.some((paiement) => paiement.statut === 'brouillon');

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

  const handleBatchValider = useCallback(async () => {
    const candidates = selectedPaiements.filter((paiement) => paiement.statut === 'brouillon');
    if (candidates.length === 0) return;
    await Promise.all(candidates.map((paiement) => validerPaiement(paiement.id)));
    clearSelection();
  }, [clearSelection, selectedPaiements, validerPaiement]);

  const resetAdvancedFilters = useCallback(() => {
    setModeFilter('tous');
    setSourceFilter('tous');
    setDateDebut('');
    setDateFin('');
    setMontantMin('');
    setMontantMax('');
  }, []);

  const handleSingleSubmit = useCallback(
    async (data: PaiementFormData) => {
      if (isEditMode && paiementId) {
        const updated = await updatePaiement({ id: paiementId, data });
        if (data.statut === 'valide' && updated.statut !== 'valide') {
          await validerPaiement(updated.id);
        }
        navigate(`/app/paiements/${paiementId}`);
        return;
      }

      const created = await createPaiement(data);
      navigate(`/app/paiements/${created.id}`);
    },
    [createPaiement, isEditMode, navigate, paiementId, updatePaiement, validerPaiement]
  );

  const handleSingleCancel = useCallback(() => {
    if (initialDepenseId) {
      navigate(`/app/depenses/${initialDepenseId}`);
      return;
    }
    navigate('/app/paiements');
  }, [initialDepenseId, navigate]);

  const { guard } = useFocusedEditorGuard({
    active: isCreateMode || isEditMode,
    dirty: isPaiementDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de paiement',
    overlayAriaLabel: 'Quitter le formulaire de paiement',
  });

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
        title="Gestion des Paiements"
        description="Gestion et suivi des paiements effectués"
        stickyHeader={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {guard}
      {isCreateMode || isEditMode ? (
        <>
          <PageHeader
            title={
              isEditMode
                ? `Modifier ${editingPaiement?.numero || 'le paiement'}`
                : initialDepenseId
                  ? 'Nouveau paiement sur dépense'
                  : 'Nouveau paiement'
            }
            description={
              isEditMode
                ? 'Modifiez un brouillon de paiement dans un espace de travail dédié.'
                : initialDepenseId
                ? 'Enregistrez le paiement depuis la dépense sélectionnée.'
                : 'Sélectionnez la dépense à régler avant de saisir le paiement.'
            }
            sticky={false}
            actions={
              <Button variant="outline" onClick={handleSingleCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour aux paiements
              </Button>
            }
          />

          {isWaitingForPreselection ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Chargement des données source du paiement...
              </p>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {isEditMode && !editingPaiement ? (
                  <div className="py-8 text-center text-muted-foreground">Chargement du paiement...</div>
                ) : isEditMode && editingPaiement?.statut !== 'brouillon' ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Seuls les paiements en brouillon peuvent être modifiés.
                  </div>
                ) : (
                  <PaiementForm
                    key={isEditMode ? `edit-${paiementId}` : `create-${initialDepenseId || 'direct'}`}
                    paiement={editingPaiement}
                    initialDepenseId={initialDepenseId}
                    onSubmit={handleSingleSubmit}
                    onCancel={handleSingleCancel}
                    onDirtyChange={setIsPaiementDirty}
                    submitLabel="Valider le paiement"
                    useScrollArea={false}
                  />
                )}
              </CardContent>
            </Card>
          )}
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
          onEdit={
            snapshotPaiement.statut === 'brouillon'
              ? () => navigate(`/app/paiements/${snapshotPaiement.id}/edit`)
              : undefined
          }
          onValidate={
            snapshotPaiement.statut === 'brouillon'
              ? async () => {
                  await validerPaiement(snapshotPaiement.id);
                  navigate(`/app/paiements/${snapshotPaiement.id}`);
                }
              : undefined
          }
          onAnnuler={snapshotPaiement.statut === 'valide' ? () => handleAnnuler(snapshotPaiement.id) : undefined}
          onNavigateToEntity={handleNavigateToEntity}
        />
      ) : isSnapshotOpen && isSnapshotLoading ? (
        <div className="py-12 text-center text-muted-foreground">Chargement du paiement...</div>
      ) : (
        <>
          <PageHeader
            title="Gestion des Paiements"
            description="Gestion et suivi des paiements effectués"
            sticky={false}
            scrollProgress={scrollProgress}
            actions={<Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" />Nouveau paiement</Button>}
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
                          { value: 'brouillon', label: 'Brouillon' },
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
                    <AdvancedFiltersToggleButton
                      key="advanced-filters"
                      open={isAdvancedFiltersOpen}
                      onToggle={() => setIsAdvancedFiltersOpen((open) => !open)}
                      activeCount={activeAdvancedFiltersCount}
                    />,
                    <DropdownMenu key="batch-actions">
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Actions groupées</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!hasBrouillonsSelected} onClick={handleBatchValider}>
                          Valider les brouillons
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={selectedIds.size === 0} onClick={clearSelection}>
                          Effacer la sélection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>,
                  ]}
                />
              }
              advancedFilters={
                <AdvancedFiltersPanel
                  open={isAdvancedFiltersOpen}
                  onReset={resetAdvancedFilters}
                  resetDisabled={activeAdvancedFiltersCount === 0}
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mode de paiement</label>
                      <Select value={modeFilter} onValueChange={(value) => setModeFilter(value as typeof modeFilter)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tous">Tous les modes</SelectItem>
                          <SelectItem value="virement">Virement</SelectItem>
                          <SelectItem value="cheque">Chèque</SelectItem>
                          <SelectItem value="especes">Espèces</SelectItem>
                          <SelectItem value="carte">Carte</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Source</label>
                      <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as typeof sourceFilter)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tous">Toutes les sources</SelectItem>
                          <SelectItem value="depense">Paiements sur dépense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date début</label>
                        <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Date fin</label>
                        <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Montant</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Min" value={montantMin} onChange={(e) => setMontantMin(e.target.value)} />
                        <Input type="number" placeholder="Max" value={montantMax} onChange={(e) => setMontantMax(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </AdvancedFiltersPanel>
              }
            >
              <PaiementTable
                paiements={paginatedItems}
                onView={openSnapshot}
                onEdit={(id) => navigate(`/app/paiements/${id}/edit`)}
                onValidate={async (id) => {
                  await validerPaiement(id);
                }}
                onAnnuler={handleAnnuler}
                selection={{ selectedIds, allSelected, toggleOne, toggleAll }}
                stickyHeader
                stickyHeaderOffset={0}
                scrollContainerClassName="max-h-[calc(100vh-240px)] overflow-auto"
                footer={
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={goToPage}
                    onPageSizeChange={setPageSize}
                    isLoading={isLoading}
                    itemLabel="paiements"
                    showKeyboardHint
                  />
                }
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
