import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Img, Appear, Tap as Pressable, OriginTag, Price, useProgressive } from '../ui';
import { SkeletonPromoRow } from '../skeleton';
import { useOpenProduct } from '../nav';
import { useCatalog } from '../store';
import { CatItem, currentPrice, isPromoActive, promoPercent } from '../catalog';
import { money, plural, soldLabel } from '../format';

type Origin = 'all' | 'kin' | 'cn';
const ORIGINS: [Origin, string][] = [['all', 'Toutes'], ['kin', 'Stock Kinshasa'], ['cn', 'Import Chine']];

/** Article en promo : photo, nom, ventes, prix promo, ancien prix barré et remise. */
function PromoRow({ p, onOpen }: { p: CatItem; onOpen: () => void }) {
  const sold = soldLabel(p.s);
  return (
    <Pressable onPress={onOpen} accessibilityLabel={p.n} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.bg }}>
      <View style={{ width: 112, height: 112, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg }}>
        <Img uri={p.b} style={{ width: '100%', height: '100%' }} />
        <OriginTag kin={p.o === 'kin'} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <T w={500} style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>{p.n}</T>
        {!!sold && <T style={{ fontSize: 12, color: C.grey4 }}>{sold}</T>}
        <View style={{ marginTop: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Price value={currentPrice(p)} sizes={[12, 20, 12]} />
          {!!p.pr && <T style={{ fontSize: 12, color: C.grey4, textDecorationLine: 'line-through' }}>{money(p.pr[1])}</T>}
          <View style={{ paddingHorizontal: 6, borderRadius: 4, backgroundColor: C.redSoft }}>
            <T w={700} style={{ fontSize: 12, lineHeight: 18, color: C.red }}>−{promoPercent(p)} %</T>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function Promos() {
  const insets = useSafeAreaInsets();
  const open = useOpenProduct();
  const [origin, setOrigin] = useState<Origin>('all');
  const { products, catalogReady } = useCatalog();
  const ready = catalogReady;

  // Promos en cours, de la plus forte remise à la plus faible.
  const promos = useMemo(
    () => products.filter(isPromoActive).sort((a, b) => promoPercent(b) - promoPercent(a)),
    [products],
  );
  // Le filtre de provenance n'apparaît que si les deux provenances ont des promos.
  const mixed = promos.some(p => p.o === 'kin') && promos.some(p => p.o === 'cn');
  const list = promos.filter(p => !mixed || origin === 'all' || p.o === origin);
  const more = useProgressive(origin);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, backgroundImage: `linear-gradient(125deg, ${C.brandLight} 0%, ${C.red} 70%)`, flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <T w={700} accessibilityRole="header" style={{ fontSize: 24, color: C.white }}>Promos</T>
        {ready && <T w={500} style={{ fontSize: 14, color: C.white }}>{plural(list.length, 'article')}</T>}
      </View>
      {mixed && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: C.white }} contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
          {ORIGINS.map(([key, label]) => {
            const a = key === origin;
            return (
              <Pressable key={key} onPress={() => setOrigin(key)} accessibilityRole="tab" accessibilityState={{ selected: a }} style={{ height: 34, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: a ? C.redSoft : C.bg }}>
                <T w={a ? 600 : 400} style={{ fontSize: 13, color: a ? C.red : C.ink }}>{label}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} onScroll={more.onScroll} scrollEventThrottle={more.scrollEventThrottle} contentContainerStyle={{ paddingBottom: 14 }}>
        <View style={{ backgroundColor: C.white }}>
          {ready
            ? list.slice(0, more.limit).map((p, i) => <Appear key={p.k} i={i}><PromoRow p={p} onOpen={() => open(p.k)} /></Appear>)
            : [0, 1, 2, 3].map(i => <SkeletonPromoRow key={i} />)}
        </View>
        {ready && list.length === 0 && (
          <T style={{ paddingVertical: 40, fontSize: 14, color: C.grey, textAlign: 'center' }}>Aucune promo en ce moment.</T>
        )}
      </ScrollView>
    </View>
  );
}
