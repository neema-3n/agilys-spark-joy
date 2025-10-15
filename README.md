# AGILYS - Plateforme de Gestion Budgétaire et Comptable

Application de gestion budgétaire pour collectivités locales africaines, développée en mode agile sur 7 sprints.

## 🚀 Démarrage Rapide

```bash
# Installation des dépendances
npm install

# Lancement en mode développement
npm run dev

# Accès à l'application
http://localhost:8080
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
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me
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

## 📦 Scripts NPM

```bash
npm run dev        # Démarrage serveur de développement
npm run build      # Build production
npm run preview    # Preview du build
npm run lint       # Linter ESLint
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

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
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
