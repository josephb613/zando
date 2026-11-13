import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Appear, Tap as Pressable, ProductCard, useProgressive } from '../ui';
import { SkeletonProductCard } from '../skeleton';
import { useNav, useOpenProduct, useRequireAuth } from '../nav';
import { useCatalog, useHistory, useLots } from '../store';
import { CatItem, currentPrice, isPromoActive, promoPercent, rayonsOf } from '../catalog';
import { money, plural } from '../format';
import { Icon, SearchIcon } from '../icons';
import { Shortcut, ShortcutKind, Strip, StripItem } from './Accueil.parts';

/** Raccourcis sous l'en-tête : promos en cours, articles les moins chers, meilleures ventes, prix de gros, suivi des commandes. */
const SHORTCUTS: { kind: ShortcutKind; label: string }[] = [
  { kind: 'promo', label: 'Promos' },
  { kind: 'petitsPrix', label: 'Petits prix' },
  { kind: 'ventes', label: 'Top ventes' },
  { kind: 'gros', label: 'Prix de gros' },
  { kind: 'commandes', label: 'Commandes' },
];

/** Nombre de vignettes par bandeau. */
const STRIP = 10;
/** Gain du meilleur palier de gros par rapport au prix à l'unité (0 à 1). */
const grosGain = (p: CatItem) => 1 - p.t[p.t.length - 1][1] / p.t[0][1];

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
  const requireAuth = useRequireAuth();
  const { viewed } = useHistory();
  const { lots: openLots } = useLots();

  // Bandeaux du rayon affiché : plus fortes remises, puis plus gros écarts entre l'unité et le lot.
  const promos = useMemo(() => all.filter(isPromoActive).sort((a, b) => promoPercent(b) - promoPercent(a)).slice(0, STRIP), [all]);
  const lots = useMemo(() => all.filter(p => p.t.length >= 2 && grosGain(p) > 0).sort((a, b) => grosGain(b) - grosGain(a)).slice(0, STRIP), [all]);
  // Lots groupés en cours du rayon affiché, avec leur article.
  const groupLots = useMemo(() => openLots.flatMap(l => {
    const p = all.find(x => x.k === l.productId);
    return p ? [{ l, p }] : [];
  }).slice(0, STRIP), [openLots, all]);
  const recent = useMemo(() => (tab ? [] : viewed.map(k => products.find(p => p.k === k)).filter((p): p is CatItem => !!p)), [tab, viewed, products]);
  const cardW = (W - 8 - 5) / 2;

  const go = (kind: ShortcutKind) => {
    if (kind === 'promo') nav.popTo('Tabs', { screen: 'Promos' });
    else if (kind === 'gros') requireAuth('Gros', () => nav.popTo('Tabs', { screen: 'Gros' }));
    else if (kind === 'commandes') requireAuth('Compte', () => nav.navigate('Commandes'));
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
        <View style={{ backgroundColor: C.white, paddingTop: 12, paddingHorizontal: 2, paddingBottom: 8, flexDirection: 'row' }}>
          {SHORTCUTS.map((s, i) => (
            <Pressable key={s.kind} onPress={() => go(s.kind)} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 4 }}>
              <Shortcut kind={s.kind} i={i} />
              <T style={{ fontSize: 12, color: C.greyIcon, textAlign: 'center', lineHeight: 15 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{s.label}</T>
            </Pressable>
          ))}
        </View>

        {ready && promos.length > 0 && (
          <Strip title="En promo" onMore={() => nav.popTo('Tabs', { screen: 'Promos' })}>
            {promos.map(p => <StripItem key={p.k} item={p} price={currentPrice(p)} badge={`−${promoPercent(p)} %`} note={p.pr && money(p.pr[1])} strike onPress={() => open(p.k)} />)}
          </Strip>
        )}
        {ready && groupLots.length > 0 && (
          <Strip title="Lots groupés" onMore={() => go('gros')}>
            {groupLots.map(({ l, p }) => <StripItem key={l.id} item={p} price={l.unit} note={`${plural(l.target - l.taken, 'pièce')} à réserver`} onPress={() => open(p.k)} />)}
          </Strip>
        )}
        {ready && lots.length > 0 && (
          <Strip title="Prix de gros" onMore={() => go('gros')}>
            {lots.map(p => {
              const [min, price] = p.t[p.t.length - 1];
              return <StripItem key={p.k} item={p} price={price} note={`dès ${min} pièces`} onPress={() => open(p.k)} />;
            })}
          </Strip>
        )}
        {ready && recent.length > 0 && (
          <Strip title="Vus récemment">
            {recent.map(p => <StripItem key={p.k} item={p} price={currentPrice(p)} onPress={() => open(p.k)} />)}
          </Strip>
        )}

        <View style={{ paddingHorizontal: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {ready
            ? all.slice(0, more.limit).map((p, i) => <Appear key={p.k} i={i}><ProductCard item={p} width={cardW} onPress={() => open(p.k)} /></Appear>)
            : [0, 1, 2, 3, 4, 5].map(i => <SkeletonProductCard key={i} width={cardW} />)}
        </View>
      </ScrollView>
    </View>
  );
}
