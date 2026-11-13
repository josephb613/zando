/**
 * Accès au projet Firebase pour les scripts d'administration de ce dossier, avec la session de la CLI
 * (`npx firebase-tools login`) : droits du propriétaire du projet, règles de sécurité contournées.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PROJECT = 'sokoni-5c824';
const DOCS = `projects/${PROJECT}/databases/(default)/documents`;

function findFirebaseTools() {
  const cands = [];
  try { cands.push(path.join(cp.execSync('npm root -g', { encoding: 'utf8' }).trim(), 'firebase-tools')); } catch {}
  const npx = path.join(process.env.HOME || '', '.npm', '_npx');
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) cands.push(path.join(npx, d, 'node_modules', 'firebase-tools'));
  const hit = cands.find(c => fs.existsSync(path.join(c, 'lib', 'auth.js')));
  if (!hit) throw new Error('firebase-tools introuvable : lancez `npx firebase-tools --version` puis réessayez.');
  return hit;
}

/** Jeton d'accès Google de la session CLI. */
async function accessToken() {
  const auth = require(path.join(findFirebaseTools(), 'lib', 'auth'));
  const acct = auth.getGlobalDefaultAccount();
  if (!acct) throw new Error('Aucun compte connecté : lancez `npx firebase-tools login`.');
  const t = await auth.getAccessToken(acct.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  return t.access_token || t;
}

/**
 * Appel REST authentifié ; `url` est relative à l'API Firestore v1, ou absolue (Identity Toolkit),
 * auquel cas le projet est indiqué comme projet de facturation de l'appel.
 */
async function api(token, method, url, body) {
  const absolute = /^https:/.test(url);
  const r = await fetch(absolute ? url : 'https://firestore.googleapis.com/v1/' + url, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(absolute ? { 'x-goog-user-project': PROJECT } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${JSON.stringify(j.error || j).slice(0, 300)}`);
  return j;
}

/** Valeur JS -> valeur Firestore (REST). Firestore refuse les tableaux imbriqués. */
const val = v => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) {
    if (v.some(Array.isArray)) throw new Error('Firestore refuse les tableaux imbriqués : ' + JSON.stringify(v));
    return { arrayValue: { values: v.map(val) } };
  }
  return { mapValue: { fields: fields(v) } };
};
const fields = o => Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined && x !== null).map(([k, x]) => [k, val(x)]));

module.exports = { PROJECT, DOCS, accessToken, api, fields };
