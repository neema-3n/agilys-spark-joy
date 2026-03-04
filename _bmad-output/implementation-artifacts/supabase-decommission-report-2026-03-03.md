# Supabase Decommission Report

Date: 2026-03-03
Story: `m3-3-decommissionner-supabase-de-facon-controlee`
Decision: NO-GO (cloture)
Statut story: in-progress

## Executive Summary

Le runtime Supabase sur les surfaces applicatives actives est fortement reduit et controle par gate automatise.
La story ne peut pas etre marquee `done` tant que les volets infra (Edge Functions, webhooks, secrets, storage) ne sont pas explicitement decommissionnes et traces.

## Controles executes

1. Gate statique zero-runtime:
   - Commande: `pnpm run test:supabase:runtime-gate`
   - Resultat: PASS
2. Verification documentaire:
   - Story status/sprint status realignes sur `in-progress`
   - Inventaire decommission present
3. Verification code legacy:
   - `src/integrations/supabase/client.ts` neutralise (runtime disabled)

## Ecarts ouverts bloquants

1. Edge Functions Supabase encore presentes dans `supabase/functions/*`.
2. Arret webhooks Supabase non documente.
3. Nettoyage/rotation secrets `SUPABASE_*` non finalise.
4. Validation finale storage non tracee.

## Plan de cloture recommande

1. Finaliser migration/remplacement des flux dependants d'Edge Functions.
2. Executer et tracer les operations d'extinction infra Supabase (avec validation humaine explicite).
3. Mettre a jour story + sprint status + matrice de parite dans le meme lot.
4. Rejouer gate et smoke tests post-extinction, puis seulement basculer en `done`.

