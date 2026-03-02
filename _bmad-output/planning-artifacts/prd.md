---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-01b-continue
  - step-12-complete
inputDocuments:
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/product-brief-agilys-2026-02-01.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/product-brief-agilys-2026-02-11.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/product-brief-validation-agilys-2026-02-01.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/research/market-agilys-public-pfm-research-2026-02-11.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/research/domain-gestion-budgetaire-publique-ohada-syscebnl-research-2026-02-11.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/planning-artifacts/research/technical-agilys-mvp-architecture-research-2026-02-11.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/brainstorming/brainstorming-session-2026-02-05T20:06:29Z.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/analysis/copil-deck-agilys-2026-02-05.md
  - /Volumes/mySD1.5/projects/agilys/_bmad-output/analysis/executive-brief-agilys-2026-02-05.md
workflowType: 'prd'
workflow: 'edit'
documentCounts:
  briefCount: 3
  researchCount: 3
  brainstormingCount: 1
  projectDocsCount: 0
classification:
  projectType: saas_b2b
  domain: govtech
  complexity: high
  projectContext: greenfield
date: 2026-02-11
lastEdited: 2026-02-17
editHistory:
  - date: 2026-02-17
    changes: "Ajout surface vitrine publique: scope, funnel acquisition->auth, FR74-FR83 et NFR37-NFR42."
  - date: 2026-02-17
    changes: "Passage vitrine multi-pages en Release 1: contrat sitemap, FR84-FR90 et NFR43-NFR44."
  - date: 2026-02-13
    changes: "Reecriture complete post-validation: NFR mesurables, tracabilite KPI business, compliance govtech, FR14"
  - date: 2026-02-13
    changes: "Priorisation input utilisateur: rapports/analyses/dashboards integres au PRD (scope + FR)."
  - date: 2026-02-13
    changes: "Ajout addendum impacts implementation pour FR60-FR70 (API, donnees, ecrans, delivery)."
  - date: 2026-02-13
    changes: "Alignement 100% input rapports: ajout FR71-FR73 (DSF, pieces manquantes, temps par etape)."
---

# Product Requirements Document - agilys

**Author:** Snoumigue
**Date:** 2026-02-11

## Executive Summary

AGILYS est une application SaaS de gestion budgetaire publique de bout en bout.  
Le produit couvre la planification et l'allocation budgetaire, l'execution de la depense, le controle de tresorerie, et le reporting probatoire pour audit et pilotage.  
Release 1 (V1) vise un impact mesurable en 90 jours sur la maitrise des allocations, la fluidite des transitions de depense, et la rapidite de production des preuves de controle.  
La strategie produit repose sur des invariants non negociables: historique non destructif, separation ordonnateur/comptable, controle cash sur transitions critiques, correlation ID sur flux critiques, et conformite locale (OHADA/SYCEBNL, souverainete, donnees personnelles).

## Success Criteria

### User Success (Release 1 - 90 jours)

- `% lignes budgetaires allouees et validees dans le delai cible >= 80%`
- `% ecart prevision vs execution sur perimetre pilote <= 10%`
- `% dossiers de depense passant Reservation -> Paiement sans reprise majeure >= 70%`
- `% transitions critiques avec controle cash applique >= 90%`
- `Temps moyen de constitution d'un dossier d'audit <= 4 heures`
- `% visiteurs vitrine -> clic CTA principal >= 20%`
- `% clic CTA principal -> authentification reussie >= 60%`

Contexte assume: premiere mise en production du produit complet, avec priorite a la stabilite, la conformite et la fiabilite operationnelle.

### Business Success (12 mois)

- `>= 5 organisations actives en production`
- `>= 80%` des organisations onboardees atteignent un usage V1 actif
- `Rétention organisationnelle >= 90%`
- `>= 1 référence institutionnelle majeure signée et publiée avant M+12`
- `MRR >= 25k EUR` à M+12 sur périmètre V1

### Technical Success (SLO/SLA)

- `Disponibilité plateforme >= 99,5%` (hors fenêtres planifiées)
- `Synchronisation offline -> online (p95) <= 5 min` après reconnexion stable
- `Latence moteur de règles (p95) <= 500 ms` (contrôle cash + autorisation)

### Measurable Outcomes

- Adoption V1 mesuree par la progression des 4 KPI User Success a M+3.
- Conversion acquisition mesuree via funnel vitrine -> clic CTA principal -> authentification reussie -> premiere visite app.
- Viabilité business mesurée à M+12 par production active, activation, rétention, référence institutionnelle signée/publiée, et MRR.
- Fiabilité technique mesurée en continu via SLO (disponibilité, sync p95, latence règles p95).
- La référence institutionnelle est tracée par un parcours d'adoption institutionnelle (pilote -> homologation -> publication de cas).

## Product Scope

### Release 1 (V1) - Functional Baseline

- Vitrine publique multi-pages de presentation produit (acquisition, credibilite, conversion)
- Sitemap vitrine minimum en Release 1: `/`, `/fonctionnalites`, `/cas-clients`, `/contact`, pages legales
- Parcours d'entree unifie `visite vitrine -> Se connecter -> authentification -> application`
- Cadrage budgetaire de l'exercice (structures, enveloppes, nomenclatures)
- Allocation, suivi et reallocation des credits par programme/section/action
- Previsions budgetaires et suivi ecart prevision/execution
- Execution de la depense (Reservation -> Engagement -> Bon de commande -> Facture -> Depense -> Paiement)
- Controle cash-aware sur transitions critiques
- Suivi de tresorerie
- Composants pilotage: tableau de bord, analyses financieres, reporting
- Composants comptabilite et conformite: plan comptable, journal comptable, controle interne
- Catalogue de rapports prioritaires: execution budgetaire, engagements, credits disponibles, alertes de depassement, tresorerie, paiements, rapprochement bancaire, balance, grand livre, fiche compte, dettes fournisseurs, avances/regularisations, dashboards multi-axes et audit trail
- Parametres de gouvernance (roles, regles, seuils, entites)
- Parcours offline-first et reprise synchronisee
- Dossier d'audit exportable et historise

### Enhancements Post-V1

- Interop renforcee avec Tresor, procurement et GED
- Analytics avancee de performance budgetaire multi-axes
- Scenario planning budgetaire et simulations pluriannuelles

### Vision (Future)

- Automatisation et IA d’assistance
- Reporting bailleurs industrialisé

### Out of Scope (Release 1)

- Consolidation financiere multi-entites et normes internationales avancees (au-dela du perimetre OHADA/SYCEBNL cible)
- Gestion des recettes
- Paie
- Gestion patrimoniale
- CMS marketing avance (edition no-code, workflow d'approbation, personnalisation par segment)
- A/B testing automatise de pages vitrine

## Domain Model & Navigation Contract

Le produit est organise en trois surfaces de navigation:

- `Vitrine publique`: presentation produit multi-pages, preuve de valeur, capture de lead et acces a l'authentification

- `Operations`: execution budgetaire et depense
- `Pilotage`: comptabilite, conformite, analyse et administration

### Menu-to-Domain Mapping (heritage valide)

| Espace | Menu | Objet metier principal | Workflow principal | KPI principal |
| --- | --- | --- | --- | --- |
| Operations | Budget | Budget/Enveloppe/Ligne | Cadrer -> Allouer -> Reallouer -> Cloturer periode | Taux d'allocation dans delai cible |
| Operations | Previsions Budgetaires | Prevision | Saisir -> Consolider -> Valider -> Comparer a l'execution | Ecart prevision/execution |
| Operations | Reservation de Credits | Reservation | Brouillon -> Soumise -> Validee -> Annulee/Expiree | Delai moyen de reservation |
| Operations | Engagements | Engagement | Brouillon -> Valide -> Partiellement execute -> Solde/Annule | Taux d'engagement conforme |
| Operations | Bons de Commande | Bon de commande | Brouillon -> Emis -> Partiellement receptionne -> Receptionne -> Cloture/Annule | Taux BC rapproches |
| Operations | Factures | Facture | Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee/Rejetee/Annulee | Taux factures validees sans rejet |
| Operations | Depenses | Depense | Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee/Annulee | Delai ordonnancement -> paiement |
| Operations | Paiements | Paiement | Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie (ou Rejete/Annule) | Taux paiements reconcilies |
| Operations | Suivi de Tresorerie | Position de tresorerie | Consolider -> Projeter -> Alerter -> Arbitrer | Respect des seuils de tresorerie |
| Pilotage | Plan Comptable | Compte/Nomenclature | Configurer -> Versionner -> Publier | Couverture nomenclature |
| Pilotage | Journal Comptable | Ecriture/Journaux | Generer -> Verifier -> Exporter | Taux ecritures conformes |
| Pilotage | Controle Interne | Controle/Exception | Detecter -> Qualifier -> Assigner -> Cloturer | Delai de cloture des controles |
| Pilotage | Tableau de Bord | Indicateur | Consolider -> Visualiser -> Decider | Frequence d'usage pilotage |
| Pilotage | Projets & Analytique | Axe analytique | Associer -> Suivre -> Analyser | Taux de depenses ventilees |
| Pilotage | Analyses Financieres | Analyse | Calculer -> Comparer -> Expliquer | Delai de production analyse |
| Pilotage | Reporting | Rapport | Compiler -> Valider -> Publier | Delai de publication reporting |
| Pilotage | Parametres | Gouvernance systeme | Configurer -> Tester -> Appliquer | Taux configs conformes du premier coup |

### Canonical Domain Objects

- `Budget`: cadre d'allocation (exercice, enveloppes, lignes, plafonds, versions)
- `Reservation`: blocage previsionnel de credit avant engagement
- `Engagement`: obligation juridique sur credit reserve
- `Bon de commande`: support contractuel/achat d'un engagement
- `Facture`: piece justificative soumise a controle et liquidation
- `Depense`: dossier financier ordonnancable, potentiellement compose de une ou plusieurs factures
- `Paiement`: execution vers systeme de tresorerie/ERP avec statuts de retour
- `Position de tresorerie`: etat/projection cash pour controle de risque

### State Machines (Release 1)

- `Budget`: Brouillon -> Propose -> Valide -> Publie -> Ajuste -> Cloture
- `Facture`: Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee
- `Depense`: Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee -> Annulee
- `Paiement`: Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie (ou Rejete/Annule selon retour)

### Status Model by Document

Cette section sert de contrat de reference pour l'UX, le backend, les regles de droits et les tests.

- `Reservation`: Brouillon -> Soumise -> Validee -> Rejetee -> Annulee -> Expiree
- `Engagement`: Brouillon -> Valide -> Partiellement execute -> Solde -> Annule
- `BonDeCommande`: Brouillon -> Emis -> Partiellement receptionne -> Receptionne -> Cloture -> Annule
- `Facture`: Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee
- `Depense`: Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee -> Annulee
- `Paiement`: Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie (ou Rejete/Annule selon retour)

Tableau des transitions (contrat minimal):

| Document | From | To | Type | Condition minimale |
| --- | --- | --- | --- | --- |
| Reservation | Brouillon | Soumise | Autorisee | Champs obligatoires complets |
| Reservation | Soumise | Validee | Autorisee | Validation role habilite + credit disponible |
| Reservation | Validee | Brouillon | Interdite | Requiert nouvelle reservation |
| Engagement | Brouillon | Valide | Autorisee | Reservation valide + pieces justificatives |
| Engagement | Valide | Solde | Autorisee | Execution complete constatee |
| Engagement | Solde | Valide | Interdite | Statut final irreversible |
| BonDeCommande | Brouillon | Emis | Autorisee | Engagement valide |
| BonDeCommande | Emis | Receptionne | Autorisee | Reception confirmee |
| BonDeCommande | Cloture | Emis | Interdite | Reouverture par exception uniquement |
| Facture | Brouillon | Soumise | Autorisee | Metadonnees + piece facture presentes |
| Facture | Soumise | Controlee | Autorisee | Controle formel effectue |
| Facture | Controlee | Validee | Autorisee | Validation metier/comptable |
| Facture | Validee | Rejetee | Autorisee | Motif de rejet trace |
| Facture | Payee | Brouillon | Interdite | Contre-passation obligatoire si correction |
| Depense | Brouillon | Liquidee | Autorisee | Facture(s) validee(s) rattachee(s) |
| Depense | Liquidee | Ordonnancee | Autorisee | Controle cash vert + separation des roles |
| Depense | Ordonnancee | Payee | Autorisee | Paiement execute/reconcilie |
| Depense | Cloturee | Ordonnancee | Interdite | Reouverture gouvernee obligatoire |
| Paiement | Brouillon | Transmis | Autorisee | Depense ordonnancee |
| Paiement | Transmis | Accepte | Autorisee | Ack systeme externe recu |
| Paiement | Execute | Reconcilie | Autorisee | Rapprochement confirme |
| Paiement | Transmis | Rejete | Autorisee | Rejet externe recu + motif trace |
| Paiement | Execute | Brouillon | Interdite | Correction par ecriture de regularisation |

Regles generales:
- Toute transition doit etre autorisee par role (RBAC/ABAC) et journalisee avec horodatage.
- Les transitions critiques doivent verifier les controles cash avant validation.
- Les transitions d'annulation/correction doivent declencher contre-passation si des ecritures existent.
- Les transitions vers statuts finaux (`Payee`, `Cloturee`, `Annulee`) sont irreversibles hors workflow d'exception gouvernee.

## User Journeys

### 1) Utilisateur principal - Parcours de succès (Directrice Financière)

**Opening Scene**  
Aicha, directrice financiere, demarre son cycle mensuel avec des arbitrages d'allocation et des demandes de depense en attente. Elle veut piloter le budget global sans perdre la maitrise conformite/cash.

**Rising Action**  
Elle ouvre AGILYS, consulte la consommation par enveloppe et les alertes de depassement, puis ajuste les allocations.  
Ensuite, elle valide les demandes de depense critiques avec vue complete des pieces, droits, et statut cash.

**Climax**  
Elle arbitre et valide rapidement car chaque decision est explicable, tracee, et coherente avec les plafonds budgetaires.

**Resolution**  
Les equipes executent sans blocages improductifs, et Aicha dispose d'une situation budgetaire fiable pour le COPIL et l'audit.

**Risques/Fallback**  
Si un dossier est incomplet ou hors regle, AGILYS bloque la transition et guide une correction non destructive.

---

### 2) Utilisateur principal - Parcours edge case (Comptable en zone de risque cash)

**Opening Scene**  
Moussa, comptable, traite une facture prioritaire. Le credit est disponible, mais la projection de tresorerie signale une zone rouge.

**Rising Action**  
Il tente l'ordonnancement; le moteur de regles bloque et explique la cause (seuil cash depasse).  
AGILYS propose rephasage, report, ou escalation pour exception gouvernee.

**Climax**  
Une exception est demandee avec quorum requis, justification obligatoire, horodatage et validite limitee.

**Resolution**  
La continuite de service est maintenue sans perte de gouvernance. Le dossier reste classe "sous contrainte" pour suivi.

**Risques/Fallback**  
Si quorum non atteint, la transition reste bloquee avec actions explicites.

---

### 3) Admin/Ops - Configuration et continuité (Admin client)

**Opening Scene**  
Nadia, admin client, prepare un nouvel exercice budgetaire et doit garantir la coherence des structures, enveloppes, droits et regles avant ouverture.

**Rising Action**  
Elle parametre structure budgetaire, enveloppes, nomenclature, roles, seuils cash et regles de transition.  
Elle verifie les alertes de configuration incomplete et lance un controle de coherence.

**Climax**  
Avant ouverture operationnelle, AGILYS detecte une incoherence de droits sur une transition critique et empeche un risque de contournement.

**Resolution**  
La configuration est corrigee, validee puis publiee. Les equipes demarrent dans un cadre securise.

**Risques/Fallback**  
En cas d'erreur, rollback de parametrage versionne sans ecraser l'historique.

---

### 4) Support/Troubleshooting - Investigation (Contrôleur interne)

**Opening Scene**  
Fatou, controleuse interne, recoit une alerte sur un depassement et doit expliquer "qui a decide quoi, quand, et sur quelle base".

**Rising Action**  
Elle ouvre le dossier dans AGILYS, parcourt la timeline immuable, les versions de budget, le statut cash au moment de la transition et l'historique d'exceptions.

**Climax**  
Elle identifie la sequence exacte: allocation initiale, transition bloquee, justification, quorum, validation finale.

**Resolution**  
Elle produit un dossier de preuve en quelques heures, sans reconstruction manuelle multi-fichiers.

**Risques/Fallback**  
Si divergence inter-systeme detectee, AGILYS l'expose explicitement et trace la resolution.

---

### 5) API/Integration - Flux ERP comptable legacy

**Opening Scene**  
Jean, responsable integration, doit connecter AGILYS aux systemes comptables et tresorerie existants sans interrompre l'exploitation.

**Rising Action**  
Il configure les mappings budgetaires/comptables, la correlation d'identifiants, et les echanges asynchrones.  
Chaque evenement AGILYS est publie avec correlation ID; les retours externes sont rapproches automatiquement.

**Climax**  
Un retour de paiement est rejete pour divergence de nomenclature. AGILYS classe l'ecart, notifie les equipes, et ouvre un chemin de correction tracable.

**Resolution**  
Le flux est regularise sans perte de preuve, et le dashboard d'ecarts permet de piloter la qualite d'integration.

**Risques/Fallback**  
En cas de desynchronisation prolongee, mode degrade assume + SLA de rattrapage.

---

### 6) Adoption Institutionnelle - Référence majeure (Direction générale / Tutelle)

**Opening Scene**  
Le sponsor institutionnel et la direction generale demandent une preuve tangible de valeur avant generalisation.

**Rising Action**  
AGILYS consolide les KPI de pilotage, les gains d'execution et les preuves d'audit sur une periode de reference.

**Climax**  
Le comite de gouvernance valide le dossier de reference institutionnelle avec criteres explicites (adoption, performance, conformite).

**Resolution**  
La reference est signee et publiee, puis exploitee pour l'extension commerciale et institutionnelle.

**Risques/Fallback**  
Si un critere de reference n'est pas atteint, un plan de remediation est ouvert avec jalons a 30/60 jours.

---

### 7) Acquisition Vitrine - Conversion vers l'application (Visiteur public)

**Opening Scene**  
Un visiteur public arrive sur la vitrine AGILYS pour evaluer la valeur de la plateforme et verifier sa credibilite avant de se connecter ou de prendre contact.

**Rising Action**  
Le visiteur parcourt les pages vitrine (`/`, `/fonctionnalites`, `/cas-clients`, `/contact`), consulte les preuves de valeur, puis clique sur le CTA principal vers l'authentification.

**Climax**  
Le parcours enchaine sans friction: redirection vers auth, authentification reussie, puis arrivee sur la page d'entree applicative.

**Resolution**  
Le funnel `vitrine_vue -> cta_principal_click -> auth_page_view -> auth_success -> app_landing_view` est trace de bout en bout avec couverture analytics 100%.

**Risques/Fallback**  
Si conversion faible ou abandon eleve a une etape du funnel, AGILYS ouvre un plan d'optimisation priorise (contenu vitrine, CTA, flux auth) avec revue hebdomadaire.

### Journey Requirements Summary

- Gestion budgetaire de bout en bout avec preuve immuable sur allocations et transitions de depense.
- Machines d'etat explicites pour budget, facture, depense et paiement.
- Moteur de regles cash-aware explicable avec blocage conditionnel et exceptions gouvernees.
- Timeline non destructive avec double temporalite et versioning complet.
- Dashboard budgetaire et pilotage (consommations, blocages, ecarts, conformite, actions attendues).
- Administration robuste (RBAC/ABAC, parametrage versionne, controle de coherence).
- Investigation rapide pour controle interne (dossier de preuve exportable).
- Integration asynchrone avec systemes legacy via correlation ID obligatoire.
- Parcours de recuperation clairs en cas d'erreur, rejet, ou indisponibilite reseau.
- Parcours d'adoption institutionnelle permettant de materialiser une reference majeure exploitable.
- Parcours acquisition vitrine instrumente de bout en bout jusqu'a la premiere arrivee applicative.

## Domain-Specific Requirements

### Compliance & Regulatory

- Conformité traçabilité/audit des actes budgétaires (historique non destructif, journalisation complète).
- Exigences d’accessibilité du secteur public (référentiel local + principes WCAG).
- Exigences de transparence et de gouvernance (justification des exceptions, piste d’audit exportable).
- Conservation et intégrité des preuves selon politiques institutionnelles (durées d’archivage, non-altération).
- Conformité aux normes comptables OHADA / SYCEBNL lorsque applicable.
- Respect des règles de séparation ordonnateur / comptable public (principe de séparation des fonctions).
- Archivage électronique conforme aux exigences nationales (durées légales de conservation).
- Traçabilité des modifications conforme aux exigences des inspections d’État / Cours des comptes.
- Hébergement des données conforme aux exigences de souveraineté numérique locale (si applicable).
- Protection des données personnelles selon législation nationale (ex: lois locales inspirées RGPD).

### Technical Constraints

- Sécurité forte: RBAC strict, séparation des rôles, chiffrement transit/stockage, journaux inviolables.
- Résilience opérationnelle: mode offline-first, synchronisation différée, reprise sur incident.
- Performance critique: latence moteur de règles p95 <= 500 ms, sync offline -> online p95 <= 5 min.
- Haute disponibilité cible: >= 99,5% hors maintenance planifiée.

### Integration Requirements

- Intégration asynchrone avec ERP comptable legacy.
- correlation ID obligatoire sur tout flux inter-systèmes.
- Gestion des divergences (rejet, retard, conflit de mapping) avec qualification et remédiation tracée.
- Export de preuves et états consolidés pour contrôle interne / audit.

### Risk Mitigations

- Risque de contournement: overrides gouvernés (quorum, justification, durée limitée).
- Risque de désynchronisation: tableau d’écarts + SLA de rattrapage.
- Risque d’usage punitif: charte d’usage séparant preuve opérationnelle et disciplinaire.
- Risque qualité de données: contrôles de complétude à la saisie + rattrapage guidé.

## Procurement Compliance

- Le systeme doit imposer des workflows de passation conformes aux seuils et procedures d'achat public parametres par juridiction, avec taux de conformite `>= 99%` mesure mensuellement par audit interne.
- Chaque dossier engageant une depense au-dela d'un seuil de passation doit inclure 100% des pieces justificatives obligatoires avant transition `Valide`, verifie par regle bloquante.
- Le systeme doit journaliser `100%` des decisions de passation (auteur, base legale, horodatage, motif), mesure par controle quotidien d'exhaustivite des logs.
- Les controles de conformite procurement doivent etre executables en `<= 2 min` (p95) par dossier standard pour verification pre-engagement, mesure via APM.

## Security Clearance

- Le systeme doit appliquer des niveaux d'habilitation (`H0` a `H3`) par role et perimetre organisationnel, avec couverture `100%` des roles critiques verifiee mensuellement.
- Toute action critique sur dossier budgetaire doit verifier le niveau d'habilitation requis avant execution, avec taux de verification `100%` mesure par traces d'autorisation.
- Les exceptions d'acces hors habilitation doivent etre refusees par defaut et journalisees a `100%` avec motif, mesure par controle journalier des refus.
- Les habilitations actives doivent etre re-certifiees tous les `180 jours` maximum, avec taux de recertification dans les delais `>= 98%`, mesure par rapport de gouvernance IAM.

## Accessibility & Transparency Governance

- Le systeme doit maintenir un registre de conformite accessibilite (WCAG 2.1 AA) avec campagne de verification trimestrielle, couverture `100%` des parcours publics critiques et publication d'un rapport horodate.
- Chaque release incluant des changements sur la vitrine ou l'authentification doit executer un controle d'accessibilite automatise + echantillon manuel, avec taux de correction des ecarts critiques `>= 95%` avant mise en production.
- Le systeme doit publier un tableau de transparence institutionnelle mensuel (KPI service, incidents, delais de resolution, statut conformite), avec disponibilite du rapport `>= 99%`.
- Les preuves de gouvernance (rapports accessibilite, rapports transparence, decisions correctives) doivent etre archivees sur `>= 36 mois` avec piste d'audit complete.

## Innovation & Novel Patterns

### Detected Innovation Areas

- Passage d'un SI budgetaire fragmente a une plateforme unifiee Operations + Pilotage.
- Couplage natif allocation budgetaire, execution de la depense, et controle cash en continu.
- Formalisation explicite des objets Facture et Depense avec cycles distincts mais relies.
- Continuité probatoire en contexte degrade (offline + double temporalite + versioning non destructif).

### Market Context & Competitive Landscape

- Les offres existantes couvrent souvent soit l'execution (ERP) soit le pilotage (BI), rarement les deux de facon coherente.
- Positionnement recommande: "application de gestion budgetaire publique Operations + Pilotage, interoperable legacy", pas "ERP de remplacement".
- Avantage competitif: reduction mesurable des ecarts budgetaires, meilleure discipline d'execution, auditabilite native.

### Validation Approach

- Pilote 90 jours sur un perimetre budgetaire complet avec mesure des KPI allocation, ecart prevision/execution, fluidite de depense, cash-control coverage, temps audit.
- Tests d’acceptation terrain sur scénarios de blocage/override et indisponibilité réseau.
- Validation interop ERP legacy via taux d’écarts qualifiés/résolus et SLA de rattrapage.

### Risk Mitigation

- Risque "innovation trop ambitieuse" -> Release 1 centree sur invariants non negociables.
- Risque rejet utilisateur -> explicabilité des règles + UX non punitive.
- Risque friction legacy -> intégration asynchrone incrémentale + correlation ID obligatoire.
- Risque conformité locale -> exigences OHADA/SYCEBNL et séparation ordonnateur/comptable intégrées by design.

## SaaS B2B Specific Requirements

### Project-Type Overview

AGILYS est une plateforme `SaaS B2B govtech` de pilotage budgetaire public avec contraintes institutionnelles fortes.  
Le modele cible combine isolation multi-tenant stricte, gouvernance des roles, et exigences de conformite "release blocking" des la Release 1.

### Technical Architecture Considerations

- Architecture multi-tenant avec séparation stricte par organisation.
- Modèle de sécurité “deny by default” sur accès données, actions métier et audit.
- Intégrations externes priorisées sur des flux asynchrones traçables (événements + correlation ID).
- Capacité de fonctionnement en contexte institutionnel hétérogène (SSO parfois disponible, legacy dominant).

### Tenant Model

- Isolation stricte par tenant au niveau:
  - données
  - configuration
  - journaux d’audit
  - règles métier et seuils cash
- Interdiction de partage de données inter-tenant.
- Support Release 1 de multi-entites internes dans un meme tenant (commune, directions, etablissements rattaches).
- Hiérarchie organisationnelle paramétrable (entité parent/enfant) pour pilotage et contrôle d’accès.

### RBAC Matrix

Roles Release 1 confirmes:
- Admin client
- Directeur financier / Ordonnateur
- Comptable
- Chef de service
- Contrôleur interne
- Auditeur (lecture seule)

Règles d’autorisation:
- RBAC strict en Release 1.
- ABAC léger requis en complément RBAC:
  - restrictions par entité
  - restrictions par seuil montant
  - restrictions par type d’acte
- ABAC multi-axes complexe explicitement hors Release 1.

### Subscription Tiers

- Release 1: offre unique (pas de differenciation tarifaire/fonctionnelle).
- PRD doit préserver la capacité future de segmentation:
  - `Pilot`
  - `Standard`
  - `Enterprise public`
- La segmentation future ne doit pas remettre en cause les invariants de conformité.

### Integration List

Integrations obligatoires Release 1:
- ERP comptable legacy (mode asynchrone)
- Export dossier d’audit (PDF/ZIP structuré)
- SSO institutionnel (lorsqu’existant)

Intégrations prévues en Growth:
- Système de paiement / Trésor
- GED institutionnelle
- Outils de procurement

### Compliance Requirements (Release Blocking)

Criteres bloquants de mise en production Release 1:
- Traçabilité complète des dossiers budgetaires avec historique non destructif
- Séparation ordonnateur / comptable effectivement appliquée
- correlation ID obligatoire sur flux critiques
- Piste d’audit exportable et vérifiable
- Conservation légale paramétrable
- Hébergement conforme exigences de souveraineté locale
- Protection des données personnelles conforme à la loi nationale
- Moteur d'ecritures double entree actif avec controle debit=credit
- Generation automatique des ecritures sur transitions metier critiques
- Annulation/correction geree par contre-passation tracee
- Cloture d'exercice operationnelle et auditable
- Rapprochement bancaire operationnel avec resolution tracee des ecarts
- Migration legacy validee avec reconciliation des soldes et statuts

Condition explicite: non-respect d'un seul de ces points = `release blocked`.

### Execution Considerations

- Démarrer avec des politiques de sécurité et conformité versionnées, testables et auditables.
- Rendre les garde-fous conformité visibles dans l’UX (pas seulement backend).
- Instrumenter des contrôles automatiques pré-release sur les exigences “release blocking”.
- Concevoir les connecteurs legacy comme adaptateurs remplaçables pour accélérer la trajectoire Growth.

## Project Scoping & Phased Development

Cette section traduit la vision en trajectoire d’exécution et définit les frontières de livraison par phase.

### Release 1 Strategy & Philosophy

**Release 1 Approach:** Mise en production initiale d'un produit "budget-first" complet, couvrant Operations + Pilotage avec exigences fortes de conformite et de fiabilite.  
**Resource Requirements:** Équipe noyau 6-8 personnes (PO/PM, tech lead, 2-3 dev fullstack, QA, UX, spécialiste métier/compliance part-time).

### Exercice Budgetaire en Production (Workflow Reglementaire)

Cycle d'exploitation impose en production:
- `Pre-ouverture`: verification referentiels, enveloppes, plafonds, regles et droits.
- `Ouverture`: activation officielle de l'exercice avec parametres initiaux figes.
- `Exploitation`: execution courante sur periodes ouvertes avec controles continus.
- `Pre-cloture`: controles de coherence, traitement des ecarts et des ecritures en attente.
- `Cloture`: verrouillage formel des periodes et emission du dossier de cloture.
- `Post-cloture`: archivage, audit final et preparation de l'exercice suivant.

Gestion des periodes:
- `Ouverte`: saisie et validations autorisees.
- `En revue`: saisie limitee, corrections supervisees.
- `Fermee`: aucune ecriture directe autorisee.
- `Reouverture`: uniquement via workflow d'exception (quorum, justification, tracabilite).

Regles d'exception tardive:
- Factures tardives, erreurs materielles, ou decisions de tutelle traitees via parcours gouverne.
- Correction imposee par contre-passation + regularisation, sans suppression destructive.
- Qualification obligatoire de l'impact (budgetaire, comptable, audit).

Continuité N+1:
- Bascule controlee des soldes et referentiels d'ouverture.
- Separation stricte N / N+1 avec consolidation de lecture.
- Verifications prealables avant autorisation des operations sur N+1.

### Release 1 Feature Set

**Core User Journeys Supported:**
- Visiteur anonyme: decouverte vitrine, evaluation de la valeur, clic CTA principal, authentification.
- Directrice financiere: arbitrage budgetaire, allocation et validation des transitions critiques.
- Comptable: execution de la depense avec controle cash et gestion d'exceptions gouvernees.
- Controleur interne: reconstitution et export dossier de preuve complet.
- Admin client: parametrage structures/enveloppes/roles/regles/entites.
- Integration: synchronisation asynchrone legacy avec gestion d'ecarts et rejets.

**Must-Have Capabilities:**
- Vitrine publique responsive multi-pages avec message de valeur, preuves de confiance et CTA principal `Se connecter`.
- Architecture d'information vitrine minimum: `/`, `/fonctionnalites`, `/cas-clients`, `/contact`, pages legales.
- Parcours de conversion trace `vitrine -> auth -> app` avec instrumentation analytics.
- Protection stricte des routes privees et redirection deterministe des utilisateurs non authentifies.
- Exercice budgetaire, structure, enveloppes et nomenclature parametrables par tenant.
- Allocation et suivi des credits par programme/section/action.
- Machine d'etat facture (Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee).
- Machine d'etat depense (Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee -> Annulee).
- Machine d'etat paiement (Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie, ou Rejete/Annule).
- Dossier budgetaire avec timeline immuable et versioning non destructif.
- Contrôle risque cash 90j (p95 <= 500 ms).
- Exception gouvernee (quorum, justification, TTL).
- RBAC strict + ABAC léger (entité, seuil, type d’acte).
- Multi-tenant strict + hiérarchie multi-entités intra-tenant.
- Offline-first avec synchro différée (p95 <= 5 min après reconnexion stable).
- correlation ID obligatoire sur flux critiques.
- Export audit structuré (PDF/ZIP), piste d’audit vérifiable.
- SSO institutionnel (si existant).
- Moteur d'ecritures comptables en double entree pilote par evenements metier.
- Generation automatique des ecritures a chaque transition metier concernee.
- Gestion des annulations/corrections par contre-passation et reemission tracee.
- Cloture d'exercice avec verrouillage, ecritures de regularisation et journal de cloture.
- Rapprochement bancaire (automatique + manuel assiste) avec statut de reconciliation.
- Migration legacy avec controles d'integrite et validation post-migration.
- Criteres compliance "release blocking" appliques.

### Roadmap Post-Release

**V1.x (Ameliorations):**
- Integrations Tresor avancees, GED, procurement.
- Analytics avancée multi-axes.
- Renforcement gouvernance et observabilité d’exploitation.

**V3 (Expansion):**
- Automatisation/IA d’assistance décisionnelle et contrôle.
- Reporting bailleurs industrialisé.
- Segmentation d’offre (Pilot/Standard/Enterprise public).

### Risk Mitigation Strategy

**Technical Risks:**
- Complexité interop legacy -> adaptateurs asynchrones + tableau d’écarts + SLA rattrapage.
- Conflits offline -> politiques de résolution explicites + traçabilité des merges.
- Surcharge perf moteur règles -> SLO instrumentés + tests charge précoces.

**Market Risks:**
- Adoption insuffisante -> deploiement progressif sur perimetre prioritaire + KPI a 90 jours.
- Perception “outil de sanction” -> charte d’usage + UX explicative non punitive.

**Resource Risks:**
- Ressources reduites -> deprioriser SSO optionnel et certains connecteurs non critiques en Release 1.
- Derive planning -> gates de scope stricts bases sur criteres release blocking.

## Functional Requirements

Les exigences fonctionnelles ci-dessous constituent le contrat de capacités pour UX, architecture et epics.

### Budget & Previsions

- FR1: L'Admin client peut configurer exercice budgetaire, structure, enveloppes, sections, programmes et nomenclature.
- FR2: Les acteurs habilites peuvent allouer et reallouer des credits par axe budgetaire (programme/section/action).
- FR3: Le systeme peut versionner les allocations et conserver l'historique des arbitrages.
- FR4: Le systeme peut gerer des previsions budgetaires periodiques et consolider les revisions.
- FR5: Le systeme peut calculer et exposer l'ecart prevision/execution par axe et periode.
- FR6: Le Directeur financier / Ordonnateur peut valider ou rejeter une allocation, un ajustement ou une prevision.
- FR7: Le systeme peut imposer des plafonds et bloquer les operations incompatibles avec le cadre budgetaire valide.
- FR8: Le systeme peut associer chaque decision budgetaire a des autorisations explicites tracables.

### Operations de Depense (Reservation -> Engagement -> BC -> Facture -> Depense -> Paiement)

- FR9: Les utilisateurs habilites peuvent creer et suivre des reservations de credit.
- FR10: Le systeme peut convertir une reservation en engagement juridique dans le respect des regles.
- FR11: Le systeme peut associer un bon de commande a un engagement et suivre son statut.
- FR12: Le systeme peut enregistrer les factures avec pieces et metadonnees obligatoires.
- FR13: Le systeme peut appliquer un cycle facture explicite (Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee).
- FR14: Le systeme peut constituer une depense a partir de `1..20` factures validees, avec rejet automatique au-dela de 20 et message d'action.
- FR15: Le systeme peut appliquer un cycle depense explicite (Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee -> Annulee).
- FR16: Le systeme peut initier et suivre un paiement avec statuts de retour (Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie, ou Rejete/Annule).
- FR17: Le systeme peut empecher tout paiement d'une depense non ordonnancee.
- FR18: Le systeme peut gerer les cas de paiement partiel, rejet et reprise.

### Controle Cash, Tresorerie et Exceptions

- FR19: Le systeme peut evaluer le risque cash a chaque transition critique (engagement, ordonnancement, paiement).
- FR20: Le systeme peut bloquer une transition lorsque les seuils de risque configures sont depasses.
- FR21: Le systeme peut expliquer la cause du blocage et proposer des actions de remediation.
- FR22: Les acteurs habilites peuvent demander une exception avec justification obligatoire.
- FR23: Le systeme peut imposer un quorum d'approbation et une limite temporelle sur les exceptions.
- FR24: Le systeme peut fournir un suivi de tresorerie (position, projection, alertes) pour pilotage quotidien.
- FR25: Le Controleur interne peut auditer toutes les transitions passees en exception.

### Pilotage, Comptabilite et Conformite

- FR26: Le systeme peut presenter un tableau de bord budgetaire (consommation, ecarts, blocages, risques).
- FR27: Le systeme peut offrir des vues d'analyses financieres et de reporting periodique.
- FR28: Le systeme peut rattacher les flux a des axes analytiques (projets/centres) pour analyse.
- FR29: Le systeme peut gerer plan comptable et journal comptable en coherence avec les flux operations.
- FR30: Le systeme peut produire un dossier d'audit exportable structure (PDF/ZIP) incluant preuves et timeline.
- FR31: Le systeme peut exposer un module de controle interne (ecarts, exceptions, plans d'action, statut).
- FR32: Le systeme peut conserver un historique non destructif complet avec double temporalite.

### Integration, Resilience et Gouvernance

- FR33: Le systeme peut echanger des informations avec ERP/Tresor legacy en mode asynchrone.
- FR34: Le systeme peut associer un correlation ID a chaque flux critique inter-systemes.
- FR35: Les equipes habilitees peuvent suivre les rejets et divergences d'integration jusqu'a resolution.
- FR36: Les utilisateurs autorises peuvent operer en mode degrade de connectivite.
- FR37: Le systeme peut synchroniser apres reconnexion et qualifier les conflits de synchronisation.
- FR38: L'Admin client peut attribuer/revoquer des roles avec RBAC strict et ABAC leger (entite, seuil, type).
- FR39: Le systeme peut appliquer la separation ordonnateur/comptable dans les droits et actions.
- FR40: Le systeme peut isoler donnees, configurations, journaux et regles par tenant.
- FR41: L'Admin client peut configurer des politiques de conservation legale parametables.
- FR42: Le systeme peut fournir les traces necessaires aux inspections d'Etat et audits externes.

### Moteur d'Ecritures, Cloture et Reconciliation

- FR43: Le systeme peut maintenir un plan comptable versionne (classes, comptes, sous-comptes, axes analytiques, dates d'effet).
- FR44: Le systeme peut parametrer des regles de mapping `evenement metier -> schema d'ecriture` (debit, credit, journal, axes, piece source).
- FR45: Le systeme peut generer automatiquement des ecritures en double entree pour les transitions critiques (engagement, liquidation, paiement, annulation, rejet).
- FR46: Le systeme peut verifier l'equilibre debit=credit avant validation de chaque ecriture.
- FR47: Le systeme peut garantir l'idempotence de generation des ecritures pour eviter les doublons.
- FR48: Le systeme peut suivre le statut d'une ecriture (`generee`, `postee`, `rejetee`, `corrigee`) avec journal horodate.
- FR49: Le systeme peut traiter annulations/corrections par contre-passation sans suppression destructive des ecritures sources.
- FR50: Le systeme peut executer la cloture d'exercice (controles pre-cloture, regularisations, verrouillage periode, reouverture gouvernee).
- FR51: Le systeme peut realiser le rapprochement bancaire automatique et manuel assiste avec qualification des ecarts.
- FR52: Le systeme peut produire un journal de migration legacy (correspondance des etats, anomalies, corrections, validations).
- FR53: Le systeme peut valider la migration legacy par reconciliation avant/apres des soldes comptables et statuts operationnels.
- FR54: Le systeme peut appliquer les etats de periode (`ouverte`, `en revue`, `fermee`) avec regles d'acces associees.
- FR55: Le systeme peut executer une phase de pre-cloture avec checklist obligatoire (ecarts, ecritures rejetees, rapprochements, exceptions ouvertes).
- FR56: Le systeme peut verrouiller une periode cloturee et interdire toute ecriture directe hors workflow de reouverture gouvernee.
- FR57: Le systeme peut gerer les exceptions tardives par workflow dedie (motif, approbation, contre-passation, regularisation).
- FR58: Le systeme peut produire un dossier de cloture d'exercice (preuves, journaux, ecarts, decisions) signe metier/technique.
- FR59: Le systeme peut preparer l'ouverture N+1 avec reprise controlee des soldes et referentiels.

### Reporting, Analyses et Dashboards Prioritaires

- FR60: Le systeme peut produire une balance comptable par periode avec totaux debit/credit par compte et export CSV/XLSX/PDF.
- FR61: Le systeme peut produire un grand livre detaille par compte avec filtres (periode, entite, axe analytique, statut) et export.
- FR62: Le systeme peut produire une fiche de compte annuelle (mouvements, soldes d'ouverture/cloture, piece source reliee).
- FR63: Le systeme peut produire un etat des dettes fournisseurs (anciennete, echeances, historique de reglement, reste a payer).
- FR64: Le systeme peut produire un etat des avances et regularisations (avance initiale, consommation, ecarts, statut de regularisation).
- FR65: Le systeme peut produire des rapports d'execution budgetaire par ligne, composante et axe analytique (projet, bailleur, zone) avec comparaison prevision/execution.
- FR66: Le systeme peut produire des rapports de tresorerie incluant journal des flux, situation des comptes, previsions et alertes de seuil.
- FR67: Le systeme peut produire un etat des paiements (realises, en attente, rejetes, partiels) et un rapport de rapprochement bancaire qualifiant les ecarts.
- FR68: Le systeme peut produire des dashboards visuels (budgetaire, analytique, tresorerie, comptable, conformite) avec filtres temporels et organisationnels.
- FR69: Le systeme peut offrir des tableaux croises dynamiques multi-dimensions (ligne budgetaire, operation, fournisseur, axe analytique, periode) pour exploration ad hoc.
- FR70: Le systeme peut produire un dossier de depense unifie (reservation -> paiement) avec pieces justificatives, controles de chaine, actions utilisateurs et preuves d'audit exportables.
- FR71: Le systeme peut produire une DSF (Declaration Statistique et Fiscale) exportable et controlee, conforme au cadre OHADA/SYCEBNL applicable au tenant.
- FR72: Le systeme peut produire un rapport des pieces justificatives manquantes ou non validees, avec filtre par etape, entite, fournisseur et criticite.
- FR73: Le systeme peut produire un indicateur et rapport de temps de traitement par etape budgetaire (reservation, engagement, BC, facture, depense, paiement), avec p50/p95 et tendance periodique.

### Vitrine Publique Multi-Pages, Acquisition et Authentification

- FR74: Le systeme peut exposer une vitrine publique accessible sans authentification pour presenter AGILYS et ses cas d'usage.
- FR75: La page d'accueil vitrine (`/`) doit contenir au minimum hero, proposition de valeur, preuves de confiance, FAQ courte et CTA vers l'authentification.
- FR76: Le CTA principal de la vitrine doit rediriger vers la page d'authentification sans etape intermediaire inutile.
- FR77: Le systeme peut offrir un CTA secondaire de decouverte produit sans entrer en competition visuelle avec le CTA principal.
- FR78: Toute tentative d'acces a une route privee par un utilisateur non authentifie doit etre redirigee vers l'authentification.
- FR79: Apres authentification reussie, l'utilisateur doit etre redirige vers la page d'entree applicative definie par le produit.
- FR80: Le comportement d'un utilisateur deja authentifie visitant la vitrine doit etre deterministe et configurable (`afficher vitrine` ou `rediriger vers app`).
- FR81: Le systeme doit instrumenter les evenements du funnel minimum: `vitrine_vue`, `cta_principal_click`, `auth_page_view`, `auth_success`, `app_landing_view`.
- FR82: La vitrine doit exposer les liens legaux minimaux (confidentialite, conditions d'utilisation, contact support).
- FR83: Le systeme doit permettre l'evolution de la vitrine sans impact regressif sur les parcours applicatifs authentifies.
- FR84: Le systeme doit exposer une page `/fonctionnalites` decrivant les capacites cles et cas d'usage prioritaires.
- FR85: Le systeme doit exposer une page `/cas-clients` (ou `/temoignages`) avec au moins trois preuves de valeur verifiables.
- FR86: Le systeme doit exposer une page `/contact` avec formulaire minimal (`nom`, `email`, `organisation`, `besoin`) et confirmation de soumission.
- FR87: Le menu principal de la vitrine doit rendre accessibles `/`, `/fonctionnalites`, `/cas-clients`, `/contact` en maximum un clic.
- FR88: Chaque page vitrine doit comporter un CTA visible vers l'authentification ou la prise de contact, sans conflit de priorite visuelle.
- FR89: Les pages legales publiques `/mentions-legales`, `/politique-confidentialite`, `/conditions-utilisation` doivent etre accessibles depuis le footer.
- FR90: Le systeme doit distinguer les conversions `authentification` et `lead contact` dans l'analytics pour pilotage acquisition.

### Addendum Reporting - Impacts FR60-FR70

#### Capacites de service (Contrat cible)

- Le systeme expose des services de consultation de rapports avec filtres communs (tenant, periode, entite, axes analytiques, statut).
- Le systeme expose des services d'export asynchrones avec suivi d'etat de traitement et acces securise aux livrables.
- Le systeme offre une capacite d'analyse multidimensionnelle pour exploration ad hoc et comparaison inter-periodes.
- Le systeme fournit un dossier de depense unifie agregant timeline, pieces, transitions, journaux et ecarts de controle.

#### Capacites de donnees (Modele minimal)

- Le systeme maintient des jeux de donnees analytiques dedies a l'execution budgetaire, aux paiements, aux flux de tresorerie et aux evenements d'audit.
- Le systeme maintient des dimensions metier de reference (temps, lignes budgetaires, fournisseurs, projets, bailleurs, zones, comptes).
- Le systeme maintient un catalogue versionne des rapports avec regles d'acces et formats de restitution autorises.
- Le systeme maintient un suivi des traitements d'export (parametres, statut, integrite, retention, auteur).

#### Surfaces fonctionnelles (Release 1)

- Surface `Rapports Budgetaires`: execution, consommation, credits disponibles, alertes.
- Surface `Rapports Comptables`: balance, grand livre, fiche compte.
- Surface `Tresorerie & Paiements`: journal flux, situation, previsions, paiements, rapprochement.
- Surface `Analytique`: tableaux croises dynamiques et comparatifs multi-axes.
- Surface `Dossier de Depense`: vue unifiee reservation -> paiement et export probatoire.

#### Delivery et Qualite

- Priorite lot 1: FR65, FR66, FR67, FR70 (pilotage operationnel et preuve).
- Priorite lot 2: FR60, FR61, FR62, FR63, FR64 (comptable et fournisseurs).
- Priorite lot 3: FR68, FR69 (dashboards avances et exploration ad hoc).
- Criteres d'acceptation transverses: RBAC/ABAC, tracabilite complete, parite ecran/export, performance conforme NFR.

## Non-Functional Requirements

Les exigences non fonctionnelles ci-dessous définissent les critères de qualité et de conformité nécessaires à la mise en production.

### Performance
- NFR1: Les contrôles de règles critiques (autorisation + cash) doivent répondre en `p95 <= 500 ms`, mesuré en continu par monitoring applicatif et vérifié hebdomadairement sur fenêtre glissante de 7 jours.
- NFR2: Les écrans opérationnels principaux (dashboard blocages, detail dossier budgetaire) doivent charger en `<= 2 s` en conditions nominales réseau, mesuré par monitoring experience utilisateur sur le percentile p95.
- NFR3: Les exports de dossier d’audit standard doivent être générés en `<= 60 s` pour un dossier de taille courante.

### Reliability & Availability
- NFR4: La disponibilité plateforme doit être `>= 99,5%` hors maintenances planifiées, mesurée mensuellement via l'outil d'uptime monitoring de production.
- NFR5: Le système doit préserver la continuité de saisie en mode dégradé réseau avec taux de perte de transaction locale `= 0%`, mesuré par tests de résilience hebdomadaires.
- NFR6: Le délai de synchronisation offline -> online doit être `p95 <= 5 min` après reconnexion stable, mesuré par traces de synchronisation et consolidé dans un rapport hebdomadaire.

### Security
- NFR7: Toutes les données sensibles doivent être chiffrées en transit (TLS 1.2+) et au repos (AES-256), avec taux de conformité `100%` mesuré par scan de configuration mensuel.
- NFR8: Le contrôle d’accès doit appliquer RBAC strict et ABAC léger sur `100%` des opérations sensibles, mesuré par campagne de tests d'autorisation automatisés à chaque release.
- NFR9: Toute action critique doit être journalisée avec identité, horodatage, contexte et résultat, avec couverture de journalisation `>= 99,9%` mesurée par contrôle quotidien.
- NFR10: Aucune action interdite par séparation ordonnateur/comptable ne doit être exécutable (`0` violation), mesuré par tests d'intrusion fonctionnels mensuels.

### Compliance & Auditability
- NFR11: L’historique des dossiers budgétaires doit être non destructif avec taux d'intégrité `100%`, mesuré par vérification quotidienne de chaîne d'audit.
- NFR12: Chaque flux critique inter-système doit porter un correlation ID avec couverture `100%`, mesurée par contrôle automatique des messages en production.
- NFR13: Le système doit permettre l’export de piste d’audit vérifiable (PDF/ZIP structuré) avec taux de succès `>= 99%` et délai `<= 60 s` pour dossier standard, mesurés par monitoring applicatif.
- NFR14: Les politiques de conservation légale doivent être paramétrables par juridiction avec couverture `100%` des juridictions actives, vérifiée lors des audits trimestriels.
- NFR15: Le déploiement doit respecter les contraintes locales de souveraineté et de protection des données avec `0` non-conformité majeure constatée en audit annuel.

### Scalability
- NFR16: Le système doit supporter une croissance `x10` des volumes de dossiers budgetaires sans rupture fonctionnelle majeure, mesuré par campagnes de tests de charge trimestrielles avec scénario de montée progressive.
- NFR17: La dégradation de performance sous charge cible ne doit pas dépasser `10%` sur les parcours critiques, mesurée par comparaison baseline vs charge cible lors des tests de performance trimestriels.
- NFR18: L’architecture doit permettre l’ajout de nouveaux tenants sans interruption de service (`0` minute d'arrêt non planifié), mesuré lors de tests d'onboarding mensuels.

### Accessibility
- NFR19: Les interfaces web doivent viser conformité `WCAG 2.1 AA` sur les parcours critiques métier, mesurée par audits automatisés et manuels à chaque release majeure.
- NFR20: Les parcours de décision et de contrôle doivent être utilisables au clavier et lisibles par technologies d’assistance avec taux de conformité `>= 95%` aux tests d'accessibilité trimestriels.
- NFR21: Les messages de blocage/erreur doivent être explicites, non ambigus et actionnables, avec taux de compréhension utilisateur `>= 90%` mesuré par tests UX semestriels.

### Integration
- NFR22: Les échanges ERP legacy doivent tolérer les indisponibilités temporaires avec taux de reprise automatique `>= 99%` en `<= 15 min`, mesuré par supervision d'intégration.
- NFR23: Les divergences d’intégration doivent être détectées, qualifiées et traçables avec délai de détection `<= 5 min` (p95), mesuré par monitoring des files d'attente.
- NFR24: Les interfaces d’intégration doivent garantir l'idempotence sur les opérations critiques avec taux de doublon `<= 0,01%`, mesuré par contrôle quotidien.
- NFR25: La génération des écritures automatiques doit être idempotente et déterministe, avec écart de reproductibilité `= 0` entre deux exécutions du même événement, mesuré par tests de non-régression.
- NFR26: Le controle debit=credit doit etre applique a 100% des ecritures avant validation.
- NFR27: Le moteur d'ecritures doit traiter une transition metier critique en `<= 1 seconde (p95)`, hors indisponibilite externe, mesuré par instrumentation applicative et revu mensuellement.
- NFR28: Les opérations de contre-passation/correction doivent être intégralement traçables et liées aux pièces sources avec taux de liaison `100%`, mesuré par contrôle d'intégrité quotidien.
- NFR29: La clôture d'exercice doit produire un journal de clôture vérifiable et inaltérable avec preuve d'intégrité cryptographique `100%`, mesurée à chaque clôture.
- NFR30: Le rapprochement bancaire doit permettre une résolution assistée des écarts avec audit trail complet, et taux de résolution des écarts `>= 95%` en `<= J+5`, mesuré mensuellement.
- NFR31: La migration legacy doit produire un rapport de réconciliation avec tolérance d'écart nulle sur comptes critiques (`0` écart), mesurée à chaque lot de migration.
- NFR32: Le workflow complet de cloture doit etre executable dans une fenetre operationnelle de `<= 4 heures` pour un tenant standard, mesuré lors de chaque cloture par journal horodate de debut/fin.
- NFR33: Aucune écriture ne doit être autorisée sur période `fermee` en dehors d'un workflow de réouverture approuvé et tracé (`0` violation), mesuré par contrôle quotidien.
- NFR34: Le dossier de cloture doit etre genere automatiquement en `<= 15 minutes` apres validation finale, mesuré a chaque execution par le timestamp de generation du pipeline de cloture.
- NFR35: Toute exception tardive doit être résolue avec traçabilité complète (décision, auteur, horodatage, impact) en `<= J+5` pour `>= 95%` des cas, mesuré mensuellement.
- NFR36: La bascule N vers N+1 doit garantir une cohérence des soldes avec tolérance d'écart nulle sur comptes de contrôle (`0` écart), vérifiée par bilan de bascule signé.

### Web Public, SEO et Conversion
- NFR37: La vitrine publique doit atteindre `LCP <= 2,5 s` (p75) sur mobile et desktop, mesuree par RUM mensuel.
- NFR38: La vitrine doit atteindre `CLS <= 0,1` et `INP <= 200 ms` (p75), mesures en continu via Web Vitals.
- NFR39: Les pages publiques critiques doivent etre indexables (meta title, description, canonical, structure Hn) avec couverture `100%` auditee a chaque release.
- NFR40: Le suivi analytics du funnel vitrine -> authentification -> app doit avoir une couverture d'evenements `100%` sur les etapes FR81, mesuree hebdomadairement depuis l'outil analytics de reference avec controle de parite plan de marquage vs evenements emis.
- NFR41: Le temps de redirection post-authentification vers l'app doit etre `<= 2 s` (p95), mesure par trace front-to-back.
- NFR42: Le taux d'acces non autorise reussi sur routes privees doit rester a `0`, verifie par tests automatiques et monitoring securite a chaque release.
- NFR43: Les pages vitrine `/`, `/fonctionnalites`, `/cas-clients`, `/contact` doivent charger en `<= 2,5 s` (p75) sur reseau mobile standard, mesure par RUM mensuel par route.
- NFR44: La couverture analytics des conversions vitrine doit etre `100%` pour les evenements `lead_form_submit` et `lead_form_success` en plus des etapes FR81, mesuree mensuellement par reconciliation entre logs applicatifs et entrepot analytics avec ecart acceptable `<= 1%`.

## Correct Course Addendum (2026-02-21)

- Clarification d execution: les exigences FR38-FR42 (gouvernance IAM/multi-tenant) sont implementees en increments story-level obligatoirement independants et testables.
- Clarification de traçabilite: chaque story doit conserver le chainage `Architecture Rule -> AC -> Test(s)` sans AC conditionnelle non testable.
- Clarification data governance: chaque story doit declarer un `Data/Schema Impact` minimal specifique, sans liste transversale generique.

## Correct Course Addendum (2026-02-21 - relaunch loop)

- Clarification de qualite story-level: AC metier specifiques prioritaires, garde-fous transverses centralises en gouvernance.
- Clarification de traçabilite technique: impact schema explicite par story pour auditabilite implementation.
