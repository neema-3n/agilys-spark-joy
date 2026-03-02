# Story 2.1 - Mettre en place l'auth NestJS JWT + refresh

Status: ready-for-dev
Epic: 2 - Gouvernance d'acces, roles et isolation multi-tenant
Story Key: 2-1-mettre-en-place-lauth-nestjs-jwt-refresh
Created: 2026-03-01

## User Story

As a utilisateur authentifie,  
I want me connecter et maintenir ma session de facon securisee,  
So that j'accede aux fonctionnalites selon mes droits.

## Acceptance Criteria

1. **Given** des identifiants valides  
   **When** l'utilisateur se connecte via l'API  
   **Then** un access token et un refresh token sont emis  
   **And** la session peut etre renouvelee sans re-authentification immediate.

## Scope Technique (MVP Story 2.1)

- Backend NestJS:
  - endpoint `POST /auth/login`
  - endpoint `POST /auth/refresh`
  - endpoint `POST /auth/logout` (invalidation refresh token)
- Persistence:
  - stockage securise des refresh tokens (hashes)
- Security:
  - expiration access token courte
  - rotation refresh token
  - journalisation minimale des evenements auth

## Out of Scope

- Interface frontend complete de migration auth (Story 2.4)
- RBAC fin sur tous les modules (Story 2.2)

## Definition of Done

- Endpoints auth operationnels en local
- Cas nominal login/refresh/logout testes
- Rejets valides (identifiants invalides / token invalide) verifies
- Documentation courte des routes et payloads
