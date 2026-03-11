# Auth API (Story 2.1)

## Routes

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Payloads

### `POST /auth/login`

Request:

```json
{
  "email": "user@agilys.local",
  "password": "ChangeMe123!"
}
```

Success `201`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Error `401` (identifiants invalides):

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

### `POST /auth/refresh`

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Success `201`:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<new-jwt>"
}
```

Errors:
- `401` token invalide/signature invalide/expiré
- `403` token révoqué ou mismatch hash

### `POST /auth/logout`

Request:

```json
{
  "refreshToken": "<jwt>"
}
```

Success `204`.

Errors:
- `401` token invalide

## Variables d'environnement

- `APP_ENV` (`development`, `preview`, `staging`, `production`; default runtime fallback: `development`)
- `PORT` (default: `3001`)
- `AUTH_STORAGE_MODE` (`postgres` par defaut, `memory` pour tests locaux rapides)
- `JWT_ACCESS_SECRET` (required)
- `JWT_REFRESH_SECRET` (required)
- `JWT_ACCESS_TTL_SECONDS` (default: `900`)
- `JWT_REFRESH_TTL_SECONDS` (default: `604800`)
- `AUTH_TEST_USER_EMAIL` (default: `user@agilys.local`)
- `AUTH_TEST_USER_PASSWORD` (default: `ChangeMe123!`)
- `POSTGRES_HOST` (default: `127.0.0.1`)
- `POSTGRES_PORT` (default: `5432`)
- `POSTGRES_DB` (default: `agilys`)
- `POSTGRES_USER` (default: `agilys_app`)
- `POSTGRES_PASSWORD` (default: `change-me-local-only`)

## Correspondance non-production

Le backend suit la meme convention que le frontend:

- `preview` -> `APP_ENV=preview`
- `staging` -> `APP_ENV=staging`
- `production` -> `APP_ENV=production`

Si le backend est pilote par deploy hooks GitHub Actions, utiliser:

- `BACKEND_PREVIEW_DEPLOY_HOOK_URL`
- `BACKEND_STAGING_DEPLOY_HOOK_URL`
- `BACKEND_PRODUCTION_DEPLOY_HOOK_URL`

Le repo ne fixe pas encore le provider backend definitif. Les workflows frontend peuvent donc declencher un hook backend sans imposer de blueprint IaC.

## Prerequis PostgreSQL pour les refresh tokens persistants (Story 2.5)

Avant de lancer l'API en mode `AUTH_STORAGE_MODE=postgres`, appliquer les migrations SQL:

```bash
pnpm run db:migrate
```

La migration cree la table `public.auth_refresh_tokens` (hash du refresh token, `jti`, expiration/revocation) et ses index.
Sans cette migration, l'API retournera une erreur explicite demandant d'executer `db:migrate`.
