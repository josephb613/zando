/** Affichage des articles : prix, provenance, vignette, carte de grille. */
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { C, T, W } from '../theme';
import { Icon } from '../icons';
import { CatItem, currentPrice } from '../catalog';
import { ORIGIN } from '../delivery';
import { hotColor, priceParts, soldLabel } from '../format';
import { Tap } from './motion';
import { Img } from './media';

/**
 * Étiquette de provenance collée au coin bas-gauche de la photo (le parent est la photo, en position relative).
 * Bande pleine, texte blanc, seul le coin haut-droit est arrondi : vert pour Kinshasa, bleu pour la Chine.
 */
export function OriginTag({ kin }: { kin: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0, paddingLeft: 7, paddingRight: 8, borderTopRightRadius: 8, backgroundColor: kin ? C.green : C.blue }}>
      <T w={600} numberOfLines={1} style={{ fontSize: 11, lineHeight: 19, color: C.white, letterSpacing: 0.1 }}>{ORIGIN[kin ? 'kin' : 'cn'].tag}</T>
    </View>
  );
}

/** Prix « $ 12 ,50 » à trois tailles [$, entier, décimales], aligné sur la ligne de base ; `prefix` à la taille du $. */
export function Price({ value, sizes, color = C.red, w = 600, prefix, style }: {
  value: number; sizes: [number, number, number]; color?: string; w?: W; prefix?: string; style?: StyleProp<ViewStyle>;
}) {
  const { int, dec } = priceParts(value);
  return (
    <View style={style}>
      <T w={w} style={{ color, fontSize: sizes[1] }} numberOfLines={1}>
        {!!prefix && <T w={500} style={{ fontSize: sizes[0] }}>{prefix}</T>}
        <T w={w} style={{ fontSize: sizes[0] }}>$</T>
        {int}
        <T w={w} style={{ fontSize: sizes[2] }}>{dec}</T>
      </T>
    </View>
  );
}

/** Vignette article avec quantité « ×n ». */
export function Thumb({ img, qty, size }: { img: string; qty: number; size: number }) {
  return (
    <View style={{ flexShrink: 0, width: size, height: size, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg }}>
      <Img uri={img} style={{ width: size, height: size }} />
      <View style={{ position: 'absolute', right: 2, bottom: 2, paddingHorizontal: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <T w={600} style={{ color: C.white, fontSize: 10 }}>×{qty}</T>
      </View>
    </View>
  );
}

/**
 * Carte d'article des grilles (accueil, rayons, résultats, fiche produit).
 * - `price` / `pricePrefix` : prix affiché à la place du prix courant (prix de gros « Dès 10 pcs »).
 * - `onCart` : ajoute le bouton panier rond en bas à droite.
 */
export function ProductCard({ item, width, onPress, price, pricePrefix, onCart }: {
  item: CatItem; width: number; onPress: () => void; price?: number; pricePrefix?: string; onCart?: () => void;
}) {
  const sold = soldLabel(item.s);
  const body = (
    <>
      <View style={{ width, height: width, backgroundColor: C.bg }}>
        <Img uri={item.b} style={{ width: '100%', height: '100%' }} />
        <OriginTag kin={item.o === 'kin'} />
      </View>
      <View style={{ gap: 3, paddingTop: 6, paddingHorizontal: 7, paddingBottom: 8 }}>
        <T numberOfLines={1} style={{ fontSize: 14, lineHeight: 18 }}>{item.n}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 16 }}>
          {!!item.h && <T numberOfLines={1} style={{ flexShrink: 1, fontSize: 12, color: hotColor(item.h) }}>{item.h}</T>}
          {!!sold && <T numberOfLines={1} style={{ marginLeft: 'auto', fontSize: 12, color: C.grey4 }}>{sold}</T>}
        </View>
        <Price value={price ?? currentPrice(item)} prefix={pricePrefix} sizes={[12, 21, 13]} style={{ paddingRight: onCart ? 34 : 0 }} />
      </View>
    </>
  );
  const card = { width, borderRadius: 6, backgroundColor: C.white, overflow: 'hidden' } as const;
  if (!onCart) return <Tap onPress={onPress} accessibilityLabel={item.n} style={card}>{body}</Tap>;
  return (
    <View style={card}>
      <Tap onPress={onPress} accessibilityLabel={item.n}>{body}</Tap>
      <Tap onPress={onCart} accessibilityLabel={'Ajouter au panier : ' + item.n} style={{ position: 'absolute', right: 7, bottom: 7, width: 32, height: 32, borderRadius: 16, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.redDisabled, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="basketPlus" size={18} color={C.red} />
      </Tap>
    </View>
  );
}
