# AGILYS — Gestion budgétaire, comptable et de trésorerie

Plateforme web de gestion budgétaire, d'exécution de la dépense, de trésorerie et de comptabilité, destinée aux organismes publics et parapublics africains, alignée sur le cadre **OHADA / SYCEBNL**.

## Démarrage

```bash
npm install
npm run dev
```

L'application démarre sur http://localhost:8080, sans configuration préalable : l'URL du projet Supabase et la clé publique `anon` sont écrites dans [`src/integrations/supabase/client.ts`](src/integrations/supabase/client.ts), fichier généré.

Un `.env` reste utile pour l'outillage local — voir [`.env.example`](.env.example). Il n'est pas versionné et ne doit jamais l'être.

## Le domaine métier

### Chaîne de la dépense

```
Réservation → Engagement → Bon de commande → Facture → Dépense → Paiement
  (crédit)     (juridique)     (achat)       (dette)  (liquidation) (décaissement)
```

À chaque étape, le crédit budgétaire est consommé et recalculé automatiquement. La base tient quatre compteurs par ligne budgétaire — `montant_reserve`, `montant_engage`, `montant_liquide`, `montant_paye` — dont se déduit le **disponible**, contrôlé en temps réel.

### Structure budgétaire

```
Structure → Section → Programme → Action → Ligne budgétaire
                                             ├── Enveloppes (sources de financement)
                                             └── Projets (axe analytique)
```

### Modèle d'accès

Multi-tenant (plusieurs clients par instance) croisé multi-exercice. Six rôles : `super_admin`, `admin_client`, `directeur_financier`, `comptable`, `chef_service`, `operateur_saisie`.

## Modules

| Domaine | Contenu |
|---|---|
| Préparation | Budget, projets & analytique, prévisions, enveloppes |
| Exécution | Réservations, engagements, dépenses, paiements |
| Achats | Fournisseurs, bons de commande, factures |
| Trésorerie | Comptes, recettes, opérations, rapprochements, journal |
| Comptabilité | Plan comptable, règles paramétrables, écritures générées, journal |
| Reporting | 21 rapports en 5 familles : budgétaire, financier, comptable, trésorerie, réglementaire |
| Administration | Exercices, référentiels, structure, format monétaire |

### Modules non implémentés

Analyses financières, contrôle interne, mandats et gestion des utilisateurs affichent un écran « Module en construction ».

Côté reporting, les rapports déclarent eux-mêmes leur maturité via le champ `availability` dans [`src/lib/reporting-definitions.ts`](src/lib/reporting-definitions.ts) : `live` (données complètes), `partial` (calcul métier à approfondir), `empty` (structure prête, données non exposées).

## Architecture

| Couche | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui, React Router, Recharts, Zod |
| Backend | Supabase — Postgres avec RLS, edge functions Deno |
| Déploiement | Vercel, sur la branche `main` |

**Point d'architecture structurant : la logique métier vit majoritairement en base, pas dans le frontend.** Les triggers et fonctions Postgres assurent les recalculs de montants et l'intégrité référentielle ; les edge functions gèrent les créations avec numérotation séquentielle (`create_engagement_with_numero`, `create_facture_with_numero`, …). Le frontend consomme cette logique via les services de `src/services/api/`.

Conséquence pratique : **toute évolution fonctionnelle du calcul passe d'abord par une migration SQL**, pas par du code React.

```
src/
├── components/       # Composants par domaine métier + ui/ (shadcn)
├── contexts/         # Auth, Client, Exercice
├── hooks/            # Hooks de données et d'état
├── integrations/
│   └── supabase/     # Client et types générés
├── lib/              # Utilitaires, définitions de reporting
├── pages/
│   ├── app/          # Pages applicatives (layout AppLayoutTailAdmin)
│   └── auth/         # Connexion
├── services/api/     # Accès aux données, un service par entité
└── types/            # Types du domaine

supabase/
├── migrations/       # Schéma, triggers, fonctions RPC
└── functions/        # Edge functions Deno
```

## Scripts

```bash
npm run dev        # Serveur de développement (port 8080)
npm run build      # Build de production
npm run preview    # Prévisualisation du build
npm run lint       # ESLint
```

## Base de données

Les migrations sont dans `supabase/migrations/`, appliquées via le CLI Supabase :

```bash
supabase db push
```

Le script `sync-migrations.sh` synchronise les migrations locales avec le projet distant.

## Documentation complémentaire

- [`src/AGENTS-BUSINESS.md`](src/AGENTS-BUSINESS.md) — règles métier du domaine budgétaire
- [`src/AGENTS-WORKFLOWS.md`](src/AGENTS-WORKFLOWS.md) — workflows applicatifs
- [`src/AGENTS-PATTERNS.md`](src/AGENTS-PATTERNS.md) — conventions de code
- [`src/AGENTS-GOTCHAS.md`](src/AGENTS-GOTCHAS.md) — pièges connus
