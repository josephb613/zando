import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Appear, Tap as Pressable, ProductCard, useProgressive } from '../ui';
import { SkeletonProductCard } from '../skeleton';
import { useNav, useOpenProduct } from '../nav';
import { useCatalog } from '../store';
import { rayonsOf } from '../catalog';
import { Icon, SearchIcon } from '../icons';
import { Shortcut, ShortcutKind } from './Accueil.parts';

/** Raccourcis sous l'en-tête : promos en cours, articles les moins chers, meilleures ventes. */
const SHORTCUTS: { kind: ShortcutKind; label: string }[] = [
  { kind: 'promo', label: 'Promos' },
  { kind: 'petitsPrix', label: 'Petits prix' },
  { kind: 'ventes', label: 'Meilleures ventes' },
];

export default function Accueil() {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const nav = useNav();
  const open = useOpenProduct();
  const [tab, setTab] = useState<string | null>(null);
  const { products, catalogReady } = useCatalog();
  const ready = catalogReady;
  const rayons = useMemo(() => rayonsOf(products), [products]);
  const all = useMemo(() => products.filter(p => !tab || p.c === tab), [products, tab]);
  const more = useProgressive(tab);
  const cardW = (W - 8 - 5) / 2;

  const go = (kind: ShortcutKind) => {
    if (kind === 'promo') nav.popTo('Tabs', { screen: 'Promos' });
    else nav.navigate('Resultats', { sort: kind === 'petitsPrix' ? 'asc' : 'sales' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={{ backgroundColor: C.white }}>
        <View style={{ paddingTop: insets.top + 8, paddingRight: 10, paddingBottom: 6, paddingLeft: 10, backgroundImage: 'linear-gradient(180deg, #FFE3D3 0%, #FFF3EC 60%, #FFFFFF 100%)' }}>
          <Pressable accessibilityLabel="Rechercher un article" onPress={() => nav.navigate('Recherche')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, padding: 2, paddingLeft: 12, borderRadius: 999, borderWidth: 2, borderColor: C.red, backgroundColor: C.white }}>
            <SearchIcon color={C.grey4} />
            <T numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 15, color: C.grey4 }}>Rechercher un article</T>
            <View style={{ height: '100%', paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundImage: `linear-gradient(90deg, ${C.brandLight} 0%, ${C.red} 100%)` }}>
              <T w={700} style={{ fontSize: 14, color: C.white }}>Rechercher</T>
            </View>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 18, paddingHorizontal: 12, alignItems: 'flex-end' }}>
            {[{ key: null, label: 'Tout' }, ...rayons].map(r => {
              const a = r.key === tab;
              return (
                <Pressable key={r.label} onPress={() => setTab(r.key)} accessibilityRole="tab" accessibilityState={{ selected: a }} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingBottom: 6 }}>
                  <T w={a ? 700 : 400} style={{ fontSize: a ? 17 : 15, color: a ? C.ink : C.grey }}>{r.label}</T>
                  <View style={{ position: 'absolute', bottom: 3, width: 18, height: 3, borderRadius: 2, backgroundColor: a ? C.red : 'transparent' }} />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable accessibilityLabel="Tous les rayons" onPress={() => nav.popTo('Tabs', { screen: 'Categories', params: { rayon: tab ?? undefined } })} style={{ width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, boxShadow: '-10px 0 8px -4px #FFFFFF' }}>
            <Icon name="menu" size={20} color={C.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} onScroll={more.onScroll} scrollEventThrottle={more.scrollEventThrottle} contentContainerStyle={{ gap: 8, paddingBottom: 14 }}>
        <View style={{ backgroundColor: C.white, paddingTop: 12, paddingHorizontal: 4, paddingBottom: 8, flexDirection: 'row', gap: 4 }}>
          {SHORTCUTS.map((s, i) => (
            <Pressable key={s.kind} onPress={() => go(s.kind)} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
              <Shortcut kind={s.kind} i={i} />
              <T style={{ fontSize: 12, color: C.greyIcon, textAlign: 'center', lineHeight: 15 }} numberOfLines={1}>{s.label}</T>
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {ready
            ? all.slice(0, more.limit).map((p, i) => <Appear key={p.k} i={i}><ProductCard item={p} width={cardW} onPress={() => open(p.k)} /></Appear>)
            : [0, 1, 2, 3, 4, 5].map(i => <SkeletonProductCard key={i} width={cardW} />)}
        </View>
      </ScrollView>
    </View>
  );
}
