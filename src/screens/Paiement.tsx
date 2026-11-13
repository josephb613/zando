import React, { useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, Illus, T } from '../theme';
import { Header, Radio, Tap as Pressable, DashLine, Thumb } from '../ui';
import { useNav } from '../nav';
import { isDeliverable, useAddresses, useAuth, useCart, useOrders } from '../store';
import { SHIP_ICONS } from '../shipIcons';
import { money, plural } from '../format';
import { ORIGIN, SHIPS, shipPrice } from '../delivery';
import { CASH, PAYS, PayTag } from '../payments';
import { OrdersError } from '../firebase';
import { Icon, PinIcon, PlaneIcon } from '../icons';

const H2 = { fontSize: 15 } as const;
const SECTION = { backgroundColor: C.white, padding: 14, gap: 10 } as const;
const opt = (a: boolean) => ({ borderColor: a ? C.red : C.line, backgroundColor: a ? C.redSoft : C.white });

export default function Paiement() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { connected } = useAuth();
  const { address, addressesReady } = useAddresses();
  const { items, totals, commune, payMethod, setPayMethod, payPhone, setPayPhone, shipIndex, setShipIndex } = useCart();
  const { placeOrder } = useOrders();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lockRef = useRef(false);

  const picked = items.filter(it => it.selected && it.p);
  const kinOnly = totals.cn === 0;
  const mobile = payMethod !== CASH;
  const deliverable = isDeliverable(address);
  const phoneOk = !mobile || payPhone.replace(/\D/g, '').length >= 9;
  const canOrder = connected && deliverable && totals.count > 0 && phoneOk && !busy;

  const submit = async () => {
    if (lockRef.current) return;
    if (!connected) { nav.navigate('Connexion', { next: 'Paiement' }); return; }
    lockRef.current = true;
    setBusy(true);
    setError('');
    try {
      const created = await placeOrder();
      if (created.payUrl) Linking.openURL(created.payUrl).catch(() => {});
      nav.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Confirmation' }] });
    } catch (e) {
      // Erreurs métier du serveur (produit indisponible, commune non desservie…) : message tel quel.
      setError(e instanceof OrdersError && e.code !== 'internal' && e.code !== 'unavailable'
        ? e.message
        : 'La commande n’a pas pu être enregistrée. Vérifiez votre connexion et réessayez.');
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  };

  const label = !connected ? 'Se connecter pour commander' : busy ? 'Enregistrement…' : `Commander · ${money(totals.total)}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Paiement" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingVertical: 8 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {connected && addressesReady && (
          <View style={{ backgroundColor: C.white }}>
            <Pressable onPress={() => (address ? nav.navigate('Adresses', { pick: true }) : nav.navigate('Adresse'))} accessibilityLabel="Adresse de livraison" style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <PinIcon size={22} color={C.red} />
              {address ? (
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <T w={600} style={{ fontSize: 14 }}>{`${address.name} · ${address.phone}`}</T>
                  <T style={{ fontSize: 13, lineHeight: 18, color: C.grey }}>{[address.line, deliverable ? address.commune : '', address.landmark].filter(Boolean).join(' · ')}</T>
                  {!deliverable && <T w={600} style={{ fontSize: 12, color: C.amber }}>Commune à préciser : touchez pour modifier l’adresse</T>}
                </View>
              ) : (
                <T w={600} style={{ flex: 1, fontSize: 14, color: C.red }}>Ajouter une adresse de livraison</T>
              )}
              <T w={600} style={{ fontSize: 13, color: C.red }}>{address ? 'Modifier' : ''}</T>
            </Pressable>
            <DashLine color={C.redDisabled} width={3} dash="9 6" />
          </View>
        )}

        <View style={SECTION}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T w={500} style={H2}>{plural(totals.count, 'article')}</T>
            <Pressable onPress={() => nav.popTo('Tabs', { screen: 'Panier' })} style={{ marginLeft: 'auto', minHeight: 32, justifyContent: 'center' }}>
              <T w={500} style={{ fontSize: 13, color: C.red }}>Modifier</T>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {totals.kin > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.greenSoft }}>
                <PinIcon color={C.green} size={14} />
                <T w={600} style={{ fontSize: 12, color: C.green }}>{kinOnly ? ORIGIN.kin.delay : `${plural(totals.kin, 'article')} · ${ORIGIN.kin.delay.toLowerCase()}`}</T>
              </View>
            )}
            {totals.cn > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.blueSoft }}>
                <PlaneIcon size={13} />
                <T w={600} style={{ fontSize: 12, color: C.blue }}>{totals.kin === 0 ? ORIGIN.cn.delay : `${plural(totals.cn, 'article')} · ${ORIGIN.cn.delay.toLowerCase()}`}</T>
              </View>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {picked.map(it => <Thumb key={it.id} img={it.p?.b ?? ''} qty={it.qty} size={66} />)}
          </ScrollView>
        </View>

        <View style={SECTION}>
          <T w={500} style={H2}>Livraison</T>
          {SHIPS.map((o, i) => {
            if (o.kinOnly && !kinOnly) return null;
            const a = i === shipIndex;
            const price = shipPrice(i, commune, totals.subtotal) ?? 0;
            return (
              <Pressable key={o.label} onPress={() => setShipIndex(i)} accessibilityRole="radio" accessibilityState={{ checked: a }}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2 }, opt(a)]}>
                <Radio on={a} />
                <View style={{ marginVertical: -8, marginHorizontal: -4 }}><Illus xml={SHIP_ICONS[o.icon]} size={48} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T w={600} style={{ fontSize: 14 }}>{o.label}</T>
                  <T style={{ fontSize: 12, color: C.grey }}>{o.detail}</T>
                </View>
                <T w={600} style={{ fontSize: 14, color: price === 0 ? C.green2 : C.ink }}>{price === 0 ? 'Gratuit' : money(price)}</T>
              </Pressable>
            );
          })}
        </View>

        <View style={SECTION}>
          <T w={500} style={H2}>Moyen de paiement</T>
          {PAYS.map(o => {
            // Paiement à la livraison : seulement si toute la commande vient du stock de Kinshasa.
            if (o.label === CASH && !kinOnly) return null;
            const a = o.label === payMethod;
            return (
              <Pressable key={o.label} onPress={() => { setPayMethod(o.label); setError(''); }} accessibilityRole="radio" accessibilityState={{ checked: a }}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2 }, opt(a)]}>
                <Radio on={a} />
                <PayTag method={o.label} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <T w={600} style={{ fontSize: 14 }}>{o.label}</T>
                  <T style={{ fontSize: 12, color: C.grey }}>{o.detail}</T>
                </View>
              </Pressable>
            );
          })}
          {mobile && (
            <View style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: C.bg }}>
              <T w={500} style={{ fontSize: 13, color: C.inkSoft }}>Numéro {payMethod} à débiter</T>
              <TextInput accessibilityLabel={`Numéro ${payMethod}`} value={payPhone} onChangeText={setPayPhone} keyboardType="phone-pad" placeholder="+243 …" placeholderTextColor={C.grey4}
                style={{ height: 46, paddingHorizontal: 12, borderWidth: 1.5, borderColor: phoneOk ? C.grey6 : C.amber, borderRadius: 10, fontSize: 15, backgroundColor: C.white, color: C.ink, fontFamily: 'InstrumentSans_400Regular' }} />
            </View>
          )}
        </View>

        <View style={[SECTION, { gap: 8 }]}>
          <T w={500} style={[H2, { marginBottom: 2 }]}>Récapitulatif</T>
          <View style={{ flexDirection: 'row' }}>
            <T style={{ fontSize: 14, color: C.grey }}>{`Articles (${totals.count})`}</T>
            <T style={{ fontSize: 14, marginLeft: 'auto' }}>{money(totals.retail)}</T>
          </View>
          {totals.savings > 0.004 && (
            <View style={{ flexDirection: 'row' }}>
              <T style={{ fontSize: 14, color: C.grey }}>Réduction prix de gros</T>
              <T w={500} style={{ fontSize: 14, marginLeft: 'auto', color: C.green2 }}>−{money(totals.savings)}</T>
            </View>
          )}
          <View style={{ flexDirection: 'row' }}>
            <T style={{ fontSize: 14, color: C.grey }}>Livraison</T>
            <T w={500} style={{ fontSize: 14, marginLeft: 'auto' }}>{totals.ship === 0 ? 'Gratuite' : money(totals.ship)}</T>
          </View>
          <View>
            <DashLine color={C.grey6} width={1} dash="3 3" />
            <View style={{ flexDirection: 'row', paddingTop: 10 }}>
              <T w={700} style={{ fontSize: 17 }}>Total</T>
              <T w={700} style={{ fontSize: 17, marginLeft: 'auto', color: C.red }}>{money(totals.total)}</T>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 + insets.bottom, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
        {!!error && <T w={500} accessibilityRole="alert" style={{ marginBottom: 8, fontSize: 13, color: C.red, textAlign: 'center' }}>{error}</T>}
        <Pressable disabled={connected && !canOrder} onPress={submit}
          accessibilityState={{ disabled: connected && !canOrder }}
          style={{ height: 54, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: !connected || canOrder ? C.red : C.redDisabled }}>
          {busy ? <ActivityIndicator color={C.white} /> : !connected && <Icon name="user" size={18} color={C.white} />}
          <T w={700} style={{ fontSize: 16, color: C.white }}>{label}</T>
        </Pressable>
      </View>
    </View>
  );
}
