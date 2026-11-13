/**
 * Lots groupés : plusieurs clients réservent des pièces d'un même article pour atteindre ensemble
 * le premier palier de gros. Règles communes à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 */
import type { Tier } from './pricing';

/** Durée d'ouverture d'un lot : passé ce délai sans être complet, il expire et personne ne paie. */
export const LOT_HOURS = 48;

/** `open` : en cours de remplissage · `full` : complet, les commandes sont créées · `closed` : expiré ou vidé. */
export const LOT_STATUSES = ['open', 'full', 'closed'] as const;
export type LotStatus = (typeof LOT_STATUSES)[number];

/**
 * Palier visé par un lot groupé : le premier palier de gros, `[pièces à réunir, prix unitaire]`.
 * `null` si l'article n'a pas de prix de gros inférieur au prix à l'unité.
 */
export function lotTier(tiers: Tier[]): Tier | null {
  const tier = tiers[1];
  if (!tier || !tiers[0] || tier[0] < 2 || !(tier[1] < tiers[0][1])) return null;
  return tier;
}

/** Un lot accepte des réservations tant qu'il est ouvert, incomplet et non expiré. */
export function lotIsOpen(lot: { status: string; taken: number; target: number; expiresAt: number }, nowMs: number): boolean {
  return lot.status === 'open' && lot.taken < lot.target && lot.expiresAt > nowMs;
}
