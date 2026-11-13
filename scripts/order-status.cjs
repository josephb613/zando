#!/usr/bin/env node
/**
 * Fait avancer une commande d'un statut à l'autre, comme l'action `updateOrderStatus` du module de commandes :
 * sert au back-office et à tester l'écran de suivi de l'app (qui se met à jour en direct).
 *
 *   node scripts/order-status.cjs SK-AB12CD                 affiche la commande et son statut
 *   node scripts/order-status.cjs SK-AB12CD in_transit      change le statut
 *
 * Statuts : pending_payment, sourcing, in_transit, out_for_delivery, delivered, cancelled.
 * Utilise la session de la CLI Firebase (`npx firebase-tools login`).
 */
const { DOCS, accessToken, api, fields } = require('./firebase-cli.cjs');
const { ORDER_STATUSES, STATUS_DETAILS, STATUS_LABELS, STATUS_PROGRESS, isOrderStatus } = require('../server/src/shared/orders');

async function main() {
  const [ref, status] = process.argv.slice(2);
  if (!ref) throw new Error('Usage : node scripts/order-status.cjs SK-XXXXXX [statut]');
  if (status && !isOrderStatus(status)) throw new Error(`Statut inconnu. Statuts : ${ORDER_STATUSES.join(', ')}`);

  const token = await accessToken();
  const rows = await api(token, 'POST', `${DOCS}:runQuery`, {
    structuredQuery: {
      from: [{ collectionId: 'orders' }],
      where: { fieldFilter: { field: { fieldPath: 'ref' }, op: 'EQUAL', value: { stringValue: ref } } },
      limit: 1,
    },
  });
  const doc = rows.find(r => r.document)?.document;
  if (!doc) throw new Error(`Commande introuvable : ${ref}`);
  const current = doc.fields.status?.stringValue;
  if (!status) {
    console.log(`${ref} : ${current} (${STATUS_LABELS[current] ?? 'statut inconnu'})`);
    return;
  }

  const update = { status, statusLabel: STATUS_LABELS[status], detail: STATUS_DETAILS[status], progress: STATUS_PROGRESS[status] };
  const mask = Object.keys(update).map(k => 'updateMask.fieldPaths=' + k).join('&');
  await api(token, 'PATCH', `${doc.name}?${mask}`, { fields: fields(update) });
  console.log(`${ref} : ${current} -> ${status} (${STATUS_LABELS[status]})`);
}

main().catch(e => { console.error('ERREUR', e.message); process.exit(1); });
