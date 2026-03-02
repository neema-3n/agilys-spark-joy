# Backlog Sprintable - Migration Progressive (V1)

Date: 2026-03-01
Source: sprint-change-proposal-2026-03-01.md (approuvée)

## Cadence proposée
- Sprint length: 2 semaines
- Priorité globale: continuité utilisateur + migration progressive sans rupture UX
- Règle transversale: réutiliser `shadcn/ui` et améliorer les composants existants avant réutilisation

## Sprint 1 - Fondations techniques minimales

### CC-01.01 - Bootstrap monorepo migration
- Priority: P0
- Estimate: 5 pts
- Dependencies: aucune
- Acceptance Criteria:
  - Monorepo structuré avec `apps/web-next`, `apps/api-nest`, `packages/shared-types`
  - Scripts de dev/build/lint exécutables
  - Conventions de partage de types documentées

### CC-01.02 - PostgreSQL local et migrations initiales
- Priority: P0
- Estimate: 8 pts
- Dependencies: CC-01.01
- Acceptance Criteria:
  - PostgreSQL local opérationnel
  - Migrations versionnées exécutables (`db:migrate`, `db:reset`, `db:seed`)
  - Schéma minimal: users, roles, tenants/client, tables cœur paramétrage

### CC-01.03 - Client API front unifié
- Priority: P0
- Estimate: 5 pts
- Dependencies: CC-01.01
- Acceptance Criteria:
  - Wrapper HTTP commun avec gestion erreurs + auth headers
  - Au moins 1 module branché sur cette couche (sans appel direct Supabase)

### CC-01.04 - Stratégie UI de transition transparente
- Priority: P0
- Estimate: 3 pts
- Dependencies: CC-01.01
- Acceptance Criteria:
  - Audit composants `shadcn/ui` + composants maison fait
  - Liste “à améliorer avant réutilisation” produite
  - Guide de continuité UX validé

## Sprint 2 - Auth complète (hors Supabase)

### CC-02.01 - Auth NestJS (JWT + refresh)
- Priority: P0
- Estimate: 8 pts
- Dependencies: CC-01.02
- Acceptance Criteria:
  - Endpoints login/logout/refresh implémentés
  - Guards de protection actifs
  - Gestion access/refresh token testée en local

### CC-02.02 - RBAC et permissions métier
- Priority: P0
- Estimate: 5 pts
- Dependencies: CC-02.01
- Acceptance Criteria:
  - Rôles et permissions stockés en DB
  - Guards RBAC sur endpoints sensibles
  - Cas refus d’accès couvert

### CC-02.03 - Migration frontend AuthContext vers API NestJS
- Priority: P0
- Estimate: 8 pts
- Dependencies: CC-02.01, CC-02.02
- Acceptance Criteria:
  - `AuthContext` n’utilise plus Supabase
  - Protection des routes conservée (aucune rupture user)
  - Refresh silencieux/session expirée gérés

## Sprint 3 - Modules prioritaires (partie 1)

### CC-03.01 - Paramètres Utilisateurs (complet)
- Priority: P1
- Estimate: 8 pts
- Dependencies: CC-02.03
- Acceptance Criteria:
  - CRUD utilisateurs disponible
  - Attribution rôles disponible
  - Activation/désactivation + journal d’audit minimal
  - UI basée sur composants existants améliorés

### CC-03.02 - Paramètres Généraux (complet)
- Priority: P1
- Estimate: 5 pts
- Dependencies: CC-02.03
- Acceptance Criteria:
  - Configuration générale gérée en UI + API
  - Historisation des changements sensibles
  - Pas de régression visuelle dans Paramètres

## Sprint 4 - Modules prioritaires (partie 2)

### CC-03.03 - Rapprochement bancaire (MVP)
- Priority: P1
- Estimate: 13 pts
- Dependencies: CC-02.03
- Acceptance Criteria:
  - Import de relevés/mouvements
  - Matching semi-automatique opérationnel
  - Gestion d’écarts + état de rapprochement
  - Parcours utilisateur cohérent avec UI existante

## Sprint 5 - Migration métier progressive

### CC-04.01 - Adapter services partagés sans duplication
- Priority: P1
- Estimate: 8 pts
- Dependencies: CC-01.03
- Acceptance Criteria:
  - Façades par domaine créées
  - Remplacement progressif des appels Supabase sous façade
  - Réutilisation composants `shadcn/ui` priorisée

### CC-04.02 - Migration progressive par lots métier
- Priority: P1
- Estimate: 13 pts
- Dependencies: CC-04.01
- Acceptance Criteria:
  - Lot 1 (paramètres + auth): terminé
  - Lot 2 (trésorerie): terminé
  - Lot 3 (chaîne dépense): planifié + démarré

## Sprint 6 - Sortie Supabase

### CC-04.03 - Décommission Supabase
- Priority: P2
- Estimate: 8 pts
- Dependencies: CC-04.02
- Acceptance Criteria:
  - Dépendances Supabase retirées du runtime principal
  - Code mort supprimé/archivé
  - Runbook migration et exploitation locale à jour

## Risques & Mitigation
- Risque: régression fonctionnelle pendant migration module par module
  - Mitigation: feature flags + QA de non-régression ciblée par module
- Risque: dérive UX
  - Mitigation: revue UI systématique avant livraison, réutilisation composants existants améliorés
- Risque: auth instable en phase de bascule
  - Mitigation: migration auth tôt (Sprint 2), tests de session/refresh avant modules métier

## Définition de Done (transverse)
- Pas d’appel Supabase ajouté dans les nouvelles stories
- Types stricts et lint clean
- UX sans rupture visible pour l’utilisateur final
- Documentation technique de la story mise à jour
