/**
 * Logique des commandes Sokoni, indépendante de l'hébergeur.
 *
 * Seule voie autorisée pour créer ou modifier une commande : l'app envoie les produits et quantités,
 * le serveur relit les prix dans Firestore, recalcule livraison et totaux, puis écrit avec l'Admin SDK.
 * Les règles Firestore interdisent toute écriture directe de commande côté client.
 */
const { FieldValue } = require('firebase-admin/firestore');
const nyole = require('./nyole');
const { isKnownCommune, shipPrice } = require('./shared/delivery');
const { MAX_QTY, basePrice, normalizeTiers, priceForQty } = require('./shared/pricing');
const {
  CASH, CASH_KIN_ONLY, CONFIRMED_LABEL, STATUS_DETAILS, STATUS_LABELS, STATUS_PROGRESS, isOrderStatus, isPayMethod,
} = require('./shared/orders');

/** Erreur renvoyée à l'app : `code` reprend les codes Firebase (invalid-argument, not-found…). */
class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Prix unitaire selon le palier atteint par la quantité totale du produit (règles de src/shared/pricing.ts). */
function unitPrice(product, qty) {
  return priceForQty(normalizeTiers(product.tiers, basePrice(product)), qty, Number(product.price) || 0);
}

function text(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}

const PAY_CURRENCY = 'USD';
const cents = n => Math.round(n * 100) / 100;

/**
 * Lance le paiement Mobile Money des commandes `docRefs` (références Firestore) chez nyole.
 * Renvoie `{ payUrl }`, ou `{}` si nyole n'est pas configuré ou refuse : la commande reste alors
 * « en attente de paiement » et l'app garde son comportement d'avant.
 */
async function startPayment(docRefs, refs, total, phone, idempotencyKey) {
  if (!nyole.enabled()) return {};
  try {
    const session = await nyole.createSession({
      amount: cents(total),
      currency: PAY_CURRENCY,
      phone: nyole.internationalPhone(phone),
      description: `Sokoni · ${refs.join(' + ')}`,
      metadata: { order_id: refs[0], refs: refs.join(',') },
      idempotencyKey,
    });
    await Promise.all(docRefs.map(ref => ref.update({
      nyoleSession: session.id, nyoleAmount: cents(total), nyoleCurrency: PAY_CURRENCY,
    })));
    return { payUrl: session.url };
  } catch (e) {
    console.error('[nyole] session non créée', refs.join(','), e.message);
    return {};
  }
}

/**
 * Webhook nyole. Le corps est déjà authentifié par sa signature (voir handler.js).
 * Seul `payment.completed` fait avancer une commande, et seulement si montant et devise correspondent.
 * Idempotent : une commande qui n'attend plus de paiement n'est pas touchée.
 */
async function handleNyoleWebhook(db, event) {
  if (!event || event.event !== 'payment.completed' || event.data?.status !== 'SUCCESS') return { ignored: true };
  const data = event.data;
  const snap = await db.collection('orders').where('nyoleSession', '==', String(data.id || '')).get();
  if (snap.empty) return { ignored: true };

  const expected = cents(snap.docs.reduce((n, d) => n + (Number(d.data().total) || 0), 0));
  const currency = snap.docs[0].data().nyoleCurrency;
  if (cents(Number(data.amount)) !== expected || data.currency !== currency) {
    console.error('[nyole] montant ou devise inattendus', data.id, data.amount, data.currency, 'attendu', expected, currency);
    return { ignored: true };
  }

  const batch = db.batch();
  let confirmed = 0;
  for (const doc of snap.docs) {
    if (doc.data().status !== 'pending_payment') continue;
    confirmed += 1;
    batch.update(doc.ref, {
      status: 'sourcing',
      statusLabel: CONFIRMED_LABEL,
      detail: STATUS_DETAILS.sourcing,
      progress: STATUS_PROGRESS.sourcing,
      paidAt: FieldValue.serverTimestamp(),
      payRef: text(data.provider_reference, 120),
    });
  }
  if (confirmed) await batch.commit();
  return { confirmed };
}

/** Crée une ou deux commandes (Kinshasa / Chine) pour l'utilisateur `uid`. */
async function createOrders(db, uid, data = {}) {
  if (!uid) throw new ApiError('unauthenticated', 'Connexion requise.');

  const groups = Array.isArray(data.groups) ? data.groups : [];
  if (groups.length < 1 || groups.length > 2) {
    throw new ApiError('invalid-argument', 'Groupes de commande invalides.');
  }

  const commune = text(data.commune, 80);
  const payMethod = text(data.payMethod, 80);
  const payPhone = text(data.phone, 40);
  if (!isKnownCommune(commune)) throw new ApiError('invalid-argument', 'Commune non desservie.');
  const shipIndex = Number(data.shipIndex);
  if (!isPayMethod(payMethod)) {
    throw new ApiError('invalid-argument', 'Moyen de paiement invalide.');
  }

  const rawAddress = data.address && typeof data.address === 'object' ? data.address : null;
  const address = rawAddress
    ? {
        name: text(rawAddress.name, 120),
        phone: text(rawAddress.phone, 40),
        line: text(rawAddress.line, 240),
        landmark: text(rawAddress.landmark, 240),
        commune: text(rawAddress.commune || commune, 80),
      }
    : null;
  if (address && (!address.name || !address.phone || !address.line)) {
    throw new ApiError('invalid-argument', 'Adresse de livraison incomplète.');
  }

  if (payMethod === CASH && groups.some(group => !group.kin)) {
    throw new ApiError('failed-precondition', CASH_KIN_ONLY);
  }

  // 1. Valider la forme des groupes et collecter les produits.
  const productIds = new Set();
  for (const group of groups) {
    if (!Array.isArray(group.lines) || group.lines.length < 1 || group.lines.length > 100) {
      throw new ApiError('invalid-argument', 'Lignes de commande invalides.');
    }
    for (const line of group.lines) {
      const key = text(line.k || line.img, 80);
      if (!key) throw new ApiError('invalid-argument', 'Produit manquant.');
      productIds.add(key);
    }
  }

  // 2. Relire les produits : le client ne peut pas imposer un prix.
  const snaps = await db.getAll(...[...productIds].map(key => db.collection('products').doc(key)));
  const products = new Map();
  snaps.forEach(snap => { if (snap.exists) products.set(snap.id, snap.data()); });
  for (const key of productIds) {
    if (!products.has(key)) throw new ApiError('not-found', `Produit introuvable : ${key}`);
  }

  // 3. Recalculer chaque commande.
  const computed = groups.map(group => {
    const lines = group.lines.map(line => {
      const key = text(line.k || line.img, 80);
      const qty = Math.floor(Number(line.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
        throw new ApiError('invalid-argument', 'Quantité invalide.');
      }
      return { key, img: text(line.img, 240) || key, qty, variant: text(line.variant, 80) || 'Standard' };
    });

    const qtyByProduct = new Map();
    for (const line of lines) {
      qtyByProduct.set(line.key, (qtyByProduct.get(line.key) || 0) + line.qty);
    }

    let subtotal = 0;
    const expectedOrigin = group.kin ? 'kin' : 'cn';
    const orderLines = lines.map(line => {
      const product = products.get(line.key);
      if (product.active === false) {
        throw new ApiError('failed-precondition', `Produit indisponible : ${line.key}`);
      }
      if (product.origin && product.origin !== expectedOrigin) {
        throw new ApiError('invalid-argument', 'Origine du produit incohérente avec le groupe de commande.');
      }
      const unit = unitPrice(product, qtyByProduct.get(line.key));
      subtotal += unit * line.qty;
      return {
        img: line.img,
        qty: line.qty,
        name: text(product.name, 160),
        variant: line.variant,
        unit,
      };
    });
    const count = lines.reduce((n, line) => n + line.qty, 0);
    return { kin: !!group.kin, orderLines, subtotal, count };
  });

  // 4. Frais de livraison recalculés ici (src/shared/delivery.ts), sur le sous-total de tout le panier,
  //    facturés une seule fois sur la première commande, comme dans l'app.
  const cartSubtotal = computed.reduce((n, c) => n + c.subtotal, 0);
  const ship = shipPrice(shipIndex, commune, cartSubtotal);
  if (ship === null) throw new ApiError('invalid-argument', 'Option de livraison invalide.');

  // 5. Écrire les commandes atomiquement.
  const base = 'SK-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
  const refs = groups.map((_, i) => (groups.length > 1 ? `${base}-${'AB'[i]}` : base));
  const batch = db.batch();
  let totalAll = 0;
  let countAll = 0;
  const cash = payMethod === CASH;
  const status = cash ? 'sourcing' : 'pending_payment';
  const docRefs = [];

  computed.forEach((c, index) => {
    const groupShip = index === 0 ? ship : 0;
    const total = Math.round((c.subtotal + groupShip) * 100) / 100;
    totalAll += total;
    countAll += c.count;

    const docRef = db.collection('orders').doc();
    docRefs.push(docRef);
    batch.set(docRef, {
      uid,
      ref: refs[index],
      kin: c.kin,
      status,
      statusLabel: cash ? CONFIRMED_LABEL : STATUS_LABELS.pending_payment,
      detail: STATUS_DETAILS[status],
      progress: STATUS_PROGRESS[status],
      count: c.count,
      total,
      ship: groupShip,
      shipIndex,
      lines: c.orderLines,
      commune,
      payMethod,
      ...(payPhone && !cash ? { payPhone } : {}),
      ...(address ? { address } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  const total = Math.round(totalAll * 100) / 100;
  const pay = cash ? {} : await startPayment(docRefs, refs, total, payPhone, `sokoni-${refs.join('+')}`);
  return { refs, total, count: countAll, ...pay };
}

/**
 * Change le moyen de paiement de commandes encore en attente (écran EchecPaiement).
 * Reçoit toutes les références d'un même passage en caisse (`SK-XXXX-A` et `-B`) et les met à jour ensemble.
 * Passer au paiement à la livraison confirme la commande, comme à la création.
 */
async function updateOrderPayment(db, uid, data = {}) {
  if (!uid) throw new ApiError('unauthenticated', 'Connexion requise.');

  const raw = Array.isArray(data.refs) ? data.refs : [data.ref];
  const refs = [...new Set(raw.map(r => text(r, 40)).filter(Boolean))];
  const payMethod = text(data.payMethod, 80);
  const payPhone = text(data.phone, 40);
  if (refs.length < 1 || refs.length > 2 || !isPayMethod(payMethod)) {
    throw new ApiError('invalid-argument', 'Paramètres de paiement invalides.');
  }

  const snap = await db.collection('orders').where('uid', '==', uid).where('ref', 'in', refs).get();
  if (snap.size !== refs.length) throw new ApiError('not-found', 'Commande introuvable.');
  if (snap.docs.some(d => d.data().status !== 'pending_payment')) {
    throw new ApiError('failed-precondition', 'Cette commande n’attend plus de paiement.');
  }

  const cash = payMethod === CASH;
  if (cash && snap.docs.some(d => d.data().kin !== true)) {
    throw new ApiError('failed-precondition', CASH_KIN_ONLY);
  }
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      payMethod,
      payPhone: !cash && payPhone ? payPhone : FieldValue.delete(),
      ...(cash
        ? {
            status: 'sourcing',
            statusLabel: CONFIRMED_LABEL,
            detail: STATUS_DETAILS.sourcing,
            progress: STATUS_PROGRESS.sourcing,
          }
        : {}),
    });
  }
  await batch.commit();
  if (cash) return { ok: true };
  // Nouvelle session à chaque essai : l'ancienne a pu être annulée ou expirer.
  const total = snap.docs.reduce((n, d) => n + (Number(d.data().total) || 0), 0);
  const pay = await startPayment(snap.docs.map(d => d.ref), refs, total, payPhone, `sokoni-${refs.join('+')}-${Date.now()}`);
  return { ok: true, ...pay };
}

/** Fait avancer le statut d'une commande (back-office, rôle admin requis). */
async function updateOrderStatus(db, claims, data = {}) {
  if (!claims || claims.admin !== true) {
    throw new ApiError('permission-denied', 'Accès administrateur requis.');
  }

  const ref = text(data.ref, 40);
  const status = text(data.status, 40);
  if (!ref || !isOrderStatus(status)) {
    throw new ApiError('invalid-argument', 'Statut de commande invalide.');
  }

  const snap = await db.collection('orders').where('ref', '==', ref).limit(1).get();
  if (snap.empty) throw new ApiError('not-found', 'Commande introuvable.');

  await snap.docs[0].ref.update({
    status,
    statusLabel: STATUS_LABELS[status],
    detail: STATUS_DETAILS[status],
    progress: STATUS_PROGRESS[status],
  });
  return { ok: true };
}

module.exports = { ApiError, createOrders, updateOrderPayment, updateOrderStatus, handleNyoleWebhook };
