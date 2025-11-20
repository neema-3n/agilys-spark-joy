# Pattern Table

## Règle d'or

**Toutes les tables de données doivent utiliser le composant `Table` de shadcn/ui avec des colonnes typées, un tri, et des actions de ligne cohérentes.**

## Pourquoi ce pattern ?

1. **Cohérence visuelle** : Toutes les tables ont le même look & feel
2. **Accessibilité** : Les composants shadcn sont accessibles par défaut
3. **Performance** : Tri et filtrage côté client pour petites listes, côté serveur pour grandes
4. **Maintenabilité** : Structure identique facilite les modifications
5. **Responsive** : Adaptation mobile avec scroll horizontal

## Structure de base

### 1. Imports

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useMemo } from 'react';
```

### 2. Props du composant

```typescript
interface TableProps {
  data: Facture[];
  isLoading?: boolean;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRowClick?: (id: string) => void;
}
```

### 3. États et tri

```typescript
const [sortColumn, setSortColumn] = useState<keyof Facture>('dateFacture');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

const handleSort = (column: keyof Facture) => {
  if (sortColumn === column) {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};

const sortedData = useMemo(() => {
  return [...data].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}, [data, sortColumn, sortDirection]);
```

### 4. Structure HTML de la table

```typescript
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead 
          className="cursor-pointer"
          onClick={() => handleSort('numero')}
        >
          Numéro
          {sortColumn === 'numero' && (
            <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </TableHead>
        <TableHead onClick={() => handleSort('dateFacture')}>
          Date
        </TableHead>
        <TableHead>Fournisseur</TableHead>
        <TableHead className="text-right">Montant TTC</TableHead>
        <TableHead>Statut</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    
    <TableBody>
      {isLoading ? (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8">
            Chargement...
          </TableCell>
        </TableRow>
      ) : sortedData.length === 0 ? (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            Aucune facture trouvée
          </TableCell>
        </TableRow>
      ) : (
        sortedData.map((facture) => (
          <TableRow 
            key={facture.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick?.(facture.id)}
          >
            <TableCell className="font-medium">{facture.numero}</TableCell>
            <TableCell>{formatDate(facture.dateFacture)}</TableCell>
            <TableCell>{facture.fournisseurNom}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(facture.montantTTC)}
            </TableCell>
            <TableCell>
              <Badge variant={getStatutVariant(facture.statut)}>
                {facture.statut}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onView(facture.id);
                    }}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir le détail
                    </DropdownMenuItem>
                  )}
                  {onEdit && facture.statut === 'brouillon' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEdit(facture.id);
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  {onDelete && facture.statut === 'brouillon' && (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(facture.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
</div>
```

## Helpers de formatage

Créez des fonctions utilitaires pour le formatage :

```typescript
// Dans @/lib/utils.ts ou un fichier dédié

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR');
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('fr-FR');
};

export const getStatutVariant = (statut: string): 'default' | 'secondary' | 'success' | 'destructive' => {
  switch (statut) {
    case 'brouillon':
      return 'secondary';
    case 'validee':
      return 'success';
    case 'annulee':
      return 'destructive';
    default:
      return 'default';
  }
};
```

## Actions conditionnelles

Les actions doivent être conditionnelles selon le statut :

```typescript
<DropdownMenuContent align="end">
  {/* Toujours visible */}
  <DropdownMenuItem onClick={() => onView(item.id)}>
    <Eye className="mr-2 h-4 w-4" />
    Voir le détail
  </DropdownMenuItem>
  
  {/* Seulement en brouillon */}
  {item.statut === 'brouillon' && (
    <>
      <DropdownMenuItem onClick={() => onEdit(item.id)}>
        <Edit className="mr-2 h-4 w-4" />
        Modifier
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(item.id)}>
        <Trash2 className="mr-2 h-4 w-4" />
        Supprimer
      </DropdownMenuItem>
    </>
  )}
  
  {/* Seulement si validée */}
  {item.statut === 'validee' && (
    <DropdownMenuItem onClick={() => onCreateDepense(item)}>
      <Plus className="mr-2 h-4 w-4" />
      Créer une dépense
    </DropdownMenuItem>
  )}
</DropdownMenuContent>
```

## Responsive - Scroll horizontal

Pour mobile, ajoutez un scroll horizontal :

```typescript
<div className="rounded-md border">
  <div className="overflow-x-auto">
    <Table>
      {/* ... contenu de la table */}
    </Table>
  </div>
</div>
```

## Colonnes avec alignement

```typescript
<TableHead className="text-right">Montant</TableHead>  {/* Nombres à droite */}
<TableCell className="text-right">{formatCurrency(montant)}</TableCell>

<TableHead>Statut</TableHead>  {/* Texte à gauche (défaut) */}
<TableCell><Badge>{statut}</Badge></TableCell>

<TableHead className="text-center">Actions</TableHead>  {/* Centré */}
<TableCell className="text-center">...</TableCell>
```

## Exemples corrects vs incorrects

### ❌ INCORRECT - Pas de tri

```typescript
// ❌ Liste non triée, ordre aléatoire
{data.map((item) => (
  <TableRow key={item.id}>...</TableRow>
))}
```

### ✅ CORRECT - Tri configurable

```typescript
// ✅ Tri selon la colonne et direction
{sortedData.map((item) => (
  <TableRow key={item.id}>...</TableRow>
))}
```

### ❌ INCORRECT - Pas de gestion du loading/empty

```typescript
// ❌ Aucun feedback visuel
<TableBody>
  {data.map((item) => (
    <TableRow>...</TableRow>
  ))}
</TableBody>
```

### ✅ CORRECT - États de chargement et vide

```typescript
// ✅ Feedback clair pour l'utilisateur
<TableBody>
  {isLoading ? (
    <TableRow>
      <TableCell colSpan={6}>Chargement...</TableCell>
    </TableRow>
  ) : data.length === 0 ? (
    <TableRow>
      <TableCell colSpan={6}>Aucune donnée</TableCell>
    </TableRow>
  ) : (
    data.map((item) => <TableRow>...</TableRow>)
  )}
</TableBody>
```

## Points d'attention

- ⚠️ **Tri** : Toujours permettre le tri au moins sur une colonne (date ou numéro)
- ⚠️ **Loading state** : Afficher un état de chargement pendant les requêtes
- ⚠️ **Empty state** : Message clair quand la liste est vide
- ⚠️ **Alignement** : Nombres à droite, texte à gauche, actions à droite
- ⚠️ **Actions conditionnelles** : Désactiver selon le statut ou les droits
- ⚠️ **Stop propagation** : `e.stopPropagation()` dans les actions pour éviter le `onRowClick`
- ⚠️ **Responsive** : Scroll horizontal sur mobile avec `overflow-x-auto`
- ⚠️ **Performance** : Utiliser `useMemo` pour le tri
- ⚠️ **Accessibilité** : Utiliser les composants shadcn qui sont accessibles

## Composants implémentant ce pattern

- ✅ `src/components/factures/FactureTable.tsx`
- ✅ `src/components/engagements/EngagementTable.tsx`
- ✅ `src/components/depenses/DepenseTable.tsx`
- ✅ `src/components/bonsCommande/BonCommandeTable.tsx`
- ✅ `src/components/reservations/ReservationTable.tsx`
- ✅ `src/components/fournisseurs/FournisseurTable.tsx`
- ✅ `src/components/projets/ProjetsTable.tsx`
- ✅ `src/components/budget/BudgetTable.tsx`

## Checklist pour nouvelles tables

Lors de la création d'une nouvelle table, vérifier :

- [ ] Utilisation du composant `Table` de shadcn/ui
- [ ] Au moins une colonne est triable (généralement date ou numéro)
- [ ] Indicateur visuel de tri (flèche ↑ ↓)
- [ ] État de chargement affiché pendant les requêtes
- [ ] Message d'état vide si aucune donnée
- [ ] Nombres alignés à droite, formatés avec `formatCurrency`
- [ ] Dates formatées avec `formatDate` ou `formatDateTime`
- [ ] Badges de statut avec variants cohérents
- [ ] Actions dans un `DropdownMenu` à droite
- [ ] Actions conditionnelles selon le statut
- [ ] `stopPropagation` sur les actions si `onRowClick` existe
- [ ] Scroll horizontal sur mobile (`overflow-x-auto`)
- [ ] `useMemo` pour les données triées
- [ ] `hover:bg-muted/50` sur les lignes si cliquables
