// Généré depuis src/shared/pricing.ts par scripts/sync-shared.cjs : ne pas modifier à la main.
"use strict";
/**
 * Prix par palier, communs à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_QTY = void 0;
exports.basePrice = basePrice;
exports.normalizeTiers = normalizeTiers;
exports.priceForQty = priceForQty;
/** Quantité maximum d'une ligne de commande. */
exports.MAX_QTY = 999;
/** Prix courant d'un produit Firestore : prix flash si la promo est active, sinon prix catalogue. */
function basePrice(product) {
    const flash = product.flash;
    return flash && flash.active === true ? Number(flash.price) : Number(product.price);
}
/**
 * Paliers normalisés : accepte `[qté, prix]` ou `{ qty, price }`, ignore les valeurs invalides,
 * et le premier palier porte toujours le prix courant `base`.
 */
function normalizeTiers(raw, base) {
    const list = Array.isArray(raw) ? raw : [];
    const tiers = list
        .map((t) => (Array.isArray(t) ? [Number(t[0]), Number(t[1])] : [Number(t?.qty), Number(t?.price)]))
        .filter(([qty, price]) => Number.isFinite(qty) && Number.isFinite(price));
    if (tiers.length)
        tiers[0] = [tiers[0][0] || 1, base];
    else
        tiers.push([1, base]);
    return tiers;
}
/** Prix unitaire du dernier palier atteint par `qty` ; `fallback` si aucun palier n'est atteint. */
function priceForQty(tiers, qty, fallback) {
    let price = fallback;
    for (const [min, value] of tiers)
        if (qty >= min)
            price = value;
    return price;
}
