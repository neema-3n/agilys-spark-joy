# Backlog Sprintable - Fermeture Migration (V1)

Date: 2026-03-02
Source: `epics.md` (Epic M1 a M4)

## Cadence proposee
- Sprint length: 2 semaines
- Priorite globale: terminer migration sans angle mort (parite, data, cutover, decommission)
- Regle transversale: aucun nouveau flux critique sans test de contrat/E2E associe

## Sprint A - Preuve de parite + securisation data

### M1.1 - Etablir l'inventaire de parite fonctionnelle
- Priority: P0
- Estimate: 5 pts
- Dependencies: aucune
- Acceptance Criteria:
  - Matrice `route/page -> API -> table` completee
  - Statut de chaque item: `migre`, `partiel`, `non migre`
  - Owner + date cible sur tous les flux critiques

### M2.1 - Definir mapping et strategie de migration data
- Priority: P0
- Estimate: 5 pts
- Dependencies: M1.1
- Acceptance Criteria:
  - Mapping source -> cible valide par domaine
  - Regles de transformation formalisees
  - Cas invalides/orphelins avec regles explicites

### M2.2 - Implementer le backfill idempotent par lots
- Priority: P0
- Estimate: 8 pts
- Dependencies: M2.1
- Acceptance Criteria:
  - Scripts rejouables sans doublon
  - Journal de lot (compteurs, erreurs, retries)
  - Reprise apres incident validee

### M2.3 - Reconciler avant/apres sur donnees critiques
- Priority: P0
- Estimate: 5 pts
- Dependencies: M2.2
- Acceptance Criteria:
  - Rapport reconciliation cardinalite + coherence
  - Ecarts critiques identifies et corriges
  - Validation metier/technique archivee

### M1.2 - Verifier la parite des contrats API
- Priority: P0
- Estimate: 5 pts
- Dependencies: M1.1
- Acceptance Criteria:
  - Tests contrats sur endpoints critiques
  - Comparaison ancien/nouveau automatisee
  - 0 ecart bloquant sur flux critiques

### M1.3 - Executer la non-regression E2E de migration
- Priority: P0
- Estimate: 5 pts
- Dependencies: M1.2
- Acceptance Criteria:
  - Scenarios E2E critiques executes en CI
  - Rapports d'execution archives
  - 0 regression bloquante

## Gate Go/No-Go Sprint A
- Parite cataloguee a 100% sur flux critiques
- Data reconciliation validee sur perimetre critique
- Contrats API + E2E critiques au vert

## Sprint B - Bascule, rollback, decommission et cloture

### M3.1 - Produire le runbook de cutover production
- Priority: P0
- Estimate: 3 pts
- Dependencies: Gate Sprint A
- Acceptance Criteria:
  - Plan minute par minute pre-check/bascule/post-check
  - Criteres Go/No-Go explicites
  - Roles et responsabilites assignes

### M3.2 - Tester le plan de rollback operationnel
- Priority: P0
- Estimate: 5 pts
- Dependencies: M3.1
- Acceptance Criteria:
  - Repetition rollback en staging executee
  - Procedure operationnelle verifiee
  - RTO/RPO mesures et documentes

### M3.3 - Decommissionner Supabase de facon controlee
- Priority: P0
- Estimate: 8 pts
- Dependencies: M3.1, M3.2
- Acceptance Criteria:
  - Inventaire usages Supabase vide en runtime
  - Auth/RLS/Storage/Functions/webhooks migres ou retires
  - Verification finale: aucun appel runtime vers Supabase

### M4.1 - Revalider RBAC/ABAC et separation des responsabilites
- Priority: P0
- Estimate: 5 pts
- Dependencies: M3.3
- Acceptance Criteria:
  - Tests autorisation sur operations sensibles
  - 0 violation separation ordonnateur/comptable
  - Journalisation de securite validee

### M4.2 - Produire le dossier d'audit de migration
- Priority: P1
- Estimate: 3 pts
- Dependencies: M4.1
- Acceptance Criteria:
  - Dossier preuves techniques + metier complet
  - Decisions/incidents/resolutions traces
  - Signature de cloture migration obtenue

### M3.4 - Organiser l'hypercare post-bascule
- Priority: P1
- Estimate: 5 pts
- Dependencies: M3.3
- Acceptance Criteria:
  - Hypercare 7-14 jours active
  - Monitoring + triage incident quotidien
  - Rapport de fin d'hypercare avec decision de stabilisation

## Gate Go/No-Go Final (migration close)
- Supabase retire du runtime principal
- Cutover et rollback repetes avec succes
- Securite d'acces revalidee
- Dossier d'audit signe

## Definition of Done (transverse)
- Aucun appel Supabase introduit ou conserve sur flux migres
- Tests critiques (contrat + E2E + reconciliation) au vert
- Lint/typecheck propres sur composants modifies
- Documentation runbook/audit mise a jour
