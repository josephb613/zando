import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { C, T, W } from '../theme';
import { Img, Appear, Tap as Pressable, OriginTag, useProgressive } from '../ui';
import { SkeletonLotCard } from '../skeleton';
import { useNav, useOpenProduct, useRequireAuth } from '../nav';
import { OpenLot, useCatalog, useLots } from '../store';
import type { CatItem } from '../catalog';
import { money, plural, timeLeft } from '../format';
import { SearchIcon } from '../icons';

/** Gain du meilleur palier par rapport au prix à l'unité (0 à 1). */
const gain = (p: CatItem) => 1 - p.t[p.t.length - 1][1] / p.t[0][1];
/** Coût du plus petit lot (palier de gros) : quantité minimum × prix unitaire. */
const lotCost = (p: CatItem) => p.t[1][0] * p.t[1][1];

type Filter = 'all' | 'small' | 'kin' | 'cn';
const FILTERS: [Filter, string][] = [['all', 'Tous les lots'], ['small', 'Lot à moins de 100 $'], ['kin', 'Stock Kinshasa'], ['cn', 'Import Chine']];

const STY: { bg: string; color: string; q: string; w: W; d: 'line-through' | 'none' }[] = [
  { bg: C.bg, color: C.grey4, q: C.grey4, w: 400, d: 'line-through' },
  { bg: '#FFF1CC', color: '#6B4300', q: '#8A5A00', w: 600, d: 'none' },
  { bg: C.ink, color: C.gold, q: '#E8DFC8', w: 700, d: 'none' },
];
const GOLD = 'linear-gradient(180deg, #FFE08A 0%, #F7B733 100%)';
const GOLD_BTN = { backgroundImage: GOLD, boxShadow: '0 3px 0 #C98A12, inset 0 1px 0 rgba(255,255,255,0.7)' } as const;

/** Lot à la une : le plus gros écart entre le prix à l'unité et le meilleur palier, avec l'escalier des prix. */
function Featured({ p, onOpen, onOrder }: { p: CatItem; onOpen: () => void; onOrder: () => void }) {
  const max = p.t[0][1];
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 14, backgroundColor: '#232327' }}>
      <Pressable onPress={onOpen} accessibilityLabel={p.n} style={{ width: 128, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: C.white }}>
        <Img uri={p.b} style={{ width: '100%', height: '100%' }} />
        <OriginTag kin={p.o === 'kin'} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <T w={600} style={{ fontSize: 14, lineHeight: 18, color: C.white }} numberOfLines={2}>{p.n}</T>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          {p.t.map(([min, price], i) => {
            const best = i === p.t.length - 1;
            return (
              <View key={min} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 3 }}>
                <T w={best ? 700 : 500} style={{ fontSize: 12, color: best ? C.gold : C.grey6 }} numberOfLines={1}>{money(price)}</T>
                <View style={{ width: '100%', height: 14 + 34 * (price / max), borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: best ? C.gold : 'rgba(255,255,255,0.14)' }} />
                <T style={{ fontSize: 10, color: C.grey6 }} numberOfLines={1}>{i === 0 ? '1 pièce' : 'dès ' + min}</T>
              </View>
            );
          })}
        </View>
        <Pressable onPress={onOrder} style={{ height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, ...GOLD_BTN }}>
          <T w={700} style={{ fontSize: 14, color: C.brown }}>Commander le lot</T>
          <T w={700} style={{ fontSize: 12, color: C.brown, opacity: 0.7 }}>−{Math.round(gain(p) * 100)} %</T>
        </Pressable>
      </View>
    </View>
  );
}

/** Lot groupé en cours : photo, prix du lot, avancement et échéance ; ouvre la fiche de l'article. */
function GroupLot({ p, lot, now, onOpen }: { p: CatItem; lot: OpenLot; now: number; onOpen: () => void }) {
  const left = lot.target - lot.taken;
  return (
    <Pressable onPress={onOpen} accessibilityLabel={`Lot groupé : ${p.n}, ${plural(left, 'pièce')} à réserver`} style={{ width: 236, flexDirection: 'row', gap: 10, padding: 8, borderRadius: 12, backgroundColor: C.white }}>
      <View style={{ width: 76, height: 76, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg }}>
        <Img uri={p.b} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T numberOfLines={1} style={{ fontSize: 13 }}>{p.n}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <T w={700} style={{ fontSize: 16 }}>{money(lot.unit)}</T>
          <T style={{ fontSize: 11, color: C.grey4 }}>/pièce</T>
        </View>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' }}>
          <View style={{ height: 6, borderRadius: 999, backgroundImage: GOLD, width: `${Math.round((lot.taken / lot.target) * 100)}%` }} />
        </View>
        <T numberOfLines={1} style={{ fontSize: 11, color: C.grey }}>{`${lot.mine > 0 ? `${lot.mine} pour vous · ` : ''}reste ${left} · ${timeLeft(lot.expiresAt, now)}`}</T>
      </View>
    </Pressable>
  );
}

function LotCard({ p, width, shine, onOpen, onOrder }: {
  p: CatItem; width: number; shine: Animated.Value; onOpen: () => void; onOrder: () => void;
}) {
  const best = p.t[p.t.length - 1][1].toFixed(2).split('.');
  return (
    <View style={{ width, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden' }}>
      <Pressable onPress={onOpen} accessibilityLabel={p.n} style={{ width: '100%', aspectRatio: 1, backgroundColor: C.bg }}>
        <Img uri={p.b} style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', top: 0, left: 0, paddingVertical: 3, paddingLeft: 8, paddingRight: 10, borderBottomRightRadius: 10, backgroundImage: GOLD }}>
          <T w={700} style={{ fontSize: 12, color: C.brown }} numberOfLines={1}>Lot de {p.t[1][0]}</T>
        </View>
        <OriginTag kin={p.o === 'kin'} />
      </Pressable>
      <View style={{ gap: 6, paddingTop: 7, paddingHorizontal: 8, paddingBottom: 10 }}>
        <T style={{ fontSize: 14, lineHeight: 18 }} numberOfLines={1}>{p.n}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <T w={700} style={{ fontSize: 22 }} numberOfLines={1}>
            <T w={700} style={{ fontSize: 12 }}>$</T>{best[0]}<T w={700} style={{ fontSize: 13 }}>{',' + best[1]}</T>
          </T>
          <T style={{ fontSize: 11, color: C.grey4 }}>/pièce</T>
          <View style={{ marginLeft: 'auto', paddingHorizontal: 5, borderRadius: 3, backgroundColor: C.ink }}>
            <T w={700} style={{ color: C.gold, fontSize: 11, lineHeight: 17 }}>−{Math.round(gain(p) * 100)} %</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {p.t.slice(0, 3).map(([min, price], i) => {
            const s = STY[i];
            return (
              <View key={min} style={{ flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 3, paddingBottom: 4, borderRadius: 5, backgroundColor: s.bg }}>
                <T style={{ fontSize: 10, color: s.q }}>{i === 0 ? 'unité' : 'dès ' + min}</T>
                <T w={s.w} style={{ fontSize: 12, color: s.color, textDecorationLine: s.d }} numberOfLines={1}>{money(price)}</T>
              </View>
            );
          })}
        </View>
        <Pressable onPress={onOrder} style={{ height: 40, marginTop: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 10, overflow: 'hidden', ...GOLD_BTN }}>
          <T w={700} style={{ fontSize: 14, color: C.brown }}>Commander le lot</T>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 18, backgroundColor: 'rgba(255,255,255,0.55)', transform: [
            { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-40, 230] }) },
            { skewX: '-20deg' },
          ] }} />
        </Pressable>
      </View>
    </View>
  );
}

/** Barre d'état claire tant que l'onglet est affiché ; isolée pour ne pas redessiner tout l'écran à chaque changement d'onglet. */
function LightStatusBar() {
  return useIsFocused() ? <StatusBar style="light" /> : null;
}

export default function Gros() {
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const nav = useNav();
  const open = useOpenProduct();
  const requireAuth = useRequireAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const shine = useState(() => new Animated.Value(0))[0];
  const { products, byKey, catalogReady } = useCatalog();
  const { lots: openLots, now } = useLots();
  const ready = catalogReady;

  // Reflet `lotShine` (3,2 s : immobile jusqu'à 60 %, traverse le bouton jusqu'à 90 %).
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.delay(1920),
      Animated.timing(shine, { toValue: 1, duration: 960, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.delay(320),
    ]));
    a.start();
    return () => a.stop();
  }, [shine]);

  // Tout article avec au moins un palier de gros se vend en lot.
  const lots = useMemo(() => products.filter(p => p.t.length >= 2), [products]);
  const featured = useMemo(() => lots.reduce<CatItem | undefined>((best, p) => (!best || gain(p) > gain(best) ? p : best), undefined), [lots]);
  const mixed = lots.some(p => p.o === 'kin') && lots.some(p => p.o === 'cn');
  const filters = FILTERS.filter(([k]) => mixed || (k !== 'kin' && k !== 'cn'));
  const list = lots.filter(p => {
    if (filter === 'kin' || filter === 'cn') return p.o === filter;
    if (filter === 'small') return lotCost(p) < 100;
    return true;
  });
  const groupLots = openLots.flatMap(l => {
    const p = byKey.get(l.productId);
    return p ? [{ l, p }] : [];
  });
  const more = useProgressive(filter);
  const cardW = (SW - 10 - 6) / 2;
  const order = (p: CatItem) => requireAuth(`Produit:${p.k}`, () => nav.navigate('Variantes', { id: p.k, buy: true }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LightStatusBar />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 10, paddingBottom: 8, backgroundImage: 'linear-gradient(180deg, #3A2E12 0%, #17171A 100%)' }}>
        <Pressable accessibilityLabel="Rechercher un article" onPress={() => nav.navigate('Recherche')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, padding: 2, paddingLeft: 12, borderRadius: 999, borderWidth: 2, borderColor: C.gold, backgroundColor: '#26262A' }}>
          <SearchIcon color={C.gold} />
          <T style={{ flex: 1, minWidth: 0, fontSize: 15, color: '#BDBDBD' }} numberOfLines={1}>Rechercher un article</T>
          <View style={{ height: '100%', paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundImage: GOLD }}>
            <T w={700} style={{ fontSize: 14, color: C.brown }}>Chercher</T>
          </View>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} onScroll={more.onScroll} scrollEventThrottle={more.scrollEventThrottle} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        {ready && featured && (
          <View style={{ backgroundColor: C.night, paddingTop: 4, paddingHorizontal: 10, paddingBottom: 14 }}>
            <Featured p={featured} onOpen={() => open(featured.k)} onOrder={() => order(featured)} />
          </View>
        )}

        {ready && groupLots.length > 0 && (
          <View style={{ gap: 8, paddingTop: 4 }}>
            <T w={700} accessibilityRole="header" style={{ paddingHorizontal: 12, fontSize: 16 }}>Lots groupés en cours</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
              {groupLots.map(({ l, p }) => <GroupLot key={l.id} p={p} lot={l} now={now} onOpen={() => open(p.k)} />)}
            </ScrollView>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4, paddingHorizontal: 12 }}>
          {filters.map(([k, label]) => {
            const a = k === filter;
            return (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: a }} onPress={() => setFilter(k)} style={{ height: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: a ? C.ink : C.white }}>
                <T w={a ? 700 : 400} style={{ fontSize: 13, color: a ? C.gold : C.ink }}>{label}</T>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 5 }}>
          {ready
            ? list.slice(0, more.limit).map((p, i) => (
              <Appear key={p.k} i={i}><LotCard p={p} width={cardW} shine={shine} onOpen={() => open(p.k)} onOrder={() => order(p)} /></Appear>
            ))
            : [0, 1, 2, 3].map(i => <SkeletonLotCard key={i} width={cardW} />)}
        </View>
        {ready && list.length === 0 && (
          <T style={{ paddingVertical: 28, fontSize: 14, color: C.grey, textAlign: 'center' }}>Aucun lot pour ce filtre.</T>
        )}
      </ScrollView>
    </View>
  );
}
