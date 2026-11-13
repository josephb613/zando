import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { BackIcon, Img, Tap as Pressable } from '../ui';
import { useNav, useOpenProduct } from '../nav';
import { useCatalog, useHistory } from '../store';
import { CatItem, currentPrice, rayonsOf } from '../catalog';
import { money } from '../format';
import { Icon, SearchIcon } from '../icons';

const SECTION = { backgroundColor: C.white, paddingTop: 12, paddingBottom: 14, gap: 10 } as const;

export default function Recherche() {
  const nav = useNav();
  const openProduct = useOpenProduct();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const { products, byKey } = useCatalog();
  const { searches, addSearch, clearSearches, viewed } = useHistory();
  const search = (query: string) => {
    const text = query.trim();
    if (text) addSearch(text);
    nav.navigate('Resultats', { q: text });
  };

  // Un article par rayon pour illustrer chaque rayon.
  const rayons = useMemo(() => rayonsOf(products).map(r => ({ ...r, img: products.find(p => p.c === r.key)?.b })), [products]);
  const seen = viewed.map(k => byKey.get(k)).filter((p): p is CatItem => !!p);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: insets.top + 8, paddingBottom: 8, paddingLeft: 4, paddingRight: 12, backgroundColor: C.white }}>
        <Pressable accessibilityLabel="Retour" onPress={() => nav.goBack()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingLeft: 12, paddingRight: 4, borderRadius: 999, borderWidth: 2, borderColor: C.red, backgroundColor: C.white }}>
          <SearchIcon color={C.red} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => search(q)}
            placeholder="Veste, écouteurs…"
            placeholderTextColor={C.grey4}
            returnKeyType="search"
            autoFocus
            accessibilityLabel="Rechercher un article"
            style={{ flex: 1, minWidth: 0, height: '100%', fontSize: 15, color: C.ink, fontFamily: 'InstrumentSans_400Regular', outlineStyle: 'none' } as never}
          />
          <Pressable onPress={() => search(q)} style={{ height: 32, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
            <T w={600} style={{ fontSize: 13, color: C.white }}>Chercher</T>
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 + insets.bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {searches.length > 0 && (
          <View style={[SECTION, { paddingHorizontal: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T w={500} accessibilityRole="header" style={{ fontSize: 14 }}>Recherches récentes</T>
              <Pressable onPress={clearSearches} accessibilityLabel="Effacer les recherches récentes" style={{ marginLeft: 'auto', width: 44, height: 32, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash" size={18} color={C.grey4} weight={0.9} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {searches.map(r => (
                <Pressable key={r} onPress={() => search(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.bg }}>
                  <Icon name="clock" size={13} color={C.grey4} />
                  <T style={{ fontSize: 13 }}>{r}</T>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={SECTION}>
          <T w={500} accessibilityRole="header" style={{ marginHorizontal: 16, fontSize: 14 }}>Rayons</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {rayons.map(r => (
              <Pressable key={r.key} onPress={() => nav.popTo('Tabs', { screen: 'Categories', params: { rayon: r.key } })} style={{ width: 72, alignItems: 'center', gap: 6 }}>
                <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: C.bg }}>
                  <Img uri={r.img} style={{ width: 60, height: 60 }} />
                </View>
                <T numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, textAlign: 'center' }}>{r.label}</T>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {seen.length > 0 && (
          <View style={SECTION}>
            <T w={500} accessibilityRole="header" style={{ marginHorizontal: 16, fontSize: 14 }}>Vus récemment</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {seen.map(p => (
                <Pressable key={p.k} onPress={() => openProduct(p.k)} accessibilityLabel={p.n} style={{ width: 96, gap: 4 }}>
                  <View style={{ width: 96, height: 96, borderRadius: 10, overflow: 'hidden', backgroundColor: C.bg }}>
                    <Img uri={p.b} style={{ width: 96, height: 96 }} />
                  </View>
                  <T w={600} style={{ fontSize: 14, color: C.red }}>{money(currentPrice(p))}</T>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
