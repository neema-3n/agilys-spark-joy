# Supabase Decommission Inventory

Date: 2026-03-03
Story: `m3-3-decommissionner-supabase-de-facon-controlee`
Statut: in-progress

## Synthese

Objectif: inventorier toutes les dependances Supabase runtime et leur remplacement cible.

## Matrice Surface -> Usage -> Remplacement -> Owner -> Statut

| Surface | Usage observe | Remplacement cible | Owner | Statut |
| --- | --- | --- | --- | --- |
| Frontend services (`src/services/api/*`) | Appels directs Supabase historiques | Client HTTP unifie vers NestJS | Plateforme FE | Migre (majoritaire) |
| Auth front (`src/pages/auth/InitTestUsers.tsx`) | Seed utilisateurs via function Supabase | `POST /auth/init-test-users` (NestJS) | Plateforme BE | Migre |
| Frontend legacy (`src/integrations/supabase/client.ts`) | Client SDK Supabase exporte | Module neutralise (runtime disabled) | Plateforme FE | Neutralise |
| Backend API (`backend/src/**`) | Logiques metier migrees | Modules NestJS proteges JWT + policy | Plateforme BE | Migre (en cours de hardening) |
| Edge Functions (`supabase/functions/*`) | Functions legacy encore presentes | Migration/retire infra apres validation finale | Plateforme/SRE | A faire |
| Webhooks Supabase | Documentation d'arret non finalisee | Webhooks/handlers cibles NestJS | Plateforme/SRE | A faire |
| Secrets (`SUPABASE_*`) | Nettoyage final non documente | Rotation/suppression apres fermeture M3.3 | SRE | A faire |
| CI/CD | Gate `test:supabase:runtime-gate` actif | Gate elargi + enforcement PR | Plateforme DevEx | En cours |

## Preuves techniques (local repo)

- Gate local execute: `pnpm run test:supabase:runtime-gate` -> PASS
- Client legacy neutralise: `src/integrations/supabase/client.ts`
- Story et sprint realignes: status `in-progress`

