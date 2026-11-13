// Généré depuis src/shared/orders.ts par scripts/sync-shared.cjs : ne pas modifier à la main.
"use strict";
/**
 * Moyens de paiement et statuts de commande, communs à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_PROGRESS = exports.STATUS_DETAILS = exports.CONFIRMED_LABEL = exports.STATUS_LABELS = exports.isOrderStatus = exports.ORDER_STATUSES = exports.CASH_KIN_ONLY = exports.CASH = exports.isPayMethod = exports.PAY_METHODS = void 0;
exports.PAY_METHODS = ['M-Pesa', 'Orange Money', 'Airtel Money', 'Paiement à la livraison'];
const isPayMethod = (v) => exports.PAY_METHODS.includes(v);
exports.isPayMethod = isPayMethod;
/** Paiement en espèces à la réception : réservé aux articles en stock à Kinshasa. */
exports.CASH = 'Paiement à la livraison';
exports.CASH_KIN_ONLY = 'Le paiement à la livraison est réservé aux articles en stock à Kinshasa.';
exports.ORDER_STATUSES = ['pending_payment', 'sourcing', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'];
const isOrderStatus = (v) => exports.ORDER_STATUSES.includes(v);
exports.isOrderStatus = isOrderStatus;
exports.STATUS_LABELS = {
    pending_payment: 'En attente de paiement',
    sourcing: 'Achat chez le fournisseur',
    in_transit: 'En transit vers Kinshasa',
    out_for_delivery: 'En livraison',
    delivered: 'Livrée',
    cancelled: 'Annulée',
};
/** Libellé d'une commande payée à la livraison, confirmée sans attendre de paiement. */
exports.CONFIRMED_LABEL = 'Commande confirmée';
exports.STATUS_DETAILS = {
    pending_payment: 'Paiement non encore reçu',
    sourcing: 'Préparation en cours',
    in_transit: 'En route vers Kinshasa',
    out_for_delivery: 'Le livreur arrive aujourd’hui',
    delivered: 'Commande remise',
    cancelled: 'Commande annulée',
};
exports.STATUS_PROGRESS = {
    pending_payment: 0, sourcing: 15, in_transit: 55, out_for_delivery: 80, delivered: 100, cancelled: 0,
};
