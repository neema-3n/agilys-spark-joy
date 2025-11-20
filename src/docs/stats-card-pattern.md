# Pattern Stats Card

## Règle d'or

**Tous les composants de statistiques doivent utiliser le composant réutilisable `StatsCard` et calculer les agrégations de façon cohérente.**

## Pourquoi ce pattern ?

1. **Cohérence visuelle** : Toutes les cartes de stats ont le même design
2. **Réutilisabilité** : Un seul composant pour toutes les stats
3. **Performance** : Calculs optimisés avec `useMemo`
4. **Maintenabilité** : Structure identique pour tous les dashboards
5. **Responsive** : Grid adaptatif selon la taille d'écran

## Composant StatsCard réutilisable

Le composant de base existe déjà dans `src/components/ui/stats-card.tsx` :

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color = 'text-primary' 
}: StatsCardProps) => {
  return (
    <Card className="hover:shadow-primary transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {trend && (
          <p className={`text-xs ${trendUp ? 'text-secondary' : 'text-muted-foreground'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
```

## Structure d'un composant Stats

### 1. Imports

```typescript
import { StatsCard } from '@/components/ui/stats-card';
import { FileText, CheckCircle, Clock, AlertCircle, Euro } from 'lucide-react';
import { useMemo } from 'react';
import { Facture } from '@/types/facture.types';
```

### 2. Props du composant

```typescript
interface FactureStatsProps {
  factures: Facture[];
  isLoading?: boolean;
}
```

### 3. Calculs avec useMemo

```typescript
const stats = useMemo(() => {
  if (!factures || factures.length === 0) {
    return {
      total: 0,
      totalMontant: 0,
      enAttente: 0,
      validees: 0,
      enRetard: 0,
    };
  }

  const now = new Date();
  
  return {
    total: factures.length,
    totalMontant: factures.reduce((sum, f) => sum + f.montantTTC, 0),
    enAttente: factures.filter(f => f.statut === 'brouillon').length,
    validees: factures.filter(f => f.statut === 'validee').length,
    enRetard: factures.filter(f => 
      f.dateEcheance && 
      new Date(f.dateEcheance) < now && 
      f.montantPaye < f.montantTTC
    ).length,
  };
}, [factures]);
```

### 4. Formatage des valeurs

```typescript
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

### 5. Rendu avec Grid

```typescript
export const FactureStats = ({ factures, isLoading }: FactureStatsProps) => {
  const stats = useMemo(() => { /* ... */ }, [factures]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20" />
            <CardContent className="h-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total des factures"
        value={stats.total.toString()}
        icon={FileText}
        color="text-primary"
      />
      
      <StatsCard
        title="Montant total TTC"
        value={formatCurrency(stats.totalMontant)}
        icon={Euro}
        color="text-primary"
      />
      
      <StatsCard
        title="En attente"
        value={stats.enAttente.toString()}
        icon={Clock}
        color="text-warning"
        trend={`${Math.round((stats.enAttente / stats.total) * 100)}% du total`}
      />
      
      <StatsCard
        title="Validées"
        value={stats.validees.toString()}
        icon={CheckCircle}
        color="text-success"
        trend={`${Math.round((stats.validees / stats.total) * 100)}% du total`}
      />
      
      {stats.enRetard > 0 && (
        <StatsCard
          title="En retard"
          value={stats.enRetard.toString()}
          icon={AlertCircle}
          color="text-destructive"
          trend="Nécessite une action"
          trendUp={false}
        />
      )}
    </div>
  );
};
```

## Types de calculs courants

### Compteurs simples

```typescript
const totalItems = items.length;
const activeItems = items.filter(i => i.statut === 'actif').length;
```

### Sommes

```typescript
const totalMontant = items.reduce((sum, item) => sum + item.montant, 0);
const moyenneMontant = totalMontant / items.length;
```

### Pourcentages

```typescript
const pourcentageComplete = Math.round((completed / total) * 100);
```

### Dates et échéances

```typescript
const now = new Date();
const enRetard = items.filter(i => 
  i.dateEcheance && 
  new Date(i.dateEcheance) < now &&
  i.statut !== 'terminee'
).length;
```

### Comparaisons période

```typescript
const thisMonth = items.filter(i => 
  new Date(i.createdAt).getMonth() === new Date().getMonth()
).length;

const lastMonth = items.filter(i => {
  const date = new Date(i.createdAt);
  const last = new Date();
  last.setMonth(last.getMonth() - 1);
  return date.getMonth() === last.getMonth();
}).length;

const trend = `${thisMonth > lastMonth ? '+' : ''}${thisMonth - lastMonth} vs mois dernier`;
```

## Grid responsive

Utilisez toujours une grille responsive :

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Mobile: 1 colonne */}
  {/* Tablet: 2 colonnes */}
  {/* Desktop: 4 colonnes */}
</div>
```

Pour 3 cartes :

```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

Pour 5+ cartes :

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
```

## Couleurs sémantiques

Utilisez les couleurs selon la signification :

```typescript
// Informations générales
color="text-primary"

// Succès, validé, complet
color="text-success"  // ou "text-green-600"

// Attention, en attente
color="text-warning"  // ou "text-yellow-600"

// Erreur, retard, problème
color="text-destructive"  // ou "text-red-600"

// Neutre, secondaire
color="text-muted-foreground"
```

## Exemples corrects vs incorrects

### ❌ INCORRECT - Calculs dans le JSX

```typescript
// ❌ Calculs refaits à chaque render
<StatsCard
  title="Total"
  value={factures.filter(f => f.statut === 'validee').length.toString()}
/>
```

### ✅ CORRECT - Calculs dans useMemo

```typescript
// ✅ Calculs optimisés
const stats = useMemo(() => ({
  validees: factures.filter(f => f.statut === 'validee').length,
}), [factures]);

<StatsCard title="Total" value={stats.validees.toString()} />
```

### ❌ INCORRECT - Pas de gestion du loading

```typescript
// ❌ Pas d'état de chargement
return (
  <div className="grid grid-cols-4 gap-4">
    <StatsCard ... />
  </div>
);
```

### ✅ CORRECT - Loading state

```typescript
// ✅ Skeleton pendant le chargement
if (isLoading) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">...</Card>
      ))}
    </div>
  );
}
```

## Points d'attention

- ⚠️ **Utiliser useMemo** : Pour éviter les recalculs à chaque render
- ⚠️ **Gérer les cas vides** : Retourner des valeurs par défaut si `items.length === 0`
- ⚠️ **Formater les montants** : Utiliser `Intl.NumberFormat` pour les devises
- ⚠️ **Loading state** : Afficher des skeletons pendant le chargement
- ⚠️ **Grid responsive** : Adapter le nombre de colonnes selon l'écran
- ⚠️ **Couleurs sémantiques** : Utiliser les couleurs du design system
- ⚠️ **Trends optionnels** : N'afficher les tendances que si pertinent
- ⚠️ **Icônes cohérentes** : Utiliser lucide-react pour toutes les icônes
- ⚠️ **Division par zéro** : Vérifier avant de calculer des pourcentages

## Composants implémentant ce pattern

- ✅ `src/components/factures/FactureStats.tsx`
- ✅ `src/components/engagements/EngagementStats.tsx`
- ✅ `src/components/depenses/DepensesStats.tsx`
- ✅ `src/components/bonsCommande/BonCommandeStats.tsx`
- ✅ `src/components/reservations/ReservationStats.tsx`
- ✅ `src/components/fournisseurs/FournisseurStats.tsx`
- ✅ `src/components/projets/ProjetStats.tsx`

## Checklist pour nouveaux composants Stats

Lors de la création d'un nouveau composant de statistiques, vérifier :

- [ ] Utilisation du composant `StatsCard` réutilisable
- [ ] Calculs dans `useMemo` pour optimiser les performances
- [ ] Gestion du cas `items.length === 0`
- [ ] Loading state avec skeleton cards
- [ ] Formatage des montants avec `Intl.NumberFormat`
- [ ] Grid responsive (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- [ ] Couleurs sémantiques cohérentes
- [ ] Icônes de lucide-react
- [ ] Trends optionnels et pertinents
- [ ] Pas de division par zéro dans les pourcentages
- [ ] Props typées avec TypeScript
