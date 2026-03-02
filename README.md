# AGILYS - Plateforme de Gestion Budgétaire et Comptable

Application de gestion budgétaire pour collectivités locales africaines, développée en mode agile sur 7 sprints.

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
pnpm install

# Lancement en mode développement
pnpm dev

# Accès à l'application
http://localhost:8080
```

### Commande dev unique + ports personnalisables (Story CC-01.05)

`pnpm dev` démarre la stack locale complète:
- PostgreSQL (Docker Compose)
- API NestJS
- Frontend Vite

Variables supportées (sans modifier le code):

```bash
WEB_PORT=8080
API_PORT=3001
DB_PORT=5432
```

Exemple de surcharge:

```bash
WEB_PORT=8181 API_PORT=3100 DB_PORT=55432 pnpm dev
```

Runbook détaillé: `docs/runbooks/local-dev-command-and-ports.md`

## 🔐 Configuration Auth Frontend (Story 2.4)

Le frontend d'authentification utilise maintenant l'API NestJS (`/auth/login`, `/auth/refresh`, `/auth/logout`) avec stockage local des tokens.

Variables frontend (fichier `.env`) :

```bash
VITE_API_BASE_URL="http://localhost:3001"
```

Notes:
- Si `VITE_API_BASE_URL` est absent, le client frontend utilise des chemins relatifs (`/auth/*`) vers le même host.
- Les variables `AUTH_TEST_USER_EMAIL` et `AUTH_TEST_USER_PASSWORD` se configurent côté backend (voir `backend/README.md`).
- Si le frontend tourne sur un port différent de l'API (`localhost:8082` par exemple), définir `CORS_ORIGINS` côté backend (ex: `CORS_ORIGINS=http://localhost:8080,http://localhost:8082`).
- Le backend auth utilise PostgreSQL local par défaut (`AUTH_STORAGE_MODE=postgres`). Pour les tests backend rapides, basculer en `AUTH_STORAGE_MODE=memory`.

## 🐘 PostgreSQL Local via Docker (Story CC-01.02)

La base locale PostgreSQL est fournie via `docker compose` (pas d'installation SGBD native).

Initialisation variables locales:

```bash
cp .env.example .env
```

```bash
docker compose up -d postgres
docker compose ps postgres
docker compose down
```

Si `5432` est deja pris localement:

```bash
POSTGRES_PORT=55432 docker compose up -d postgres
```

Runbook complet:
- `docs/runbooks/postgresql-local-docker.md`
- verification smoke: `./scripts/verify-postgres-local.sh`

### Migrations DB versionnees (Story CC-01.03)

```bash
pnpm run db:migrate
pnpm run db:reset
pnpm run db:seed
```

Validation bout-en-bout:

```bash
pnpm run db:verify
```

Import donnees Supabase vers local (schema `public`, data-only):

```bash
pnpm run db:import:remote
```

Mettre a jour le dataset seed depuis l'etat local courant:

```bash
pnpm run db:snapshot:local
```

## 🧪 Comptes de Test (Phase 0 - Mock Authentication)

### Super Admin
- **Email:** `super@agilys.com`
- **Password:** `super123`
- **Rôles:** super_admin
- **Accès:** Tous les clients, toutes les fonctionnalités

### Admin Client (Commune Porto-Novo)
- **Email:** `admin@portonovo.bj`
- **Password:** `admin123`
- **Rôles:** admin_client, directeur_financier
- **Accès:** Gestion complète du client Porto-Novo

### Directeur Financier
- **Email:** `directeur@portonovo.bj`
- **Password:** `directeur123`
- **Rôles:** directeur_financier
- **Accès:** Validation budgets et engagements

### Comptable
- **Email:** `comptable@portonovo.bj`
- **Password:** `comptable123`
- **Rôles:** comptable
- **Accès:** Saisie factures et paiements

## 📋 Fonctionnalités Actuelles (Sprint 1)

### ✅ Landing Page
- Présentation des fonctionnalités
- Navigation responsive
- Mode sombre/clair
- Lien vers connexion

### ✅ Authentification Mock
- Login avec validation Zod
- Interface d'inscription (UI ready)
- Gestion des rôles et permissions
- Redirection automatique

### ✅ Dashboard
- 4 KPIs statistiques
- Graphique d'exécution budgétaire (Recharts)
- Liste des derniers engagements
- Design responsive

### ✅ Navigation
- Sidebar collapsible
- Sélecteur client (super_admin)
- Sélecteur exercice
- Menu mobile

## 🏗️ Architecture Frontend

```
src/
├── components/
│   ├── ui/              # Composants shadcn
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── stats-card.tsx  # Composant KPI réutilisable
│   │   └── ...
│   ├── Header.tsx       # Header avec theme toggle
│   ├── ProtectedRoute.tsx
│   └── RoleGuard.tsx
├── contexts/
│   ├── AuthContext.tsx
│   ├── ClientContext.tsx
│   └── ExerciceContext.tsx
├── pages/
│   ├── auth/
│   │   └── Login.tsx    # Login + Signup UI
│   ├── app/
│   │   ├── AppLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Budgets.tsx
│   │   ├── Engagements.tsx
│   │   ├── Factures.tsx
│   │   ├── Tresorerie.tsx
│   │   ├── Reporting.tsx
│   │   └── Parametres.tsx
│   └── Index.tsx        # Landing page
├── services/
│   ├── api/
│   │   ├── auth.service.ts
│   │   └── clients.service.ts
│   └── mockData/
│       ├── users.mock.ts
│       ├── clients.mock.ts
│       ├── exercices.mock.ts
│       └── engagements.mock.ts
└── types/
    └── index.ts         # Types TypeScript
```

## 📡 Structure Backend Attendue (Sprint 2)

Le frontend est prêt à se connecter à une API REST. Endpoints attendus :

### Authentification
```
POST   /auth/login
POST   /auth/register
POST   /auth/logout
POST   /auth/refresh
```

### Clients
```
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id
```

### Exercices
```
GET    /api/exercices?clientId=xxx
GET    /api/exercices/:id
POST   /api/exercices
PUT    /api/exercices/:id
```

### Budgets
```
GET    /api/budgets?exerciceId=xxx
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

## 🛠️ Technologies

- **React 18** - Library UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Composants UI
- **React Router** - Navigation
- **Recharts** - Graphiques
- **Zod** - Validation
- **next-themes** - Dark mode

## 📦 Scripts PNPM

```bash
pnpm dev             # Demarrage stack locale (DB + API + Front)
pnpm run dev:frontend # Frontend seul (Vite)
pnpm run dev:backend  # API seule (NestJS)
pnpm run build       # Build production
pnpm run preview     # Preview du build
pnpm run lint        # Linter ESLint
pnpm run test:dev-command # Verification des ports et de la commande dev
pnpm run db:migrate  # Appliquer les migrations versionnees
pnpm run db:reset    # Reset DB local + rejeu migrations (destructif)
pnpm run db:seed     # Peupler donnees de base rejouables
pnpm run db:verify   # Verification complete migrate/reset/seed
pnpm run db:import:remote # Import donnees Supabase (public) vers local
pnpm run db:snapshot:local # Sauver l'etat local comme dataset de seed
```

## 🎨 Design System

Le projet utilise un design system basé sur des tokens CSS :
- Couleurs HSL pour dark/light mode
- Gradients personnalisés
- Shadows avec glow effects
- Transitions smooth

Voir `src/index.css` et `tailwind.config.ts` pour la configuration.

## 📅 Roadmap

- **Sprint 1** ✅ Landing + Auth UI + Dashboard
- **Sprint 2** 🔄 Backend (Supabase) + Auth réelle
- **Sprint 3** 📊 Module Budgets complet
- **Sprint 4** 💼 Module Engagements
- **Sprint 5** 🧾 Module Factures
- **Sprint 6** 💰 Module Trésorerie
- **Sprint 7** 📈 Reporting + Exports

## 🤝 Contribution

Projet développé en méthodologie Agile avec Lovable AI.

---

## Project info

**URL**: https://lovable.dev/projects/f6e6f81d-8c38-4e2b-8103-d73eccc9b765

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/f6e6f81d-8c38-4e2b-8103-d73eccc9b765) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirements are having Node.js and pnpm installed - [install Node with nvm](https://github.com/nvm-sh/nvm#installing-and-updating), then enable Corepack to use the project-pinned pnpm version.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Enable Corepack and use the pinned pnpm version.
corepack enable
corepack use pnpm@9.12.0

# Step 4: Install the necessary dependencies.
pnpm install

# Step 5: Start the development server with auto-reloading and an instant preview.
pnpm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

---

**AGILYS** - Solution de gestion budgétaire pour l'Afrique 🌍
