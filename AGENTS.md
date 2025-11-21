# AGILYS - Guide pour Agents IA

> **🎯 Objectif** : Vue d'ensemble stratégique du projet AGILYS pour permettre aux agents IA d'intervenir efficacement
> **👥 Pour qui** : Agents IA (Codex, Claude, etc.) intervenant sur le code après développement initial
> **⏱️ Dernière MAJ** : 2025-01-21

## 📍 Navigation Rapide

- [Vue d'Ensemble](#-vue-densemble)
- [Règles d'Or](#-règles-dor)
- [Architecture](#-architecture-globale)
- [Stack Technique](#-stack-technique)
- [Où Chercher Quoi](#-où-chercher-quoi)
- [Documentation Détaillée](#-documentation-détaillée)

---

## 🎯 Vue d'Ensemble

**AGILYS** est une application web de **gestion budgétaire pour collectivités locales africaines** (Bénin). Elle permet de gérer l'ensemble du cycle budgétaire : prévisions, engagements, factures, dépenses, paiements, avec contrôle de disponibilité en temps réel.

### Concepts Métier Clés

- **Multi-tenant** : Plusieurs clients (communes, départements) sur une même instance
- **Multi-exercice** : Gestion de plusieurs exercices budgétaires par client
- **Structure budgétaire** : Section → Programme → Action → Ligne Budgétaire
- **Flux de dépense** : Réservation → Engagement → Facture → Dépense → Paiement
- **Contrôle de disponibilité** : Vérification automatique des crédits disponibles

### Utilisateurs Cibles

- **Super Admin** : Gestion multi-clients
- **Admin Client** : Administration d'une collectivité
- **Directeur Financier** : Validation et pilotage budgétaire
- **Chef de Service** : Gestion opérationnelle des dépenses
- **Comptable** : Saisie et suivi comptable

---

## 🔑 Règles d'Or

### 1. **Snapshot Pattern - RÈGLE ABSOLUE**
❌ **JAMAIS** : Les handlers passés aux composants Snapshot ne doivent **JAMAIS** appeler `handleCloseSnapshot()`
✅ Le snapshot reste ouvert quand un dialog s'ouvre par-dessus (z-index)
📖 Voir : `src/docs/snapshot-pattern.md`

### 2. **Multi-tenant Obligatoire**
✅ Toute entité métier doit avoir un `client_id`
✅ Tous les services API filtrent par `client_id`
✅ RLS policies vérifient `client_id`

### 3. **Multi-exercice Obligatoire**
✅ Les opérations budgétaires ont un `exercice_id`
✅ L'exercice actif est géré via `ExerciceContext`
✅ Filtrage automatique par exercice dans les hooks

### 4. **Génération de Numéros via Edge Functions**
❌ **JAMAIS** générer de numéros côté client
✅ Toujours utiliser les edge functions (`create-engagement`, `create-facture`, etc.)
✅ Les numéros sont uniques et séquentiels par exercice

### 5. **Validation & Workflows**
✅ Statuts typés (`'brouillon' | 'en_attente' | 'valide' | 'annule'`)
✅ Transitions de statut validées côté serveur
✅ Validation Zod côté client + serveur

### 6. **Design System Strict**
❌ **JAMAIS** `text-white`, `bg-blue-500`, etc. dans les composants
✅ Toujours utiliser les tokens CSS du design system (`--primary`, `--foreground`, etc.)
✅ Toutes les couleurs en HSL dans `index.css` et `tailwind.config.ts`

### 7. **Types TypeScript Stricts**
✅ Pas de `any` sauf justification exceptionnelle
✅ Types métier dans `src/types/*.types.ts`
✅ Séparation Create/Update/Read types

### 8. **Transformations DB ↔ Frontend**
✅ Services API utilisent `mapFromDatabase()` et `mapToDatabase()`
✅ Convention : snake_case en DB, camelCase en frontend
✅ Parsing explicite des nombres (`parseFloat()`)

### 9. **Loading & Error States**
✅ Toujours gérer les états de chargement
✅ Toasts pour feedback utilisateur
✅ Messages d'erreur explicites

### 10. **Sécurité RLS**
✅ RLS activé sur toutes les tables métier
✅ Policies par action (SELECT, INSERT, UPDATE, DELETE)
✅ Vérification `auth.uid()` et `client_id`

---

## 🏗️ Architecture Globale

```
agilys/
├── src/
│   ├── components/          # Composants React
│   │   ├── ui/             # shadcn/ui components (design system)
│   │   ├── shared/         # Composants partagés (SnapshotBase)
│   │   ├── app/            # Layout & Header
│   │   ├── budget/         # Composants budget (Section, Programme, Action, Ligne)
│   │   ├── engagements/    # Composants engagements
│   │   ├── factures/       # Composants factures
│   │   ├── depenses/       # Composants dépenses
│   │   ├── reservations/   # Composants réservations
│   │   ├── bonsCommande/   # Composants bons de commande
│   │   ├── fournisseurs/   # Composants fournisseurs
│   │   ├── projets/        # Composants projets
│   │   ├── previsions/     # Composants prévisions
│   │   ├── parametres/     # Composants paramètres
│   │   └── lists/          # Composants listes génériques
│   │
│   ├── pages/              # Pages React Router
│   │   ├── Index.tsx       # Page d'accueil publique
│   │   ├── auth/           # Pages authentification
│   │   └── app/            # Pages application (protégées)
│   │
│   ├── hooks/              # Hooks personnalisés
│   │   ├── use*.ts         # Hooks métier (useEngagements, useFactures, etc.)
│   │   ├── useSnapshotState.ts  # Hook snapshot pattern
│   │   └── useSnapshotHandlers.ts
│   │
│   ├── services/           # Services & API
│   │   ├── api/            # Services Supabase CRUD
│   │   └── mockData/       # Données mock (legacy)
│   │
│   ├── types/              # Types TypeScript
│   │   ├── *.types.ts      # Types métier par domaine
│   │   └── index.ts        # Types génériques
│   │
│   ├── contexts/           # Contextes React
│   │   ├── AuthContext.tsx # Authentification
│   │   ├── ClientContext.tsx  # Client actif
│   │   └── ExerciceContext.tsx # Exercice actif
│   │
│   ├── lib/                # Utilitaires
│   │   ├── utils.ts        # Helpers génériques
│   │   └── snapshot-utils.ts  # Utilitaires snapshot
│   │
│   ├── docs/               # Documentation patterns
│   │   ├── snapshot-pattern.md
│   │   ├── dialog-form-pattern.md
│   │   ├── service-api-pattern.md
│   │   ├── table-pattern.md
│   │   └── stats-card-pattern.md
│   │
│   ├── index.css           # Design system (variables CSS)
│   └── main.tsx            # Point d'entrée
│
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── create-engagement/
│   │   ├── create-facture/
│   │   ├── create-depense/
│   │   ├── create-reservation/
│   │   ├── create-bon-commande/
│   │   └── create-modification-budgetaire/
│   │
│   └── migrations/         # Migrations SQL
│
├── AGENTS.md               # Ce fichier
└── src/AGENTS-*.md         # Documentation détaillée
```

---

## 🛠️ Stack Technique

### Frontend
- **React 18** + **TypeScript 5**
- **Vite** (build tool)
- **React Router 6** (routing)
- **Tailwind CSS 3** (styling)
- **shadcn/ui** (composants UI)
- **React Hook Form** + **Zod** (formulaires & validation)
- **TanStack Query** (state management serveur)
- **date-fns** (dates)
- **Lucide React** (icônes)
- **Recharts** (graphiques)

### Backend
- **Supabase** (BaaS)
  - PostgreSQL (base de données)
  - Row Level Security (RLS)
  - Edge Functions (Deno)
  - Authentication (email/password)
  - Storage (fichiers)

### Développement
- **ESLint** (linting)
- **TypeScript** (types stricts)
- **Git** (versionning)

---

## 📂 Où Chercher Quoi

### Pour comprendre un concept métier
→ `src/AGENTS-BUSINESS.md`

### Pour suivre un pattern de code
→ `src/AGENTS-PATTERNS.md`
→ `src/docs/*.md`

### Pour ajouter/modifier une fonctionnalité
→ `src/AGENTS-WORKFLOWS.md`

### Pour éviter les erreurs courantes
→ `src/AGENTS-GOTCHAS.md`

### Pour comprendre le schéma DB
→ `src/integrations/supabase/types.ts` (généré automatiquement)
→ `supabase/migrations/` (historique SQL)

### Pour voir un exemple complet
→ Regarder l'implémentation existante :
- **Factures** : `src/pages/app/Factures.tsx` + `src/components/factures/`
- **Engagements** : `src/pages/app/Engagements.tsx` + `src/components/engagements/`
- **Budget** : `src/pages/app/Budgets.tsx` + `src/components/budget/`

### Pour les types métier
→ `src/types/*.types.ts`

### Pour les services API
→ `src/services/api/*.service.ts`

### Pour les hooks métier
→ `src/hooks/use*.ts`

### Pour les edge functions
→ `supabase/functions/*/index.ts`

---

## 📚 Documentation Détaillée

| Fichier | Contenu |
|---------|---------|
| **[AGENTS-PATTERNS.md](./src/AGENTS-PATTERNS.md)** | Patterns de code à suivre (Snapshot, Dialog, Service, Table, Stats) |
| **[AGENTS-BUSINESS.md](./src/AGENTS-BUSINESS.md)** | Règles métier et domaine budgétaire |
| **[AGENTS-WORKFLOWS.md](./src/AGENTS-WORKFLOWS.md)** | Guides pratiques pour modifications courantes |
| **[AGENTS-GOTCHAS.md](./src/AGENTS-GOTCHAS.md)** | Pièges et erreurs courantes à éviter |

### Documentation des Patterns

| Fichier | Contenu |
|---------|---------|
| **[snapshot-pattern.md](./src/docs/snapshot-pattern.md)** | Pattern snapshot (règle d'or : handlers ne ferment jamais) |
| **[dialog-form-pattern.md](./src/docs/dialog-form-pattern.md)** | Pattern formulaire dialog (validation, numéros) |
| **[service-api-pattern.md](./src/docs/service-api-pattern.md)** | Pattern service API (CRUD, transformations) |
| **[table-pattern.md](./src/docs/table-pattern.md)** | Pattern table (colonnes, tri, formatage) |
| **[stats-card-pattern.md](./src/docs/stats-card-pattern.md)** | Pattern stats (calculs, useMemo) |

---

## 🚀 Démarrage Rapide

### Comprendre le projet en 10 minutes

1. **Lire ce fichier** (AGENTS.md) → Vue d'ensemble
2. **Lire AGENTS-BUSINESS.md** → Comprendre le métier
3. **Lire AGENTS-PATTERNS.md** → Connaître les patterns critiques
4. **Explorer un exemple** → `src/pages/app/Factures.tsx` (implémentation complète)
5. **Vérifier les types** → `src/types/facture.types.ts`

### Avant de modifier du code

1. ✅ Identifier le domaine concerné (budget, engagement, facture, etc.)
2. ✅ Lire le pattern applicable dans `src/docs/`
3. ✅ Vérifier les règles métier dans `AGENTS-BUSINESS.md`
4. ✅ Suivre le workflow dans `AGENTS-WORKFLOWS.md`
5. ✅ Vérifier les gotchas dans `AGENTS-GOTCHAS.md`
6. ✅ Respecter le design system (pas de couleurs directes)

---

## ⚠️ Points d'Attention Critiques

### 🚨 Ne JAMAIS
- ❌ Fermer un snapshot dans un handler
- ❌ Générer des numéros côté client
- ❌ Utiliser des couleurs directes (text-white, bg-blue-500)
- ❌ Oublier client_id ou exercice_id
- ❌ Modifier auth.users ou schemas réservés Supabase
- ❌ Utiliser `any` en TypeScript sans justification

### ✅ Toujours
- ✅ Utiliser les edge functions pour les numéros
- ✅ Valider avec Zod côté client ET serveur
- ✅ Mapper DB ↔ Frontend dans les services
- ✅ Gérer loading & error states
- ✅ Utiliser les tokens du design system
- ✅ Suivre les patterns documentés

---

## 🔗 Liens Utiles

- **Supabase Dashboard** : https://supabase.com/dashboard/project/gvpsfgzstiqbjlgqglyh
- **Documentation Lovable** : https://docs.lovable.dev/
- **Documentation Supabase** : https://supabase.com/docs
- **Documentation shadcn/ui** : https://ui.shadcn.com/
- **Documentation React Hook Form** : https://react-hook-form.com/
- **Documentation Zod** : https://zod.dev/

---

## 📞 Support

Pour toute question ou clarification :
1. Consulter les fichiers AGENTS-*.md
2. Explorer les exemples de code existants
3. Vérifier la documentation des patterns dans `src/docs/`
4. Analyser les tests dans `tests/`

---

**✨ Bonne intervention sur AGILYS !**
