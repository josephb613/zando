This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm run lint                # lint the whole repo (app, scripts, server), zero warnings
npm run typecheck           # tsc --noEmit
npm run shared:check        # server/src/shared/ is up to date with src/shared/
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint, typecheck and shared:check before declaring any task done.

## Navigation & Routing

- **Current implementation: React Navigation** (`@react-navigation/native`, `native-stack`, `bottom-tabs`).
  - The root stack and tabs are declared in `App.tsx`.
  - Route names and params are typed in `src/nav.ts` (`RootParams`).
  - Screens live in `src/screens/`; shared screen pieces use the `*.parts.tsx` suffix.
  - Use `useNav()` for typed navigation; tab screens take their params through `TabParams` (`navigate('Tabs', { screen, params })`).
  - `useRequireAuth()` / `useOpenProduct()` gate product pages and the wholesale tab for visitors in production; `useFinishLogin()` resumes the `next` destination after sign-in.
- **Do not introduce a second navigation system.** New screens must be added to `RootParams`, `App.tsx`, and `src/screens/index.ts`.
- **Target for a future migration: Expo Router.** If the migration is scheduled, move routes to `src/app/`, add `_layout.tsx` files, and replace `useNav()` with `Link`, `router`, and `useLocalSearchParams`. Keep non-route code outside `src/app/`. Docs: https://docs.expo.dev/router/introduction.md
- Until the migration is done, `AGENTS.md` and the codebase intentionally use React Navigation; do not mix the two.

## Code partagé

- `src/shared/` : règles métier communes à l'app et au module de commandes `server/` (livraison, prix par palier, paiements, statuts). Aucun import React Native ici. Après modification : `npm run shared:sync` (génère `server/src/shared/`, ne jamais l'éditer à la main) ; `npm run shared:check` vérifie la copie.
- `src/ui/` : composants réutilisables (animations, en-tête, feuille du bas, formes, carte produit `ProductCard`). `src/icons.tsx` : icônes communes. Un écran n'importe jamais les pièces d'un autre écran ; les fichiers `*.parts.tsx` ne servent qu'à leur écran.
- Couleurs : toujours via `C` (`src/theme.tsx`) ; ajouter un jeton plutôt qu'un code hexadécimal répété.
- `src/store.tsx` : état de l'app en fournisseurs séparés (`useAuth`, `useCatalog`, `useHistory`, `useAddresses`, `useCart`, `useOrders`). Le panier n'enregistre que `{ k, variant, qty, selected }` : nom, photo, provenance et prix sont relus dans le catalogue. La commune de livraison est celle de l'adresse choisie, sinon la zone du profil.
- Aucune donnée inventée à l'écran : avis, stocks, délais, minuteurs, livreurs ou bons doivent venir de Firestore ou du serveur. Une fonction sans donnée ni service derrière n'est pas affichée.

## Scripts d'administration (`scripts/`, session `npx firebase-tools login`)

- `node scripts/order-status.cjs SK-XXXXXX [statut]` : lit ou change le statut d'une commande (suivi en direct dans l'app).
- `node scripts/set-admin.cjs +243… [--remove]` : rôle admin (action `updateOrderStatus` du serveur, écriture du catalogue).
- `node scripts/import-pinduoduo.cjs [--dry-run]` : remplace le catalogue par `archive/pinduoduo/products.json`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
