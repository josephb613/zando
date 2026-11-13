#!/usr/bin/env node
/**
 * Donne (ou retire) le rôle admin à un compte Sokoni, identifié par son numéro de téléphone.
 * Le rôle admin ouvre l'action `updateOrderStatus` du module de commandes (server/) et l'écriture du catalogue (règles Firestore).
 *
 *   node scripts/set-admin.cjs +243970000000          donne le rôle
 *   node scripts/set-admin.cjs +243970000000 --remove retire le rôle
 *
 * Utilise la session de la CLI Firebase (`npx firebase-tools login`).
 * Le compte doit se reconnecter (ou attendre le rafraîchissement du jeton, 1 h max) pour que le rôle s'applique.
 */
const { PROJECT, accessToken, api } = require('./firebase-cli.cjs');

const IDENTITY = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`;

async function main() {
  const phone = process.argv[2];
  const remove = process.argv.includes('--remove');
  if (!phone || !/^\+\d{8,15}$/.test(phone)) throw new Error('Usage : node scripts/set-admin.cjs +243XXXXXXXXX [--remove]');

  const token = await accessToken();
  const found = await api(token, 'POST', `${IDENTITY}:lookup`, { phoneNumber: [phone] });
  const user = (found.users || [])[0];
  if (!user) throw new Error(`Aucun compte avec le numéro ${phone} : connectez-vous une fois dans l'app.`);

  const claims = user.customAttributes ? JSON.parse(user.customAttributes) : {};
  if (remove) delete claims.admin; else claims.admin = true;
  await api(token, 'POST', `${IDENTITY}:update`, { localId: user.localId, customAttributes: JSON.stringify(claims) });
  console.log(`${phone} (${user.localId}) : rôle admin ${remove ? 'retiré' : 'donné'}.`);
}

main().catch(e => { console.error('ERREUR', e.message); process.exit(1); });
