## Website Archive

This directory contains the public AGILYS website code that was removed from the active app runtime.

Current intent:
- the main repo is now app-first;
- `/` redirects to `/auth/login`;
- the files here are preserved for a future extraction into a dedicated `agilys-web` repository.

Archived website scope:
- `src/pages/Index.tsx`
- `src/components/Header.tsx`
- `src/components/Hero.tsx`
- `src/components/Features.tsx`
- `src/components/Modules.tsx`
- `src/components/Dashboard.tsx`
- `src/components/CTA.tsx`
- `src/components/Footer.tsx`
- `src/assets/dashboard-preview.jpg`
- `src/assets/hero-background.jpg`

Notes for future extraction:
- keep the `src/` structure when moving to a standalone repo;
- recreate the Vite/React app shell around this folder;
- re-establish path aliasing for `@/`;
- connect the new repo to `agilys.com` when Vercel access is available.
