/**
 * Accès Firebase côté serveur (Admin SDK) : Firestore et vérification des jetons de connexion.
 * Fonctionne sur l'offre gratuite Spark : seules les Cloud Functions exigent Blaze.
 *
 * Identifiants, au choix :
 *   FIREBASE_SERVICE_ACCOUNT            contenu JSON de la clé de compte de service (ou ce JSON encodé en base64)
 *   GOOGLE_APPLICATION_CREDENTIALS      chemin vers le fichier de clé (pratique en local)
 */
const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

/** Lit la clé : JSON brut (éventuellement entouré de guillemets) ou JSON encodé en base64. */
function parseServiceAccount(raw) {
  let value = raw.trim();
  if (/^(['"]).*\1$/s.test(value) && value.length > 1) value = value.slice(1, -1).trim();
  if (!value.startsWith('{')) {
    const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{')) value = decoded;
  }
  if (!value.startsWith('{')) {
    // Ne jamais journaliser la clé : seulement sa longueur et la nature du premier caractère.
    const first = value[0] || '';
    const hint = /[A-Za-z0-9\-_"'{}\[\]]/.test(first) ? `« ${first} »` : `code ${first.charCodeAt(0) || 0}`;
    throw new Error(`FIREBASE_SERVICE_ACCOUNT invalide : le contenu du fichier JSON est attendu (longueur ${value.length}, commence par ${hint}).`);
  }
  const account = JSON.parse(value);
  if (!account.private_key || !account.client_email) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT incomplet : private_key ou client_email manquant.');
  }
  return account;
}

function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return applicationDefault();
  return cert(parseServiceAccount(raw));
}

function app() {
  return getApps()[0] || initializeApp({ credential: credential() });
}

const db = () => getFirestore(app());

/** Vérifie le jeton envoyé par l'app et renvoie ses informations (uid, rôle admin…), ou `null`. */
async function verifyToken(token) {
  if (!token) return null;
  try {
    return await getAuth(app()).verifyIdToken(token);
  } catch {
    return null;
  }
}

module.exports = { db, verifyToken, parseServiceAccount };
