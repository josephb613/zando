import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Image } from 'expo-image';
import { C } from '../theme';
import { useAnimate } from '../ui';

// Icônes 3D animées des raccourcis de l'accueil (assets/icons3d) ; elles s'arrêtent hors écran
// et quand « Réduire les animations » est actif. `i` décale le départ de chaque icône.

export type ShortcutKind = 'promo' | 'petitsPrix' | 'ventes';

const SIZE = 52;

/** Boucle de 0 à 1, lancée après `delay` ms tant que l'écran est visible. */
function useLoop(dur: number, delay: number, easing: (t: number) => number) {
  const v = useState(() => new Animated.Value(0))[0];
  const on = useAnimate();
  useEffect(() => {
    if (!on) return undefined;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, easing, useNativeDriver: true }));
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [v, dur, delay, easing, on]);
  return v;
}

// ---------- Éclair (Promos) : fixe, des étincelles scintillent autour ----------
// [x, y, taille, moment du scintillement (0 à 1), couleur] en unités du dessin (128 × 128)
const SPARKS: [number, number, number, number, string][] = [
  [36, 38, 11, 0.15, C.yellow], [93, 30, 13, 0.4, C.brandLight], [88, 62, 9, 0.7, C.yellow],
  [42, 62, 8, 0.55, C.brandLight], [62, 12, 10, 0.85, C.yellow], [22, 82, 9, 0.3, C.yellow],
  [106, 86, 11, 0.62, C.brandLight], [74, 94, 7, 0.9, C.yellow],
];
function Spark({ v, x, y, size, at, color, k }: { v: Animated.Value; x: number; y: number; size: number; at: number; color: string; k: number }) {
  const w = size * k;
  const keys = [0, Math.max(0.01, at - 0.12), at, Math.min(0.99, at + 0.12), 1];
  const bar = { position: 'absolute' as const, backgroundColor: color, borderRadius: w };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x * k - w / 2, top: y * k - w / 2, width: w, height: w,
      opacity: v.interpolate({ inputRange: keys, outputRange: [0, 0, 1, 0, 0] }),
      transform: [{ translateY: v.interpolate({ inputRange: keys, outputRange: [0, 0, -1.5 * k, -3 * k, -3 * k] }) },
        { scale: v.interpolate({ inputRange: keys, outputRange: [0.3, 0.3, 1.1, 0.4, 0.3] }) },
        { rotate: v.interpolate({ inputRange: keys, outputRange: ['0deg', '0deg', '45deg', '90deg', '90deg'] }) }] }}>
      <View style={[bar, { left: 0, right: 0, top: w * 0.38, height: w * 0.24 }]} />
      <View style={[bar, { top: 0, bottom: 0, left: w * 0.38, width: w * 0.24 }]} />
    </Animated.View>
  );
}
function Eclair({ i }: { i: number }) {
  const k = SIZE / 128;
  const v = useLoop(2200, i * 260, Easing.linear);
  return (
    <View style={{ width: SIZE, height: SIZE, marginVertical: -2 }}>
      <Image source={require('../../assets/icons3d/anim/eclair-base.png')} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
      <Image source={require('../../assets/icons3d/anim/eclair-bolt.png')} style={{ position: 'absolute', width: SIZE, height: SIZE }} contentFit="contain" />
      {SPARKS.map(([x, y, sz, at, c], n) => <Spark key={n} v={v} x={x} y={y} size={sz} at={at} color={c} k={k} />)}
    </View>
  );
}

// ---------- Étiquette (Petits prix) qui se balance, trophée (Meilleures ventes) qui flotte ----------
const TAG = require('../../assets/icons3d/promo.png');
const TROPHY = require('../../assets/icons3d/trophee.png');
const sine = Easing.inOut(Easing.sin);

function Tag({ i }: { i: number }) {
  const v = useLoop(2600, i * 260, sine);
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, marginVertical: -2, transformOrigin: '50% 8%',
      transform: [{ rotate: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-7deg', '7deg', '-7deg'] }) }] }}>
      <Image source={TAG} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
    </Animated.View>
  );
}

function Trophy({ i }: { i: number }) {
  const v = useLoop(2400, i * 260, sine);
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, marginVertical: -2,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -3, 0] }) }, { scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] }) }] }}>
      <Image source={TROPHY} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
    </Animated.View>
  );
}

export function Shortcut({ kind, i }: { kind: ShortcutKind; i: number }) {
  if (kind === 'promo') return <Eclair i={i} />;
  if (kind === 'petitsPrix') return <Tag i={i} />;
  return <Trophy i={i} />;
}
