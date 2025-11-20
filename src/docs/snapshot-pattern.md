# Pattern Snapshot

## Règle d'or

**Les handlers passés aux composants Snapshot ne doivent JAMAIS appeler `handleCloseSnapshot()`.**

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

## Effet poussoir du header

### Principe

Quand un snapshot est ouvert et que l'utilisateur scroll vers le bas, le `PageHeader` doit progressivement :
- Se réduire (scale)
- Devenir transparent (opacity)
- Se déplacer vers le haut (translateY)
- Devenir flou (blur)

Cela améliore l'expérience utilisateur en maximisant l'espace disponible pour le contenu du snapshot tout en gardant le contexte visible.

### Implémentation

#### 1. Importer le hook `useScrollProgress`

```typescript
import { useScrollProgress } from '@/hooks/useScrollProgress';
```

#### 2. Calculer le scroll progress

Le hook prend en paramètre un booléen indiquant si le snapshot est ouvert :

```typescript
// Gérer le scroll pour l'effet de disparition du header
const scrollProgress = useScrollProgress(!!snapshotFactureId);
```

**Paramètres du hook :**
- `isSnapshotOpen` (boolean) : `true` si un snapshot est ouvert
- `maxScroll` (number, optionnel) : Distance de scroll maximum pour atteindre `progress = 1` (défaut: 100px)

**Retour :**
- `scrollProgress` (number) : Valeur entre 0 et 1 représentant la progression du scroll

#### 3. Passer la prop au PageHeader

```typescript
<PageHeader
  title="Factures"
  description="Gestion des factures"
  scrollProgress={scrollProgress}  // ← Important !
  actions={...}
/>
```

#### 4. Exemple complet dans une page

```typescript
import { useScrollProgress } from '@/hooks/useScrollProgress';

export default function Factures() {
  const [snapshotFactureId, setSnapshotFactureId] = useState<string | null>(null);
  
  // Calculer le scroll progress
  const scrollProgress = useScrollProgress(!!snapshotFactureId);
  
  return (
    <div className="flex-1 overflow-auto">
      <PageHeader
        title="Factures"
        description="Gestion des factures"
        scrollProgress={scrollProgress}
        actions={...}
      />
      
      {snapshotFactureId ? (
        <FactureSnapshot {...} />
      ) : (
        <div className="p-6">
          <FactureTable {...} />
        </div>
      )}
    </div>
  );
}
```

### Points d'attention

- ⚠️ **Ne pas oublier** de passer `scrollProgress` au `PageHeader` : sans cette prop, l'effet ne fonctionnera pas
- ✅ Le hook écoute automatiquement le scroll de l'élément `<main>` de l'application
- ✅ Le hook se nettoie automatiquement (cleanup du listener) au unmount
- ✅ Quand le snapshot se ferme, le `scrollProgress` revient automatiquement à 0

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

## Pages implémentant ce pattern

- ✅ `src/pages/app/Factures.tsx` - Snapshots de factures
- ✅ `src/pages/app/Engagements.tsx` - Snapshots d'engagements
- ✅ `src/pages/app/BonsCommande.tsx` - Snapshots de bons de commande
- ✅ `src/pages/app/Reservations.tsx` - Snapshots de réservations
- ✅ `src/pages/app/Depenses.tsx` - Snapshots de dépenses

## Checklist pour nouveaux snapshots

Lors de la création d'un nouveau snapshot, vérifier :

- [ ] Les handlers ne ferment jamais le snapshot
- [ ] L'interface contient des JSDoc pour documenter le comportement
- [ ] Les raccourcis clavier (Escape, flèches) fonctionnent correctement
- [ ] Le dialogue et le snapshot coexistent visuellement (z-index)
- [ ] La navigation entre snapshots fonctionne pendant qu'un dialogue est ouvert
- [ ] L'effet poussoir du header est implémenté (useScrollProgress + scrollProgress prop)
