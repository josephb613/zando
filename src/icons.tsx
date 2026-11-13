/** Icônes de l'app : jeu maison dessiné dans `iconGlyphs.ts`, affiché ici. */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { GLYPHS, IconName, Part } from './iconGlyphs';
import { C } from './theme';

export type { IconName };

type IconProps = { size?: number; color?: string };

/** Trait compensé : un peu plus épais en petit, un peu plus fin en grand. */
const strokeFor = (size: number) => 2 * Math.min(1.15, Math.max(0.85, (24 / size) ** 0.25));

/**
 * `active` : corps rempli, détails en réserve dans la couleur `knockout` (fond sous l'icône).
 * `weight` : multiplie l'épaisseur du trait.
 */
export function Icon({ name, size = 24, color = C.ink, active = false, knockout = C.white, weight = 1 }:
  IconProps & { name: IconName; active?: boolean; knockout?: string; weight?: number }) {
  const sw = strokeFor(size) * weight;
  const parts: readonly Part[] = GLYPHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {parts.map((p, i) => {
        const stroke = { strokeWidth: sw * (p.w ?? 1), strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
        switch (p.k) {
          case 'line': return <Path key={i} d={p.d} fill="none" stroke={color} {...stroke} />;
          case 'body': return <Path key={i} d={p.d} fill={active ? color : 'none'} stroke={color} {...stroke} />;
          case 'inner': return <Path key={i} d={p.d} fill="none" stroke={active ? knockout : color} {...stroke} />;
          case 'dot': return <Path key={i} d={p.d} fill={active ? knockout : color} />;
          case 'solid': return <Path key={i} d={p.d} fill={color} />;
          default: return <Path key={i} d={p.d} fill={color} stroke={knockout} strokeWidth={1.5} />;
        }
      })}
    </Svg>
  );
}

export const BackIcon = ({ color = C.ink, size = 22 }: IconProps) => <Icon name="back" size={size} color={color} />;

export const CloseIcon = ({ color = C.ink, size = 20 }: IconProps) => <Icon name="close" size={size} color={color} />;

/** Chevron vers la droite ; `width` = épaisseur du trait sur la grille 24 (2 par défaut). */
export const Chevron = ({ size = 16, color = C.grey4, width = 2 }: IconProps & { width?: number }) => (
  <Icon name="chevronRight" size={size} color={color} weight={width / 2} />
);

/** Repère de lieu, plein (livraison depuis Kinshasa, adresse). */
export const PinIcon = ({ size = 14, color = C.green }: IconProps) => <Icon name="pin" size={size} color={color} active />;

/** Avion plein (import Chine). */
export const PlaneIcon = ({ size = 14, color = C.blue }: IconProps) => <Icon name="plane" size={size} color={color} active />;

export const SearchIcon = ({ color = C.grey2, size = 18 }: IconProps) => <Icon name="search" size={size} color={color} />;

export const CheckIcon = ({ size = 12, color = C.white }: IconProps) => <Icon name="check" size={size} color={color} weight={1.1} />;
