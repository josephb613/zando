/** Animations réutilisables ; toutes respectent « Réduire les animations » du téléphone. */
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// « Réduire les animations » du téléphone : on coupe les effets de mouvement.
let reduce = false;
AccessibilityInfo.isReduceMotionEnabled?.().then(v => { reduce = v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', v => { reduce = v; });
export const reduceMotion = () => reduce;
/** Vrai quand les animations en boucle doivent tourner : écran visible et « Réduire les animations » désactivé. */
export function useAnimate() {
  const focused = useIsFocused();
  return focused && !reduce;
}

const APressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable qui s'enfonce sous le doigt puis rebondit au relâcher.
 * L'enfoncement est plafonné à ~10 px de largeur pour que les grandes lignes ne « sautent » pas.
 */
export function Tap({ scale = 0.95, style, onPressIn, onPressOut, onLayout, ...rest }: PressableProps & { scale?: number }) {
  const s = useState(() => new Animated.Value(1))[0];
  const w = useRef(0);
  if (typeof style === 'function') return <Pressable {...rest} style={style} onPressIn={onPressIn} onPressOut={onPressOut} onLayout={onLayout} />;
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const base = Array.isArray(flat.transform) ? flat.transform : [];
  return (
    <APressable
      {...rest}
      onLayout={e => { w.current = e.nativeEvent.layout.width; onLayout?.(e); }}
      onPressIn={e => {
        if (!reduce) Animated.spring(s, { toValue: Math.max(scale, w.current ? 1 - 10 / w.current : scale), speed: 60, bounciness: 0, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        Animated.spring(s, { toValue: 1, speed: 18, bounciness: 10, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
      style={[flat, { transform: [...base, { scale: s }] }] as never}
    />
  );
}

/** Au-delà des premiers éléments (hors de l'écran), la liste s'affiche directement, sans attendre la cascade. */
const APPEAR_MAX = 6;

/** Apparition en fondu + légère montée ; `i` décale l'entrée pour un effet cascade dans les listes. */
export function Appear({ i = 0, dy = 14, style, children }: { i?: number; dy?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const still = reduce || i >= APPEAR_MAX;
  const v = useState(() => new Animated.Value(still ? 1 : 0))[0];
  useEffect(() => {
    if (still) return;
    Animated.timing(v, { toValue: 1, duration: 260, delay: i * 30, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, i, still]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Petit rebond élastique chaque fois que `trigger` change (badge, compteur). */
export function Bump({ trigger, skip = false, children, style }: { trigger: unknown; skip?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce || skip) return;
    s.setValue(0.6);
    Animated.spring(s, { toValue: 1, speed: 14, bounciness: 16, useNativeDriver: true }).start();
  }, [trigger, s]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}

/** Grossit brièvement (1 → peak → 1) à chaque changement de `trigger` (pas au montage) : prix, quantité. */
export function Pop({ trigger, peak = 1.12, duration = 250, children, style }: {
  trigger: string | number; peak?: number; duration?: number; children: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const s = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    s.setValue(1);
    Animated.sequence([
      Animated.timing(s, { toValue: peak, duration: duration * 0.35, useNativeDriver: true }),
      Animated.timing(s, { toValue: 1, duration: duration * 0.65, useNativeDriver: true }),
    ]).start();
  }, [trigger, s, peak, duration]);
  return <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>;
}

/**
 * Halo rond qui s'élargit de `spread` px en s'effaçant, en boucle.
 * `yoyo` : le halo revient au lieu de repartir de zéro. Positionné en absolu : placer avec `style`.
 */
export function Pulse({ size, spread = 12, color = 'rgba(255,80,0,0.45)', yoyo = false, style }: {
  size: number; spread?: number; color?: string; yoyo?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce) return undefined;
    const a = Animated.loop(yoyo
      ? Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 800, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 800, easing: Easing.ease, useNativeDriver: true }),
        ])
      : Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.ease, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v, yoyo]);
  return (
    <Animated.View pointerEvents="none" style={[{
      position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, (size + spread * 2) / size] }) }],
    }, style]} />
  );
}

/** Apparition « popIn » : échelle from → over → 1 avec fondu. Renvoie le style animé à poser sur un Animated.View. */
export function usePopIn(from: number, over: number, duration: number) {
  const v = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => {
    if (reduce) return;
    Animated.timing(v, { toValue: 1, duration, easing: Easing.ease, useNativeDriver: true }).start();
  }, [v, duration]);
  return {
    opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [from, over, 1] }) }],
  };
}
