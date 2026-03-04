# M3.4 Hypercare Dashboard Template

## 1) Fenetre hypercare et couverture

- Periode cible: J0 a J+30 apres bascule.
- Horaires de couverture:
  - J0 a J+7: 08:00-22:00 (7/7)
  - J+8 a J+30: 08:00-20:00 (lundi-samedi)
- Astreinte:
  - Rotation primaire: Incident Commander (quotidienne)
  - Rotation secondaire: owner backend, owner frontend, owner data
- Canal principal: `#hypercare-war-room`
- Canal escalation: `#exec-escalade`

## 2) RACI

| Role | Nom | Responsabilite |
| --- | --- | --- |
| Incident Commander | A designer | Pilotage incident, triage, priorisation |
| owner backend | A designer | API/NestJS, mitigation backend |
| owner frontend | A designer | parcours critiques, erreurs frontend |
| owner data | A designer | data quality, reconciliation |
| PM | A designer | communication interne, suivi risques |

## 3) Criteres d entree et de sortie

### criteres d entree

- Bascule technique declaree GO.
- Monitoring actif sur auth, API, parcours critiques.
- Register incident initialise.
- Astreinte et rotations confirmees.

### criteres de sortie

- 10 jours consecutifs sans incident P1.
- MTTR P1/P2 <= objectif hebdomadaire valide.
- Taux de succes parcours critiques >= 99.5% sur 7 jours.
- Toutes actions correctives critiques cloturees ou planifiees avec ETA approuve.
- transfert en run standard valide en comite de sortie.

## 4) Standup hypercare quotidien

### Standup hypercare quotidien (15 min)

1. incidents ouverts/fermes 24h
2. risques majeurs et blocages
3. actions du jour (owner + ETA)
4. escalade necessaire (oui/non)

## 5) Dashboard local de sante

## KPI operationnels

- incidents P1/P2 ouverts et fermes par jour
- MTTD
- MTTR
- succes auth (%)
- succes API (%)
- succes parcours critiques (%)
- erreurs frontend (count et top 3 signatures)
- actions correctives livrees vs planifiees

## Seuils d alerte

- auth success < 99.0% (15 min): alerte P2
- API error rate > 2.0% (15 min): alerte P2
- parcours critiques success < 98.5% (15 min): alerte P1
- erreurs frontend > 20/min sur route critique: alerte P2

## Rituels

- point "Meteo service" 2 fois/jour
- revue incidents en fin de journee
- revue hebdomadaire causes racines (vendredi)

## Escalade

- Niveau 1: Incident Commander
- Niveau 2: owner backend + owner frontend + owner data
- Niveau 3: PM + management exec

Regle d escalation:
- P1: escalation immediate (< 5 min)
- P2: escalation si non mitige en 30 min
