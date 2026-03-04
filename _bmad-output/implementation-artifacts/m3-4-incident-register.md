# M3.4 Incident Register

## Runbook checklist P1/P2

### P1 checklist

1. Declarer incident et ouvrir war room
2. Poser hypothese de diagnostic initiale
3. Appliquer mitigation immediate
4. Evaluer rollback partiel si necessaire
5. Confirmer stabilisation et communiquer statut
6. Ouvrir action corrective avec proprietaire et ETA

### P2 checklist

1. Qualifier impact et scope
2. Diagnostiquer source probable
3. Mitiger avec owner technique
4. Verifier regression sur parcours critiques
5. Planifier action corrective et suivi

## Registre incidents/actions correctives

| ID | Severite | Service | Date/Heure detection | Temps de detection | Temps de mitigation | Temps de resolution | Statut | Action corrective | Proprietaire | ETA | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INC-2026-03-03-001 | P2 | API budget | 2026-03-03 09:12 | 4 min | 18 min | 42 min | Ferme | Retry idempotent + guard timeout | Jean Mbarga | 2026-03-05 | Incident post-cutover |
| INC-2026-03-03-002 | P1 | Auth | 2026-03-03 14:08 | 2 min | 9 min | 26 min | Ferme | Hardening refresh flow | Jean Mbarga | 2026-03-04 | Escalade exec faite |

## Regle de communication interne

- P1:
  - T0: annonce initiale en moins de 5 min
  - Updates: toutes les 15 min
  - Cloture: bilan causes, impact, mitigation, actions
- P2:
  - T0: annonce initiale en moins de 15 min
  - Updates: toutes les 30 min
  - Cloture: bilan synthese et suivi

Format message communication interne:

1. Incident ID + severite
2. Impact business/utilisateur
3. Hypothese en cours
4. Action de mitigation
5. ETA prochaine mise a jour
