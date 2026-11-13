/**
 * Règles de livraison communes à l'app et au module de commandes (server/).
 * Source unique : `npm run shared:sync` en génère la copie JavaScript dans server/src/shared/.
 * Ce fichier ne doit rien importer de React Native ni d'Expo.
 */

/** Seuil de livraison standard offerte (zone 0). */
export const FREE_SHIP = 20;

/** [commune, zone] — zone 0 : standard, 1 : proche, 2 : périphérie. */
export const COMMUNES: [string, number][] = [
  ['Bandalungwa', 0], ['Barumbu', 0], ['Gombe', 0], ['Kalamu', 0], ['Kasa-Vubu', 0], ['Kintambo', 0],
  ['Lemba', 1], ['Limete', 0], ['Lingwala', 0], ['Masina', 2], ['Matete', 1], ['Mont-Ngafula', 2], ['Ndjili', 2], ['Ngaliema', 1],
];

/**
 * Prix des options de livraison, dans l'ordre de l'écran Paiement :
 * standard (dépend de la commune, `null`), express, camionnette, point relais.
 */
export const SHIP_PRICES: (number | null)[] = [null, 5, 12, 0];

export const isKnownCommune = (commune: string) => COMMUNES.some(c => c[0] === commune);

/** Zone d'une commune ; une commune inconnue compte comme zone 0. */
export const zoneOf = (commune: string) => {
  const found = COMMUNES.find(c => c[0] === commune);
  return found ? found[1] : 0;
};

/** Frais standard : zone 0 offerte dès 20 $, sinon 3 $ ; zones 1 et 2 à prix fixe. */
export const baseShip = (commune: string, subtotal: number) => {
  const zone = zoneOf(commune);
  if (zone === 0) return subtotal >= FREE_SHIP ? 0 : 3;
  return zone === 1 ? 1.5 : 3;
};

/** Frais de l'option choisie, ou `null` si l'option n'existe pas. */
export const shipPrice = (index: number, commune: string, subtotal: number): number | null => {
  if (!Number.isInteger(index) || index < 0 || index >= SHIP_PRICES.length) return null;
  return index === 0 ? baseShip(commune, subtotal) : SHIP_PRICES[index];
};
