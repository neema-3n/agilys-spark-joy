stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/prd.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-01.md
  - /Volumes/mySD1.5/projects/agilys-spark-joy/_bmad-output/planning-artifacts/sprint-backlog-migration-2026-03-01.md
---

# agilys-spark-joy - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for agilys-spark-joy, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: L'Admin client peut configurer exercice budgetaire, structure, enveloppes, sections, programmes et nomenclature.
FR2: Les acteurs habilites peuvent allouer et reallouer des credits par axe budgetaire (programme/section/action).
FR3: Le systeme peut versionner les allocations et conserver l'historique des arbitrages.
FR4: Le systeme peut gerer des previsions budgetaires periodiques et consolider les revisions.
FR5: Le systeme peut calculer et exposer l'ecart prevision/execution par axe et periode.
FR6: Le Directeur financier / Ordonnateur peut valider ou rejeter une allocation, un ajustement ou une prevision.
FR7: Le systeme peut imposer des plafonds et bloquer les operations incompatibles avec le cadre budgetaire valide.
FR8: Le systeme peut associer chaque decision budgetaire a des autorisations explicites tracables.
FR9: Les utilisateurs habilites peuvent creer et suivre des reservations de credit.
FR10: Le systeme peut convertir une reservation en engagement juridique dans le respect des regles.
FR11: Le systeme peut associer un bon de commande a un engagement et suivre son statut.
FR12: Le systeme peut enregistrer les factures avec pieces et metadonnees obligatoires.
FR13: Le systeme peut appliquer un cycle facture explicite (Brouillon -> Soumise -> Controlee -> Validee -> Partiellement payee -> Payee -> Rejetee -> Annulee).
FR14: Le systeme peut constituer une depense a partir de `1..20` factures validees, avec rejet automatique au-dela de 20 et message d'action.
FR15: Le systeme peut appliquer un cycle depense explicite (Brouillon -> Liquidee -> Ordonnancee -> Partiellement payee -> Payee -> Cloturee -> Annulee).
FR16: Le systeme peut initier et suivre un paiement avec statuts de retour (Brouillon -> Transmis -> Accepte -> Execute -> Reconcilie, ou Rejete/Annule).
FR17: Le systeme peut empecher tout paiement d'une depense non ordonnancee.
FR18: Le systeme peut gerer les cas de paiement partiel, rejet et reprise.
FR19: Le systeme peut evaluer le risque cash a chaque transition critique (engagement, ordonnancement, paiement).
FR20: Le systeme peut bloquer une transition lorsque les seuils de risque configures sont depasses.
FR21: Le systeme peut expliquer la cause du blocage et proposer des actions de remediation.
FR22: Les acteurs habilites peuvent demander une exception avec justification obligatoire.
FR23: Le systeme peut imposer un quorum d'approbation et une limite temporelle sur les exceptions.
FR24: Le systeme peut fournir un suivi de tresorerie (position, projection, alertes) pour pilotage quotidien.
FR25: Le Controleur interne peut auditer toutes les transitions passees en exception.
FR26: Le systeme peut presenter un tableau de bord budgetaire (consommation, ecarts, blocages, risques).
FR27: Le systeme peut offrir des vues d'analyses financieres et de reporting periodique.
FR28: Le systeme peut rattacher les flux a des axes analytiques (projets/centres) pour analyse.
FR29: Le systeme peut gerer plan comptable et journal comptable en coherence avec les flux operations.
FR30: Le systeme peut produire un dossier d'audit exportable structure (PDF/ZIP) incluant preuves et timeline.
FR31: Le systeme peut exposer un module de controle interne (ecarts, exceptions, plans d'action, statut).
FR32: Le systeme peut conserver un historique non destructif complet avec double temporalite.
FR33: Le systeme peut echanger des informations avec ERP/Tresor legacy en mode asynchrone.
FR34: Le systeme peut associer un correlation ID a chaque flux critique inter-systemes.
FR35: Les equipes habilitees peuvent suivre les rejets et divergences d'integration jusqu'a resolution.
FR36: Les utilisateurs autorises peuvent operer en mode degrade de connectivite.
FR37: Le systeme peut synchroniser apres reconnexion et qualifier les conflits de synchronisation.
FR38: L'Admin client peut attribuer/revoquer des roles avec RBAC strict et ABAC leger (entite, seuil, type).
FR39: Le systeme peut appliquer la separation ordonnateur/comptable dans les droits et actions.
FR40: Le systeme peut isoler donnees, configurations, journaux et regles par tenant.
FR41: L'Admin client peut configurer des politiques de conservation legale parametables.
FR42: Le systeme peut fournir les traces necessaires aux inspections d'Etat et audits externes.
FR43: Le systeme peut maintenir un plan comptable versionne (classes, comptes, sous-comptes, axes analytiques, dates d'effet).
FR44: Le systeme peut parametrer des regles de mapping `evenement metier -> schema d'ecriture` (debit, credit, journal, axes, piece source).
FR45: Le systeme peut generer automatiquement des ecritures en double entree pour les transitions critiques (engagement, liquidation, paiement, annulation, rejet).
FR46: Le systeme peut verifier l'equilibre debit=credit avant validation de chaque ecriture.
FR47: Le systeme peut garantir l'idempotence de generation des ecritures pour eviter les doublons.
FR48: Le systeme peut suivre le statut d'une ecriture (`generee`, `postee`, `rejetee`, `corrigee`) avec journal horodate.
FR49: Le systeme peut traiter annulations/corrections par contre-passation sans suppression destructive des ecritures sources.
FR50: Le systeme peut executer la cloture d'exercice (controles pre-cloture, regularisations, verrouillage periode, reouverture gouvernee).
FR51: Le systeme peut realiser le rapprochement bancaire automatique et manuel assiste avec qualification des ecarts.
FR52: Le systeme peut produire un journal de migration legacy (correspondance des etats, anomalies, corrections, validations).
FR53: Le systeme peut valider la migration legacy par reconciliation avant/apres des soldes comptables et statuts operationnels.
FR54: Le systeme peut appliquer les etats de periode (`ouverte`, `en revue`, `fermee`) avec regles d'acces associees.
FR55: Le systeme peut executer une phase de pre-cloture avec checklist obligatoire (ecarts, ecritures rejetees, rapprochements, exceptions ouvertes).
FR56: Le systeme peut verrouiller une periode cloturee et interdire toute ecriture directe hors workflow de reouverture gouvernee.
FR57: Le systeme peut gerer les exceptions tardives par workflow dedie (motif, approbation, contre-passation, regularisation).
FR58: Le systeme peut produire un dossier de cloture d'exercice (preuves, journaux, ecarts, decisions) signe metier/technique.
FR59: Le systeme peut preparer l'ouverture N+1 avec reprise controlee des soldes et referentiels.
FR60: Le systeme peut produire une balance comptable par periode avec totaux debit/credit par compte et export CSV/XLSX/PDF.
FR61: Le systeme peut produire un grand livre detaille par compte avec filtres (periode, entite, axe analytique, statut) et export.
FR62: Le systeme peut produire une fiche de compte annuelle (mouvements, soldes d'ouverture/cloture, piece source reliee).
FR63: Le systeme peut produire un etat des dettes fournisseurs (anciennete, echeances, historique de reglement, reste a payer).
FR64: Le systeme peut produire un etat des avances et regularisations (avance initiale, consommation, ecarts, statut de regularisation).
FR65: Le systeme peut produire des rapports d'execution budgetaire par ligne, composante et axe analytique (projet, bailleur, zone) avec comparaison prevision/execution.
FR66: Le systeme peut produire des rapports de tresorerie incluant journal des flux, situation des comptes, previsions et alertes de seuil.
FR67: Le systeme peut produire un etat des paiements (realises, en attente, rejetes, partiels) et un rapport de rapprochement bancaire qualifiant les ecarts.
FR68: Le systeme peut produire des dashboards visuels (budgetaire, analytique, tresorerie, comptable, conformite) avec filtres temporels et organisationnels.
FR69: Le systeme peut offrir des tableaux croises dynamiques multi-dimensions (ligne budgetaire, operation, fournisseur, axe analytique, periode) pour exploration ad hoc.
FR70: Le systeme peut produire un dossier de depense unifie (reservation -> paiement) avec pieces justificatives, controles de chaine, actions utilisateurs et preuves d'audit exportables.
FR71: Le systeme peut produire une DSF (Declaration Statistique et Fiscale) exportable et controlee, conforme au cadre OHADA/SYCEBNL applicable au tenant.
FR72: Le systeme peut produire un rapport des pieces justificatives manquantes ou non validees, avec filtre par etape, entite, fournisseur et criticite.
FR73: Le systeme peut produire un indicateur et rapport de temps de traitement par etape budgetaire (reservation, engagement, BC, facture, depense, paiement), avec p50/p95 et tendance periodique.
FR74: Le systeme peut exposer une vitrine publique accessible sans authentification pour presenter AGILYS et ses cas d'usage.
FR75: La page d'accueil vitrine (`/`) doit contenir au minimum hero, proposition de valeur, preuves de confiance, FAQ courte et CTA vers l'authentification.
FR76: Le CTA principal de la vitrine doit rediriger vers la page d'authentification sans etape intermediaire inutile.
FR77: Le systeme peut offrir un CTA secondaire de decouverte produit sans entrer en competition visuelle avec le CTA principal.
FR78: Toute tentative d'acces a une route privee par un utilisateur non authentifie doit etre redirigee vers l'authentification.
FR79: Apres authentification reussie, l'utilisateur doit etre redirige vers la page d'entree applicative definie par le produit.
FR80: Le comportement d'un utilisateur deja authentifie visitant la vitrine doit etre deterministe et configurable (`afficher vitrine` ou `rediriger vers app`).
FR81: Le systeme doit instrumenter les evenements du funnel minimum: `vitrine_vue`, `cta_principal_click`, `auth_page_view`, `auth_success`, `app_landing_view`.
FR82: La vitrine doit exposer les liens legaux minimaux (confidentialite, conditions d'utilisation, contact support).
FR83: Le systeme doit permettre l'evolution de la vitrine sans impact regressif sur les parcours applicatifs authentifies.
FR84: Le systeme doit exposer une page `/fonctionnalites` decrivant les capacites cles et cas d'usage prioritaires.
FR85: Le systeme doit exposer une page `/cas-clients` (ou `/temoignages`) avec au moins trois preuves de valeur verifiables.
FR86: Le systeme doit exposer une page `/contact` avec formulaire minimal (`nom`, `email`, `organisation`, `besoin`) et confirmation de soumission.
FR87: Le menu principal de la vitrine doit rendre accessibles `/`, `/fonctionnalites`, `/cas-clients`, `/contact` en maximum un clic.
FR88: Chaque page vitrine doit comporter un CTA visible vers l'authentification ou la prise de contact, sans conflit de priorite visuelle.
FR89: Les pages legales publiques `/mentions-legales`, `/politique-confidentialite`, `/conditions-utilisation` doivent etre accessibles depuis le footer.
FR90: Le systeme doit distinguer les conversions `authentification` et `lead contact` dans l'analytics pour pilotage acquisition.

### NonFunctional Requirements

NFR1: Les contrôles de règles critiques (autorisation + cash) doivent répondre en `p95 <= 500 ms`, mesuré en continu par monitoring applicatif et vérifié hebdomadairement sur fenêtre glissante de 7 jours.
NFR2: Les écrans opérationnels principaux (dashboard blocages, detail dossier budgetaire) doivent charger en `<= 2 s` en conditions nominales réseau, mesuré par monitoring experience utilisateur sur le percentile p95.
NFR3: Les exports de dossier d’audit standard doivent être générés en `<= 60 s` pour un dossier de taille courante.
NFR4: La disponibilité plateforme doit être `>= 99,5%` hors maintenances planifiées, mesurée mensuellement via l'outil d'uptime monitoring de production.
NFR5: Le système doit préserver la continuité de saisie en mode dégradé réseau avec taux de perte de transaction locale `= 0%`, mesuré par tests de résilience hebdomadaires.
NFR6: Le délai de synchronisation offline -> online doit être `p95 <= 5 min` après reconnexion stable, mesuré par traces de synchronisation et consolidé dans un rapport hebdomadaire.
NFR7: Toutes les données sensibles doivent être chiffrées en transit (TLS 1.2+) et au repos (AES-256), avec taux de conformité `100%` mesuré par scan de configuration mensuel.
NFR8: Le contrôle d’accès doit appliquer RBAC strict et ABAC léger sur `100%` des opérations sensibles, mesuré par campagne de tests d'autorisation automatisés à chaque release.
NFR9: Toute action critique doit être journalisée avec identité, horodatage, contexte et résultat, avec couverture de journalisation `>= 99,9%` mesurée par contrôle quotidien.
NFR10: Aucune action interdite par séparation ordonnateur/comptable ne doit être exécutable (`0` violation), mesuré par tests d'intrusion fonctionnels mensuels.
NFR11: L’historique des dossiers budgétaires doit être non destructif avec taux d'intégrité `100%`, mesuré par vérification quotidienne de chaîne d'audit.
NFR12: Chaque flux critique inter-système doit porter un correlation ID avec couverture `100%`, mesurée par contrôle automatique des messages en production.
NFR13: Le système doit permettre l’export de piste d’audit vérifiable (PDF/ZIP structuré) avec taux de succès `>= 99%` et délai `<= 60 s` pour dossier standard, mesurés par monitoring applicatif.
NFR14: Les politiques de conservation légale doivent être paramétrables par juridiction avec couverture `100%` des juridictions actives, vérifiée lors des audits trimestriels.
NFR15: Le déploiement doit respecter les contraintes locales de souveraineté et de protection des données avec `0` non-conformité majeure constatée en audit annuel.
NFR16: Le système doit supporter une croissance `x10` des volumes de dossiers budgetaires sans rupture fonctionnelle majeure, mesuré par campagnes de tests de charge trimestrielles avec scénario de montée progressive.
NFR17: La dégradation de performance sous charge cible ne doit pas dépasser `10%` sur les parcours critiques, mesurée par comparaison baseline vs charge cible lors des tests de performance trimestriels.
NFR18: L’architecture doit permettre l’ajout de nouveaux tenants sans interruption de service (`0` minute d'arrêt non planifié), mesuré lors de tests d'onboarding mensuels.
NFR19: Les interfaces web doivent viser conformité `WCAG 2.1 AA` sur les parcours critiques métier, mesurée par audits automatisés et manuels à chaque release majeure.
NFR20: Les parcours de décision et de contrôle doivent être utilisables au clavier et lisibles par technologies d’assistance avec taux de conformité `>= 95%` aux tests d'accessibilité trimestriels.
NFR21: Les messages de blocage/erreur doivent être explicites, non ambigus et actionnables, avec taux de compréhension utilisateur `>= 90%` mesuré par tests UX semestriels.
NFR22: Les échanges ERP legacy doivent tolérer les indisponibilités temporaires avec taux de reprise automatique `>= 99%` en `<= 15 min`, mesuré par supervision d'intégration.
NFR23: Les divergences d’intégration doivent être détectées, qualifiées et traçables avec délai de détection `<= 5 min` (p95), mesuré par monitoring des files d'attente.
NFR24: Les interfaces d’intégration doivent garantir l'idempotence sur les opérations critiques avec taux de doublon `<= 0,01%`, mesuré par contrôle quotidien.
NFR25: La génération des écritures automatiques doit être idempotente et déterministe, avec écart de reproductibilité `= 0` entre deux exécutions du même événement, mesuré par tests de non-régression.
NFR26: Le controle debit=credit doit etre applique a 100% des ecritures avant validation.
NFR27: Le moteur d'ecritures doit traiter une transition metier critique en `<= 1 seconde (p95)`, hors indisponibilite externe, mesuré par instrumentation applicative et revu mensuellement.
NFR28: Les opérations de contre-passation/correction doivent être intégralement traçables et liées aux pièces sources avec taux de liaison `100%`, mesuré par contrôle d'intégrité quotidien.
NFR29: La clôture d'exercice doit produire un journal de clôture vérifiable et inaltérable avec preuve d'intégrité cryptographique `100%`, mesurée à chaque clôture.
NFR30: Le rapprochement bancaire doit permettre une résolution assistée des écarts avec audit trail complet, et taux de résolution des écarts `>= 95%` en `<= J+5`, mesuré mensuellement.
NFR31: La migration legacy doit produire un rapport de réconciliation avec tolérance d'écart nulle sur comptes critiques (`0` écart), mesurée à chaque lot de migration.
NFR32: Le workflow complet de cloture doit etre executable dans une fenetre operationnelle de `<= 4 heures` pour un tenant standard, mesuré lors de chaque cloture par journal horodate de debut/fin.
NFR33: Aucune écriture ne doit être autorisée sur période `fermee` en dehors d'un workflow de réouverture approuvé et tracé (`0` violation), mesuré par contrôle quotidien.
NFR34: Le dossier de cloture doit etre genere automatiquement en `<= 15 minutes` apres validation finale, mesuré a chaque execution par le timestamp de generation du pipeline de cloture.
NFR35: Toute exception tardive doit être résolue avec traçabilité complète (décision, auteur, horodatage, impact) en `<= J+5` pour `>= 95%` des cas, mesuré mensuellement.
NFR36: La bascule N vers N+1 doit garantir une cohérence des soldes avec tolérance d'écart nulle sur comptes de contrôle (`0` écart), vérifiée par bilan de bascule signé.
NFR37: La vitrine publique doit atteindre `LCP <= 2,5 s` (p75) sur mobile et desktop, mesuree par RUM mensuel.
NFR38: La vitrine doit atteindre `CLS <= 0,1` et `INP <= 200 ms` (p75), mesures en continu via Web Vitals.
NFR39: Les pages publiques critiques doivent etre indexables (meta title, description, canonical, structure Hn) avec couverture `100%` auditee a chaque release.
NFR40: Le suivi analytics du funnel vitrine -> authentification -> app doit avoir une couverture d'evenements `100%` sur les etapes FR81, mesuree hebdomadairement depuis l'outil analytics de reference avec controle de parite plan de marquage vs evenements emis.
NFR41: Le temps de redirection post-authentification vers l'app doit etre `<= 2 s` (p95), mesure par trace front-to-back.
NFR42: Le taux d'acces non autorise reussi sur routes privees doit rester a `0`, verifie par tests automatiques et monitoring securite a chaque release.
NFR43: Les pages vitrine `/`, `/fonctionnalites`, `/cas-clients`, `/contact` doivent charger en `<= 2,5 s` (p75) sur reseau mobile standard, mesure par RUM mensuel par route.
NFR44: La couverture analytics des conversions vitrine doit etre `100%` pour les evenements `lead_form_submit` et `lead_form_success` en plus des etapes FR81, mesuree mensuellement par reconciliation entre logs applicatifs et entrepot analytics avec ecart acceptable `<= 1%`.

### Additional Requirements

- Migration progressive par module obligatoire (pas de big-bang), avec coexistence temporaire contrôlée.
- Cible architecture officielle: Front Next.js, API NestJS, PostgreSQL localhost (dev).
- Migration complète de l’auth hors Supabase: JWT access/refresh, guards API, gestion session expirée.
- RBAC strict + ABAC léger à conserver sur les modules sensibles, avec audit trail.
- Continuité UX obligatoire: transition transparente pour l’end user sans rupture de parcours.
- Réutilisation prioritaire de `shadcn/ui` et amélioration des composants existants avant création de nouveaux.
- Création d’un client API front unifié typé pour remplacer progressivement les appels Supabase.
- Remplacement des Edge Functions Supabase par services NestJS (logique métier centralisée côté backend).
- Scripts d’exploitation locale requis: migrations DB, seed, reset.
- Décommission Supabase planifiée en fin de migration: dépendances runtime et code mort retirés.
- Modules prioritaires à finaliser: Paramètres Utilisateurs, Paramètres Généraux, Rapprochement Bancaire.
- Le rapprochement bancaire doit couvrir mode automatique + manuel assisté avec qualification des écarts.
- Les stories doivent rester testables indépendamment, avec traçabilité `règle d’architecture -> AC -> test`.
- Couverture analytics/conversion et contraintes de performance/fiabilité du PRD restent applicables durant migration.

### FR Coverage Map

FR1-FR8: Epic 3 - Parametrage budgetaire et planification
FR9-FR18: Epic 4 - Chaine operationnelle de depense de bout en bout
FR19-FR25: Epic 5 - Controle cash, exceptions et supervision des risques
FR26-FR32: Epic 7 - Pilotage, conformite et audit operationnel
FR33-FR37: Epic 8 - Integration legacy et resilience operationnelle
FR38-FR42: Epic 2 - Gouvernance d'acces, roles et isolation multi-tenant
FR43-FR59: Epic 6 - Comptabilite automatisee, cloture et reconciliation
FR60-FR67: Epic 9 - Reporting financier et tresorerie operationnelle
FR68-FR73: Epic 10 - Analytique avancee, performance des processus et conformite fiscale
FR74-FR90: Epic 1 - Vitrine publique et conversion vers l'application

## Epic List

### Epic 1: Vitrine publique et conversion vers l'application
Permettre aux visiteurs de decouvrir AGILYS, se convertir (auth ou lead), et entrer dans le produit sans friction.
**FRs covered:** FR74, FR75, FR76, FR77, FR78, FR79, FR80, FR81, FR82, FR83, FR84, FR85, FR86, FR87, FR88, FR89, FR90.

### Epic 2: Gouvernance d'acces, roles et isolation multi-tenant
Permettre a l'admin client de gouverner les acces, roles et regles de separation des responsabilites.
**FRs covered:** FR38, FR39, FR40, FR41, FR42.

### Epic 3: Parametrage budgetaire et planification
Permettre de configurer le cadre budgetaire, allouer/reallouer, versionner et piloter les previsions.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8.

### Epic 4: Chaine operationnelle de depense de bout en bout
Permettre d'executer le cycle complet reservation -> engagement -> BC -> facture -> depense -> paiement.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18.

### Epic 5: Controle cash, exceptions et supervision des risques
Permettre de bloquer les transitions risquees, gerer les exceptions, et securiser le pilotage tresorerie.
**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24, FR25.

### Epic 6: Comptabilite automatisee, cloture et reconciliation
Permettre la production comptable fiable (double entree), la cloture d'exercice et le rapprochement bancaire.
**FRs covered:** FR43, FR44, FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53, FR54, FR55, FR56, FR57, FR58, FR59.

### Epic 7: Pilotage, conformite et audit operationnel
Permettre le pilotage de gestion, la conformite, le controle interne et la tracabilite complete.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR31, FR32.

### Epic 8: Integration legacy et resilience operationnelle
Permettre les echanges legacy, la reprise apres incidents reseau et la gouvernance des synchronisations.
**FRs covered:** FR33, FR34, FR35, FR36, FR37.

### Epic 9: Reporting financier et tresorerie operationnelle
Permettre la production des rapports coeur finance/compta/tresorerie exploitables par les metiers.
**FRs covered:** FR60, FR61, FR62, FR63, FR64, FR65, FR66, FR67.

### Epic 10: Analytique avancee, performance des processus et conformite fiscale
Permettre l'analyse multidimensionnelle, la mesure des temps de cycle, et la production DSF.
**FRs covered:** FR68, FR69, FR70, FR71, FR72, FR73.

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Vitrine publique et conversion vers l'application

Permettre aux visiteurs de decouvrir AGILYS, se convertir (auth ou lead), et entrer dans le produit sans friction.

### Story 1.1: Structurer la vitrine multi-pages

As a visiteur public,
I want naviguer facilement entre les pages vitrine,
So that je comprends rapidement la proposition de valeur AGILYS.

**Acceptance Criteria:**

**Given** un utilisateur non authentifie arrive sur le site
**When** il parcourt `/`, `/fonctionnalites`, `/cas-clients`, `/contact`
**Then** la navigation principale et le footer exposent ces routes en un clic
**And** les pages legales sont accessibles depuis le footer.

### Story 1.2: Optimiser la conversion vers l'auth et le lead

As a visiteur public,
I want des CTA clairs vers authentification ou contact,
So that je peux convertir mon intention sans ambiguite.

**Acceptance Criteria:**

**Given** un visiteur parcourt une page vitrine
**When** il clique le CTA principal ou secondaire
**Then** le CTA principal redirige vers la page d'authentification
**And** le CTA secondaire declenche un parcours de decouverte/contact sans conflit visuel.

### Story 1.3: Instrumenter le funnel vitrine -> app

As a product manager,
I want tracer les etapes de conversion,
So that je peux piloter l'acquisition et les activations.

**Acceptance Criteria:**

**Given** un visiteur interagit avec la vitrine et l'auth
**When** il avance dans le funnel
**Then** les evenements `vitrine_vue`, `cta_principal_click`, `auth_page_view`, `auth_success`, `app_landing_view` sont emis
**And** les conversions `auth` et `lead` sont distinguees dans l'analytics.

### Story 1.4: Garantir performances et SEO de la vitrine

As a responsable acquisition,
I want une vitrine performante et indexable,
So that le trafic organique et l'experience restent au niveau cible.

**Acceptance Criteria:**

**Given** les pages vitrine en production
**When** les metriques web vitals et SEO sont mesurees
**Then** les seuils LCP/CLS/INP et les metadonnees SEO critiques sont conformes
**And** les ecarts de suivi analytics restent dans la tolerance definie.

## Epic 2: Gouvernance d'acces, roles et isolation multi-tenant

Permettre a l'admin client de gouverner les acces, roles et regles de separation des responsabilites.

### Story 2.1: Mettre en place l'auth NestJS JWT + refresh

As a utilisateur authentifie,
I want me connecter et maintenir ma session de facon securisee,
So that j'accede aux fonctionnalites selon mes droits.

**Acceptance Criteria:**

**Given** des identifiants valides
**When** l'utilisateur se connecte via l'API
**Then** un access token et un refresh token sont emis
**And** la session peut etre renouvelee sans re-authentification immediate.

### Story 2.2: Appliquer RBAC et separation des responsabilites

As a admin client,
I want attribuer/revoquer des roles metiers,
So that chaque acteur n'accede qu'aux actions autorisees.

**Acceptance Criteria:**

**Given** un utilisateur avec un role defini
**When** il tente une action sensible
**Then** les guards RBAC/ABAC appliquent les regles d'acces
**And** les violations de separation ordonnateur/comptable sont bloquees.

### Story 2.3: Isoler les donnees et politiques par tenant

As a admin plateforme,
I want une isolation stricte par tenant,
So that les donnees et configurations ne fuient jamais entre organisations.

**Acceptance Criteria:**

**Given** plusieurs tenants actifs
**When** un utilisateur interroge des ressources
**Then** seules les donnees de son tenant sont retournees
**And** les politiques de retention sont parametrables par tenant.

### Story 2.4: Migrer le frontend auth sans rupture UX

As a utilisateur existant,
I want conserver un parcours de connexion fluide,
So that la migration backend reste transparente.

**Acceptance Criteria:**

**Given** le nouveau backend auth est actif
**When** l'utilisateur se connecte ou sa session expire
**Then** le contexte auth frontend gere login/logout/refresh correctement
**And** les redirections vers routes protegees restent coherentes.

## Epic 3: Parametrage budgetaire et planification

Permettre de configurer le cadre budgetaire, allouer/reallouer, versionner et piloter les previsions.

### Story 3.1: Configurer referentiels budgetaires de base

As a admin client,
I want gerer exercices, enveloppes et structure budgetaire,
So that le cadre de gestion est operationnel.

**Acceptance Criteria:**

**Given** un tenant configure
**When** l'admin cree/modifie exercices, enveloppes, sections, programmes, actions
**Then** les donnees sont persistees et historisees
**And** les validations minimales de coherence sont appliquees.

### Story 3.2: Gerer allocations et reallocations de credits

As a gestionnaire budget,
I want allouer et reallouer les credits,
So that les besoins metiers evoluent sans perdre la trace des arbitrages.

**Acceptance Criteria:**

**Given** des lignes budgetaires actives
**When** une allocation ou reallocation est enregistree
**Then** l'operation respecte les plafonds et contraintes
**And** une trace d'audit complete est conservee.

### Story 3.3: Versionner les decisions budgetaires

As a directeur financier,
I want versionner les revisions budgetaires,
So that je peux comparer les versions et justifier les decisions.

**Acceptance Criteria:**

**Given** une decision budgetaire soumise
**When** elle est validee ou rejetee
**Then** une nouvelle version est enregistree avec auteur et horodatage
**And** les versions precedentes restent consultables.

### Story 3.4: Produire previsions et ecarts prevision/execution

As a controleur budget,
I want consolider les previsions et ecarts,
So that je pilote les risques de depassement.

**Acceptance Criteria:**

**Given** des previsions periodiques et donnees d'execution
**When** le calcul d'ecart est lance
**Then** les ecarts sont exposes par axe et periode
**And** les vues de suivi sont filtrables par entite et periode.

## Epic 4: Chaine operationnelle de depense de bout en bout

Permettre d'executer le cycle complet reservation -> engagement -> BC -> facture -> depense -> paiement.

### Story 4.1: Gerer reservations et engagements

As a acteur habilite,
I want creer reservation puis engagement,
So that je transforme un besoin en obligation juridique controlee.

**Acceptance Criteria:**

**Given** une ligne budgetaire disponible
**When** l'utilisateur cree reservation puis conversion en engagement
**Then** les statuts evoluent selon le workflow metier
**And** les verifications budgetaires sont appliquees.

### Story 4.2: Gerer bons de commande et factures

As a gestionnaire depense,
I want lier BC et factures a un engagement,
So that le suivi documentaire reste coherent.

**Acceptance Criteria:**

**Given** un engagement actif
**When** un BC puis une facture sont enregistres
**Then** les liens de references sont conserves
**And** les statuts facture suivent le cycle defini.

### Story 4.3: Constituer et liquider une depense

As a comptable,
I want constituer une depense depuis des factures valides,
So that je prepare l'ordonnancement conforme.

**Acceptance Criteria:**

**Given** 1 a 20 factures valides
**When** l'utilisateur cree la depense
**Then** la depense est creee avec controles de limite
**And** une tentative au-dela de 20 factures est rejetee avec message explicite.

### Story 4.4: Executer paiement et gestion des cas partiels/rejets

As a comptable payeur,
I want suivre paiements partiels, rejets et reprises,
So that les reglements sont traces jusqu'a cloture.

**Acceptance Criteria:**

**Given** une depense ordonnancee
**When** un paiement est initie puis mis a jour
**Then** les statuts de paiement evoluent selon le workflow cible
**And** tout paiement d'une depense non ordonnancee est bloque.

## Epic 5: Controle cash, exceptions et supervision des risques

Permettre de bloquer les transitions risquees, gerer les exceptions, et securiser le pilotage tresorerie.

### Story 5.1: Evaluer le risque cash sur transitions critiques

As a systeme de controle,
I want calculer le risque avant transition,
So that les actions dangereuses soient prevenues.

**Acceptance Criteria:**

**Given** une transition critique demandee
**When** le moteur de risque s'execute
**Then** un score/etat de risque est calcule
**And** la transition est bloquee si le seuil est depasse.

### Story 5.2: Expliquer blocages et proposer remediations

As a utilisateur metier,
I want comprendre pourquoi une action est bloquee,
So that je puisse corriger rapidement.

**Acceptance Criteria:**

**Given** une transition bloquee
**When** l'utilisateur consulte le detail
**Then** la cause du blocage est explicite et actionnable
**And** une liste de remediations est fournie.

### Story 5.3: Gerer workflow d'exception avec quorum

As a responsable habilite,
I want demander et approuver des exceptions encadrees,
So that les cas urgents restent gouvernes.

**Acceptance Criteria:**

**Given** un blocage critique
**When** une demande d'exception est soumise
**Then** une justification obligatoire est exigee
**And** l'exception est soumise a quorum et limite temporelle.

### Story 5.4: Offrir supervision tresorerie et audit des exceptions

As a controleur interne,
I want auditer les transitions en exception,
So that je peux suivre les risques et conformites.

**Acceptance Criteria:**

**Given** des exceptions traitees
**When** le controleur consulte les journaux
**Then** toutes les transitions en exception sont tracables
**And** les vues de tresorerie exposent position, projection et alertes.

## Epic 6: Comptabilite automatisee, cloture et reconciliation

Permettre la production comptable fiable (double entree), la cloture d'exercice et le rapprochement bancaire.

### Story 6.1: Versionner plan comptable et mapping ecritures

As a responsable comptable,
I want parametrer comptes et mappings metier->ecriture,
So that la generation comptable soit gouvernee.

**Acceptance Criteria:**

**Given** un plan comptable actif
**When** les regles de mapping sont configurees
**Then** les versions sont historisees avec dates d'effet
**And** chaque evenement metier est mappe vers debit/credit/journal.

### Story 6.2: Generer ecritures en double entree idempotentes

As a comptable,
I want des ecritures automatiques fiables,
So that les operations restent conformes et sans doublons.

**Acceptance Criteria:**

**Given** une transition metier critique
**When** la generation d'ecriture est declenchee
**Then** l'equilibre debit=credit est verifie avant validation
**And** l'idempotence empeche les doublons.

### Story 6.3: Gerer corrections et contre-passations auditables

As a comptable,
I want corriger sans suppression destructive,
So that l'historique reste conforme en audit.

**Acceptance Criteria:**

**Given** une ecriture a corriger
**When** une contre-passation est executee
**Then** les ecritures source et correction restent liees
**And** le journal conserve auteur, horodatage et motif.

### Story 6.4: Executer cloture d'exercice gouvernee

As a responsable cloture,
I want cloturer une periode avec checklist,
So that la bascule N vers N+1 soit securisee.

**Acceptance Criteria:**

**Given** une periode en pre-cloture
**When** la checklist est completee et validee
**Then** la periode passe en `fermee` avec verrouillage des ecritures
**And** l'ouverture N+1 reprend soldes et referentiels de maniere controlee.

### Story 6.5: Implementer rapprochement bancaire auto + manuel

As a tresorier,
I want rapprocher les mouvements bancaires,
So that les ecarts soient qualifies et resolus rapidement.

**Acceptance Criteria:**

**Given** des operations internes et releves bancaires
**When** un rapprochement auto puis manuel est lance
**Then** les correspondances sont proposees et validables
**And** les ecarts sont qualifies avec audit trail complet.

### Story 6.6: Produire dossier de cloture et migration reconciliation

As a auditeur,
I want disposer de preuves de cloture et migration,
So that la conformite soit verifiable.

**Acceptance Criteria:**

**Given** une cloture ou un lot de migration execute
**When** le dossier est genere
**Then** il contient preuves, ecarts, decisions et reconciliations avant/apres
**And** l'integrite du dossier est verifiable.

## Epic 7: Pilotage, conformite et audit operationnel

Permettre le pilotage de gestion, la conformite, le controle interne et la tracabilite complete.

### Story 7.1: Exposer dashboard budgetaire de pilotage

As a directeur financier,
I want visualiser consommation, ecarts et risques,
So that je priorise les actions correctives.

**Acceptance Criteria:**

**Given** des donnees budgetaires consolidees
**When** le dashboard est consulte
**Then** les indicateurs cles sont affiches par periode et entite
**And** les blocages/risques sont visibles en priorite.

### Story 7.2: Fournir vues d'analyse et axes analytiques

As a controleur de gestion,
I want analyser par projets/centres/axes,
So that je peux expliquer la performance financiere.

**Acceptance Criteria:**

**Given** des flux operations et comptables
**When** l'utilisateur applique des filtres analytiques
**Then** les vues d'analyse se mettent a jour de facon cohérente
**And** les rattachements aux axes sont conserves dans les exports.

### Story 7.3: Produire dossier d'audit exportable

As a auditeur,
I want exporter un dossier d'audit complet,
So that l'inspection externe soit facilitee.

**Acceptance Criteria:**

**Given** une plage temporelle ou un dossier cible
**When** l'export est declenche
**Then** un PDF/ZIP structure est genere avec timeline, preuves et actions
**And** le dossier est verifiable et tracable.

### Story 7.4: Activer module controle interne

As a controleur interne,
I want suivre ecarts, exceptions et plans d'action,
So that la maitrise interne reste active en continu.

**Acceptance Criteria:**

**Given** des ecarts et exceptions detectes
**When** le module controle interne est utilise
**Then** les plans d'action et statuts sont suivis de bout en bout
**And** l'historique non destructif reste disponible.

## Epic 8: Integration legacy et resilience operationnelle

Permettre les echanges legacy, la reprise apres incidents reseau et la gouvernance des synchronisations.

### Story 8.1: Mettre en place flux d'integration asynchrones

As a integrateur SI,
I want echanger avec ERP/Tresor en asynchrone,
So that les interruptions ponctuelles ne bloquent pas l'activite.

**Acceptance Criteria:**

**Given** des flux entrants/sortants legacy
**When** les echanges sont traites
**Then** chaque message porte un correlation ID
**And** les rejets sont traces avec statut de resolution.

### Story 8.2: Gerer mode degrade et reprise apres reconnexion

As a utilisateur terrain,
I want continuer en mode degrade,
So that je ne perds pas mes operations en cas de reseau instable.

**Acceptance Criteria:**

**Given** une indisponibilite de connectivite
**When** l'utilisateur saisit des operations
**Then** elles sont conservees localement sans perte
**And** la synchronisation apres reconnexion qualifie les conflits.

### Story 8.3: Superviser divergences et SLA de rattrapage

As a responsable exploitation,
I want suivre les divergences d'integration,
So that les anomalies soient corrigees dans les delais cibles.

**Acceptance Criteria:**

**Given** des ecarts detectes entre systemes
**When** la supervision est consultee
**Then** les divergences sont qualifiees avec priorite
**And** les delais de detection/reprise sont mesures.

## Epic 9: Reporting financier et tresorerie operationnelle

Permettre la production des rapports coeur finance/compta/tresorerie exploitables par les metiers.

### Story 9.1: Generer balance, grand livre et fiche compte

As a comptable,
I want produire les rapports comptables fondamentaux,
So that je peux controler la qualite comptable periodique.

**Acceptance Criteria:**

**Given** une periode et des filtres valides
**When** l'utilisateur demande un rapport comptable
**Then** la balance, le grand livre et la fiche compte sont generables
**And** les exports CSV/XLSX/PDF sont disponibles.

### Story 9.2: Produire etat dettes fournisseurs et avances

As a responsable fournisseur,
I want suivre dettes, echeances et regularisations,
So that je maitrise les engagements a payer.

**Acceptance Criteria:**

**Given** les factures et depenses du tenant
**When** les rapports fournisseurs sont generes
**Then** l'anciennete, les restes a payer et regularisations sont visibles
**And** les rapports sont filtrables par entite/periode.

### Story 9.3: Produire execution budgetaire et tresorerie

As a directeur financier,
I want suivre execution budgetaire et position de tresorerie,
So that je pilote les arbitrages quotidiens.

**Acceptance Criteria:**

**Given** des donnees budgetaires et flux de tresorerie
**When** les rapports sont consultes
**Then** les comparaisons prevision/execution et alertes de seuil sont affichees
**And** les journaux de flux et etats de paiement/rapprochement sont inclus.

## Epic 10: Analytique avancee, performance des processus et conformite fiscale

Permettre l'analyse multidimensionnelle, la mesure des temps de cycle, et la production DSF.

### Story 10.1: Offrir tableaux croises et dashboards analytiques avances

As a analyste financier,
I want explorer les donnees en multi-dimensions,
So that j'identifie rapidement tendances et anomalies.

**Acceptance Criteria:**

**Given** des dimensions analytiques disponibles
**When** l'utilisateur cree un tableau croise ou dashboard
**Then** les aggregations par axe/periode sont calculees correctement
**And** les vues sont exportables.

### Story 10.2: Produire dossier de depense unifie avec preuves

As a auditeur interne,
I want tracer un dossier de depense de bout en bout,
So that je verifie la conformite complete de la chaine.

**Acceptance Criteria:**

**Given** une depense cible
**When** le dossier unifie est consulte ou exporte
**Then** toutes les etapes reservation -> paiement sont reliees
**And** les pieces, controles et actions utilisateurs sont inclus.

### Story 10.3: Produire DSF conforme OHADA/SYCEBNL

As a responsable fiscal,
I want generer une DSF controlee,
So that les obligations declaratives sont respectees.

**Acceptance Criteria:**

**Given** des donnees comptables valides
**When** la DSF est generee
**Then** le format exporte respecte le cadre OHADA/SYCEBNL applicable
**And** les erreurs de conformite bloquantes sont signalees avant export final.

### Story 10.4: Mesurer les temps de traitement par etape

As a responsable performance process,
I want suivre p50/p95 des etapes budgetaires,
So that je reduis les goulots d'etranglement operatoires.

**Acceptance Criteria:**

**Given** les evenements de cycle budgetaire traces
**When** les indicateurs de temps sont calcules
**Then** les mesures par etape et tendance periodique sont disponibles
**And** les ecarts significatifs declenchent des alertes d'analyse.
