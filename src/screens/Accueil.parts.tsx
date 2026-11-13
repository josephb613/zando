import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { C, T } from '../theme';
import { Img, Price, Tap, useAnimate } from '../ui';
import { Chevron } from '../icons';
import type { CatItem } from '../catalog';

// Icônes 3D animées des raccourcis de l'accueil (assets/icons3d) ; elles s'arrêtent hors écran
// et quand « Réduire les animations » est actif. `i` décale le départ de chaque icône.

export type ShortcutKind = 'promo' | 'petitsPrix' | 'ventes' | 'gros' | 'commandes';

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

// ---------- Étiquette (Petits prix) qui se balance ; trophée, cartons et camion qui flottent ----------
const TAG = require('../../assets/icons3d/promo.png');
const FLOATING = {
  ventes: require('../../assets/icons3d/trophee.png'),
  gros: require('../../assets/icons3d/cartons.png'),
  commandes: require('../../assets/icons3d/camion.png'),
};
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

function Float({ kind, i }: { kind: keyof typeof FLOATING; i: number }) {
  const v = useLoop(2400, i * 260, sine);
  return (
    <Animated.View style={{ width: SIZE, height: SIZE, marginVertical: -2,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -3, 0] }) }, { scale: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] }) }] }}>
      <Image source={FLOATING[kind]} style={{ width: SIZE, height: SIZE }} contentFit="contain" />
    </Animated.View>
  );
}

export function Shortcut({ kind, i }: { kind: ShortcutKind; i: number }) {
  if (kind === 'promo') return <Eclair i={i} />;
  if (kind === 'petitsPrix') return <Tag i={i} />;
  return <Float kind={kind} i={i} />;
}

// ---------- Bandeaux d'articles défilants (promos, prix de gros, vus récemment) ----------
const THUMB = 104;

/** Bandeau blanc : titre, lien « Tout voir » si `onMore`, puis une rangée défilante de vignettes. */
export function Strip({ title, onMore, children }: { title: string; onMore?: () => void; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.white, paddingTop: 4, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingLeft: 12, paddingRight: 6 }}>
        <T w={700} accessibilityRole="header" style={{ fontSize: 16 }}>{title}</T>
        {!!onMore && (
          <Tap onPress={onMore} accessibilityLabel={'Tout voir : ' + title} style={{ marginLeft: 'auto', minHeight: 40, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <T style={{ fontSize: 13, color: C.grey }}>Tout voir</T>
            <Chevron size={14} />
          </Tap>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Vignette d'un bandeau : photo, remise éventuelle sur le coin, prix, puis `note` (ancien prix barré ou quantité du palier). */
export function StripItem({ item, price, badge, note, strike = false, onPress }: {
  item: CatItem; price: number; badge?: string; note?: string; strike?: boolean; onPress: () => void;
}) {
  return (
    <Tap onPress={onPress} accessibilityLabel={item.n} style={{ width: THUMB, gap: 3 }}>
      <View style={{ width: THUMB, height: THUMB, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg }}>
        <Img uri={item.b} style={{ width: '100%', height: '100%' }} />
        {!!badge && (
          <View style={{ position: 'absolute', top: 0, left: 0, paddingHorizontal: 6, borderBottomRightRadius: 8, backgroundColor: C.red }}>
            <T w={700} style={{ fontSize: 11, lineHeight: 18, color: C.white }}>{badge}</T>
          </View>
        )}
      </View>
      <Price value={price} sizes={[11, 17, 11]} />
      {!!note && <T numberOfLines={1} style={{ fontSize: 11, color: C.grey4, textDecorationLine: strike ? 'line-through' : 'none' }}>{note}</T>}
    </Tap>
  );
}
