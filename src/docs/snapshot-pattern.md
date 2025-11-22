# Pattern Snapshot

## Règle d'or

**Les handlers passés aux composants Snapshot ne doivent JAMAIS appeler `handleCloseSnapshot()`.**
**Le header du snapshot doit être sticky en haut (pas d'espace vide au scroll).**
**L’URL/state doivent rester synchronisés (ex: `/app/depenses/:id`, `/app/reservations/:id`, `/app/budgets/:ligneId`).**

## Pourquoi cette règle ?

1. **Expérience utilisateur optimale** : L'utilisateur doit pouvoir consulter les informations du snapshot pendant qu'il remplit le formulaire d'édition ou de création
2. **Continuité de navigation** : Le dialogue et le snapshot coexistent grâce au z-index, permettant une référence constante aux données
3. **Cohérence** : Tous les snapshots de l'application doivent se comporter de la même manière

## Comment fermer un snapshot ?

Un snapshot ne se ferme que par :
- ✅ Le bouton X en haut à droite (appelle `onClose`)
- ✅ La touche `Escape` (appelle `onClose`)
- ✅ Navigation vers une autre page
- ✅ Clic sur un autre élément de la liste (change le snapshot affiché)

Un snapshot ne se ferme JAMAIS par :
- ❌ Ouverture d'un dialogue d'édition
- ❌ Ouverture d'un dialogue de création
- ❌ Validation ou modification de l'élément

## Exemple correct

```typescript
// ✅ CORRECT - Le handler ne ferme pas le snapshot
<FactureSnapshot
  facture={snapshotFacture}
  onClose={handleCloseSnapshot}
  onEdit={snapshotFacture.statut === 'brouillon' 
    ? () => handleEdit(snapshotFacture.id) 
    : undefined}
  onCreerDepense={(snapshotFacture.statut === 'validee') 
    ? () => setSelectedFactureForDepense(snapshotFacture) 
    : undefined}
/>
```

## Exemple incorrect

```typescript
// ❌ INCORRECT - Le handler ferme le snapshot
<FactureSnapshot
  facture={snapshotFacture}
  onClose={handleCloseSnapshot}
  onEdit={snapshotFacture.statut === 'brouillon' 
    ? () => { 
        handleEdit(snapshotFacture.id); 
        handleCloseSnapshot(); // ❌ NE JAMAIS FAIRE ÇA
      } 
    : undefined}
/>
```

## Implémentation recommandée

### 1. Dans le composant page (ex: Factures.tsx)

```typescript
// Handlers simples sans fermeture du snapshot
const handleEdit = (factureId: string) => {
  setEditingFactureId(factureId);
  setDialogOpen(true);
  // Le snapshot reste ouvert
};

const handleCreerDepense = (facture: Facture) => {
  setSelectedFactureForDepense(facture);
  // Le snapshot reste ouvert
};
```

### 2. Dans les props du snapshot

```typescript
<FactureSnapshot
  facture={snapshotFacture}
  onClose={handleCloseSnapshot}
  onNavigate={handleNavigateSnapshot}
  onEdit={() => handleEdit(snapshotFacture.id)}
  onCreerDepense={() => handleCreerDepense(snapshotFacture)}
/>
```

### 3. Dans l'interface du composant snapshot

```typescript
interface FactureSnapshotProps {
  facture: Facture;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  
  /**
   * Handler pour l'édition de la facture.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onEdit?: () => void;
  
  /**
   * Handler pour créer une dépense depuis cette facture.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onCreerDepense?: () => void;
}
```

## Hook utilitaire (optionnel)

Pour garantir que les handlers ne ferment jamais le snapshot, vous pouvez utiliser le hook `useSnapshotHandlers` :

```typescript
import { useSnapshotHandlers } from '@/hooks/useSnapshotHandlers';

const handlers = useSnapshotHandlers({
  onEdit: (item) => handleEdit(item.id),
  onCreate: (sourceItem) => handleCreate(sourceItem),
});
```

Ce hook documente clairement l'intention et peut être étendu à l'avenir avec des validations supplémentaires.

### Hook de gestion d'état : `useSnapshotState`

- Emplacement : `src/hooks/useSnapshotState.ts`
- Responsabilités : conserver l'ID actuel, fournir `open/close`, navigation prev/next, reset si l’élément disparaît, synchroniser l’URL via `onNavigateToId`.
- Exemple minimal :

```ts
const {
  snapshotId,
  snapshotItem,
  snapshotIndex,
  isSnapshotOpen,
  openSnapshot,
  closeSnapshot,
  navigateSnapshot,
} = useSnapshotState({
  items: factures,
  getId: f => f.id,
  initialId: factureId, // param route
  onNavigateToId: id => navigate(id ? `/app/factures/${id}` : '/app/factures'),
  onMissingId: () => navigate('/app/factures', { replace: true }),
});
```

## Pages implémentant ce pattern

- ✅ `src/pages/app/Factures.tsx` - Snapshots de factures
- ✅ `src/pages/app/Engagements.tsx` - Snapshots d'engagements
- ✅ `src/pages/app/BonsCommande.tsx` - Snapshot BC + navigation
- ✅ `src/pages/app/Depenses.tsx` - Snapshot dépense + navigation
- ✅ `src/pages/app/Reservations.tsx` - Snapshot réservation + navigation + prompt annulation
- ✅ `src/pages/app/Budgets.tsx` - Snapshot ligne budgétaire + navigation (via query param `ligneId`)

## Checklist pour nouveaux snapshots

Lors de la création d'un nouveau snapshot, vérifier :

- [ ] Les handlers ne ferment jamais le snapshot
- [ ] L'interface contient des JSDoc pour documenter le comportement
- [ ] Les raccourcis clavier (Escape, flèches) fonctionnent correctement
- [ ] Le header du snapshot est sticky/plein écran (pas d’espace vide en haut)
- [ ] Le dialogue et le snapshot coexistent visuellement (z-index)
- [ ] La navigation entre snapshots fonctionne pendant qu'un dialogue est ouvert
- [ ] L’état/URL sont synchronisés (paramètre d’ID ou query param)
- [ ] Quand c’est possible, mutualiser l’état avec `useSnapshotState` (id, navigation, reset, sync URL)
