/**
 * Paiement Mobile Money via nyole (https://app.nyole.com/developer).
 *
 * Variables d'environnement :
 *   NYOLE_SECRET_KEY   clé secrète (af_live_sec_… ou af_test_sec_…). Sans elle, aucun paiement en ligne n'est lancé.
 *   NYOLE_API_URL      facultatif, https://app.nyole.com/api par défaut.
 *
 * Le serveur crée une session de paiement ; l'app ouvre `url`. Seul le webhook signé `payment.completed`
 * confirme une commande, jamais le retour du client.
 */
const crypto = require('node:crypto');

const secretKey = () => (process.env.NYOLE_SECRET_KEY || '').trim();
const apiUrl = () => (process.env.NYOLE_API_URL || 'https://app.nyole.com/api').replace(/\/+$/, '');
const enabled = () => secretKey() !== '';

/** Crée une session de paiement hébergée ; renvoie `{ id, url }`. Lève une erreur si nyole refuse. */
async function createSession({ amount, currency, phone, description, metadata, idempotencyKey }) {
  const res = await fetch(`${apiUrl()}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      amount,
      currency,
      ...(phone ? { customer_phone: phone } : {}),
      ...(description ? { description } : {}),
      ...(metadata ? { metadata } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id || !json.url) {
    throw new Error(`nyole ${res.status} : ${json.error?.message || json.message || json.error || 'réponse inattendue'}`);
  }
  return { id: json.id, url: json.url };
}

/** Numéro au format international (+243…), ou chaîne vide si le numéro n'est pas exploitable. */
function internationalPhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (/^\+\d{9,15}$/.test(digits)) return digits;
  if (/^00\d{9,15}$/.test(digits)) return `+${digits.slice(2)}`;
  return '';
}

/**
 * Vérifie `X-Afriflow-Signature` (t=<horodatage>,v1=<HMAC-SHA256 de "horodatage.corps brut">).
 * Refuse un horodatage de plus de 5 minutes.
 */
function verifySignature(rawBody, headers, secret, nowMs = Date.now()) {
  const ts = String(headers['x-afriflow-timestamp'] || '');
  const sig = String(headers['x-afriflow-signature'] || '')
    .split(',')
    .map(p => p.trim())
    .find(p => p.startsWith('v1='))
    ?.slice(3);
  if (!secret || !ts || !sig || !/^\d+$/.test(ts)) return false;
  if (Math.abs(nowMs / 1000 - Number(ts)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

module.exports = { enabled, createSession, internationalPhone, verifySignature, secretKey };
