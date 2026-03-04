# Supabase Decommission Report

Date: 2026-03-03
Story: `m3-3-decommissionner-supabase-de-facon-controlee`
Decision: GO (scope M3.3 sans action cloud)
Statut story: done

## Executive Summary

Le runtime Supabase sur les surfaces applicatives actives est fortement reduit et controle par gate automatise.
La cloture M3.3 est evaluee sur le retrait runtime applicatif et la traçabilite documentaire, avec politique explicite de non-intervention cloud Supabase.

## Controles executes

1. Gate statique zero-runtime:
   - Commande: `pnpm run test:supabase:runtime-gate`
   - Resultat: PASS
2. Verification documentaire:
   - Story status/sprint status realignes sur `in-progress`
   - Inventaire decommission present
3. Verification code legacy:
   - `src/integrations/supabase/client.ts` neutralise (runtime disabled)

## Ecarts ouverts (hors scope cloud accepte)

1. Edge Functions Supabase encore presentes dans `supabase/functions/*` (non supprimees par politique cloud freeze).
2. Arret webhooks Supabase non documente cote dashboard (verification manuelle reportee).
3. Nettoyage/rotation secrets `SUPABASE_*` non finalise cote cloud (reporte).
4. Validation finale storage non tracee cote cloud (reportee).

## Plan de cloture recommande (sans toucher le cloud)

1. Finaliser et maintenir le gate `zero runtime Supabase` sur les surfaces actives.
2. Conserver un inventaire cloud read-only horodate (sans action destructive).
3. Mettre a jour story + sprint status + matrice de parite avec mention explicite "cloud freeze".
4. Planifier un lot futur distinct si une decommission cloud est un jour autorisee.
