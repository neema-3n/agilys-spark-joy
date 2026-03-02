# Checklist decommission Supabase Auth

## Lot 2.4 - Migration frontend auth vers NestJS

- [x] Le flux `login` frontend n'utilise plus `supabase.auth.signInWithPassword`.
- [x] Le flux `logout` frontend appelle `POST /auth/logout` (best effort), puis nettoie la session locale.
- [x] Le stockage token est centralise dans un module unique (`src/services/auth/token-storage.ts`).
- [x] La source de verite de session est centralisee dans `AuthContext` via API auth locale.
- [x] Le mecanisme refresh est centralise (single-flight + replay unique apres 401).
- [x] Les redirections protected route conservent `state.from`.
- [x] Les hints de comptes login sont alignes avec le backend NestJS auth.
- [ ] Les autres appels metier front migrent de Supabase vers API backend (hors scope de la story 2.4).
- [ ] Suppression du package `@supabase/supabase-js` une fois tous les modules migres.
