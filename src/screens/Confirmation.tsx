import React from 'react';
import { Animated, Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Tap as Pressable, Thumb, usePopIn } from '../ui';
import { useNav } from '../nav';
import { useOrders } from '../store';
import { money, plural } from '../format';
import { ORIGIN } from '../delivery';
import { CASH } from '../payments';
import { Icon } from '../icons';

/** Commande qui vient d'être enregistrée : références, paiement attendu, articles et adresse. */
export default function Confirmation() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { lastOrder } = useOrders();
  const pop = usePopIn(0.3, 1.12, 500);
  const home = () => nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });

  if (!lastOrder) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: C.bg }}>
        <Pressable onPress={() => nav.replace('Commandes')} style={{ minHeight: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
          <T w={600} style={{ fontSize: 14, color: C.white }}>Mes commandes</T>
        </Pressable>
      </View>
    );
  }

  const { refs, total, count, savings, items, address, payMethod, payPhone, payUrl } = lastOrder;
  const cash = payMethod === CASH;
  const origins = (['kin', 'cn'] as const).filter(o => items.some(it => it.p?.o === o));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: C.white, paddingTop: 36 + insets.top, paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center', gap: 10 }}>
          <Animated.View style={[{ width: 66, height: 66, borderRadius: 33, backgroundColor: C.green2, alignItems: 'center', justifyContent: 'center' }, pop]}>
            <Icon name="check" size={32} color={C.white} weight={1.5} />
          </Animated.View>
          <T w={600} accessibilityRole="header" style={{ marginTop: 6, fontSize: 22 }}>Commande enregistrée</T>
          <T style={{ fontSize: 14, lineHeight: 20, color: C.grey, textAlign: 'center' }}>
            {cash
              ? <>Vous paierez <T w={700} style={{ color: C.ink }}>{money(total)}</T> à la livraison.</>
              : <><T w={700} style={{ color: C.ink }}>{money(total)}</T> à régler par {payMethod} au <T w={700} style={{ color: C.ink }}>{payPhone}</T>. Statut : en attente de paiement.</>}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 2 }}>
            {refs.map(r => (
              <View key={r} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.bg }}>
                <T w={500} style={{ fontSize: 13 }}>Commande n° {r}</T>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: C.white, padding: 16, gap: 12 }}>
          <T w={500} style={{ fontSize: 15 }}>{plural(count, 'article')}</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {items.map(it => <Thumb key={it.id} img={it.p?.b ?? ''} qty={it.qty} size={64} />)}
          </ScrollView>
          <View style={{ gap: 4 }}>
            {origins.map(o => <T key={o} style={{ fontSize: 13, color: C.inkSoft }}>{ORIGIN[o].long}</T>)}
            {savings > 0.004 && <T style={{ fontSize: 13, color: C.green2 }}>{`${money(savings)} économisés grâce aux prix de gros`}</T>}
          </View>
        </View>

        <View style={{ backgroundColor: C.white, padding: 16, gap: 4 }}>
          <T w={500} style={{ fontSize: 15 }}>Livraison</T>
          <T style={{ fontSize: 13, lineHeight: 19, color: C.inkSoft }}>{`${address.name} · ${address.phone}`}</T>
          <T style={{ fontSize: 13, lineHeight: 19, color: C.inkSoft }}>{[address.line, address.commune, address.landmark].filter(Boolean).join(' · ')}</T>
        </View>
      </ScrollView>

      <View style={{ gap: 8, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 16 + insets.bottom, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        {!!payUrl && (
          <Pressable onPress={() => Linking.openURL(payUrl).catch(() => {})} style={{ height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
            <T w={700} style={{ fontSize: 15, color: C.white }}>{`Payer ${money(total)}`}</T>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={home} style={{ flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: C.ink }}>
          <T w={600} style={{ fontSize: 15 }}>Continuer</T>
        </Pressable>
        <Pressable onPress={() => (refs.length === 1 ? nav.replace('Commande', { ref: refs[0] }) : nav.replace('Commandes'))} style={{ flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
          <T w={700} style={{ fontSize: 15, color: C.white }}>{refs.length === 1 ? 'Suivre la commande' : 'Mes commandes'}</T>
        </Pressable>
        </View>
      </View>
    </View>
  );
}
