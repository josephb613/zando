import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { SvgXml } from 'react-native-svg';

/** Couleurs de Zandu. */
export const C = {
  // Couleur principale : un seul orange façon Taobao (les noms « red… » sont gardés pour ne pas toucher tout le code).
  red: '#FF5000',
  redDark: '#CC3D00',
  redShadow: '#A33200',
  redSoft: '#FFF1E8',
  redSoft2: '#FFF7F2',
  redDisabled: '#FFC6A8',
  /** Début des dégradés de la marque (orange clair → C.red). */
  brandLight: '#FF9000',
  yellow: '#FFD21F',
  yellow2: '#FFE066',
  ink: '#1B1B1B',
  grey: '#5E5E5E',
  grey2: '#6B6B6B',
  grey3: '#737373',
  grey4: '#888888',
  grey5: '#A3A3A3',
  /** Traits de séparation appuyés, bordures de boutons secondaires. */
  grey6: '#D4D4D4',
  /** Chevrons des listes de réglages. */
  grey7: '#C8C8C8',
  /** Libellés sous les icônes de raccourcis. */
  greyIcon: '#58595B',
  /** Texte secondaire foncé (commandes livrées ou annulées). */
  inkSoft: '#3F3F3F',
  line: '#EDEDED',
  line2: '#E0E0E0',
  bg: '#F5F5F5',
  bg2: '#F2F2F2',
  white: '#FFFFFF',
  green: '#15803D',
  green2: '#166534',
  greenSoft: '#E8F7EE',
  greenSoft2: '#F0FBF4',
  greenPale: '#DCFCE7',
  blue: '#1E40AF',
  blueSoft: '#E6ECFB',
  amber: '#B45309',
  /** Espace commerçant (Prix de gros) : fond sombre, accent or, texte brun sur l'or. */
  night: '#17171A',
  gold: '#FFD166',
  brown: '#3B2300',
};

export type W = 400 | 500 | 600 | 700 | 800 | 900;

// Police de l'app : Instrument Sans (400 à 700 ; 800 et 900 retombent sur 700).
const SANS: Record<W, string> = {
  400: 'InstrumentSans_400Regular',
  500: 'InstrumentSans_500Medium',
  600: 'InstrumentSans_600SemiBold',
  700: 'InstrumentSans_700Bold',
  800: 'InstrumentSans_700Bold',
  900: 'InstrumentSans_700Bold',
};
const SANS_ITALIC: Record<W, string> = {
  400: 'InstrumentSans_400Regular_Italic',
  500: 'InstrumentSans_500Medium_Italic',
  600: 'InstrumentSans_600SemiBold_Italic',
  700: 'InstrumentSans_700Bold_Italic',
  800: 'InstrumentSans_700Bold_Italic',
  900: 'InstrumentSans_700Bold_Italic',
};

/**
 * Texte de base. `w` = graisse CSS (400…900), `bowlby` = police d'affiche « Bowlby One » (logo).
 * Ne jamais mettre fontWeight dans style : utiliser `w`. `fontStyle: 'italic'` choisit la vraie italique.
 */
export function T({ w = 400, bowlby = false, style, ...rest }: TextProps & { w?: W; bowlby?: boolean }) {
  const italic = StyleSheet.flatten(style)?.fontStyle === 'italic';
  const fontFamily = bowlby ? 'BowlbyOne_400Regular' : (italic ? SANS_ITALIC : SANS)[w];
  return <Text {...rest} style={[{ color: C.ink }, style, { fontFamily, fontStyle: 'normal' }]} />;
}

/** Affiche une illustration SVG fournie en texte XML. */
export function Illus({ xml, size }: { xml: string; size: number }) {
  return <SvgXml xml={xml} width={size} height={size} />;
}
