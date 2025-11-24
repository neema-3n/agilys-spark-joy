# Table Pattern (List*)

Référence pour les listes factorisées basées sur `ListLayout`, `ListToolbar` et `ListTable`. Le modèle provient de la liste des factures.

## Composants

- `ListLayout` : carte contenant titre, description optionnelle, actions (optionnel aligné à droite), toolbar et footer optionnel.
- `ListToolbar` : barre de recherche + filtres (ReactNode[]) + slot droit (bouton principal). Gère uniquement l’UI, pas le state.
- `ListTable` : tableau générique (shadcn/ui) avec colonnes typées et gestion d’état vide.
- `PaginationControls` : contrôle de pagination serveur (flèches, numéros, page size, raccourcis ← →).

## API principale

```tsx
type ListColumn<T> = {
  id: string;
  header: ReactNode;
  className?: string;
  cellClassName?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => ReactNode;
};

<ListTable
  items={items}
  columns={columns}
  getRowId={(item) => item.id}
  onRowDoubleClick={(item) => onView(item.id)} // optionnel
  emptyMessage="Aucun élément trouvé"
  stickyHeader // optionnel
  stickyHeaderOffset={0} // top pour le sticky
  scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto" // conteneur scroll vertical
  footer={/* PaginationControls ici */}
/>
```

## Bonnes pratiques

- Colonnes : mettre `align: 'right'` pour les montants/dates, `cellClassName` pour truncation (`truncate` + largeur).
- Actions : dernière colonne alignée à droite, largeur fixe (`w-[70px]`), utiliser `DropdownMenu`.
- Navigation : clic sur numéro via `<Link>` + `onViewDetails` pour snapshot; **ne pas fermer** le snapshot depuis un handler.
- États : toujours prévoir `emptyMessage`; gérer loading côté parent (skeleton/spinner).
- Accessibilité : `aria-label` sur l’input de recherche; boutons focusables (`focus-visible` conservé).
- Style : aucune couleur directe; uniquement les tokens du design system (classes shadcn/Tailwind existantes).
- Performance : dériver `columns` et `filteredItems` avec `useMemo` si nécessaire pour éviter les recalculs.
- Scroll : utiliser `scrollContainerClassName` pour définir la hauteur max (`max-h[...]`) et `overflow-auto`; le sticky s’applique sur les `th` avec `stickyHeader` + `stickyHeaderOffset`.

## Pagination serveur (recommandée)

- Pattern : `useServerPagination` + service `getPaginated` (Supabase) + `PaginationControls` dans le footer du `ListTable`.
- Stockage : `pageSize` persisté via `storageKey`, synchro URL (`page`, `pageSize`, filtres), préfetch ±1 page, raccourcis clavier ← →, Ctrl+Home/End.
- Tri/filtre : passer `sortBy`, `sortOrder`, `filters` au service; `setFilters` remet la page à 1. Utiliser des filtres typés (ex: `FactureFilters`).
- Loading : `isLoading` (initial) et `isFetching` (changement page/filtre) alimentent `PaginationControls` (spinner discret).

### Exemple simplifié (dérivé de Factures)

```tsx
// Hook
const {
  data: factures,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  goToPage,
  setPageSize,
  setFilters,
  filters,
  isLoading,
  isFetching,
} = useFacturesPaginated(); // wrap de useServerPagination + mutations CRUD

// Service (supabase)
facturesService.getPaginated = (clientId, exerciceId, params) => {
  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize - 1;
  let query = supabase
    .from('factures')
    .select('*, fournisseurs (id, nom, code)', { count: 'exact' })
    .eq('client_id', clientId);
  if (exerciceId) query = query.eq('exercice_id', exerciceId);
  if (params.filters?.statut) query = query.eq('statut', params.filters.statut);
  if (params.filters?.searchTerm) {
    query = query.or(`numero.ilike.%${params.filters.searchTerm}%,objet.ilike.%${params.filters.searchTerm}%`);
  }
  query = query.order(params.sortBy || 'date_facture', { ascending: params.sortOrder === 'asc' });
  query = query.range(start, end);
  return query.then(({ data, count, error }) => {
    if (error) throw error;
    const totalPages = Math.ceil((count || 0) / params.pageSize);
    return { data: data.map(mapFactureFromDB), totalCount: count || 0, page: params.page, pageSize: params.pageSize, totalPages };
  });
};

// Table + footer
<ListTable
  items={factures}
  columns={columns}
  getRowId={(f) => f.id}
  onRowDoubleClick={(f) => onViewDetails(f.id)}
  emptyMessage="Aucune facture trouvée"
  stickyHeader
  stickyHeaderOffset={0}
  scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
  footer={
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      pageSizeOptions={[10, 25, 50, 100]}
      onPageChange={goToPage}
      onPageSizeChange={setPageSize}
      isLoading={isLoading}
      isFetching={isFetching}
      itemLabel="factures"
      showKeyboardHint
    />
  }
/>
```

### Sélection batch (optionnel)

Utiliser une première colonne `Checkbox` contrôlée par le parent pour exécuter des actions en batch. La sélection est gérée par `useListSelection` et passée au tableau (obligatoire).

```tsx
const ids = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);
const { selectedIds, allSelected, toggleOne, toggleAll } = useListSelection(ids);

const columns: ListColumn<Facture>[] = [
  buildSelectionColumn({
    selection: { selectedIds, allSelected, toggleOne, toggleAll },
    getId: (facture) => facture.id,
    getLabel: (facture) => `Sélectionner la facture ${facture.numero}`,
    allLabel: 'Sélectionner toutes les factures',
  }),
  // ... autres colonnes ...
];

// Utiliser selectedIds pour déclencher l'action batch (ex: bouton dans rightSlot)
```

## Exemple minimal (issu des factures)

```tsx
const columns: ListColumn<Facture>[] = [
  {
    id: 'numero',
    header: 'Numéro',
    render: (facture) => (
      <Link
        to={`/app/factures/${facture.id}`}
        className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          onViewDetails(facture.id);
        }}
      >
        {facture.numero}
      </Link>
    ),
  },
  { id: 'date', header: 'Date', render: (facture) => formatDate(facture.dateFacture) },
  { id: 'montant', header: 'Montant (TTC)', align: 'right', render: (f) => <span className="font-medium">{formatMontant(f.montantTTC)}</span> },
  { id: 'statut', header: 'Statut', render: (f) => getStatutBadge(f.statut) },
  {
    id: 'actions',
    header: '',
    align: 'right',
    cellClassName: 'text-right w-[70px]',
    render: (facture) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDetails(facture.id)}>
            <Eye className="mr-2 h-4 w-4" />
            Voir les détails
          </DropdownMenuItem>
          {/* ...actions conditionnelles... */}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

return (
  <ListLayout
    title="Liste des factures"
    description="Visualisez, filtrez et gérez vos factures fournisseurs"
    actions={<Button onClick={onCreate}>Nouvelle facture</Button>}
    toolbar={
      <ListToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher par numéro, objet, fournisseur..."
        filters={[/* Dropdown statut */]}
      />
    }
  >
    <ListTable
      items={filteredFactures}
      columns={columns}
      getRowId={(facture) => facture.id}
      onRowDoubleClick={(facture) => onViewDetails(facture.id)}
      emptyMessage="Aucune facture trouvée"
      stickyHeader
      stickyHeaderOffset={0}
      scrollContainerClassName="max-h-[calc(100vh-220px)] overflow-auto"
    />
  </ListLayout>
);
```

## Checklist Table/List

- [ ] Colonnes typées `ListColumn<T>` (align/cellClassName pour montants et truncation)
- [ ] `emptyMessage` renseigné
- [ ] Navigation : lien + `onRowDoubleClick` vers snapshot, sans fermer le snapshot
- [ ] Actions à droite via `DropdownMenu`, classes width/align cohérentes
- [ ] Colonne `Checkbox` (si batch) contrôlée par le parent (`toggleAll`, `toggleOne`) via `useListSelection` + `buildSelectionColumn`
- [ ] Toolbar : input avec icône `Search`, filtres en tableau de ReactNode, `rightSlot` pour CTA
- [ ] Respect tokens design system (aucune couleur directe)
- [ ] Loading géré côté parent (spinner/skeleton)
- [ ] Responsive : conteneur scroll horizontal (`overflow-x-auto`) déjà géré
- [ ] State `isLoading` factorisé : composant `ListPageLoading` pour header + message de chargement
- [ ] Scroll vertical : `scrollContainerClassName` pour la hauteur + `overflow-auto`, stickyHeader + offset configuré
- [ ] Pagination serveur : `useServerPagination` + service `getPaginated` + `PaginationControls` en footer (URL sync, raccourcis clavier)
