# Documentation des Patterns

Ce dossier contient la documentation des patterns de code utilisés dans l'application. Les patterns documentent les conventions, règles et bonnes pratiques à suivre pour maintenir la cohérence et la qualité du code.

## 📋 Patterns Disponibles

### [Snapshot Pattern](./snapshot-pattern.md) ✅

**Quand l'utiliser :** À chaque fois que vous créez une vue détaillée en overlay (snapshot) pour afficher les informations d'une entité.

**Couvre :**
- Règle d'or : les handlers ne doivent jamais fermer le snapshot
- Coexistence snapshot/dialogue grâce au z-index
- Navigation entre snapshots (flèches, Escape)
- Effet poussoir du header avec `useScrollProgress`
- Checklist de validation

**Pages implémentées :**
- Factures, Engagements, Bons de commande, Réservations, Dépenses

---

### [Dialog Form Pattern](./dialog-form-pattern.md) ✅

**Quand l'utiliser :** Avant d'ajouter de nouveaux formulaires de création/édition.

**Couvre :**
- Structure standard des dialogues de formulaire
- Utilisation de `react-hook-form` + Zod
- Génération automatique de numéros (via edge functions)
- Gestion des relations (fournisseurs, lignes budgétaires, etc.)
- Calculs automatiques (montants, disponibles, etc.)
- États conditionnels (lecture seule selon statut)

**Composants concernés :**
- 15+ composants de dialogue (Factures, Engagements, Dépenses, etc.)

---

### [Service API Pattern](./service-api-pattern.md) ✅

**Quand l'utiliser :** Avant d'ajouter de nouveaux services API.

**Couvre :**
- Structure standard d'un service (getAll, getById, create, update, delete)
- Mappings `fromDB` / `toDB` pour transformer les données
- Gestion des clés étrangères et relations
- Filtrage par client et exercice
- Gestion des erreurs standard

**Services concernés :**
- Tous les services dans `src/services/api/`

---

### [Table Pattern](./table-pattern.md) ✅

**Quand l'utiliser :** Avant de créer de nouvelles tables de données.

**Couvre :**
- Structure des colonnes (helpers, formatters)
- Tri et filtrage
- Actions de ligne (éditer, supprimer, snapshot)
- États de chargement et messages vides
- Responsivité mobile

**Composants concernés :**
- Tous les composants `*Table.tsx`

---

### [Stats Card Pattern](./stats-card-pattern.md) ✅

**Quand l'utiliser :** Avant de créer de nouveaux tableaux de bord.

**Couvre :**
- Structure des composants `*Stats.tsx`
- Calculs d'agrégations (totaux, moyennes, compteurs)
- Utilisation du composant `StatsCard`
- Indicateurs de tendance
- Gestion des états vides

**Composants concernés :**
- Tous les composants `*Stats.tsx`

---

## 📝 Quand Créer un Nouveau Pattern ?

Créez un fichier de pattern si :

- ✅ Le pattern se répète **au moins 3 fois** dans le code
- ✅ Il y a des **règles critiques** à respecter (sécurité, UX, performance)
- ✅ Une erreur peut avoir un **impact significatif**
- ✅ Le pattern est **complexe** (pas évident pour un nouveau développeur)
- ✅ Vous avez dû corriger **plusieurs fois** les mêmes erreurs

Ne créez PAS de pattern file si :

- ❌ C'est du code simple et évident
- ❌ Le pattern change fréquemment
- ❌ C'est spécifique à un seul composant
- ❌ Il n'y a pas de règles particulières à suivre

---

## 📁 Structure d'un Fichier Pattern

Chaque fichier de pattern devrait contenir :

```markdown
# Pattern [Nom]

## Règle d'or
La règle la plus importante à retenir (1 phrase)

## Pourquoi ce pattern ?
Explication du contexte et des problèmes résolus

## Structure de base
Code exemple minimal

## Exemples corrects vs incorrects
```typescript
// ✅ CORRECT
...

// ❌ INCORRECT
...
```

## Points d'attention
Liste des pièges courants

## Composants implémentant ce pattern
Liste des fichiers concernés

## Checklist
- [ ] Point de validation 1
- [ ] Point de validation 2
```

---

## 🔄 Maintenance

Les patterns doivent être :
- ✏️ **Mis à jour** quand les pratiques évoluent
- 🔍 **Consultés** avant chaque implémentation similaire
- 📚 **Référencés** dans les code reviews
- 🎓 **Utilisés** pour l'onboarding des nouveaux développeurs

---

## 🚀 Contribution

Pour ajouter un nouveau pattern :

1. Vérifiez qu'il répond aux critères ci-dessus
2. Créez le fichier dans `src/docs/`
3. Suivez la structure recommandée
4. Ajoutez-le à ce README
5. Référencez-le dans les composants concernés

---

## 📚 Ressources

- [Architecture de l'application](../types/index.ts) - Types globaux
- [Services API](../services/api/) - Services de données
- [Composants UI](../components/ui/) - Composants réutilisables
- [Hooks personnalisés](../hooks/) - Hooks métier
