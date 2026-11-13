/**
 * Prix par palier, communs à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 */

/** [quantité minimum, prix unitaire]. */
export type Tier = [number, number];

/** Quantité maximum d'une ligne de commande. */
export const MAX_QTY = 999;

/** Prix courant d'un produit Firestore : prix flash si la promo est active, sinon prix catalogue. */
export function basePrice(product: { price?: unknown; flash?: { active?: unknown; price?: unknown } | null }): number {
  const flash = product.flash;
  return flash && flash.active === true ? Number(flash.price) : Number(product.price);
}

/**
 * Paliers normalisés : accepte `[qté, prix]` ou `{ qty, price }`, ignore les valeurs invalides,
 * et le premier palier porte toujours le prix courant `base`.
 */
export function normalizeTiers(raw: unknown, base: number): Tier[] {
  const list = Array.isArray(raw) ? raw : [];
  const tiers: Tier[] = list
    .map((t): Tier => (Array.isArray(t) ? [Number(t[0]), Number(t[1])] : [Number(t?.qty), Number(t?.price)]))
    .filter(([qty, price]) => Number.isFinite(qty) && Number.isFinite(price));
  if (tiers.length) tiers[0] = [tiers[0][0] || 1, base];
  else tiers.push([1, base]);
  return tiers;
}

/** Prix unitaire du dernier palier atteint par `qty` ; `fallback` si aucun palier n'est atteint. */
export function priceForQty(tiers: Tier[], qty: number, fallback: number): number {
  let price = fallback;
  for (const [min, value] of tiers) if (qty >= min) price = value;
  return price;
}
