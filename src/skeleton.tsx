import React, { useEffect, useState } from 'react';
import { Animated, DimensionValue, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { C } from './theme';
import { reduceMotion } from './ui';

// Un seul moteur d'animation pour tous les squelettes : évite de lancer
// des dizaines de boucles natives quand une grille entière est en chargement.
const shimmer = new Animated.Value(0);
let shimmerLoop: Animated.CompositeAnimation | null = null;
let shimmerUsers = 0;

function useShimmer() {
  useEffect(() => {
    if (reduceMotion()) return;
    shimmerUsers += 1;
    if (!shimmerLoop) {
      shimmerLoop = Animated.loop(Animated.timing(shimmer, {
        toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true,
      }));
      shimmerLoop.start();
    }
    return () => {
      shimmerUsers -= 1;
      if (shimmerUsers === 0 && shimmerLoop) {
        shimmerLoop.stop();
        shimmerLoop = null;
        shimmer.setValue(0);
      }
    };
  }, []);
}

/**
 * Bloc gris animé (effet « shimmer ») qui remplace un contenu pendant son chargement.
 * `width` / `height` acceptent les mêmes valeurs qu'un style React Native.
 */
export function Skeleton({ width, height, radius = 6, style }: {
  width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  useShimmer();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={e => setW(e.nativeEvent.layout.width)}
      style={[{ width, height, borderRadius: radius, backgroundColor: '#E7E7E7', overflow: 'hidden' }, style]}
    >
      {w > 0 && !reduceMotion() && (
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: Math.max(48, w * 0.45),
          backgroundColor: 'rgba(255,255,255,0.72)',
          transform: [
            { translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w] }) },
            { skewX: '-18deg' },
          ],
        }} />
      )}
    </View>
  );
}

/** Carte produit (grille 2 colonnes) : photo, nom, étiquette, prix. */
export function SkeletonProductCard({ width }: { width: number }) {
  return (
    <View style={{ width, borderRadius: 6, backgroundColor: C.white, overflow: 'hidden' }}>
      <Skeleton width="100%" height={width} radius={0} />
      <View style={{ gap: 6, paddingTop: 7, paddingHorizontal: 7, paddingBottom: 9 }}>
        <Skeleton width="92%" height={13} radius={4} />
        <Skeleton width="55%" height={11} radius={4} />
        <Skeleton width={56} height={18} radius={4} style={{ marginTop: 2 }} />
      </View>
    </View>
  );
}

/** Ligne de l'onglet Promos : photo carrée, nom, prix. */
export function SkeletonPromoRow() {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.bg }}>
      <Skeleton width={112} height={112} radius={8} />
      <View style={{ flex: 1, gap: 7 }}>
        <Skeleton width="92%" height={14} radius={4} />
        <Skeleton width="60%" height={14} radius={4} />
        <View style={{ flex: 1 }} />
        <Skeleton width="55%" height={20} radius={4} />
      </View>
    </View>
  );
}

/** Ligne du panier : case, photo, nom, taille, prix et quantité. */
export function SkeletonCartRow() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 13, paddingRight: 12, borderTopWidth: 1, borderTopColor: C.bg }}>
      <Skeleton width={22} height={22} radius={11} />
      <Skeleton width={88} height={88} radius={6} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="85%" height={14} radius={4} />
        <Skeleton width={56} height={18} radius={4} />
        <Skeleton width="45%" height={17} radius={4} />
      </View>
    </View>
  );
}

/** Carte « lot » de l'onglet Gros : photo, prix, 3 paliers, bouton. */
export function SkeletonLotCard({ width }: { width: number }) {
  return (
    <View style={{ width, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden' }}>
      <Skeleton width="100%" height={width} radius={0} />
      <View style={{ gap: 6, paddingTop: 7, paddingHorizontal: 8, paddingBottom: 10 }}>
        <Skeleton width="90%" height={13} radius={4} />
        <Skeleton width={64} height={22} radius={4} />
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {[0, 1, 2].map(i => <Skeleton key={i} height={34} radius={5} style={{ flex: 1 }} />)}
        </View>
        <Skeleton width="100%" height={40} radius={10} />
      </View>
    </View>
  );
}

/** Carte commande : bandeau, statut, progression, articles. */
export function SkeletonOrderCard() {
  return (
    <View style={{ borderRadius: 14, backgroundColor: C.white, overflow: 'hidden' }}>
      <Skeleton width="100%" height={34} radius={0} />
      <View style={{ gap: 10, padding: 12 }}>
        <Skeleton width="45%" height={15} radius={4} />
        <Skeleton width="100%" height={5} radius={999} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Skeleton width={56} height={56} radius={8} />
          <Skeleton width={56} height={56} radius={8} />
          <View style={{ flex: 1 }} />
          <Skeleton width={72} height={16} radius={4} />
        </View>
      </View>
    </View>
  );
}

/** Colonne de droite de l'écran Catégories : sous-rayons puis grille d'articles. */
export function SkeletonCategories({ width }: { width: number }) {
  const col3 = (width - 20 - 12) / 3;
  const col2 = (width - 6) / 2;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ padding: 10, borderRadius: 12, backgroundColor: C.white, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 6 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={{ width: col3, alignItems: 'center', gap: 5 }}>
            <Skeleton width="100%" height={col3} radius={10} />
            <Skeleton width="80%" height={10} radius={4} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[0, 1, 2, 3].map(i => <SkeletonProductCard key={i} width={col2} />)}
      </View>
    </View>
  );
}

/** Fiche produit : photo, prix et nom, paliers de prix. */
export function SkeletonProduit({ width }: { width: number }) {
  return (
    <View style={{ gap: 8 }}>
      <Skeleton width={width} height={width} radius={0} />
      <View style={{ backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
        <Skeleton width={120} height={30} radius={4} />
        <Skeleton width="92%" height={18} radius={4} />
        <Skeleton width="60%" height={14} radius={4} />
      </View>
      <View style={{ backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
        <Skeleton width="45%" height={15} radius={4} />
        <Skeleton width="100%" height={52} radius={8} />
      </View>
    </View>
  );
}

/** Carte adresse de livraison : étiquette, nom, adresse, repère. */
export function SkeletonAddressCard() {
  return (
    <View style={{ borderRadius: 14, backgroundColor: C.white, padding: 14, gap: 8 }}>
      <Skeleton width={64} height={18} radius={4} />
      <Skeleton width="75%" height={14} radius={4} />
      <Skeleton width="95%" height={13} radius={4} />
      <Skeleton width="60%" height={12} radius={4} />
    </View>
  );
}

/** Suivi d'une commande : statut, étapes, articles. */
export function SkeletonTracking() {
  return (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <View style={{ backgroundColor: C.white, padding: 16, gap: 8 }}>
        <Skeleton width="55%" height={12} radius={4} />
        <Skeleton width="65%" height={20} radius={4} />
      </View>
      <View style={{ backgroundColor: C.white, padding: 16, gap: 18 }}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Skeleton width={22} height={22} radius={11} />
            <Skeleton width="55%" height={14} radius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}
