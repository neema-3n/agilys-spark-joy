# Instructions & Guidelines — Lovable (TypeScript + React)

## 1. Coding Style
- Utiliser **TypeScript partout** (pas de `any` non justifié).
- Utiliser `const` par défaut, `let` si nécessaire.
- Noms explicites (camelCase pour variables/fonctions, PascalCase pour composants).
- Toujours déstructurer les props.
- Aucun code mort, aucune duplication.

## 2. React Best Practices
- Composants **fonctionnels** uniquement.
- Composants courts, simples, orientés UI, 1 seule responsabilité.
- Extraire toute logique dans :
  - `hooks/` → custom hooks
  - `lib/` ou `services/` → logique métier
- Utiliser `useState` et `useEffect` correctement :
  - éviter les effets inutiles
  - dépendances propres dans les hooks
- Préférer **composition** à l’héritage.
- Pas de logique complexe dans les JSX : tout dans des fonctions.

## 3. TypeScript Rules
- Typage strict (`strict: true`).
- Pas de `any`, `unknown` préféré si besoin.
- Typage des props systématique :
  ```ts
  interface MyComponentProps {
    title: string;
    count?: number;
  }
  ```
- Utiliser `type` pour les unions, `interface` pour les objets.
- Préférer les types dérivés (`ReturnType`, `Pick`, `Omit`, etc.).

## 4. UI/UX & Styling
- Utiliser Tailwind ou CSS modules selon projet.
- Classes propres, pas de styles inline sauf exception.
- UI minimaliste, lisible, moderne.
- Boutons, inputs, formulaires → cohérents et réutilisables.
- Responsiveness obligatoire (mobile-first).

## 5. API / State Management
- Pour les appels API :
  - utiliser `fetch` ou un wrapper dans `lib/api.ts`.
  - gérer loading + error states.
- Ne jamais mettre un appel API directement dans un composant lourd.
- Utiliser `React Query` si le projet l’utilise (sinon hooks maison).

## 6. File Structure

```
src/
  components/
    ComponentName/
      index.ts
      ComponentName.tsx
      ComponentName.test.tsx
      ComponentName.css
  hooks/
  lib/
  context/
  pages/ or routes/
  assets/
```

## 7. Testing
- Tests unitaires pour toute logique critique.
- Tests React → `@testing-library/react`.
- Noms de tests clairs et expressifs.

## 8. General Assistant Behavior
- Répondre dans la langue du message.
- Proposer toujours un code **propre, structuré, idiomatique**.
- Fournir les explications seulement si demandé.
- Toujours utiliser le style React + TS moderne (ES2023).
- Respecter le ton Lovable : **clair, simple, efficace**.
