/**
 * Zones de livraison de Kinshasa et options du tunnel de paiement, côté affichage.
 * Les règles de prix viennent de src/shared/delivery.ts, partagé avec le module de commandes (server/).
 */
import { FREE_SHIP, baseShip, zoneOf } from './shared/delivery';
import { money } from './format';

export { COMMUNES, FREE_SHIP, isKnownCommune, shipPrice, zoneOf } from './shared/delivery';

/** Provenance et délai annoncé : `tag` sur les photos, `delay` dans le panier, `long` sur la fiche et au paiement. */
export const ORIGIN = {
  kin: { tag: 'Kinshasa · demain', delay: 'Livré demain', long: 'En stock à Kinshasa · livré demain' },
  cn: { tag: 'Chine · 10–15 j', delay: 'Livré sous 10 à 15 jours', long: 'Import Chine · livré sous 10 à 15 jours' },
} as const;

/**
 * Frais de la livraison standard dans une commune, en clair : « 1,50 $ », « 3,00 $, offerte dès 20,00 $ »
 * (`short` : « Offerte dès 20,00 $ », pour les listes où la règle complète est rappelée ailleurs).
 */
export function zoneFee(commune: string, short = false) {
  const fee = money(baseShip(commune, 0));
  if (zoneOf(commune) !== 0) return fee;
  return short ? `Offerte dès ${money(FREE_SHIP)}` : `${fee}, offerte dès ${money(FREE_SHIP)}`;
}

/**
 * Options de livraison de l'écran Paiement, dans l'ordre des prix de src/shared/delivery.ts :
 * l'index choisi est envoyé au serveur, qui recalcule le prix. `kinOnly` : impossible pour un colis venant de Chine.
 */
export const SHIPS = [
  { label: 'Livraison standard', detail: 'À domicile', icon: 'a8af9f27', kinOnly: false },
  { label: 'Livraison express', detail: 'Aujourd’hui avant 20 h', icon: '76372ec6', kinOnly: true },
  { label: 'Camionnette', detail: 'Gros volumes, à domicile', icon: 'c7fb5e54', kinOnly: false },
  { label: 'Point relais', detail: 'Retrait à Gombe, bd du 30 Juin', icon: '65daa54b', kinOnly: false },
] as const;
