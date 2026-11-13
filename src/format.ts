import { C } from './theme';

/** 12.5 → « 12,50 $ » (espace pour les milliers). */
export function money(v: number) {
  return v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $';
}
/** 12.5 → { int: '12', dec: ',50' } pour les prix à deux tailles. */
export function priceParts(v: number) {
  const [i, d] = v.toFixed(2).split('.');
  return { int: i, dec: ',' + d };
}
/** 1 → « 1 article », 3 → « 3 articles ». */
export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Date courte : « 12 nov. 2026 ». */
export const shortDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Couleur des étiquettes reprises du fournisseur (« Top ventes », « Nouveauté »…). */
export function hotColor(h: string): string {
  return /Nouveaut|racheté/.test(h) ? C.green : C.red;
}

/** « 3,1k » -> 3100 ; « 760 » -> 760. */
export const soldNum = (s: string) => {
  const n = parseFloat((s || '').replace(/\s/g, '').replace(',', '.')) || 0;
  return Math.round(/m/i.test(s || '') ? n * 1e6 : /k/i.test(s || '') ? n * 1000 : n);
};
/** « 3,1k vendus », ou rien quand le nombre de ventes de l'article est inconnu. */
export const soldLabel = (s: string) => (s ? `${s} vendus` : '');

/** Temps restant avant `untilMs` : « 31 h », « 45 min », « moins d'une minute ». */
export function timeLeft(untilMs: number, nowMs: number) {
  const min = Math.floor((untilMs - nowMs) / 60000);
  if (min < 1) return 'moins d’une minute';
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h`;
}
