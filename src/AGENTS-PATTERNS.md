# AGENTS - Patterns de Code

> **🎯 Objectif** : Référence complète des patterns de code à suivre impérativement dans AGILYS
> **👥 Pour qui** : Agents IA intervenant sur le code
> **⏱️ Dernière MAJ** : 2025-01-21

## 📍 Navigation Rapide

- [Patterns Critiques](#-patterns-critiques)
- [Index des Patterns](#-index-des-patterns)
- [Checklists](#-checklists)
- [Anti-Patterns](#-anti-patterns)

---

## 🔥 Patterns Critiques

Ces patterns sont **ABSOLUMENT OBLIGATOIRES** et doivent être respectés sans exception.

### 1. 🚨 Snapshot Pattern - RÈGLE D'OR

**Documentation complète** : `src/docs/snapshot-pattern.md`

#### La Règle Absolue
```typescript
// ❌ INTERDIT - Le handler ferme le snapshot
<FactureSnapshot
  onEdit={() => {
    handleEdit(id);
    handleCloseSnapshot(); // ❌ NE JAMAIS FAIRE ÇA
  }}
/>

// ✅ CORRECT - Le handler ne ferme pas le snapshot
<FactureSnapshot
  onEdit={() => handleEdit(id)} // ✅ Le snapshot reste ouvert
/>
```

#### Pourquoi ?
- L'utilisateur doit pouvoir **consulter les infos pendant qu'il remplit le formulaire**
- Le dialogue et le snapshot **coexistent** grâce au z-index
- Navigation continue entre snapshots pendant qu'un dialogue est ouvert

#### Comment fermer un snapshot ?
✅ Bouton X en haut à droite
✅ Touche Escape
✅ Navigation vers une autre page
✅ Clic sur un autre élément de la liste

❌ **JAMAIS** lors de l'ouverture d'un dialog

#### Hook recommandé : `useSnapshotState`
```typescript
const {
  snapshotId,
  snapshotItem,
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

#### Checklist Snapshot
- [ ] Le header est sticky (pas d'espace vide au scroll)
- [ ] L'URL est synchronisée avec l'ID du snapshot
- [ ] Les handlers ne ferment jamais le snapshot
- [ ] La navigation prev/next fonctionne
- [ ] Escape ferme le snapshot
- [ ] Le bouton X ferme le snapshot

---

### 2. 📝 Dialog Form Pattern

**Documentation complète** : `src/docs/dialog-form-pattern.md`

#### Structure Standard
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// 1. Schéma Zod
const formSchema = z.object({
  objet: z.string().min(1, "L'objet est obligatoire"),
  montant: z.number().positive("Le montant doit être positif"),
  fournisseurId: z.string().min(1, "Le fournisseur est obligatoire"),
});

// 2. Hook Form
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    objet: engagement?.objet || '',
    montant: engagement?.montant || 0,
    fournisseurId: engagement?.fournisseurId || '',
  },
});

// 3. Submit Handler
const onSubmit = async (values: z.infer<typeof formSchema>) => {
  try {
    if (engagement?.id) {
      await updateMutation.mutateAsync({ id: engagement.id, ...values });
    } else {
      // Génération de numéro via edge function
      await createMutation.mutateAsync(values);
    }
    form.reset();
    onOpenChange(false);
  } catch (error) {
    console.error(error);
    toast.error("Une erreur est survenue");
  }
};
```

#### Points Clés
- ✅ **React Hook Form** + **Zod** pour validation
- ✅ Génération de numéros via **edge functions** (jamais côté client)
- ✅ États conditionnels (read-only selon statut)
- ✅ Relations gérées via Select (fournisseurs, lignes budgétaires)
- ✅ Calculs automatiques (ex: montant TTC = HT + TVA)
- ✅ Loading states pendant mutations
- ✅ Toasts pour feedback utilisateur

#### Checklist Dialog Form
- [ ] Validation Zod complète
- [ ] defaultValues initialisées correctement
- [ ] Numéros générés via edge function (si applicable)
- [ ] Loading state visible pendant submit
- [ ] Toast de succès/erreur
- [ ] Form.reset() après succès
- [ ] Dialog se ferme après succès
- [ ] Relations chargées (fournisseurs, lignes, etc.)
- [ ] Champs conditionnels selon statut (brouillon vs validé)

---

### 3. 🔌 Service API Pattern

**Documentation complète** : `src/docs/service-api-pattern.md`

#### Structure Standard
```typescript
import { supabase } from '@/integrations/supabase/client';
import { Engagement, CreateEngagementInput, UpdateEngagementInput } from '@/types/engagement.types';

// Helper: DB → Frontend
const mapFromDatabase = (row: any): Engagement => ({
  id: row.id,
  clientId: row.client_id,
  exerciceId: row.exercice_id,
  numero: row.numero,
  objet: row.objet,
  montant: parseFloat(row.montant || 0), // ⚠️ Parser les nombres
  fournisseurId: row.fournisseur_id,
  statut: row.statut as Engagement['statut'],
  dateCreation: row.date_creation,
  createdAt: row.created_at,
});

// Helper: Frontend → DB
const mapToDatabase = (input: CreateEngagementInput | UpdateEngagementInput) => ({
  client_id: (input as any).clientId,
  exercice_id: (input as any).exerciceId,
  numero: (input as any).numero,
  objet: (input as any).objet,
  montant: (input as any).montant,
  fournisseur_id: (input as any).fournisseurId,
  statut: (input as any).statut,
});

export const engagementsService = {
  // READ
  async getAll(clientId: string, exerciceId: string): Promise<Engagement[]> {
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async getById(id: string): Promise<Engagement> {
    const { data, error } = await supabase
      .from('engagements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  // CREATE (via edge function pour génération numéro)
  async create(input: CreateEngagementInput): Promise<Engagement> {
    const { data, error } = await supabase.functions.invoke('create-engagement', {
      body: input,
    });

    if (error) throw error;
    return data;
  },

  // UPDATE
  async update(id: string, input: UpdateEngagementInput): Promise<Engagement> {
    const dbData = mapToDatabase(input);
    const { data, error } = await supabase
      .from('engagements')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  // DELETE
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('engagements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
```

#### Points Clés
- ✅ **mapFromDatabase** : snake_case → camelCase + parsing nombres
- ✅ **mapToDatabase** : camelCase → snake_case
- ✅ Filtrage systématique par `client_id` et `exercice_id`
- ✅ Création via edge function pour numéros uniques
- ✅ Types stricts (Input/Output séparés)
- ✅ Gestion d'erreurs explicite

#### Checklist Service API
- [ ] Helpers mapFromDatabase et mapToDatabase
- [ ] parseFloat() pour tous les nombres
- [ ] Filtrage par client_id et exercice_id
- [ ] Création via edge function (si numéro auto)
- [ ] Types stricts (Create/Update/Read)
- [ ] Gestion d'erreurs (throw error)
- [ ] Order by pour listes

---

### 4. 📊 Table Pattern

**Documentation complète** : `src/docs/table-pattern.md`

#### Structure Standard (List*)
- `ListLayout` : carte avec titre/description + toolbar (recherche/filtre) + footer optionnel.
- `ListToolbar` : input de recherche (icône Search intégrée), tableau de filtres (ReactNode[]) et `rightSlot` pour CTA.
- `ListTable` : tableau générique basé sur shadcn/ui. Colonnes typées `ListColumn<T>`, `getRowId`, `onRowDoubleClick` pour ouvrir un snapshot.

#### Points Clés
- ✅ Colonnes `ListColumn<T>` avec alignement (`align`), `cellClassName` pour truncation
- ✅ Actions dans la dernière colonne (align right, largeur fixe), `DropdownMenu` pour les menus
- ✅ Clic sur numéro/ligne ouvre snapshot ou détails, sans fermer le snapshot depuis le handler
- ✅ `emptyMessage` obligatoire ; loading géré par le parent (skeleton/spinner)
- ✅ Aucun style direct (couleurs) : utiliser les tokens/design system
- ✅ Toolbar accessible : `aria-label` sur l’input, filtres en ReactNode
- ✅ Colonne `Checkbox` en option pour sélection batch, contrôlée par le parent
- ✅ Responsive déjà géré (`overflow-x-auto` sur la table)

#### Checklist Table/List
- [ ] Colonnes typées `ListColumn<T>` (align right pour montants/dates, truncation si besoin)
- [ ] `emptyMessage` renseigné
- [ ] `onRowDoubleClick` / liens configurés pour snapshot ou détails
- [ ] Actions à droite via `DropdownMenu` + largeur/align cohérents
- [ ] Colonne `Checkbox` si batch (toggle all/one dans le parent)
- [ ] Toolbar : recherche + filtres + `rightSlot` pour CTA
- [ ] Respect du design system (pas de couleurs directes)
- [ ] Loading state côté parent (spinner/skeleton)
- [ ] Scrolling horizontal déjà assuré (`overflow-x-auto`)

---

### 5. 📈 Stats Card Pattern

**Documentation complète** : `src/docs/stats-card-pattern.md`

#### Structure Standard
```typescript
import { StatsCard } from '@/components/ui/stats-card';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';

interface EngagementStatsProps {
  engagements: Engagement[];
}

export const EngagementStats = ({ engagements }: EngagementStatsProps) => {
  // Calculs avec useMemo
  const stats = useMemo(() => {
    const total = engagements.length;
    const valides = engagements.filter(e => e.statut === 'valide').length;
    const enAttente = engagements.filter(e => e.statut === 'en_attente').length;
    const montantTotal = engagements.reduce((sum, e) => sum + e.montant, 0);
    const montantValide = engagements
      .filter(e => e.statut === 'valide')
      .reduce((sum, e) => sum + e.montant, 0);
    
    return { total, valides, enAttente, montantTotal, montantValide };
  }, [engagements]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Engagements"
        value={stats.total}
        icon={TrendingUp}
        trend={{ value: 12, isPositive: true }}
      />
      <StatsCard
        title="Validés"
        value={stats.valides}
        icon={CheckCircle}
        variant="success"
      />
      <StatsCard
        title="En Attente"
        value={stats.enAttente}
        icon={AlertCircle}
        variant="warning"
      />
      <StatsCard
        title="Montant Total"
        value={formatCurrency(stats.montantTotal)}
        icon={TrendingUp}
      />
    </div>
  );
};
```

#### Points Clés
- ✅ Composant `<StatsCard>` du design system
- ✅ **useMemo** pour calculs (performance)
- ✅ Variants sémantiques (success, warning, error)
- ✅ Grid responsive (mobile → desktop)
- ✅ Icônes Lucide appropriées
- ✅ Formatage currency et nombres

#### Checklist Stats
- [ ] useMemo pour tous les calculs
- [ ] StatsCard du design system
- [ ] Variants sémantiques cohérents
- [ ] Grid responsive (gap-4, md:grid-cols-2, lg:grid-cols-4)
- [ ] Icônes appropriées
- [ ] Formatage currency et nombres
- [ ] Trends si pertinent

---

## 📑 Index des Patterns

| Pattern | Documentation | Criticité |
|---------|---------------|-----------|
| **Snapshot** | `src/docs/snapshot-pattern.md` | 🔴 Critique |
| **Dialog Form** | `src/docs/dialog-form-pattern.md` | 🔴 Critique |
| **Service API** | `src/docs/service-api-pattern.md` | 🔴 Critique |
| **Table** | `src/docs/table-pattern.md` | 🟠 Important |
| **Stats Card** | `src/docs/stats-card-pattern.md` | 🟡 Recommandé |

---

## ✅ Checklists

### Avant de Créer un Nouveau Composant

- [ ] J'ai vérifié si un composant similaire existe déjà
- [ ] J'ai identifié le pattern applicable
- [ ] J'ai lu la documentation complète du pattern
- [ ] Je connais les règles critiques (snapshot, multi-tenant, etc.)
- [ ] J'ai préparé les types TypeScript
- [ ] J'ai prévu les loading & error states

### Avant de Soumettre une Modification

- [ ] Le code suit les patterns documentés
- [ ] Pas de couleurs directes (design system uniquement)
- [ ] Types TypeScript stricts (pas de any)
- [ ] Loading & error states gérés
- [ ] Validation Zod si formulaire
- [ ] Tests manuels effectués
- [ ] Pas de régression sur fonctionnalités existantes

### Checklist Snapshot (Détaillée)

- [ ] Header sticky (pas d'espace vide au scroll)
- [ ] URL synchronisée avec ID (/app/factures/:id)
- [ ] Handlers NE ferment PAS le snapshot
- [ ] Navigation prev/next fonctionne
- [ ] Escape ferme le snapshot
- [ ] Bouton X ferme le snapshot
- [ ] Z-index correct (dialog par-dessus)
- [ ] useSnapshotState utilisé si possible
- [ ] onClose, onNavigate implémentés
- [ ] Reset si item disparaît (suppression)

### Checklist Dialog Form (Détaillée)

- [ ] React Hook Form + zodResolver
- [ ] Schéma Zod complet
- [ ] defaultValues initialisées
- [ ] Numéro via edge function (si auto)
- [ ] Loading pendant submit
- [ ] Toast succès/erreur
- [ ] form.reset() après succès
- [ ] Dialog se ferme après succès
- [ ] Relations chargées (selects)
- [ ] Champs conditionnels (statut)
- [ ] Calculs automatiques (si applicable)

### Checklist Service API (Détaillée)

- [ ] mapFromDatabase implémentée
- [ ] mapToDatabase implémentée
- [ ] parseFloat() pour nombres
- [ ] Filtrage client_id + exercice_id
- [ ] Création via edge function (si numéro)
- [ ] Types stricts (Create/Update/Read)
- [ ] Gestion erreurs (throw)
- [ ] Order by pour listes
- [ ] Select single pour getById
- [ ] Error handling explicite

---

## 🚫 Anti-Patterns

### ❌ À NE JAMAIS FAIRE

#### 1. Fermer le snapshot dans un handler
```typescript
// ❌ INTERDIT
<FactureSnapshot
  onEdit={() => {
    handleEdit(id);
    handleCloseSnapshot(); // ❌
  }}
/>
```

#### 2. Utiliser des couleurs directes
```typescript
// ❌ INTERDIT
<div className="text-white bg-blue-500 border-red-300">

// ✅ CORRECT
<div className="text-foreground bg-primary border-border">
```

#### 3. Générer des numéros côté client
```typescript
// ❌ INTERDIT
const numero = `ENG/${new Date().getFullYear()}/${Math.random()}`;

// ✅ CORRECT
const result = await supabase.functions.invoke('create-engagement', { body });
```

#### 4. Oublier client_id ou exercice_id
```typescript
// ❌ INTERDIT
const { data } = await supabase.from('engagements').select('*');

// ✅ CORRECT
const { data } = await supabase
  .from('engagements')
  .select('*')
  .eq('client_id', clientId)
  .eq('exercice_id', exerciceId);
```

#### 5. Utiliser any en TypeScript
```typescript
// ❌ INTERDIT
const handleSubmit = (data: any) => { ... }

// ✅ CORRECT
const handleSubmit = (data: z.infer<typeof formSchema>) => { ... }
```

#### 6. Ne pas parser les nombres de DB
```typescript
// ❌ INTERDIT (retourne string!)
montant: row.montant

// ✅ CORRECT
montant: parseFloat(row.montant || 0)
```

#### 7. Oublier useMemo pour calculs stats
```typescript
// ❌ INTERDIT (recalcul à chaque render)
const total = engagements.reduce((sum, e) => sum + e.montant, 0);

// ✅ CORRECT
const total = useMemo(
  () => engagements.reduce((sum, e) => sum + e.montant, 0),
  [engagements]
);
```

#### 8. Modification directe de state
```typescript
// ❌ INTERDIT
engagements.push(newEngagement);

// ✅ CORRECT
setEngagements([...engagements, newEngagement]);
```

---

## 🔗 Voir Aussi

- **[AGENTS.md](../AGENTS.md)** - Vue d'ensemble du projet
- **[AGENTS-BUSINESS.md](./AGENTS-BUSINESS.md)** - Règles métier
- **[AGENTS-WORKFLOWS.md](./AGENTS-WORKFLOWS.md)** - Guides pratiques
- **[AGENTS-GOTCHAS.md](./AGENTS-GOTCHAS.md)** - Pièges à éviter

---

**✨ Respecter ces patterns garantit la cohérence et la maintenabilité du code AGILYS.**
