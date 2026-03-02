# Runbook - Commande `pnpm dev` et surcharge des ports

## Objectif

Démarrer la stack locale complète avec une seule commande:

- PostgreSQL local via Docker Compose
- API NestJS
- Frontend Vite

## Prérequis

```bash
pnpm install
docker --version
docker compose version
```

## Variables de ports

Variables supportées:

- `WEB_PORT` (défaut: `8080`)
- `API_PORT` (défaut: `3001`)
- `DB_PORT` (défaut: `5432`)

Compatibilité Docker existante:

- `DB_PORT` est mappé vers `POSTGRES_PORT` pour le service PostgreSQL.

## Lancement standard

```bash
pnpm dev
```

Sortie attendue:

- Frontend: `http://localhost:8080`
- API: `http://localhost:3001`
- DB: `localhost:5432`

## Surcharge des ports

```bash
WEB_PORT=8181 API_PORT=3100 DB_PORT=55432 pnpm dev
```

Sortie attendue:

- Frontend: `http://localhost:8181`
- API: `http://localhost:3100`
- DB: `localhost:55432`

## Validation rapide sans démarrer les services

```bash
DEV_VALIDATE_ONLY=1 pnpm dev
```

La commande affiche les ports résolus et vérifie l'absence de conflit.

## Erreurs courantes

### Conflit de ports

Le script échoue si deux services partagent le même port:

```text
[dev] WEB_PORT, API_PORT et DB_PORT doivent etre distincts (...)
```

Corriger les variables puis relancer.

### Docker indisponible

Le script échoue si Docker n'est pas installé ou non démarré.

## Vérification automatisée

```bash
pnpm run test:dev-command
```

Ce test valide:

- les ports par défaut,
- la surcharge par variables d'environnement,
- la détection de conflits de ports.
