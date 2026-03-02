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

- `PORT` (default: `3001`)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL_SECONDS` (default: `900`)
- `JWT_REFRESH_TTL_SECONDS` (default: `604800`)
- `AUTH_TEST_USER_EMAIL` (default: `user@agilys.local`)
- `AUTH_TEST_USER_PASSWORD` (default: `ChangeMe123!`)
