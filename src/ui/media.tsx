/** Photos produit et logo de la marque. */
import React from 'react';
import { StyleProp, View } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { C } from '../theme';

/**
 * Photo produit par URL (Firebase Hosting). Sans URL valable, un bloc vide de la même taille garde la mise en page ;
 * le fond gris du parent reste visible tant que la photo charge ou si elle est introuvable.
 */
export function Img({ uri, style }: { uri?: string; style?: StyleProp<ImageStyle> }) {
  if (!uri || !/^https?:\/\//i.test(uri)) return <View style={style as never} />;
  return <Image source={{ uri }} style={style} contentFit="cover" />;
}

// Les 24 petits dessins glissés en transparence dans les crochets (cases de 10 × 10, en quinconce).
function LogoIcons({ color }: { color: string }) {
  const p = { fill: 'none', stroke: color, strokeWidth: 0.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const at = (x: number, y: number, el: React.ReactNode) => <G transform={`translate(${x} ${y})`}>{el}</G>;
  return (
    <G {...p}>
      {at(0, 0, <Path d="M1 3.5h6l-1 3.5H2z M2.6 3.5a1.4 1.4 0 0 1 2.8 0" />)}
      {at(10, 0, <Path d="M1 2.5v4.5h6.5V5.6c0-.6-.4-1-1-1.1L4.2 4 3 2.5z M1 5.5h6.5" />)}
      {at(20, 0, <><Circle cx={4} cy={4} r={2.2} {...p} /><Path d="M3 1.8V.6h2v1.2 M3 6.2v1.2h2V6.2 M4 3v1.2l.8.6" /></>)}
      {at(30, 0, <><Path d="M1.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5" /><Rect x={1} y={5} width={1.3} height={2.2} rx={0.4} {...p} /><Rect x={5.7} y={5} width={1.3} height={2.2} rx={0.4} {...p} /></>)}
      {at(40, 0, <><Path d="M.5 2h4.5v4H.5z M5 3.5h1.6l1 1.3V6H5" /><Circle cx={2} cy={6.6} r={0.7} {...p} /><Circle cx={6} cy={6.6} r={0.7} {...p} /></>)}
      {at(50, 0, <><Circle cx={1.8} cy={5.8} r={1.2} {...p} /><Circle cx={6.2} cy={5.8} r={1.2} {...p} /><Path d="M1.8 5.8l1.8-2.6h1.6l1 2.6 M4.6 3.2l-.4-1.2h-1" /></>)}
      {at(5, 10, <><Rect x={0.8} y={2.2} width={6.4} height={3.8} rx={0.5} {...p} /><Circle cx={4} cy={4.1} r={1} {...p} /></>)}
      {at(15, 10, <Path d="M2.8 1.2 1 2.3l.8 1.3.8-.4v3.9h2.8V3.2l.8.4.8-1.3-1.8-1.1a1.2 1.2 0 0 1-2.4 0z" />)}
      {at(25, 10, <Path d="M3 .8h2l-.3 1.4 1.8 5.2H1.5l1.8-5.2z" />)}
      {at(35, 10, <><Rect x={1.8} y={2} width={4.4} height={5.4} rx={1.2} {...p} /><Path d="M3 2V1.4a1 1 0 0 1 2 0V2 M2.8 5h2.4" /></>)}
      {at(45, 10, <><Circle cx={2.2} cy={4.6} r={1.4} {...p} /><Circle cx={5.8} cy={4.6} r={1.4} {...p} /><Path d="M3.6 4.4h.8 M.8 4.2l-.3-1 M7.2 4.2l.3-1" /></>)}
      {at(55, 10, <><Rect x={1} y={3} width={6} height={4.4} {...p} /><Path d="M1 4.6h6 M4 3v4.4 M4 3C3.4 1.4 1.8 1.4 2 2.4c.1.6 1.2.6 2 .6s1.9 0 2-.6c.2-1-1.4-1-2 .6" /></>)}
      {at(0, 20, <><Rect x={2.2} y={0.8} width={3.6} height={6.6} rx={0.7} {...p} /><Path d="M3.6 6.3h.8" /></>)}
      {at(10, 20, <Path d="M1 2.8l3-1.5 3 1.5v3.4l-3 1.5-3-1.5z M1 2.8l3 1.5 3-1.5 M4 4.3v3.4" />)}
      {at(20, 20, <Path d="M4 .8v6.4 M1 4.6l3-1.6 3 1.6 M2.6 7.4l1.4-.6 1.4.6" />)}
      {at(30, 20, <Path d="M1.5 3h5v4.5h-5z M3 3v-.6a1 1 0 0 1 2 0V3" />)}
      {at(40, 20, <><Path d="M1 1.2h3.2l2.9 2.9-3 3-3.1-3.1z" /><Circle cx={2.4} cy={2.6} r={0.5} {...p} /></>)}
      {at(50, 20, <><Circle cx={2.2} cy={2.4} r={0.8} {...p} /><Circle cx={5.8} cy={5.6} r={0.8} {...p} /><Path d="M6.2 1.6 1.8 6.4" /></>)}
      {at(5, 30, <><Path d="M0.5 1.5h1.2l1.1 4.3h4l.9-3H2" /><Circle cx={3.2} cy={7.2} r={0.6} {...p} /><Circle cx={6.2} cy={7.2} r={0.6} {...p} /></>)}
      {at(15, 30, <><Circle cx={4} cy={4} r={2.8} {...p} /><Circle cx={4} cy={4} r={1.6} {...p} /></>)}
      {at(25, 30, <><Path d="M.6 5h6.8l-1 2H1.6z" /><Rect x={1.8} y={3} width={1.8} height={2} {...p} /><Rect x={3.8} y={3} width={1.8} height={2} {...p} /><Rect x={2.8} y={1.2} width={1.8} height={1.8} {...p} /></>)}
      {at(35, 30, <><Path d="M4 7.4S1.6 5 1.6 3.4a2.4 2.4 0 0 1 4.8 0C6.4 5 4 7.4 4 7.4z" /><Circle cx={4} cy={3.4} r={0.8} {...p} /></>)}
      {at(45, 30, <Path d="M1 4 4 1.3 7 4 M1.8 3.4v4h4.4v-4 M3.4 7.4V5.6h1.2v1.8" />)}
      {at(55, 30, <Path d="M4 .9l.95 2 2.15.25-1.6 1.5.45 2.15L4 5.75 2.05 6.8l.45-2.15-1.6-1.5 2.15-.25z" />)}
    </G>
  );
}

const HOOK_A = 'M8 14H40a12 12 0 0 1 0 24H30';
const HOOK_B = 'M56 50H24a12 12 0 0 1 0-24H34';

/**
 * Logo Zandu : deux crochets entrelacés (vendeur et acheteur), remplis de petits dessins en transparence.
 * `light` : version pour fond clair (crochet rouge + jaune). Par défaut : version pour le fond rouge (blanc + jaune).
 * Les dessins ne sont tracés qu'à partir de 60 px : en dessous ils seraient invisibles.
 */
export function Logo({ size = 64, light = false }: { size?: number; light?: boolean }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const a = 'la' + uid, b = 'lb' + uid;
  const detail = size >= 60;
  const hookA = light ? C.red : C.white;
  const pat = (id: string, color: string) => (
    <Pattern id={id} width={64} height={40} patternUnits="userSpaceOnUse" patternTransform="rotate(45) scale(0.42)">
      <LogoIcons color={color} />
    </Pattern>
  );
  return (
    <Svg width={size} height={size} viewBox="-3 -3 70 70">
      {detail && <Defs>{pat(a, light ? C.white : C.red)}{pat(b, C.redDark)}</Defs>}
      <G transform="rotate(-45 32 32)">
        <Path d={HOOK_A} fill="none" stroke={hookA} strokeWidth={10} strokeLinecap="round" />
        {detail && <Path d={HOOK_A} fill="none" stroke={`url(#${a})`} strokeWidth={10} strokeLinecap="round" opacity={0.22} />}
        <Path d={HOOK_B} fill="none" stroke={C.yellow} strokeWidth={10} strokeLinecap="round" />
        {detail && <Path d={HOOK_B} fill="none" stroke={`url(#${b})`} strokeWidth={10} strokeLinecap="round" opacity={0.22} />}
      </G>
    </Svg>
  );
}
