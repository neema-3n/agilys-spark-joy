# Plan d’exécution découpé en sous-tâches

## Résumé
Livrer un lot “cleanup urgent” en 5 chantiers: purge métier DB, navigation sidebar, page Trésorerie, page Paramètres, page Login; puis validation complète.

## Sous-tâche 1 — Préparation et sauvegarde opérationnelle
- Vérifier la connexion au projet Supabase cible.
- Faire un export de sécurité des tables à conserver (`comptes`, `parametres_referentiels`, `profiles`, `user_roles`) avant purge.
- Définir un fichier de logs d’exécution (horodatage + résultats de compteurs).

## Sous-tâche 2 — Script SQL de purge métier réutilisable
- Créer:
  - `/Users/max/.codex/worktrees/b3aa/agilys-spark-joy/supabase/scripts/cleanup_keep_referentiels_plan_comptable.sql`
- Implémenter:
  - transaction SQL,
  - suppression des données métier en ordre FK-safe,
  - exclusion explicite des tables utilisateurs et des 2 tables à conserver.
- Ajouter en fin de script:
  - requêtes de contrôle `COUNT(*)` par table clé,
  - output lisible pour audit post-run.

## Sous-tâche 3 — Exécution de la purge et vérification DB
- Exécuter le script sur la base Supabase du projet.
- Contrôler:
  - tables métier vidées,
  - `comptes` et `parametres_referentiels` conservés,
  - `profiles`, `user_roles`, `auth.users` inchangés.
- Produire un mini rapport chiffré.

## Sous-tâche 4 — Sidebar: masquage des menus demandés
- Fichier:
  - `/Users/max/.codex/worktrees/b3aa/agilys-spark-joy/src/pages/app/AppLayout.tsx`
- Actions:
  - masquer `Prévisions Budgétaires`,
  - masquer `Analyses Financières`,
  - masquer `Contrôle Interne`,
  - retirer le groupe/section `Conformité` du pilotage,
  - conserver `Suivi De Trésorerie`.

## Sous-tâche 5 — Trésorerie: retrait onglet Rapprochement uniquement
- Fichier:
  - `/Users/max/.codex/worktrees/b3aa/agilys-spark-joy/src/pages/app/Tresorerie.tsx`
- Actions:
  - supprimer `TabsTrigger` “Rapprochement”,
  - supprimer `TabsContent` associé,
  - garder les autres onglets et flux inchangés.

## Sous-tâche 6 — Paramètres: retrait de General
- Fichier:
  - `/Users/max/.codex/worktrees/b3aa/agilys-spark-joy/src/pages/app/Parametres.tsx`
- Actions:
  - retirer `general` de `SECTION_IDS`,
  - retirer la section/carte “Paramètres Généraux” du menu latéral interne.

## Sous-tâche 7 — Login: masquer le cadre “Comptes de test :”
- Fichier:
  - `/Users/max/.codex/worktrees/b3aa/agilys-spark-joy/src/pages/auth/Login.tsx`
- Action:
  - supprimer uniquement le bloc d’aide des comptes de test, sans toucher aux handlers login/signup.

## Sous-tâche 8 — Contrôles qualité et non-régression
- Lancer vérification TypeScript/lint du frontend.
- Vérifier manuellement:
  - sidebar conforme,
  - absence onglet rapprochement,
  - absence paramètre general,
  - absence bloc comptes test login,
  - navigation restante OK.

## Sous-tâche 9 — Livraison
- Fournir récapitulatif:
  - fichiers modifiés,
  - résultat purge DB (comptages),
  - points validés / éventuels risques résiduels.

## Interfaces/APIs impactées
- Aucune API publique modifiée.
- Aucune suppression de route.
- Ajout d’un script SQL opérationnel dans `supabase/scripts`.

## Tests/Scénarios d’acceptation
1. Sidebar n’affiche plus les menus ciblés ni le groupe `Conformité`.
2. `Suivi De Trésorerie` reste visible.
3. Onglet `Rapprochement` absent dans Trésorerie.
4. `Paramètres Généraux` absent dans Paramètres.
5. Bloc `Comptes de test :` absent dans Login.
6. DB: métier vidé, `comptes` + `parametres_referentiels` conservés, users inchangés.

## Hypothèses
- Masquage UI uniquement (pas de blocage URL direct).
- Module Utilisateurs hors scope.
