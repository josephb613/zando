import React, { useEffect, useMemo } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Img, Tap as Pressable, ProductCard } from '../ui';
import { SkeletonProduit } from '../skeleton';
import { RootParams, useNav, useOpenProduct } from '../nav';
import { useCart, useCatalog, useHistory } from '../store';
import { CatItem, RAYON_LABEL, SIZES, currentPrice, isPromoActive, promoPercent } from '../catalog';
import { ORIGIN } from '../delivery';
import { hotColor, money, soldLabel } from '../format';
import { BackIcon, Icon, PinIcon, PlaneIcon } from '../icons';

/** Paliers de prix : [quantité min, prix unitaire, tranche « 1 à 5 pièces », « 6 à 29 », « 30 et + »]. */
function tiersOf(p: CatItem): [number, number, string][] {
  return p.t.map(([min, price], i) => {
    const last = p.t[i + 1] ? p.t[i + 1][0] - 1 : null;
    const range = last === null ? `${min} et +` : last > min ? `${min} à ${last}` : `${min}`;
    return [min, price, i === 0 ? `${range} pièce${last !== min ? 's' : ''}` : range];
  });
}

function BarButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: primary ? C.red : C.white, borderWidth: 2, borderColor: C.red }}>
      <T w={600} style={{ fontSize: 15, color: primary ? C.white : C.red }}>{label}</T>
    </Pressable>
  );
}

export default function Produit() {
  const route = useRoute<RouteProp<RootParams, 'Produit'>>();
  const nav = useNav();
  const open = useOpenProduct();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const { products, byKey, catalogReady } = useCatalog();
  const { itemCount } = useCart();
  const { addViewed } = useHistory();
  const ready = catalogReady;
  const p = byKey.get(route.params.id);

  useEffect(() => { if (p) addViewed(p.k); }, [p, addViewed]);

  // Articles du même rayon, dans l'ordre du catalogue, à partir de celui-ci.
  const similar = useMemo(() => {
    if (!p) return [];
    const same = products.filter(x => x.c === p.c && x.k !== p.k);
    const at = products.indexOf(p) % Math.max(same.length, 1);
    return [...same.slice(at), ...same.slice(0, at)].slice(0, 6);
  }, [p, products]);

  const top = (
    <View style={{ position: 'absolute', top: 10 + insets.top, left: 12 }}>
      <Pressable accessibilityLabel="Retour" onPress={() => nav.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(20,20,20,0.45)', alignItems: 'center', justifyContent: 'center' }}>
        <BackIcon size={20} color={C.white} />
      </Pressable>
    </View>
  );

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {ready ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <T w={600} style={{ fontSize: 16, textAlign: 'center' }}>Cet article n’est plus disponible.</T>
            <Pressable onPress={() => nav.goBack()} style={{ minHeight: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
              <T w={600} style={{ fontSize: 14, color: C.white }}>Retour</T>
            </Pressable>
          </View>
        ) : <SkeletonProduit width={W} />}
        {top}
      </View>
    );
  }

  const kin = p.o === 'kin';
  const price = currentPrice(p);
  const [pInt, pDec] = price.toFixed(2).split('.');
  const promo = isPromoActive(p);
  const sold = soldLabel(p.s);
  const tiers = tiersOf(p);
  const sizes = SIZES[p.kd];
  const cardW = (W - 12 - 6) / 2;
  const choose = (buy: boolean) => nav.navigate('Variantes', { id: p.k, buy });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        <View style={{ width: W, height: W, backgroundColor: C.white }}>
          <Img uri={p.b} style={{ width: W, height: W }} />
        </View>

        <View style={{ marginTop: -8, backgroundColor: C.white, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <T w={600} style={{ color: C.red }}>
              <T w={600} style={{ fontSize: 34, color: C.red }}>{pInt}</T>
              <T w={600} style={{ fontSize: 18, color: C.red }}>{',' + pDec + ' $'}</T>
            </T>
            {promo && !!p.pr && (
              <>
                <T style={{ fontSize: 14, color: C.grey4, textDecorationLine: 'line-through' }}>{money(p.pr[1])}</T>
                <View style={{ paddingHorizontal: 7, borderRadius: 4, backgroundColor: C.red }}>
                  <T w={700} style={{ fontSize: 12, lineHeight: 20, color: C.white }}>−{promoPercent(p)} %</T>
                </View>
              </>
            )}
            {!!sold && <T numberOfLines={1} style={{ marginLeft: 'auto', fontSize: 13, color: C.grey3 }}>{sold}</T>}
          </View>
          <T w={500} style={{ fontSize: 18, lineHeight: 25 }}>{p.n}</T>
          {!!p.h && <T w={500} style={{ fontSize: 13, color: hotColor(p.h) }}>{p.h}</T>}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {kin ? <PinIcon size={14} /> : <PlaneIcon size={14} />}
              <T w={500} style={{ fontSize: 14, color: kin ? C.green : C.blue }}>{ORIGIN[p.o].long}</T>
            </View>
            {kin && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="shieldCheck" size={14} color={C.green} active />
                <T w={500} style={{ fontSize: 14, color: C.green }}>Paiement à la livraison possible</T>
              </View>
            )}
          </View>
        </View>

        {tiers.length > 1 && (
          <View style={{ backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
            <T w={600} style={{ fontSize: 15 }}>Prix selon la quantité</T>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: 'hidden' }}>
              {tiers.map(([min, value, range], i) => (
                <View key={min} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', gap: 1, backgroundColor: i > 0 ? C.greenSoft2 : C.white, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.line }}>
                  <T w={600} style={{ fontSize: 16, color: i > 0 ? C.green : C.ink }}>{money(value)}</T>
                  <T style={{ fontSize: 11, color: C.grey }}>{range}</T>
                </View>
              ))}
            </View>
            {!!sizes && <T style={{ fontSize: 13, color: C.grey }}>{sizes.label === 'Taille' ? 'Toutes tailles confondues.' : 'Toutes pointures confondues.'}</T>}
          </View>
        )}

        {similar.length > 0 && (
          <View style={{ paddingTop: 4, paddingHorizontal: 6, gap: 8 }}>
            <T w={600} style={{ paddingHorizontal: 8, fontSize: 15 }}>{`Dans le rayon ${RAYON_LABEL[p.c] ?? ''}`.trim()}</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {similar.map(s => <ProductCard key={s.k} item={s} width={cardW} onPress={() => open(s.k)} />)}
            </View>
          </View>
        )}
      </ScrollView>

      {top}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingRight: 12, paddingBottom: 10 + insets.bottom, paddingLeft: 4, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        <Pressable onPress={() => nav.popTo('Tabs', { screen: 'Panier' })} accessibilityLabel={`Panier, ${itemCount} articles`} style={{ width: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <View>
            <Icon name="basket" size={24} color={C.grey} weight={0.9} />
            {itemCount > 0 && (
              <View style={{ position: 'absolute', top: -6, left: 14, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 999, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                <T w={600} style={{ fontSize: 10, color: C.white }}>{itemCount}</T>
              </View>
            )}
          </View>
          <T style={{ fontSize: 11, color: C.grey }}>Panier</T>
        </Pressable>
        <BarButton label="Ajouter au panier" onPress={() => choose(false)} />
        <BarButton label="Acheter" primary onPress={() => choose(true)} />
      </View>
    </View>
  );
}
