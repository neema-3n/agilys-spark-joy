# Migration Report - Lot B (Example)

- Date: 2026-03-03
- migration_batch_id: `lot-b-client-demo-20260303103045-a1b2c3d4`
- Source: `backend/.data/budget-referentiels.test.json`
- Status: `success`

## Volumes

- Inserts: 148
- Updates: 12
- Rejects: 0
- Retries: 1
- Errors: 0
- Duration (ms): 1842

## Sous-lots

| Domaine | Watermark | Status | Inserts | Updates | Rejects | Retries |
|---|---|---|---:|---:|---:|---:|
| exercices | exercices:1/1 | success | 1 | 0 | 0 | 0 |
| enveloppes | enveloppes:1/1 | success | 6 | 0 | 0 | 0 |
| sections | sections:1/2 | success | 10 | 0 | 0 | 0 |
| sections | sections:2/2 | success | 8 | 0 | 0 | 0 |
| programmes | programmes:1/2 | success | 22 | 4 | 0 | 0 |
| actions | actions:1/3 | success | 40 | 8 | 0 | 1 |
| allocations | allocations:1/2 | success | 30 | 0 | 0 | 0 |
| decisionVersions | decisionVersions:1/2 | success | 31 | 0 | 0 | 0 |

## Anomalies

Aucune anomalie bloquante. Les anomalies non bloquantes sont journalisees dans `migration_batch_sub_lots.anomalies`.

## Validation idempotence

- Rerun avec meme `migration_batch_id`: aucun doublon cree.
- Cardinalite stable: OK.
- Reprise apres echec d'un sous-lot: uniquement les sous-lots `failed` relances.
