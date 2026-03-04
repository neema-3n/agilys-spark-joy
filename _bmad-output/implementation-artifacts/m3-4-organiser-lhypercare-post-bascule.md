# Story M3.4: Organiser l'hypercare post-bascule

Status: ready-for-dev

## Story

As a equipe plateforme,
I want structurer une phase d'hypercare post-bascule,
so that les incidents de transition soient détectés, traités et tracés rapidement sans dérive de service.

## Acceptance Criteria

1. **Cadre opérationnel hypercare défini et activable**
   - **Given** la bascule technique est effectuée
   - **When** l'hypercare démarre
   - **Then** les rituels de suivi, seuils d'alerte, responsabilités et canaux d'escalade sont explicités
   - **And** un plan de sortie d'hypercare mesurable est documenté

2. **Pilotage incidents et qualité de service traçable**
   - **Given** un incident post-bascule
   - **When** il est pris en charge
   - **Then** le temps de détection, de mitigation et de résolution est mesuré
   - **And** les actions correctives sont capitalisées dans un registre unique

## Tasks / Subtasks

- [ ] Définir la fenêtre hypercare et la gouvernance (AC: 1)
  - [ ] Documenter la durée cible (ex: J0 à J+30), horaires de couverture, astreinte et rotation
  - [ ] Nommer RACI (incident commander, owner backend, owner frontend, owner data, PM)
  - [ ] Définir critères d'entrée/sortie hypercare validés

- [ ] Mettre en place les rituels et tableaux de bord (AC: 1, 2)
  - [ ] Standup hypercare quotidien (risques, incidents, actions)
  - [ ] Dashboard local de santé (auth, API, parcours critiques, erreurs frontend)
  - [ ] Rapport journalier synthèse (incidents ouverts/fermés, MTTR, risques)

- [ ] Standardiser la gestion d'incident post-bascule (AC: 2)
  - [ ] Formaliser la runbook checklist "incident P1/P2" (diagnostic, mitigation, rollback partiel)
  - [ ] Créer un registre des incidents/actions correctives avec propriétaire et ETA
  - [ ] Définir règle de communication interne (fréquence et contenu)

- [ ] Exécuter la boucle d'amélioration continue hypercare (AC: 2)
  - [ ] Revue hebdomadaire des causes racines et tendances
  - [ ] Prioriser les corrections à fort impact stabilité
  - [ ] Préparer le bilan de sortie hypercare et transfert en run standard

## Dev Notes

### Contraintes

- Aucune action infrastructure distante non demandée.
- Le périmètre M3.4 couvre l'opérationnel post-bascule et la stabilisation, pas la refonte technique majeure.
- Les preuves doivent être horodatées dans `/_bmad-output/implementation-artifacts/`.

### Livrables attendus

- `/_bmad-output/implementation-artifacts/m3-4-hypercare-dashboard-template.md`
- `/_bmad-output/implementation-artifacts/m3-4-incident-register.md`
- `/_bmad-output/implementation-artifacts/m3-4-daily-report-YYYY-MM-DD.md`
- `/_bmad-output/implementation-artifacts/m3-4-exit-criteria-check.md`

### KPIs hypercare (minimum)

- Incidents P1/P2 ouverts/fermés par jour
- MTTD (Mean Time To Detect)
- MTTR (Mean Time To Resolve)
- Taux de succès des parcours critiques (auth, flux opérationnels clés)
- Nombre d'actions correctives livrées vs planifiées

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story M3.4 initialisée après clôture M3.3 côté codebase local.
- Périmètre explicitement borné à l'hypercare opérationnel local/documentaire.

### Completion Notes List

- Story créée et prête pour démarrage d'implémentation.
- Dépendances, livrables et critères de succès explicités.

### File List

- `/_bmad-output/implementation-artifacts/m3-4-organiser-lhypercare-post-bascule.md`
