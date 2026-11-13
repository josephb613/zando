/**
 * Point d'entrée HTTP du module de commandes, indépendant de l'hébergeur (Node, Render, Vercel…).
 *
 *   POST /createOrders        { groups, commune, shipIndex, payMethod, address?, phone? }
 *   POST /updateOrderPayment  { refs, payMethod, phone? }
 *   POST /updateOrderStatus   { ref, status }                 (rôle admin)
 *   POST /nyoleWebhook        événement nyole signé            (adresse à saisir dans nyole, API et journaux)
 *   GET  /health
 *
 * L'app envoie son jeton Firebase dans `Authorization: Bearer <jeton>`.
 * Réponse : `{ data }` en cas de succès, `{ error: { code, message } }` sinon.
 */
const orders = require('./orders');
const nyole = require('./nyole');

const { ApiError } = orders;
const MAX_BODY = 100 * 1024;
const STATUS = {
  'invalid-argument': 400,
  unauthenticated: 401,
  'permission-denied': 403,
  'not-found': 404,
  'failed-precondition': 409,
  'method-not-allowed': 405,
  'payload-too-large': 413,
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.end(body === undefined ? '' : JSON.stringify(body));
}

/** Corps brut en texte, ou `null` si l'hébergeur l'a déjà décodé en objet. */
async function readText(req) {
  // Certains hébergeurs (Vercel) ont déjà lu le corps.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return null;
  }
  // Lit tout le corps ; au-delà de MAX_BODY on continue de le lire sans le garder,
  // pour que la réponse 413 parvienne au client au lieu d'une connexion coupée.
  const chunks = await new Promise((resolve, reject) => {
    let size = 0;
    let parts = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) parts = null;
      else if (parts) parts.push(chunk);
    });
    req.on('end', () => resolve(parts));
    req.on('error', reject);
  });
  if (!chunks) throw new ApiError('payload-too-large', 'Requête trop volumineuse.');
  return Buffer.concat(chunks).toString('utf8');
}

async function readBody(req) {
  const text = await readText(req);
  if (text === null) return req.body || {};
  return text ? JSON.parse(text) : {};
}

/**
 * Webhook nyole : non authentifié par jeton Firebase, mais par la signature HMAC du corps brut.
 * Une clé de test ne valide que des événements `livemode: false`, une clé de production que des `livemode: true`.
 */
async function nyoleWebhook(req, db) {
  const raw = await readText(req);
  if (raw === null) throw new ApiError('invalid-argument', 'Corps brut indisponible.');
  const secret = nyole.secretKey();
  if (!nyole.verifySignature(raw, req.headers, secret)) throw new ApiError('unauthenticated', 'Signature invalide.');
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    throw new ApiError('invalid-argument', 'Corps JSON invalide.');
  }
  if (event.livemode !== secret.startsWith('af_live_')) return { ignored: true };
  return orders.handleNyoleWebhook(db, event);
}

/**
 * Crée le gestionnaire de requêtes. `deps` permet de remplacer Firestore et la vérification
 * des jetons pendant les tests ; par défaut, l'Admin SDK est utilisé.
 */
function createHandler(deps) {
  const getDeps = () => deps || require('./firebase');

  return async function handle(req, res) {
    const name = (req.url || '').split('?')[0].replace(/\/+$/, '').split('/').pop();
    try {
      if (req.method === 'OPTIONS') return send(res, 204);
      if (req.method === 'GET' && name === 'health') {
        // `?deep=1` vérifie aussi l'accès à Firestore (clé de compte de service), sans renvoyer de données.
        if (/[?&]deep=1\b/.test(req.url || '')) {
          await getDeps().db().collection('products').limit(1).get();
          return send(res, 200, { data: { ok: true, firestore: true } });
        }
        return send(res, 200, { data: { ok: true } });
      }
      if (req.method !== 'POST') throw new ApiError('method-not-allowed', 'Méthode non autorisée.');

      if (name === 'nyoleWebhook') return send(res, 200, { data: await nyoleWebhook(req, getDeps().db()) });

      const action = { createOrders: 1, updateOrderPayment: 1, updateOrderStatus: 1 }[name] ? name : null;
      if (!action) throw new ApiError('not-found', 'Action inconnue.');

      let body;
      try {
        body = await readBody(req);
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError('invalid-argument', 'Corps JSON invalide.');
      }

      const { db, verifyToken } = getDeps();
      const header = req.headers.authorization || '';
      const token = await verifyToken(header.startsWith('Bearer ') ? header.slice(7) : '');
      if (!token) throw new ApiError('unauthenticated', 'Connexion requise.');

      const data = action === 'updateOrderStatus'
        ? await orders.updateOrderStatus(db(), token, body)
        : await orders[action](db(), token.uid, body);
      return send(res, 200, { data });
    } catch (e) {
      if (e instanceof ApiError) return send(res, STATUS[e.code] || 400, { error: { code: e.code, message: e.message } });
      console.error('[orders]', name, e);
      return send(res, 500, { error: { code: 'internal', message: 'Erreur serveur, réessayez.' } });
    }
  };
}

module.exports = { createHandler };
