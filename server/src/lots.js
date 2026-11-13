/**
 * Lots groupés : plusieurs clients réservent des pièces d'un même article pour atteindre ensemble
 * le premier palier de gros (règles dans src/shared/lots.ts).
 *
 *   lots/{id}                 { productId, target, unit, taken, members, status, createdAt, expiresAt, fullAt? }
 *   lots/{id}/members/{uid}   { uid, qty, lines, address, phone, joinedAt }   (lisible par son seul propriétaire)
 *
 * Réserver ne coûte rien. Quand le lot est complet, une commande « en attente de paiement » est créée
 * pour chaque membre, au prix du lot ; chacun la paie depuis l'écran Commande (action updateOrderPayment).
 * Un lot incomplet à l'échéance expire sans commande : il est fermé à la prochaine réservation sur l'article.
 */
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { ApiError } = require('./orders');
const { isKnownCommune, shipPrice } = require('./shared/delivery');
const { LOT_HOURS, lotIsOpen, lotTier } = require('./shared/lots');
const { STATUS_DETAILS, STATUS_LABELS, STATUS_PROGRESS } = require('./shared/orders');
const { basePrice, normalizeTiers } = require('./shared/pricing');

const text = (value, max = 200) => String(value ?? '').trim().slice(0, max);
const cents = n => Math.round(n * 100) / 100;
const orderRef = () => 'SK-' + Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
const millis = t => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);

/** Moyen de paiement inscrit sur la commande d'un lot ; le membre peut le changer au moment de payer. */
const DEFAULT_PAY = 'M-Pesa';

/** Commande d'un membre, créée quand le lot est complet : prix du lot, livraison standard de sa commune. */
function orderOf(lot, product, member) {
  const subtotal = cents(lot.unit * member.qty);
  const ship = shipPrice(0, member.address.commune, subtotal) ?? 0;
  return {
    uid: member.uid,
    ref: orderRef(),
    kin: product.origin === 'kin',
    status: 'pending_payment',
    statusLabel: STATUS_LABELS.pending_payment,
    detail: STATUS_DETAILS.pending_payment,
    progress: STATUS_PROGRESS.pending_payment,
    count: member.qty,
    total: cents(subtotal + ship),
    ship,
    shipIndex: 0,
    lines: member.lines.map(line => ({
      img: text(product.photo, 240) || lot.productId,
      qty: line.qty,
      name: text(product.name, 160),
      variant: line.variant,
      unit: lot.unit,
    })),
    commune: member.address.commune,
    payMethod: DEFAULT_PAY,
    ...(member.phone ? { payPhone: member.phone } : {}),
    address: member.address,
    lot: lot.id,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Réserve des pièces dans le lot ouvert de l'article, ou ouvre un lot s'il n'y en a pas.
 * `lines` : `[{ variant, qty }]`. L'adresse est demandée dès la réservation : elle sert à créer la commande
 * quand le lot est complet, sans nouvelle action du membre.
 */
async function joinLot(db, uid, data = {}) {
  if (!uid) throw new ApiError('unauthenticated', 'Connexion requise.');
  const productId = text(data.productId, 80);
  if (!productId) throw new ApiError('invalid-argument', 'Produit manquant.');

  const rawLines = Array.isArray(data.lines) ? data.lines : [];
  if (rawLines.length < 1 || rawLines.length > 20) throw new ApiError('invalid-argument', 'Quantité invalide.');
  const lines = rawLines.map(line => {
    const qty = Math.floor(Number(line?.qty));
    if (!Number.isFinite(qty) || qty < 1) throw new ApiError('invalid-argument', 'Quantité invalide.');
    return { variant: text(line.variant, 80) || 'Standard', qty };
  });
  const qty = lines.reduce((n, line) => n + line.qty, 0);

  const raw = data.address && typeof data.address === 'object' ? data.address : {};
  const address = {
    name: text(raw.name, 120),
    phone: text(raw.phone, 40),
    line: text(raw.line, 240),
    landmark: text(raw.landmark, 240),
    commune: text(raw.commune, 80),
  };
  if (!address.name || !address.phone || !address.line) {
    throw new ApiError('invalid-argument', 'Adresse de livraison incomplète.');
  }
  if (!isKnownCommune(address.commune)) throw new ApiError('invalid-argument', 'Commune non desservie.');
  const phone = text(data.phone, 40);

  const productDoc = db.collection('products').doc(productId);
  const openLots = db.collection('lots').where('productId', '==', productId).where('status', '==', 'open');

  return db.runTransaction(async tx => {
    // Lectures d'abord (exigence des transactions Firestore).
    const productSnap = await tx.get(productDoc);
    if (!productSnap.exists) throw new ApiError('not-found', 'Produit introuvable.');
    const product = productSnap.data();
    if (product.active === false) throw new ApiError('failed-precondition', 'Produit indisponible.');
    const tier = lotTier(normalizeTiers(product.tiers, basePrice(product)));
    if (!tier) throw new ApiError('failed-precondition', 'Cet article ne se vend pas en lot groupé.');

    const now = Date.now();
    const lotsSnap = await tx.get(openLots);
    const state = doc => ({ status: 'open', taken: Number(doc.data().taken) || 0, target: Number(doc.data().target) || 0, expiresAt: millis(doc.data().expiresAt) });
    const current = lotsSnap.docs.find(doc => lotIsOpen(state(doc), now));
    const stale = lotsSnap.docs.filter(doc => doc !== current);

    const lotDoc = current ? current.ref : db.collection('lots').doc();
    // Le prix et la taille du lot sont figés à son ouverture : tous les membres paient le même prix.
    const lot = current
      ? { id: current.id, productId, target: state(current).target, unit: Number(current.data().unit), taken: state(current).taken, members: Number(current.data().members) || 0 }
      : { id: lotDoc.id, productId, target: tier[0], unit: tier[1], taken: 0, members: 0 };
    const membersSnap = current ? await tx.get(lotDoc.collection('members')) : { docs: [] };

    if (membersSnap.docs.some(doc => doc.id === uid)) {
      throw new ApiError('failed-precondition', 'Vous avez déjà réservé dans ce lot.');
    }
    const left = lot.target - lot.taken;
    if (qty > left) {
      throw new ApiError('failed-precondition', left === 1 ? 'Il ne reste qu’une pièce dans ce lot.' : `Il ne reste que ${left} pièces dans ce lot.`);
    }

    // Écritures.
    for (const doc of stale) tx.update(doc.ref, { status: 'closed', closedAt: FieldValue.serverTimestamp() });

    const member = { uid, qty, lines, address, ...(phone ? { phone } : {}) };
    tx.set(lotDoc.collection('members').doc(uid), { ...member, joinedAt: FieldValue.serverTimestamp() });

    const taken = lot.taken + qty;
    const full = taken >= lot.target;
    const expiresAt = current ? millis(current.data().expiresAt) : now + LOT_HOURS * 3600 * 1000;
    const change = {
      taken,
      members: lot.members + 1,
      status: full ? 'full' : 'open',
      ...(full ? { fullAt: FieldValue.serverTimestamp() } : {}),
    };
    if (current) tx.update(lotDoc, change);
    else {
      tx.set(lotDoc, {
        productId, target: lot.target, unit: lot.unit, ...change,
        createdAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(expiresAt),
      });
    }

    // Lot complet : une commande à payer par membre.
    let ref;
    if (full) {
      for (const m of [...membersSnap.docs.map(doc => doc.data()), member]) {
        const order = orderOf(lot, product, m);
        if (m.uid === uid) ref = order.ref;
        tx.set(db.collection('orders').doc(), order);
      }
    }

    return { lotId: lot.id, target: lot.target, taken, unit: lot.unit, status: change.status, expiresAt, ...(ref ? { ref } : {}) };
  });
}

/** Annule sa réservation dans un lot encore ouvert ; un lot sans membre est fermé. */
async function leaveLot(db, uid, data = {}) {
  if (!uid) throw new ApiError('unauthenticated', 'Connexion requise.');
  const lotId = text(data.lotId, 80);
  if (!lotId) throw new ApiError('invalid-argument', 'Lot manquant.');
  const lotDoc = db.collection('lots').doc(lotId);
  const memberDoc = lotDoc.collection('members').doc(uid);

  return db.runTransaction(async tx => {
    const [lotSnap, memberSnap] = [await tx.get(lotDoc), await tx.get(memberDoc)];
    if (!lotSnap.exists || !memberSnap.exists) throw new ApiError('not-found', 'Réservation introuvable.');
    const lot = lotSnap.data();
    if (lot.status !== 'open') throw new ApiError('failed-precondition', 'Ce lot n’accepte plus de changement.');
    const taken = Math.max(0, (Number(lot.taken) || 0) - (Number(memberSnap.data().qty) || 0));
    const members = Math.max(0, (Number(lot.members) || 0) - 1);
    tx.delete(memberDoc);
    tx.update(lotDoc, {
      taken, members,
      ...(members === 0 ? { status: 'closed', closedAt: FieldValue.serverTimestamp() } : {}),
    });
    return { ok: true };
  });
}

module.exports = { joinLot, leaveLot };
