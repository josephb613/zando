/** Affichage des statuts de commande : libellés, onglets de Commandes et étapes du suivi. */
import { CASH, OrderStatus, STATUS_LABELS } from './shared/orders';
import { C } from './theme';

export type OrderGroup = 'pay' | 'prep' | 'route' | 'done' | 'cancelled';

export const ORDER_GROUP: Record<OrderStatus, OrderGroup> = {
  pending_payment: 'pay', sourcing: 'prep', in_transit: 'route', out_for_delivery: 'route', delivered: 'done', cancelled: 'cancelled',
};

/** Onglets de l'écran Commandes, dans l'ordre d'affichage. */
export const GROUP_TABS: [OrderGroup, string][] = [
  ['pay', 'À payer'], ['prep', 'En préparation'], ['route', 'En route'], ['done', 'Livrées'], ['cancelled', 'Annulées'],
];

export const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: C.amber, sourcing: C.blue, in_transit: C.blue, out_for_delivery: C.green, delivered: C.inkSoft, cancelled: C.inkSoft,
};

/** Libellé d'un statut : pour le stock de Kinshasa, « sourcing » est la préparation à l'entrepôt, pas un achat. */
export const statusLabel = (status: OrderStatus, kin: boolean) =>
  status === 'sourcing' && kin ? 'En préparation' : STATUS_LABELS[status];

/** Nom d'une étape dans la frise du suivi. */
export function stepLabel(status: OrderStatus, kin: boolean) {
  switch (status) {
    case 'pending_payment': return 'Paiement';
    case 'sourcing': return kin ? 'Préparation à l’entrepôt' : 'Achat chez le fournisseur';
    case 'in_transit': return 'Transport vers Kinshasa';
    case 'out_for_delivery': return 'Livraison';
    default: return STATUS_LABELS[status];
  }
}

/**
 * Étapes d'une commande, de la création à la livraison. Une commande Kinshasa ne transite pas depuis la Chine ;
 * une commande payée à la livraison n'attend pas de paiement avant la préparation. Le statut actuel reste toujours affiché.
 */
export function orderSteps(o: { kin: boolean; payMethod: string; status: OrderStatus }): OrderStatus[] {
  const steps: OrderStatus[] = ['pending_payment', 'sourcing', 'in_transit', 'out_for_delivery', 'delivered'];
  return steps.filter(s => s === o.status || (!(o.kin && s === 'in_transit') && !(o.payMethod === CASH && s === 'pending_payment')));
}
