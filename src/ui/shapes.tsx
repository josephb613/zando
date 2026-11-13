/** Formes de fond et séparateurs (remplacent dégradés et bordures pointillées CSS). */
import React, { useId } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

const svgId = (raw: string) => 'g' + raw.replace(/[^a-zA-Z0-9]/g, '');

/** Fond en dégradé linéaire qui remplit son parent. `vertical` = 180deg, sinon 90deg. */
export function Grad({ from, to, vertical = false, radius = 0 }: { from: string; to: string; vertical?: boolean; radius?: number }) {
  const gid = svgId(useId());
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius, overflow: 'hidden' }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

/** Ligne pointillée horizontale (remplace un border-top/bottom dashed). */
export function DashLine({ color, width, dash, style }: { color: string; width: number; dash: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ height: width, overflow: 'hidden' }, style]}>
      <Svg width="100%" height={width}>
        <Line x1={0} y1={width / 2} x2="100%" y2={width / 2} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      </Svg>
    </View>
  );
}
