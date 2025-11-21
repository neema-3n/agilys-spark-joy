# AGENTS - Pièges et Erreurs Courantes

> **🎯 Objectif** : Référence complète des erreurs courantes et comment les éviter dans AGILYS
> **👥 Pour qui** : Agents IA intervenant sur le code
> **⏱️ Dernière MAJ** : 2025-01-21

## 📍 Navigation Rapide

- [Erreurs TypeScript](#-erreurs-typescript)
- [Erreurs Supabase](#-erreurs-supabase)
- [Erreurs React](#-erreurs-react)
- [Erreurs Performance](#-erreurs-performance)
- [Erreurs UX](#-erreurs-ux)
- [Erreurs Sécurité](#-erreurs-sécurité)
- [Erreurs Design System](#-erreurs-design-system)

---

## 🔴 Erreurs TypeScript

### 1. Utiliser `any` au lieu de types stricts

❌ **MAUVAIS**
```typescript
const handleSubmit = (data: any) => {
  console.log(data.montant); // Pas de vérification de type
};
```

✅ **CORRECT**
```typescript
const handleSubmit = (data: z.infer<typeof formSchema>) => {
  console.log(data.montant); // Type vérifié
};
```

**Pourquoi ?**
- Perte de sécurité TypeScript
- Erreurs détectées seulement au runtime
- Autocomplétion impossible

---

### 2. Oublier de parser les nombres de DB

❌ **MAUVAIS**
```typescript
const mapFromDatabase = (row: any): Engagement => ({
  montant: row.montant, // ⚠️ RETOURNE STRING!
});
```

✅ **CORRECT**
```typescript
const mapFromDatabase = (row: any): Engagement => ({
  montant: parseFloat(row.montant || 0), // ✅ Converti en nombre
});
```

**Pourquoi ?**
- PostgreSQL retourne les `numeric` en string via API
- Calculs échouent silencieusement : `"100" + "50" = "10050"` au lieu de `150`

**⚠️ Règle** : **TOUJOURS** `parseFloat()` pour montants, quantités, pourcentages

---

### 3. Assertions de type dangereuses

❌ **MAUVAIS**
```typescript
const engagement = data as Engagement; // Force le type sans vérification
```

✅ **CORRECT**
```typescript
const engagement = mapFromDatabase(data); // Transformation explicite et typée
```

**Pourquoi ?**
- Assertion force le type sans validation
- Erreurs silencieuses si structure change

---

### 4. Types optionnels mal gérés

❌ **MAUVAIS**
```typescript
const total = engagements.reduce((sum, e) => sum + e.montant, 0);
// ⚠️ Crash si e.montant est undefined
```

✅ **CORRECT**
```typescript
const total = engagements.reduce((sum, e) => sum + (e.montant || 0), 0);
// ✅ Gère les valeurs nulles/undefined
```

---

## 🗄️ Erreurs Supabase

### 1. Oublier de filtrer par `client_id` et `exercice_id`

❌ **MAUVAIS**
```typescript
const { data } = await supabase
  .from('engagements')
  .select('*');
// ⚠️ Retourne TOUS les engagements de TOUS les clients!
```

✅ **CORRECT**
```typescript
const { data } = await supabase
  .from('engagements')
  .select('*')
  .eq('client_id', clientId)
  .eq('exercice_id', exerciceId);
```

**Impact** :
- 🔴 **Fuite de données** entre clients
- 🔴 **Violation RLS** si policies mal configurées

---

### 2. Ne pas gérer les erreurs

❌ **MAUVAIS**
```typescript
const { data } = await supabase.from('engagements').select('*');
// ⚠️ Aucune gestion d'erreur
```

✅ **CORRECT**
```typescript
const { data, error } = await supabase.from('engagements').select('*');
if (error) throw error;
```

**Pourquoi ?**
- Erreurs silencieuses difficiles à debugger
- Pas de feedback utilisateur

---

### 3. Génération de numéros côté client

❌ **MAUVAIS**
```typescript
const numero = `ENG/${new Date().getFullYear()}/${Math.random()}`;
// ⚠️ Risque de doublon élevé!
```

✅ **CORRECT**
```typescript
const { data, error } = await supabase.functions.invoke('create-engagement', {
  body: input,
});
// ✅ Numéro unique garanti par edge function
```

**Pourquoi ?**
- Risque de numéros en double (race condition)
- Pas de séquence cohérente

---

### 4. Oublier `.single()` pour une seule ligne

❌ **MAUVAIS**
```typescript
const { data } = await supabase
  .from('engagements')
  .select('*')
  .eq('id', id);
// ⚠️ Retourne un tableau [engagement] au lieu de engagement
```

✅ **CORRECT**
```typescript
const { data } = await supabase
  .from('engagements')
  .select('*')
  .eq('id', id)
  .single(); // ✅ Retourne l'objet directement
```

---

### 5. Ne pas invalider le cache après mutation

❌ **MAUVAIS**
```typescript
const createMutation = useMutation({
  mutationFn: (input) => engagementsService.create(input),
  // ⚠️ Pas de invalidation → données obsolètes!
});
```

✅ **CORRECT**
```typescript
const createMutation = useMutation({
  mutationFn: (input) => engagementsService.create(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['engagements'] });
    queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] }); // ✅ Invalider aussi les lignes impactées
  },
});
```

---

### 6. Modifier les schemas réservés Supabase

❌ **MAUVAIS**
```sql
-- ⚠️ NE JAMAIS faire ça
ALTER TABLE auth.users ADD COLUMN nom TEXT;
```

**Schémas réservés** :
- `auth`
- `storage`
- `realtime`
- `supabase_functions`
- `vault`

**Solution** : Créer une table `profiles` dans `public` pour données utilisateur supplémentaires.

---

## ⚛️ Erreurs React

### 1. Oublier `useMemo` pour calculs coûteux

❌ **MAUVAIS**
```typescript
const Dashboard = ({ engagements }) => {
  const total = engagements.reduce((sum, e) => sum + e.montant, 0);
  // ⚠️ Recalculé à CHAQUE render (même si engagements ne change pas)
  
  return <StatsCard value={total} />;
};
```

✅ **CORRECT**
```typescript
const Dashboard = ({ engagements }) => {
  const total = useMemo(
    () => engagements.reduce((sum, e) => sum + e.montant, 0),
    [engagements]
  );
  
  return <StatsCard value={total} />;
};
```

**Impact** :
- Performance dégradée (recalcul inutile)
- Lag sur grandes listes

---

### 2. Modifier l'état directement

❌ **MAUVAIS**
```typescript
engagements.push(newEngagement); // ⚠️ Mutation directe!
setEngagements(engagements); // React ne détecte pas le changement
```

✅ **CORRECT**
```typescript
setEngagements([...engagements, newEngagement]); // ✅ Nouvel objet
```

---

### 3. Dépendances manquantes dans `useEffect`

❌ **MAUVAIS**
```typescript
useEffect(() => {
  loadEngagements(clientId);
}, []); // ⚠️ clientId manquant!
```

✅ **CORRECT**
```typescript
useEffect(() => {
  loadEngagements(clientId);
}, [clientId]); // ✅ Se relance si clientId change
```

---

### 4. Fermer le snapshot dans un handler (Règle d'or violée!)

❌ **MAUVAIS**
```typescript
<FactureSnapshot
  onEdit={() => {
    handleEdit(id);
    handleCloseSnapshot(); // ❌ VIOLATION RÈGLE D'OR
  }}
/>
```

✅ **CORRECT**
```typescript
<FactureSnapshot
  onEdit={() => handleEdit(id)} // ✅ Le snapshot reste ouvert
/>
```

**Voir** : `src/docs/snapshot-pattern.md`

---

### 5. Clés manquantes dans listes

❌ **MAUVAIS**
```tsx
{engagements.map(e => (
  <div>{e.numero}</div> // ⚠️ Pas de key
))}
```

✅ **CORRECT**
```tsx
{engagements.map(e => (
  <div key={e.id}>{e.numero}</div>
))}
```

---

## ⚡ Erreurs Performance

### 1. Charger toutes les données d'un coup

❌ **MAUVAIS**
```typescript
// Charger 10000 engagements en une fois
const { data: engagements } = useQuery({
  queryKey: ['engagements'],
  queryFn: () => engagementsService.getAll(clientId, exerciceId),
});
```

✅ **CORRECT**
```typescript
// Pagination + filtrage
const { data: engagements } = useQuery({
  queryKey: ['engagements', page, filters],
  queryFn: () => engagementsService.getPage(clientId, exerciceId, page, filters),
});
```

**Solution** :
- Pagination (ex: 50 items par page)
- Lazy loading
- Virtual scrolling (react-window)

---

### 2. Re-renders inutiles

❌ **MAUVAIS**
```typescript
<EngagementTable
  data={engagements}
  onEdit={(id) => console.log(id)} // ⚠️ Nouvelle fonction à chaque render
/>
```

✅ **CORRECT**
```typescript
const handleEdit = useCallback((id: string) => {
  console.log(id);
}, []);

<EngagementTable data={engagements} onEdit={handleEdit} />
```

---

### 3. Requêtes en cascade (N+1 problem)

❌ **MAUVAIS**
```typescript
// Charger engagements
const engagements = await getEngagements();

// Pour chaque engagement, charger le fournisseur (N requêtes!)
for (const eng of engagements) {
  const fournisseur = await getFournisseur(eng.fournisseurId);
}
```

✅ **CORRECT**
```typescript
// 1 seule requête avec join
const { data } = await supabase
  .from('engagements')
  .select('*, fournisseurs(*)') // ✅ Join
  .eq('client_id', clientId);
```

---

## 🎨 Erreurs UX

### 1. Pas de loading state

❌ **MAUVAIS**
```typescript
const { data: engagements } = useQuery(...);

return (
  <Table data={engagements} />
  // ⚠️ Affichage vide pendant chargement
);
```

✅ **CORRECT**
```typescript
const { data: engagements, isLoading } = useQuery(...);

if (isLoading) {
  return <Skeleton />;
}

return <Table data={engagements} />;
```

---

### 2. Pas de feedback après action

❌ **MAUVAIS**
```typescript
const handleCreate = async () => {
  await createEngagement(data);
  // ⚠️ Utilisateur ne sait pas si ça a fonctionné
};
```

✅ **CORRECT**
```typescript
const handleCreate = async () => {
  try {
    await createEngagement(data);
    toast.success('Engagement créé avec succès');
  } catch (error) {
    toast.error('Erreur lors de la création');
  }
};
```

---

### 3. Messages d'erreur non explicites

❌ **MAUVAIS**
```typescript
toast.error('Erreur'); // ⚠️ Trop vague
```

✅ **CORRECT**
```typescript
toast.error('Crédit insuffisant sur la ligne budgétaire'); // ✅ Explicite
```

---

### 4. Validation uniquement côté client

❌ **MAUVAIS**
```typescript
// Validation Zod côté client uniquement
// ⚠️ Contournable via API directe
```

✅ **CORRECT**
```typescript
// Validation Zod côté client ET côté serveur (edge function)
```

---

## 🔒 Erreurs Sécurité

### 1. RLS non activé

❌ **MAUVAIS**
```sql
CREATE TABLE engagements (...);
-- ⚠️ Pas de RLS → Tout le monde peut tout voir!
```

✅ **CORRECT**
```sql
CREATE TABLE engagements (...);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their client's data"
ON engagements FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
);
```

---

### 2. Vérifications uniquement côté client

❌ **MAUVAIS**
```typescript
// Vérifier disponibilité uniquement côté client
if (ligneBudgetaire.disponible >= montant) {
  await createEngagement(data);
}
// ⚠️ Contournable!
```

✅ **CORRECT**
```typescript
// Edge function vérifie disponibilité côté serveur
// + Transaction SQL pour éviter race conditions
```

---

### 3. Rôles non vérifiés côté serveur

❌ **MAUVAIS**
```typescript
// Vérification rôle uniquement côté client
if (hasRole(['admin'])) {
  <Button onClick={handleValidate}>Valider</Button>
}
// ⚠️ API reste accessible directement
```

✅ **CORRECT**
```typescript
// RLS Policy vérifie le rôle
CREATE POLICY "Only admins can validate"
ON engagements FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_client'
  )
);
```

---

## 🎨 Erreurs Design System

### 1. Couleurs directes au lieu de tokens

❌ **MAUVAIS**
```tsx
<div className="text-white bg-blue-500 border-red-300">
  // ⚠️ Couleurs codées en dur
</div>
```

✅ **CORRECT**
```tsx
<div className="text-foreground bg-primary border-border">
  // ✅ Tokens CSS du design system
</div>
```

**Tokens disponibles** (`index.css`) :
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--input`, `--ring`

---

### 2. Couleurs non HSL

❌ **MAUVAIS**
```css
:root {
  --primary: #3b82f6; /* ⚠️ HEX */
  --secondary: rgb(100, 200, 50); /* ⚠️ RGB */
}
```

✅ **CORRECT**
```css
:root {
  --primary: 217 91% 60%; /* ✅ HSL sans hsl() */
  --secondary: 142 71% 45%;
}
```

**Utilisation** :
```tsx
<div className="bg-primary text-primary-foreground">
  // Tailwind ajoute automatiquement hsl()
</div>
```

---

### 3. Variants non définis dans composants shadcn

❌ **MAUVAIS**
```tsx
<Badge className="bg-green-500 text-white">
  // ⚠️ Override inline au lieu de variant
</Badge>
```

✅ **CORRECT**
```tsx
// Définir variant dans badge.tsx
const badgeVariants = cva(..., {
  variants: {
    variant: {
      success: 'bg-green-500 text-white', // ✅ Variant dédié
    }
  }
});

// Utiliser
<Badge variant="success">Validé</Badge>
```

---

## 🧪 Erreurs Tests & Débogage

### 1. Console.log partout

❌ **MAUVAIS**
```typescript
console.log('data:', data);
console.log('error:', error);
// ⚠️ Pollue la console en production
```

✅ **CORRECT**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('data:', data);
}

// OU utiliser un logger
import { logger } from '@/lib/logger';
logger.debug('data:', data);
```

---

### 2. Pas de vérification des edge cases

❌ **MAUVAIS**
```typescript
const total = engagements.reduce((sum, e) => sum + e.montant, 0);
// ⚠️ Crash si engagements est undefined ou contient des montants null
```

✅ **CORRECT**
```typescript
const total = (engagements || []).reduce((sum, e) => sum + (e.montant || 0), 0);
```

**Edge cases à tester** :
- Tableaux vides
- Valeurs null/undefined
- Strings vides
- Nombres négatifs
- Dates invalides

---

## 📋 Checklist Avant Commit

### Code Quality
- [ ] Pas de `any` en TypeScript
- [ ] Tous les nombres parsés (`parseFloat`)
- [ ] Gestion d'erreurs complète
- [ ] Loading & error states implémentés

### Supabase
- [ ] Filtrage client_id + exercice_id
- [ ] RLS activé et policies créées
- [ ] Numéros via edge functions
- [ ] Cache invalidé après mutations

### React
- [ ] useMemo pour calculs coûteux
- [ ] useCallback pour handlers
- [ ] Pas de mutations directes d'état
- [ ] Keys dans les listes

### UX
- [ ] Toasts pour feedback
- [ ] Messages d'erreur explicites
- [ ] Loading states
- [ ] Validation Zod complète

### Design System
- [ ] Tokens CSS uniquement (pas de couleurs directes)
- [ ] Couleurs HSL dans index.css
- [ ] Variants shadcn utilisés

### Sécurité
- [ ] RLS activé sur tables métier
- [ ] Vérifications côté serveur
- [ ] Rôles vérifiés dans RLS
- [ ] Pas de data leaks entre clients

---

## 🔗 Voir Aussi

- **[AGENTS.md](../AGENTS.md)** - Vue d'ensemble du projet
- **[AGENTS-PATTERNS.md](./AGENTS-PATTERNS.md)** - Patterns de code
- **[AGENTS-BUSINESS.md](./AGENTS-BUSINESS.md)** - Règles métier
- **[AGENTS-WORKFLOWS.md](./AGENTS-WORKFLOWS.md)** - Guides pratiques

---

**✨ Éviter ces pièges garantit un code robuste et maintenable dans AGILYS.**
