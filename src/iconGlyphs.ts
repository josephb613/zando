/**
 * Dessins des icônes maison (aucune bibliothèque externe). Données pures, sans React : `src/icons.tsx` les affiche.
 *
 * Règles du jeu d'icônes :
 * - grille 24 × 24, dessin dans la zone 2–22 ; trait de 2 (× `w`), bouts et angles arrondis ;
 * - contenants ronds : cercle de rayon 9 centré ; rectangles : rayon d'angle 2,2 à 3 ;
 * - chaque icône porte un élément plein (porte, rebord, poignée, pastille, roue…) qui lui donne son poids ;
 * - état actif : le corps se remplit et les détails intérieurs passent en réserve (couleur `knockout`).
 *
 * Types de tracé :
 * - `line`  : trait seul, toujours dans la couleur de l'icône ;
 * - `body`  : contour, rempli quand l'icône est active ;
 * - `inner` : trait intérieur, en réserve quand l'icône est active ;
 * - `dot`   : forme pleine, en réserve quand l'icône est active ;
 * - `solid` : forme pleine, toujours dans la couleur de l'icône ;
 * - `wheel` : forme pleine cernée de la couleur de réserve (roues, curseurs posés sur un trait).
 * Les chemins n'utilisent que des commandes absolues (M L H V C Q A Z), ce qui permet de les pivoter ici.
 */

export type PartKind = 'line' | 'body' | 'inner' | 'dot' | 'solid' | 'wheel';
export type Part = { k: PartKind; d: string; w?: number };

const n = (v: number) => Math.round(v * 100) / 100;

/** Cercle en deux arcs absolus. */
const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx + r)} ${n(cy)}A${r} ${r} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;

/** Rectangle à coins arrondis. */
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
  `H${n(x + r)}A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)}Z`;

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
};

/** Étoile à `points` branches. */
function star(cx: number, cy: number, rOut: number, rIn: number, points = 5) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    d += `${i ? 'L' : 'M'}${polar(cx, cy, i % 2 ? rIn : rOut, -90 + (180 / points) * i)}`;
  }
  return `${d}Z`;
}

/** Fait pivoter (degrés, sens horaire à l'écran, autour du centre) puis décale un chemin aux commandes absolues. */
function turn(d: string, deg: number, dx = 0, dy = 0) {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const pt = (x: number, y: number) => {
    const ox = x - 12, oy = y - 12;
    return `${n(12 + ox * cos - oy * sin + dx)} ${n(12 + ox * sin + oy * cos + dy)}`;
  };
  const tokens = d.match(/[MLHVCQAZ]|-?\d*\.?\d+/g) ?? [];
  let out = '', i = 0, cx = 0, cy = 0, cmd = '';
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) cmd = tokens[i++];
    switch (cmd) {
      case 'M': case 'L': { cx = num(); cy = num(); out += `${cmd}${pt(cx, cy)}`; break; }
      case 'H': { cx = num(); out += `L${pt(cx, cy)}`; break; }
      case 'V': { cy = num(); out += `L${pt(cx, cy)}`; break; }
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(); cx = num(); cy = num();
        out += `C${pt(x1, y1)} ${pt(x2, y2)} ${pt(cx, cy)}`; break;
      }
      case 'Q': { const x1 = num(), y1 = num(); cx = num(); cy = num(); out += `Q${pt(x1, y1)} ${pt(cx, cy)}`; break; }
      case 'A': {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(); cx = num(); cy = num();
        out += `A${rx} ${ry} ${n(rot + deg)} ${large} ${sweep} ${pt(cx, cy)}`; break;
      }
      case 'Z': out += 'Z'; break;
      default: i++;
    }
  }
  return out;
}

const line = (d: string, w?: number): Part => ({ k: 'line', d, w });
const body = (d: string, w?: number): Part => ({ k: 'body', d, w });
const inner = (d: string, w?: number): Part => ({ k: 'inner', d, w });
const dot = (d: string): Part => ({ k: 'dot', d });
const solid = (d: string): Part => ({ k: 'solid', d });
const wheel = (d: string): Part => ({ k: 'wheel', d });

const RING = circle(12, 12, 9);
const TICKET = 'M5.5 6.5H18.5A2.5 2.5 0 0 1 21 9V9.9A2.1 2.1 0 0 0 21 14.1V15A2.5 2.5 0 0 1 18.5 17.5H5.5A2.5 2.5 0 0 1 3 15V14.1A2.1 2.1 0 0 0 3 9.9V9A2.5 2.5 0 0 1 5.5 6.5Z';
/** Avion vu de dessus, nez en haut (pivoté ensuite). */
const PLANE = 'M12 2.2C13 2.2 13.5 3.2 13.5 4.4V9.4L21.2 13.9V15.7L13.5 13.5V17.3L16.2 19.2V20.8L12 19.6L7.8 20.8V19.2L10.5 17.3V13.5L2.8 15.7V13.9L10.5 9.4V4.4C10.5 3.2 11 2.2 12 2.2Z';
const BASKET_HANDLE = 'M6.8 9.4A5.2 5.2 0 0 1 17.2 9.4';
const BASKET = 'M3.6 11.5H20.4L18.9 18.4A2.6 2.6 0 0 1 16.4 20.5H7.6A2.6 2.6 0 0 1 5.1 18.4Z';
const BOX = rrect(3, 6, 18, 14.5, 2.4);

export const GLYPHS = {
  // — Onglets —
  /** Accueil : maison au toit débordant, porte pleine. */
  home: [
    body('M5.5 8.77L12 3.4L18.5 8.77V18A2.5 2.5 0 0 1 16 20.5H8A2.5 2.5 0 0 1 5.5 18Z'),
    line('M2.8 11L12 3.4L21.2 11'),
    dot('M10 20.5V16.4A2 2 0 0 1 14 16.4V20.5Z'),
  ],
  /** Promos et bons : bon de réduction incliné, comme l'étiquette « détail et gros ». */
  ticket: [
    body(turn(TICKET, -12)),
    dot(turn(circle(9.3, 10.2, 1.5), -12)),
    dot(turn(circle(14.7, 13.8, 1.5), -12)),
    inner(turn('M14.8 9.4L9.2 14.6', -12)),
  ],
  /** Prix de gros, espace commerçant : boutique au store à festons (les festons de la mascotte), porte en arc comme la maison. */
  shop: [
    body('M4.2 9.6V18.2A2.3 2.3 0 0 0 6.5 20.5H17.5A2.3 2.3 0 0 0 19.8 18.2V9.6'),
    body('M3.8 3H20.2A1.4 1.4 0 0 1 21.6 4.4V6.4A3.2 3.2 0 0 1 15.2 6.4A3.2 3.2 0 0 1 8.8 6.4A3.2 3.2 0 0 1 2.4 6.4V4.4A1.4 1.4 0 0 1 3.8 3Z'),
    inner('M21.6 6.4A3.2 3.2 0 0 1 15.2 6.4A3.2 3.2 0 0 1 8.8 6.4A3.2 3.2 0 0 1 2.4 6.4'),
    solid('M8.8 3H15.2V6.4A3.2 3.2 0 0 1 8.8 6.4Z'),
    dot('M9.8 20.5V16.2A2.2 2.2 0 0 1 14.2 16.2V20.5Z'),
  ],
  /** Panier : panier de marché à anse, rebord plein. */
  basket: [line(BASKET_HANDLE), body(BASKET), inner('M9.4 14.2V17.6M14.6 14.2V17.6'), solid(rrect(2.2, 8.6, 19.6, 3, 1.5))],
  /** Ajouter au panier : le panier, une croix à la place des lattes. */
  basketPlus: [line(BASKET_HANDLE), body(BASKET), inner('M12 13.6V18.2M9.7 15.9H14.3'), solid(rrect(2.2, 8.6, 19.6, 3, 1.5))],
  /** Compte : buste, tête pleine. */
  user: [
    solid(circle(12, 7.6, 3.7)),
    body('M4.4 19.2C4.9 15.6 8 13.2 12 13.2C16 13.2 19.1 15.6 19.6 19.2A1.2 1.2 0 0 1 18.4 20.6H5.6A1.2 1.2 0 0 1 4.4 19.2Z'),
  ],

  // — Navigation —
  back: [line('M15 4.8L7.8 12L15 19.2', 1.1)],
  chevronRight: [line('M9 4.8L16.2 12L9 19.2')],
  chevronDown: [line('M4.8 9L12 16.2L19.2 9')],
  arrowRight: [line('M4.5 12H18.8M13.4 6.2L19.2 12L13.4 17.8', 1.1)],
  close: [line('M6.2 6.2L17.8 17.8M17.8 6.2L6.2 17.8', 1.1)],
  check: [line('M5 12.6L9.7 17.2L19 7.2', 1.1)],
  plus: [line('M12 5V19M5 12H19', 1.1)],
  /** Menu : trois traits, le dernier plus court. */
  menu: [line('M4 6.5H20M4 12H20M4 17.5H13.5')],
  /** Filtres : trois curseurs. */
  filter: [line('M3.5 6.5H20.5M3.5 12H20.5M3.5 17.5H20.5'), wheel(circle(8.6, 6.5, 2.3)), wheel(circle(15.6, 12, 2.3)), wheel(circle(7.4, 17.5, 2.3))],
  /** Catégories : quatre cases, une pleine. */
  search: [line(circle(10.6, 10.6, 6.6)), line('M15.7 15.7L20 20', 1.6)],

  // — Actions —
  heart: [body('M12 20.5C9.5 18.9 3 14.6 3 9.4C3 6.6 5.1 4.5 7.7 4.5C9.5 4.5 11.1 5.5 12 7.1C12.9 5.5 14.5 4.5 16.3 4.5C18.9 4.5 21 6.6 21 9.4C21 14.6 14.5 18.9 12 20.5Z')],
  /** Discuter : bulle, trois points pleins. */
  chat: [
    body('M7.5 4H16.5A4.5 4.5 0 0 1 21 8.5V12.5A4.5 4.5 0 0 1 16.5 17H11L7 20.6L7.5 17A4.5 4.5 0 0 1 3 12.5V8.5A4.5 4.5 0 0 1 7.5 4Z'),
    dot(circle(8.4, 10.5, 1.15)),
    dot(circle(12, 10.5, 1.15)),
    dot(circle(15.6, 10.5, 1.15)),
  ],
  trash: [
    line('M3.8 6.5H20.2M9.3 6.5V4.8A1.3 1.3 0 0 1 10.6 3.5H13.4A1.3 1.3 0 0 1 14.7 4.8V6.5'),
    body('M5.6 6.5L6.6 18.6A2.1 2.1 0 0 0 8.7 20.5H15.3A2.1 2.1 0 0 0 17.4 18.6L18.4 6.5'),
    inner('M10 10.5V16.5M14 10.5V16.5'),
  ],
  /** Renvoyer / réassort : flèche circulaire, pointe pleine. */

  // — Pastilles rondes —
  help: [body(RING), inner('M9.4 9.6C9.4 8.1 10.6 7 12.1 7C13.7 7 14.8 8.1 14.8 9.5C14.8 11.5 12 11.7 12 13.7'), dot(circle(12, 16.9, 1.2))],
  checkCircle: [body(RING), inner('M8 12.3L10.8 15L16 9.4')],
  clear: [body(RING), inner('M9 9L15 15M15 9L9 15')],
  clock: [body(RING), inner('M12 7.4V12L15.2 14')],
  /** Pièce, devise, remboursement. */

  // — Commande et livraison —
  truck: [
    body('M2.5 7.8A1.8 1.8 0 0 1 4.3 6H13.2A1.8 1.8 0 0 1 15 7.8V9.5H18.3L21.5 13.2V16.4A1.6 1.6 0 0 1 19.9 18H4.3A1.8 1.8 0 0 1 2.5 16.2Z'),
    inner('M15 9.5V13.4H21.4'),
    wheel(circle(7, 18.2, 2.3)),
    wheel(circle(17.6, 18.2, 2.3)),
  ],
  /** Livreur à moto : scooter et caisse de livraison pleine. */
  plane: [body(turn(PLANE, 45))],
  pin: [body('M12 21.3C12 21.3 4.8 15.2 4.8 9.8A7.2 7.2 0 0 1 19.2 9.8C19.2 15.2 12 21.3 12 21.3Z'), dot(circle(12, 9.8, 2.5))],
  /** Me localiser : viseur, centre plein. */
  /** Colis : carton fermé, bande adhésive pleine. */
  box: [body(BOX), inner('M3 10.4H21'), solid(rrect(10.4, 5.2, 3.2, 7.2, 0.8))],
  wallet: [
    line('M6 6.2L15.6 3.6A1.3 1.3 0 0 1 17.2 4.9V6.2'),
    body(rrect(2.6, 6.2, 18.8, 14, 3)),
    inner('M21.4 10.4H16.9A2.4 2.4 0 0 0 16.9 15.2H21.4'),
    dot(circle(17.1, 12.8, 1.05)),
  ],
  star: [body(star(12, 12.6, 9.4, 4.4))],

  // — Confiance —
  bolt: [body('M13.6 2.8L5.6 13.4H11.2L10.2 21.2L18.4 10.4H12.8Z')],
  shieldCheck: [body('M12 2.8L19.5 5.6V11.4C19.5 16 16.4 19.6 12 21.2C7.6 19.6 4.5 16 4.5 11.4V5.6Z'), inner('M8.6 11.9L11 14.3L15.6 9.5')],
} satisfies Record<string, Part[]>;

export type IconName = keyof typeof GLYPHS;
