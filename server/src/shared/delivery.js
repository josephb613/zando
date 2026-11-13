// Généré depuis src/shared/delivery.ts par scripts/sync-shared.cjs : ne pas modifier à la main.
"use strict";
/**
 * Règles de livraison communes à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 * Ce fichier ne doit rien importer de React Native ni d'Expo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipPrice = exports.baseShip = exports.zoneOf = exports.isKnownCommune = exports.SHIP_PRICES = exports.COMMUNES = exports.FREE_SHIP = void 0;
/** Seuil de livraison standard offerte (zone 0). */
exports.FREE_SHIP = 20;
/** [commune, zone] — zone 0 : standard, 1 : proche, 2 : périphérie. */
exports.COMMUNES = [
    ['Bandalungwa', 0], ['Barumbu', 0], ['Gombe', 0], ['Kalamu', 0], ['Kasa-Vubu', 0], ['Kintambo', 0],
    ['Lemba', 1], ['Limete', 0], ['Lingwala', 0], ['Masina', 2], ['Matete', 1], ['Mont-Ngafula', 2], ['Ndjili', 2], ['Ngaliema', 1],
];
/**
 * Prix des options de livraison, dans l'ordre de l'écran Paiement :
 * standard (dépend de la commune, `null`), express, camionnette, point relais.
 */
exports.SHIP_PRICES = [null, 5, 12, 0];
const isKnownCommune = (commune) => exports.COMMUNES.some(c => c[0] === commune);
exports.isKnownCommune = isKnownCommune;
/** Zone d'une commune ; une commune inconnue compte comme zone 0. */
const zoneOf = (commune) => {
    const found = exports.COMMUNES.find(c => c[0] === commune);
    return found ? found[1] : 0;
};
exports.zoneOf = zoneOf;
/** Frais standard : zone 0 offerte dès 20 $, sinon 3 $ ; zones 1 et 2 à prix fixe. */
const baseShip = (commune, subtotal) => {
    const zone = (0, exports.zoneOf)(commune);
    if (zone === 0)
        return subtotal >= exports.FREE_SHIP ? 0 : 3;
    return zone === 1 ? 1.5 : 3;
};
exports.baseShip = baseShip;
/** Frais de l'option choisie, ou `null` si l'option n'existe pas. */
const shipPrice = (index, commune, subtotal) => {
    if (!Number.isInteger(index) || index < 0 || index >= exports.SHIP_PRICES.length)
        return null;
    return index === 0 ? (0, exports.baseShip)(commune, subtotal) : exports.SHIP_PRICES[index];
};
exports.shipPrice = shipPrice;
