# Module de commandes Sokoni

Remplace les Cloud Functions (qui exigent l'offre Blaze). Les données restent dans Firestore,
utilisable sur l'offre gratuite Spark via l'Admin SDK.

| Action | Corps JSON | Qui |
| --- | --- | --- |
| `POST /createOrders` | `{ groups, commune, shipIndex, payMethod, address?, phone? }` | client connecté |
| `POST /updateOrderPayment` | `{ refs, payMethod, phone? }` | client connecté |
| `POST /updateOrderStatus` | `{ ref, status }` | admin (`node scripts/set-admin.cjs +243…`) |
| `GET /health` | | tout le monde |

L'app envoie son jeton Firebase dans `Authorization: Bearer <jeton>`.
Réponse : `{ data }` ou `{ error: { code, message } }`.

## Clé de compte de service

Console Firebase → Paramètres du projet → Comptes de service → « Générer une nouvelle clé privée ».
Ne jamais committer ce fichier ni l'envoyer dans l'app.

- En local : `GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json`
- Chez l'hébergeur : variable `FIREBASE_SERVICE_ACCOUNT` = contenu JSON de la clé (ou ce JSON en base64)

## Lancer

```bash
npm install
GOOGLE_APPLICATION_CREDENTIALS=/chemin/cle.json PORT=8080 npm start
```

- **Render / Railway / VPS** : racine `server`, commande `npm start`. URL de l'app : `https://<service>`.
- **Vercel** : racine `server`, les routes sont `api/[action].js`. URL de l'app : `https://<projet>.vercel.app/api`.

## Côté app

Définir `EXPO_PUBLIC_ORDERS_API_URL` (sans `/` final) :
- dev : fichier `.env` à la racine de l'app, puis relancer Metro ;
- APK : bloc `env` du profil dans `eas.json`.

Les règles de livraison, de prix par palier, de paiement et de statut viennent de `src/shared/` (racine de l'app).
`server/src/shared/` en est une copie générée : modifier `src/shared/*.ts`, puis lancer `npm run shared:sync` à la racine.
