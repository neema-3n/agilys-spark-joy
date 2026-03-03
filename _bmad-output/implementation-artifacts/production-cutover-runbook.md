# Runbook de Cutover Production

Date de preparation: 2026-03-03  
Story source: `m3-1-produire-le-runbook-de-cutover-production`  
Version: v1.0

## 1. Objet et perimetre

Ce runbook decrit l'execution de la bascule production de la migration vers la stack cible (Frontend/NestJS/PostgreSQL) de facon gouvernee, reversible et audit-able.

Perimetre inclus:
- bascule traffic et verification des services critiques,
- controles pre-cutover et post-cutover,
- decision Go/No-Go,
- handover exploitation.

Perimetre exclu:
- execution detaillee du rollback technique (couverte par story M3.2),
- decommission definitive Supabase (couverte par story M3.3),
- hypercare 7-14 jours (couverte par story M3.4).

## 2. Preconditions de demarrage

### 2.1 Gate A (obligatoire)

Les stories suivantes doivent etre `done`:
- `m1-1-etablir-linventaire-de-parite-fonctionnelle`
- `m2-1-definir-mapping-et-strategie-de-migration-data`
- `m2-2-implementer-le-backfill-idempotent-par-lots`
- `m2-3-reconciler-avant-apres-sur-donnees-critiques`
- `m1-2-verifier-la-parite-des-contrats-api`
- `m1-3-executer-la-non-regression-e2e-de-migration`

### 2.2 Preconditions operationnelles

- Fenetre de maintenance validee et communiquee.
- Incident commander nomme.
- Canaux de communication ouverts et testes.
- Monitoring/alerting actifs (app, API, DB, files d'integration).
- Sauvegarde et point de restauration verifies.
- Plan de rollback M3.2 reference et accessible.

## 3. Roles et responsabilites (RACI simplifie)

- Release Manager (A): pilote la timeline, arbitre Go/No-Go, signe la cloture.
- SRE/Ops (R): execute les operations infra, observe SLO/SLA, escalade incidents.
- Lead Backend (R): valide sante API, jobs critiques, contrats de reponse.
- Lead Frontend (R): valide parcours UX critiques et redirections.
- Lead Data (R): valide coherence data post-bascule et reconciliation rapide.
- Support/Business Owner (C/I): valide scenarios metier prioritaires et communication utilisateur.

## 4. Plan minute par minute (T-60 a T+120)

| Temps | Etape | Owner | Action/Commande | Preuve attendue | Critere de succes |
|---|---|---|---|---|---|
| T-60 | Freeze release | Release Manager | Geler changements non critiques | Message freeze diffuse | Aucun changement non autorise |
| T-55 | Verif canaux | SRE/Ops | Tester canal incident + canal metier | Ping/ack de chaque role | Communication operationnelle |
| T-50 | Snapshot pre-cutover | Lead Data | Executer backup/snapshot valide | ID backup + checksum | Restore point disponible |
| T-45 | Check health baseline | SRE/Ops | Verifier healthchecks app/api/db | Export dashboard baseline | Aucun signal rouge critique |
| T-40 | Verif prerequis Gate A | Release Manager | Lire evidence stories M1/M2 done | Checklist signee | Gate A confirme |
| T-35 | Validation contrats API | Lead Backend | Lancer smoke API critique | Resultat smoke consigne | 0 ecart bloquant |
| T-30 | Validation UX auth | Lead Frontend | Verifier login + redirection app | Capture parcours | Parcours nominal ok |
| T-25 | Validation data critique | Lead Data | Recheck reconciliation rapide | Rapport rapide no-critical | 0 anomalie critique |
| T-20 | Point pre-Go | Tous | Stand-up court et risques ouverts | Journal de decision | Risques acceptes ou traites |
| T-15 | Go/No-Go gate | Release Manager | Appliquer matrice Go/No-Go | Decision signee | Decision Go ou No-Go explicite |
| T-10 | Preparation switch | SRE/Ops | Preparer bascule traffic/services | Log de preparation | Pret a switch |
| T-05 | Debut cutover | SRE/Ops | Executer switch selon procedure | Log operation + timestamp | Switch execute |
| T+00 | Verification immediate | Lead Backend/SRE | Verifier endpoints critiques | Healthchecks post-switch | API stable |
| T+10 | Smoke metier prioritaire | Frontend + Business | Executer scenarios critiques | Rapport smoke metier | 0 blocage critique |
| T+20 | Controle sécurité | SRE/Ops | Verifier auth/roles/separation | Logs controles | 0 violation critique |
| T+30 | Controle data coherence | Lead Data | Verif comptes/etats critiques | Rapport coherence rapide | 0 derive critique |
| T+45 | Monitoring renforce | SRE/Ops | Surveiller erreurs/latence | Extrait dashboards | SLO dans seuils |
| T+60 | Point stabilisation | Release Manager | Decision maintien Go/No-Go tardif | Journal de decision | Stabilisation confirmee |
| T+90 | Handover support | Support + Release | Transferer contexte au support | Note handover | Support autonome |
| T+120 | Cloture cutover | Release Manager | Sign-off technique + metier | PV de cloture signe | Cutover clos et trace |

## 5. Matrice Go/No-Go

| Critere | Seuil Go | Seuil No-Go | Decisionnaire | Duree max decision |
|---|---|---|---|---|
| Gate A stories migration | 100% `done` | au moins 1 non done | Release Manager | 10 min |
| Smoke API critique | 100% pass | au moins 1 echec critique | Lead Backend | 10 min |
| Parcours auth->app | 100% pass | echec login/redirection | Lead Frontend | 10 min |
| Coherence data critique | 0 anomalie critique | au moins 1 anomalie critique | Lead Data | 10 min |
| Monitoring erreurs severes | aucune alerte critique active | alerte critique non maitrisee > 10 min | SRE/Ops | 10 min |
| Conformite securite (RBAC) | 0 violation | au moins 1 violation | SRE/Ops | 10 min |

Regle de decision:
- Go uniquement si tous les criteres Go sont valides.
- Si un critere No-Go est vrai, arret cutover et bascule vers procedure M3.2.
- Delai maximal de decision Go/No-Go: 10 minutes, au-dela declenchement No-Go par defaut.

## 6. Procedure en cas de No-Go

1. Declarer No-Go dans le canal incident.
2. Geler toute action non essentielle.
3. Lancer le plan de rollback story M3.2.
4. Reactiver la stack precedente puis restaurer le snapshot pre-cutover.
5. Executer le checkpoint smoke API/Auth post-reactivation et valider les parcours metier prioritaires.
6. Executer `pnpm run test:rollback:gate` et archiver le rapport `rollback-drill-gate-report.md`.
7. Horodater la decision finale, les causes et le statut de cloture.
8. Notifier metier/support avec ETA de retour au nominal.

## 7. Communication et escalade

Canaux:
- Canal Incident: coordination technique temps reel.
- Canal Metier: information stakeholders metier.
- Canal Support: impacts utilisateurs et scripts de reponse.

Template message de debut:
`Cutover production demarre a <heure UTC>, freeze actif, prochain point a T+20.`

Template message No-Go:
`No-Go declare a <heure UTC> pour <motif>. Rollback M3.2 declenche. ETA prochain update: <heure>.`

Template message cloture:
`Cutover cloture a <heure UTC>. Statut: <Go final/No-Go+rollback>. Rapport complet en cours d'archivage.`

## 8. Validation post-cutover (checklist)

- [ ] Healthchecks app/api/db verts
- [ ] Scenarios auth et routes protegees valides
- [ ] Parcours metiers critiques valides
- [ ] Aucune alerte securite critique
- [ ] Coherence data critique validee
- [ ] Monitoring p95 dans seuils cibles
- [ ] Journal de decision complet
- [ ] Handover support effectue

## 9. Preuves a archiver

- Journal timeline (etapes + horodatage + owner)
- Resultats smoke tests (API + metier)
- Captures monitoring pre/post bascule
- Rapport de coherence data post-cutover
- Decision Go/No-Go signee
- PV de cloture technique/metier

## 10. Sign-off

- Release Manager: __________________  Date/Heure: __________________
- Lead SRE/Ops: _____________________ Date/Heure: __________________
- Lead Backend: _____________________ Date/Heure: __________________
- Lead Frontend: ____________________ Date/Heure: __________________
- Lead Data: ________________________ Date/Heure: __________________
- Business Owner: ___________________ Date/Heure: __________________

## 11. Liens et references

- Story M3.1: `/_bmad-output/implementation-artifacts/m3-1-produire-le-runbook-de-cutover-production.md`
- Story M3.2 (rollback): `/_bmad-output/implementation-artifacts/m3-2-tester-le-plan-de-rollback-operationnel.md`
- Rapport drill rollback M3.2: `/_bmad-output/implementation-artifacts/rollback-staging-drill-2026-03-03.md`
- Gate automatisee rollback: `pnpm run test:rollback:gate`
- Sprint status: `/_bmad-output/implementation-artifacts/sprint-status.yaml`
- Matrice de parite: `/_bmad-output/planning-artifacts/migration-parity-matrix.md`

## 12. Retours d'execution M3.2 (post-drill)

- Integrer le checkpoint smoke API/Auth post-reactivation stack precedente dans toute execution No-Go.
- Exiger la generation d'un rapport de gate rollback (RTO/RPO + preuves minimales) avant validation de cloture.
