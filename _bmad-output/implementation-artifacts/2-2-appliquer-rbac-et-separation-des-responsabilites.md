# Story 2.2 - Appliquer RBAC et separation des responsabilites

Status: ready-for-dev
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-2-appliquer-rbac-et-separation-des-responsabilites
Created: 2026-03-02

## Story

As a admin client,
I want attribuer/revoquer des roles metiers,
So that chaque acteur n'accede qu'aux actions autorisees.

## Acceptance Criteria

1. **Given** un utilisateur avec un role defini
   **When** il tente une action sensible
   **Then** les guards RBAC/ABAC appliquent les regles d'acces
   **And** la reponse HTTP est coherente avec la politique (autorise ou refuse).

2. **Given** une operation impliquant separation des responsabilites
   **When** un meme acteur cumule des droits incompatibles (ordonnateur/comptable)
   **Then** l'operation est bloquee
   **And** un motif explicite est retourne cote API.

3. **Given** une modification de role utilisateur
   **When** l'admin attribue ou revoque un role
   **Then** le changement est persiste
   **And** il prend effet sur les appels suivants sans comportement ambigu.

4. **Given** un acces refuse pour raison de role/politique
   **When** l'evenement est traite
   **Then** un log d'audit minimal est emis avec `userId`, `tenantId`, action ciblee, decision et horodatage
   **And** aucune donnee sensible n'est exposee.

## Scope Technique (MVP Story 2.2)

- Backend NestJS:
  - guards RBAC/ABAC sur endpoints sensibles
  - service/politique de separation des responsabilites
  - endpoint(s) de gestion d'attribution/revocation de roles
- Persistence:
  - stockage des roles utilisateur et regles associees
- Audit:
  - journalisation des decisions d'autorisation et refus critiques

## Out of Scope

- Isolation complete multi-tenant des donnees (Story 2.3)
- Refonte globale des ecrans frontend de gouvernance des roles
- Moteur d'autorisation generique cross-domain au-dela du perimetre Epic 2

## Tasks / Subtasks

- [ ] Definir le modele d'autorisation RBAC/ABAC (AC: 1, 2)
  - [ ] Lister les roles metiers et permissions associees
  - [ ] Modeliser les politiques de separation ordonnateur/comptable
  - [ ] Aligner les statuts d'erreur API pour refus d'autorisation

- [ ] Implementer les guards d'autorisation NestJS (AC: 1, 2)
  - [ ] Ajouter/etendre guards decorateurs role/policy sur endpoints sensibles
  - [ ] Integrer evaluation ABAC avec contexte minimal (user, role, tenant, action)
  - [ ] Bloquer explicitement les combinaisons de responsabilites incompatibles

- [ ] Implementer gestion des roles utilisateur (AC: 3)
  - [ ] Creer ou completer les endpoints d'attribution/revocation de roles
  - [ ] Persister les changements de roles de facon idempotente
  - [ ] Verifier la prise d'effet immediate sur les autorisations suivantes

- [ ] Ajouter audit et tracabilite des decisions (AC: 4)
  - [ ] Emettre logs structures pour autorisations/refus critiques
  - [ ] Inclure userId/tenantId/action/decision/horodatage
  - [ ] Exclure toute donnee sensible des logs

- [ ] Couvrir par tests backend (AC: 1, 2, 3, 4)
  - [ ] Tests unitaires des politiques RBAC/ABAC et separation des responsabilites
  - [ ] Tests d'integration des endpoints proteges (autorise vs refuse)
  - [ ] Tests d'integration attribution/revocation de roles et prise d'effet

## Dev Notes

### Contexte architecture et guardrails

- Le backend NestJS introduit en Story 2.1 est la base d'implementation.
- Les nouvelles regles d'autorisation doivent vivre cote backend (pas dans les composants UI).
- Ne pas introduire de dependance runtime Supabase pour cette story.

### Contraintes de mise en oeuvre

- Appliquer les guards sur les endpoints sensibles en priorite.
- Conserver des messages d'erreur actionnables sans fuite d'information sensible.
- Garantir une logique deterministe sur les cas de separation des responsabilites.

### Test strategy minimale

- Unit: evaluation permissions par role, conflits de separation.
- Integration: acces autorise/refuse sur endpoints critiques.
- Non-regression: aucun impact sur les flux auth deja valides en Story 2.1.

### References

- Source story: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.2)
- Story precedente: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/2-1-mettre-en-place-lauth-nestjs-jwt-refresh.md`
- Sprint tracker: `/Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/implementation-artifacts/sprint-status.yaml`
