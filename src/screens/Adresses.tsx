import React from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { C, T } from '../theme';
import { Header, Radio, Tap as Pressable } from '../ui';
import { SkeletonAddressCard } from '../skeleton';
import { RootParams, useNav } from '../nav';
import { useAddresses } from '../store';
import { isKnownCommune, zoneFee } from '../delivery';
import { Icon } from '../icons';

/**
 * Carnet d'adresses. `pick` (depuis le panier ou le paiement) : toucher une adresse la choisit pour la livraison
 * et revient ; sinon, toucher une adresse l'ouvre pour la modifier.
 */
export default function Adresses() {
  const route = useRoute<RouteProp<RootParams, 'Adresses'>>();
  const nav = useNav();
  const pick = route.params?.pick === true;
  const { addresses, address, pickAddress, addressesReady } = useAddresses();
  const ready = addressesReady;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={pick ? 'Adresse de livraison' : 'Mes adresses'} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, padding: 12 }} showsVerticalScrollIndicator={false}>
        {!ready && [0, 1].map(i => <SkeletonAddressCard key={i} />)}
        {ready && addresses.map(a => {
          const on = pick && a.id === address?.id;
          const ok = isKnownCommune(a.commune);
          const choose = () => {
            if (pick && ok) { pickAddress(a.id); nav.goBack(); } else nav.navigate('Adresse', { id: a.id });
          };
          return (
            <View key={a.id} style={{ borderRadius: 14, borderWidth: 2, borderColor: on ? C.red : C.white, backgroundColor: C.white, overflow: 'hidden' }}>
              <Pressable onPress={choose} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${a.tag}, ${a.line}`}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 }}>
                {pick && <View style={{ marginTop: 2 }}><Radio on={on} /></View>}
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {!!a.tag && <T w={500} style={{ paddingVertical: 1, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.bg2, fontSize: 11 }}>{a.tag}</T>}
                    {a.isDefault && <T w={600} style={{ paddingVertical: 1, paddingHorizontal: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: C.redSoft, color: C.redDark, fontSize: 11 }}>Par défaut</T>}
                  </View>
                  <T w={600} style={{ fontSize: 14 }}>{a.name} · {a.phone}</T>
                  <T style={{ fontSize: 13, lineHeight: 18, color: C.inkSoft }}>{ok ? `${a.line}, ${a.commune}` : a.line}</T>
                  {!!a.landmark && <T style={{ fontSize: 12, lineHeight: 17, color: C.grey }}>Repère : {a.landmark}</T>}
                  {ok
                    ? <T w={500} style={{ fontSize: 12, color: C.green }}>Livraison standard {zoneFee(a.commune)}</T>
                    : <T w={600} style={{ fontSize: 12, color: C.amber }}>Commune à préciser avant de commander</T>}
                </View>
              </Pressable>
              {pick && (
                <Pressable onPress={() => nav.navigate('Adresse', { id: a.id })} style={{ minHeight: 44, paddingHorizontal: 14, alignItems: 'flex-end', justifyContent: 'center', borderTopWidth: 1, borderTopColor: C.bg2 }}>
                  <T w={500} style={{ fontSize: 13, color: C.red }}>Modifier</T>
                </Pressable>
              )}
            </View>
          );
        })}

        <Pressable onPress={() => nav.navigate('Adresse')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#FFA06B', backgroundColor: C.redSoft2 }}>
          <Icon name="plus" size={18} color={C.red} weight={1.15} />
          <T w={600} style={{ fontSize: 15, color: C.red }}>Ajouter une adresse</T>
        </Pressable>
      </ScrollView>
    </View>
  );
}
