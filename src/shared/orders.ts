/**
 * Moyens de paiement et statuts de commande, communs à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 */

export const PAY_METHODS = ['M-Pesa', 'Orange Money', 'Airtel Money', 'Paiement à la livraison'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const isPayMethod = (v: string): v is PayMethod => (PAY_METHODS as readonly string[]).includes(v);

/** Paiement en espèces à la réception : réservé aux articles en stock à Kinshasa. */
export const CASH: PayMethod = 'Paiement à la livraison';
export const CASH_KIN_ONLY = 'Le paiement à la livraison est réservé aux articles en stock à Kinshasa.';

export const ORDER_STATUSES = ['pending_payment', 'sourcing', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const isOrderStatus = (v: string): v is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(v);

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  sourcing: 'Achat chez le fournisseur',
  in_transit: 'En transit vers Kinshasa',
  out_for_delivery: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

/** Libellé d'une commande payée à la livraison, confirmée sans attendre de paiement. */
export const CONFIRMED_LABEL = 'Commande confirmée';

export const STATUS_DETAILS: Record<OrderStatus, string> = {
  pending_payment: 'Paiement non encore reçu',
  sourcing: 'Préparation en cours',
  in_transit: 'En route vers Kinshasa',
  out_for_delivery: 'Le livreur arrive aujourd’hui',
  delivered: 'Commande remise',
  cancelled: 'Commande annulée',
};

export const STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending_payment: 0, sourcing: 15, in_transit: 55, out_for_delivery: 80, delivered: 100, cancelled: 0,
};
