import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BackIcon, Appear, Tap as Pressable, ProductCard, useProgressive } from '../ui';
import { SkeletonProductCard } from '../skeleton';
import { RootParams, Sort, useNav, useOpenProduct, useRequireAuth } from '../nav';
import { useCatalog, useHistory } from '../store';
import { CatItem, RAYON_LABEL, currentPrice, fold } from '../catalog';
import { plural, soldNum } from '../format';
import { CloseIcon, Icon, SearchIcon } from '../icons';

type Origin = 'all' | 'kin' | 'cn';
const ORIGINS: { key: Origin; label: string; dot: string }[] = [
  { key: 'all', label: 'Tout', dot: C.grey5 },
  { key: 'kin', label: 'En stock à Kinshasa', dot: C.green },
  { key: 'cn', label: 'Import Chine', dot: C.blue },
];
const PRICES: [string, number, number][] = [['Moins de 5 $', 0, 5], ['5 à 15 $', 5, 15], ['15 à 50 $', 15, 50], ['Plus de 50 $', 50, Infinity]];

/** Prix de gros : premier palier au-delà de l'unité. */
const grosOf = (p: CatItem) => p.t[1] ?? p.t[0] ?? [1, currentPrice(p)];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityState={{ selected: active }} style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: active ? C.red : C.line2, backgroundColor: active ? C.redSoft : C.white, justifyContent: 'center' }}>
      <T w={500} style={{ fontSize: 13, color: active ? C.redDark : C.ink }}>{label}</T>
    </Pressable>
  );
}

function FilterSheet({ origins, origin, price, count, bottom, setOrigin, setPrice, onClose, onReset }: {
  origins: typeof ORIGINS; origin: Origin; price: number; count: string; bottom: number;
  setOrigin: (o: Origin) => void; setPrice: (i: number) => void; onClose: () => void; onReset: () => void;
}) {
  const fade = useState(() => new Animated.Value(0))[0];
  const up = useState(() => new Animated.Value(0))[0];
  const [sheetH, setSheetH] = useState(600);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 200, easing: Easing.ease, useNativeDriver: true }),
      Animated.timing(up, { toValue: 1, duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
    ]).start();
  }, [fade, up]);
  const groups = [
    ...(origins.length ? [{ title: 'Provenance', opts: origins.map(o => ({ label: o.label, active: origin === o.key, pick: () => setOrigin(o.key) })) }] : []),
    { title: 'Prix', opts: PRICES.map((r, i) => ({ label: r[0], active: price === i, pick: () => setPrice(price === i ? -1 : i) })) },
  ];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', opacity: fade }]}>
      <Pressable scale={1} accessibilityLabel="Fermer les filtres" onPress={onClose} style={{ flex: 1 }} />
      <Animated.View
        accessibilityLabel="Filtres"
        onLayout={e => setSheetH(e.nativeEvent.layout.height)}
        style={{ backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingRight: 6, paddingBottom: 4, paddingLeft: 18 }}>
          <T w={500} accessibilityRole="header" style={{ fontSize: 16 }}>Filtres</T>
          <Pressable onPress={onClose} accessibilityLabel="Fermer" style={{ marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon />
          </Pressable>
        </View>
        <View style={{ paddingTop: 4, paddingHorizontal: 18, paddingBottom: 14, gap: 14 }}>
          {groups.map(g => (
            <View key={g.title} style={{ gap: 8 }}>
              <T w={600} style={{ fontSize: 13 }}>{g.title}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {g.opts.map(o => <Chip key={o.label} label={o.label} active={o.active} onPress={o.pick} />)}
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 + bottom, borderTopWidth: 1, borderTopColor: C.line }}>
          <Pressable onPress={onReset} style={{ flex: 1, height: 50, borderRadius: 999, borderWidth: 2, borderColor: C.ink, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
            <T w={600} style={{ fontSize: 15 }}>Réinitialiser</T>
          </Pressable>
          <Pressable onPress={onClose} style={{ flex: 1.4, height: 50, borderRadius: 999, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
            <T w={600} style={{ fontSize: 15, color: C.white }}>Voir {count}</T>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function Resultats() {
  const route = useRoute<RouteProp<RootParams, 'Resultats'>>();
  const nav = useNav();
  const openProduct = useOpenProduct();
  const requireAuth = useRequireAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState(route.params?.q ?? '');
  const [sort, setSort] = useState<Sort>(route.params?.sort ?? 'rel');
  const [origin, setOrigin] = useState<Origin>('all');
  const [gros, setGros] = useState(false);
  const [filters, setFilters] = useState(false);
  const [price, setPrice] = useState(-1);
  const { products, catalogReady } = useCatalog();
  const { addSearch } = useHistory();
  const ready = catalogReady;
  // Le filtre de provenance n'est proposé que si le catalogue a les deux provenances.
  const mixed = useMemo(() => products.some(p => p.o === 'kin') && products.some(p => p.o === 'cn'), [products]);

  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  const unit = (p: CatItem) => (gros ? grosOf(p)[1] : currentPrice(p));
  let list = products.filter(p => {
    if (words.length) {
      const text = fold(`${p.n} ${p.h} ${RAYON_LABEL[p.c] ?? ''}`);
      if (!words.every(w => text.includes(w))) return false;
    }
    if (mixed && origin !== 'all' && p.o !== origin) return false;
    if (price >= 0) { const [, min, max] = PRICES[price]; const v = currentPrice(p); if (v < min || v >= max) return false; }
    return true;
  });
  if (sort === 'sales') list = list.slice().sort((a, b) => soldNum(b.s) - soldNum(a.s));
  if (sort === 'asc') list = list.slice().sort((a, b) => unit(a) - unit(b));
  if (sort === 'desc') list = list.slice().sort((a, b) => unit(b) - unit(a));
  const count = plural(list.length, 'article');
  const more = useProgressive(`${query}|${sort}|${origin}|${price}|${gros}`);
  const priceSort = sort === 'asc' || sort === 'desc';
  const activeFilters = (price >= 0 ? 1 : 0) + (mixed && origin !== 'all' ? 1 : 0);
  const sorts: { label: string; active: boolean; arrow: string; pick: () => void }[] = [
    { label: 'Pertinence', active: sort === 'rel', arrow: '', pick: () => setSort('rel') },
    { label: 'Ventes', active: sort === 'sales', arrow: '', pick: () => setSort('sales') },
    { label: 'Prix', active: priceSort, arrow: sort === 'desc' ? '▼' : sort === 'asc' ? '▲' : '▲▼', pick: () => setSort(sort === 'asc' ? 'desc' : 'asc') },
  ];
  const cardW = (width - 8 - 5) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: insets.top + 8, paddingBottom: 8, paddingLeft: 4, paddingRight: 12, backgroundColor: C.white }}>
        <Pressable accessibilityLabel="Retour" onPress={() => nav.goBack()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.bg2 }}>
          <SearchIcon size={18} color={C.grey2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => { if (query.trim()) addSearch(query.trim()); }}
            placeholder="Veste, écouteurs…"
            placeholderTextColor={C.grey4}
            returnKeyType="search"
            accessibilityLabel="Rechercher un article"
            style={{ flex: 1, minWidth: 0, fontSize: 15, color: C.ink, fontFamily: 'InstrumentSans_400Regular', outlineStyle: 'none' } as never}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Effacer la recherche" style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clear" size={18} color={C.grey7} active />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {sorts.map(s => (
          <Pressable key={s.label} onPress={s.pick} accessibilityState={{ selected: s.active }} style={{ flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <T w={s.active ? 600 : 400} style={{ fontSize: 14, color: s.active ? C.red : C.ink }}>{s.label}</T>
            {!!s.arrow && <T w={s.active ? 600 : 400} style={{ fontSize: 11, color: s.active ? C.red : C.ink }}>{s.arrow}</T>}
          </Pressable>
        ))}
        <Pressable onPress={() => setFilters(true)} style={{ flex: 1, height: 44, borderLeftWidth: 1, borderLeftColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="filter" size={16} color={activeFilters ? C.red : C.ink} />
          <T w={activeFilters ? 600 : 400} style={{ fontSize: 14, color: activeFilters ? C.red : C.ink }}>{activeFilters ? `Filtres (${activeFilters})` : 'Filtres'}</T>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} onScroll={more.onScroll} scrollEventThrottle={more.scrollEventThrottle} contentContainerStyle={{ gap: 8, paddingBottom: 10 + insets.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, paddingVertical: 10, paddingHorizontal: 12 }}>
          <T style={{ flexShrink: 1, fontSize: 13, color: C.grey }}>
            <T w={700} style={{ fontSize: 13 }}>{count}</T>{query.trim() ? ` pour « ${query.trim()} »` : ''}
          </T>
          <View accessibilityLabel="Prix affiché" style={{ marginLeft: 'auto', flexDirection: 'row', padding: 3, borderRadius: 8, backgroundColor: C.bg2 }}>
            {[{ label: 'Prix détail', on: !gros, pick: () => setGros(false) }, { label: 'Prix de gros', on: gros, pick: () => setGros(true) }].map(b => (
              <Pressable key={b.label} onPress={b.pick} accessibilityState={{ selected: b.on }} style={{ height: 28, paddingHorizontal: 10, borderRadius: 6, backgroundColor: b.on ? C.white : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <T w={600} style={{ fontSize: 12, color: b.on ? C.ink : C.grey2 }}>{b.label}</T>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 4, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
          {ready
            ? list.slice(0, more.limit).map((p, i) => (
              <Appear key={p.k} i={i}><ProductCard item={p} width={cardW} price={unit(p)} pricePrefix={gros ? `Dès ${grosOf(p)[0]} pcs ` : undefined}
                onPress={() => openProduct(p.k)} onCart={() => requireAuth(`Produit:${p.k}`, () => nav.navigate('Variantes', { id: p.k }))} /></Appear>
            ))
            : [0, 1, 2, 3, 4, 5].map(i => <SkeletonProductCard key={i} width={cardW} />)}
        </View>
        {ready && list.length === 0 && (
          <View style={{ marginHorizontal: 12, paddingVertical: 28, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', gap: 6 }}>
            <T w={600} style={{ fontSize: 15, textAlign: 'center' }}>Aucun article trouvé</T>
            {activeFilters > 0 && (
              <Pressable onPress={() => { setPrice(-1); setOrigin('all'); }} style={{ minHeight: 40, paddingHorizontal: 16, justifyContent: 'center' }}>
                <T w={600} style={{ fontSize: 14, color: C.red }}>Retirer les filtres</T>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {filters && (
        <FilterSheet
          origins={mixed ? ORIGINS : []} origin={origin} price={price} count={count} bottom={insets.bottom}
          setOrigin={setOrigin} setPrice={setPrice}
          onClose={() => setFilters(false)}
          onReset={() => { setPrice(-1); setOrigin('all'); }}
        />
      )}
    </View>
  );
}
