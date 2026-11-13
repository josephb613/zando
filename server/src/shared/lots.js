// Généré depuis src/shared/lots.ts par scripts/sync-shared.cjs : ne pas modifier à la main.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOT_STATUSES = exports.LOT_HOURS = void 0;
exports.lotTier = lotTier;
exports.lotIsOpen = lotIsOpen;
/** Durée d'ouverture d'un lot : passé ce délai sans être complet, il expire et personne ne paie. */
exports.LOT_HOURS = 48;
/** `open` : en cours de remplissage · `full` : complet, les commandes sont créées · `closed` : expiré ou vidé. */
exports.LOT_STATUSES = ['open', 'full', 'closed'];
/**
 * Palier visé par un lot groupé : le premier palier de gros, `[pièces à réunir, prix unitaire]`.
 * `null` si l'article n'a pas de prix de gros inférieur au prix à l'unité.
 */
function lotTier(tiers) {
    const tier = tiers[1];
    if (!tier || !tiers[0] || tier[0] < 2 || !(tier[1] < tiers[0][1]))
        return null;
    return tier;
}
/** Un lot accepte des réservations tant qu'il est ouvert, incomplet et non expiré. */
function lotIsOpen(lot, nowMs) {
    return lot.status === 'open' && lot.taken < lot.target && lot.expiresAt > nowMs;
}
