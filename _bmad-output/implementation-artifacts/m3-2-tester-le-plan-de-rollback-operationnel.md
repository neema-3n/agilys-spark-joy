# Story M3.2: Tester le plan de rollback operationnel

Status: backlog

## Story

As a SRE/Ops,  
I want un rollback teste en conditions proches prod,  
so that un echec cutover reste recuperable rapidement.

## Acceptance Criteria

1. **Rollback executable en staging**
   - **Given** un scenario d'echec de bascule simule
   - **When** la procedure de rollback est lancee
   - **Then** le retour a l'etat precedent est execute sans ambiguite
   - **And** toutes les etapes critiques sont tracees avec owner et preuve

2. **Objectifs RTO/RPO mesures**
   - **Given** une execution complete de rollback
   - **When** la mesure post-execution est consolidee
   - **Then** les valeurs RTO/RPO observees sont documentees
   - **And** toute deviation par rapport aux objectifs est explicitee

## Procedure detaillee de rollback (reference M3.1)

### Preconditions de declenchement

- Decision `No-Go` officialisee dans le journal de decision cutover.
- Incident commander actif et canal incident ouvert.
- Snapshot pre-cutover disponible et verifie.
- Equipe minimale disponible: Release Manager, SRE/Ops, Lead Backend, Lead Data.

### Objectifs operatoires

- RTO cible: <= 30 minutes.
- RPO cible: <= 5 minutes.

### Timeline rollback (T+0 a T+45)

| Temps | Etape | Owner | Action | Preuve attendue | Critere de succes |
|---|---|---|---|---|---|
| T+0 | Declaration rollback | Release Manager | Annoncer rollback + geler changements | Message horodate canal incident | Decision partagee a tous |
| T+5 | Isolation trafic cible | SRE/Ops | Couper routage vers stack cible | Logs routing/load balancer | Plus de trafic vers cible |
| T+10 | Restauration service precedent | SRE/Ops + Backend | Re-activer endpoints stack precedente | Healthchecks stack precedente verts | API precedente rejointe |
| T+15 | Restauration data | Lead Data | Restaurer snapshot/point de restauration valide | ID restore + checksum + journal DB | Coherence data restauree |
| T+25 | Verification API/auth | Lead Backend | Lancer smoke auth + endpoints critiques | Rapport smoke horodate | 100% checks critiques pass |
| T+35 | Verification metier | Support + Business | Executer parcours metiers prioritaires | Compte-rendu de validation metier | 0 blocage critique |
| T+45 | Cloture rollback | Release Manager | Statuer rollback reussi/partiel/echec | PV de rollback signe | Systeme stabilise |

### Criteres de succes rollback

- API et auth fonctionnels sur l'etat precedent.
- Coherence data critique validee sans anomalie bloquante.
- Parcours metiers prioritaires executes sans blocage critique.
- Journal de decision et preuves completes archives.

### Communication standard

- Message debut rollback:
  - `Rollback M3.2 declenche a <heure UTC>. Objectif retour nominal <= 30 min.`
- Message progression:
  - `Rollback en cours: etape <n>/<N> terminee. Prochain point a <heure UTC>.`
- Message cloture:
  - `Rollback termine a <heure UTC>. Statut: <reussi/partiel/echec>.`

### Preuves minimales a archiver

- Journal horodate des etapes rollback.
- Extraits logs routage/infra (avant/apres).
- Rapport smoke API/auth.
- Rapport verification metier.
- Mesure RTO/RPO et ecarts.
- PV de decision finale.
