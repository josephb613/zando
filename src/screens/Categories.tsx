import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BackIcon, Img, Tap as Pressable, ProductCard, useProgressive } from '../ui';
import { SkeletonCategories } from '../skeleton';
import { TabParams, useNav, useOpenProduct } from '../nav';
import { useCatalog } from '../store';
import { rayonsOf } from '../catalog';
import { plural } from '../format';
import { SearchIcon } from '../icons';

/** Rayons à gauche ; à droite, les sous-rayons (filtres) et tous les articles du rayon choisi. */
export default function Categories() {
  const route = useRoute<RouteProp<TabParams, 'Categories'>>();
  const insets = useSafeAreaInsets();
  const { width: SW } = useWindowDimensions();
  const nav = useNav();
  const open = useOpenProduct();
  const { products, catalogReady } = useCatalog();
  const ready = catalogReady;
  const rayons = useMemo(() => rayonsOf(products), [products]);
  // Rayon demandé par l'écran précédent (paramètre), sinon le dernier choisi ici, sinon le premier.
  const [picked, setPicked] = useState<{ rayon: string; sub: string | null; from?: string } | null>(null);
  const asked = route.params?.rayon;
  const current = (picked && picked.from === asked ? picked.rayon : asked) ?? rayons[0]?.key;
  const rayon = rayons.find(r => r.key === current) ?? rayons[0];
  const sub = picked && picked.rayon === rayon?.key && picked.from === asked ? picked.sub : null;

  const inRayon = useMemo(() => products.filter(p => p.c === rayon?.key), [products, rayon]);
  const subs = useMemo(() => (rayon?.subs ?? []).flatMap(([label, re]) => {
    const first = inRayon.find(p => re.test(p.n));
    return first ? [{ label, re, img: first.b }] : [];
  }), [rayon, inRayon]);
  const subRe = subs.find(s => s.label === sub)?.re;
  const list = subRe ? inRayon.filter(p => subRe.test(p.n)) : inRayon;
  const more = useProgressive(`${rayon?.key}|${sub}`);

  const inner = SW - 98; // largeur utile de la colonne de droite
  const col3 = (inner - 16 - 20 - 12) / 3;
  const cardW = (inner - 16 - 6) / 2;
  const pick = (key: string, s: string | null) => setPicked({ rayon: key, sub: s, from: asked });

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: insets.top + 8, paddingRight: 12, paddingBottom: 8, paddingLeft: 4, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Pressable accessibilityLabel="Retour" onPress={() => nav.popTo('Tabs', { screen: 'Accueil' })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <Pressable accessibilityLabel="Rechercher un article" onPress={() => nav.navigate('Recherche')} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.bg2 }}>
          <SearchIcon />
          <T numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 15, color: C.grey4 }}>Rechercher un article</T>
        </Pressable>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <ScrollView accessibilityLabel="Rayons" showsVerticalScrollIndicator={false} style={{ width: 98, flexGrow: 0, backgroundColor: C.bg }}>
          {rayons.map(r => {
            const a = r.key === rayon?.key;
            return (
              <Pressable key={r.key} onPress={() => pick(r.key, null)} accessibilityRole="tab" accessibilityState={{ selected: a }} style={{ minHeight: 58, justifyContent: 'center', paddingTop: 10, paddingRight: 8, paddingBottom: 10, paddingLeft: 12, backgroundColor: a ? C.white : 'transparent' }}>
                <View style={{ position: 'absolute', left: 0, top: 16, bottom: 16, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: a ? C.red : 'transparent' }} />
                <T w={a ? 600 : 400} style={{ fontSize: 13, lineHeight: 17, color: a ? C.red : C.inkSoft }}>{r.label}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false} onScroll={more.onScroll} scrollEventThrottle={more.scrollEventThrottle} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingHorizontal: 8, paddingBottom: 14 }}>
          {ready && rayon ? (
            <>
              {subs.length > 0 && (
                <View style={{ padding: 10, borderRadius: 12, backgroundColor: C.white, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 6 }}>
                  {subs.map(s => {
                    const a = s.label === sub;
                    return (
                      <Pressable key={s.label} onPress={() => pick(rayon.key, a ? null : s.label)} accessibilityState={{ selected: a }} style={{ width: col3, alignItems: 'center', gap: 5 }}>
                        <View style={{ width: '100%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: a ? C.red : 'transparent', backgroundColor: C.bg }}>
                          <Img uri={s.img} style={{ width: '100%', height: '100%' }} />
                        </View>
                        <T w={a ? 600 : 400} style={{ fontSize: 12, textAlign: 'center', maxWidth: '100%', color: a ? C.red : C.ink }} numberOfLines={1}>{s.label}</T>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <T style={{ fontSize: 13, color: C.grey }}>{plural(list.length, 'article')}{sub ? ` · ${sub}` : ''}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {list.slice(0, more.limit).map(p => <ProductCard key={p.k} item={p} width={cardW} onPress={() => open(p.k)} />)}
              </View>
            </>
          ) : (
            <SkeletonCategories width={inner - 16} />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
