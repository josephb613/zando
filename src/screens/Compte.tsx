import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Tap as Pressable, Thumb } from '../ui';
import { useNav } from '../nav';
import { useAddresses, useAuth, useOrders } from '../store';
import { signOut } from '../firebase';
import { Chevron, Icon, IconName } from '../icons';
import { GROUP_TABS, ORDER_GROUP, OrderGroup, statusLabel } from '../orderStatus';
import { plural } from '../format';
import { AccountGate } from './Compte.parts';
import { ACCOUNT_GATE } from '../env';

const GROUP_ICONS: Partial<Record<OrderGroup, IconName>> = { pay: 'wallet', prep: 'box', route: 'truck', done: 'checkCircle' };

/** « +243970000000 » -> « +243 97 000 0000 » (format RDC) ; autres indicatifs : numéro tel quel. */
const prettyPhone = (e164: string) => {
  const m = /^\+243(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `+243 ${m[1]} ${m[2]} ${m[3]}` : e164;
};

function Row({ label, value, onPress, color = C.ink }: { label: string; value?: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingLeft: 16, paddingRight: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.bg }}>
      <T style={{ fontSize: 16, color }}>{label}</T>
      {!!value && <T numberOfLines={1} style={{ marginLeft: 'auto', flexShrink: 1, fontSize: 14, color: C.grey4 }}>{value}</T>}
      <View style={value ? undefined : { marginLeft: 'auto' }}><Chevron size={16} color={C.grey7} /></View>
    </Pressable>
  );
}

export default function Compte() {
  const { user, connected, commune } = useAuth();
  const { orders } = useOrders();
  const { addresses } = useAddresses();
  const nav = useNav();
  const insets = useSafeAreaInsets();

  if (!connected && ACCOUNT_GATE) return <AccountGate />;

  const count = (g: OrderGroup) => orders.filter(o => ORDER_GROUP[o.status] === g).length;
  // Commande à suivre : la plus récente qui n'est ni livrée ni annulée.
  const active = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const logout = () => {
    signOut().catch(() => {});
    nav.reset({ index: 0, routes: [{ name: 'Connexion' }] });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 16, paddingBottom: 16, gap: 4, backgroundImage: 'linear-gradient(180deg, #FFE3D3 0%, #FFF3EC 60%, #FFFFFF 100%)' }}>
          <T w={700} accessibilityRole="header" style={{ fontSize: 22 }}>{connected ? prettyPhone(user?.phoneNumber ?? '') : 'Visiteur'}</T>
          {!connected && (
            <Pressable onPress={() => nav.navigate('Connexion', { next: 'Compte' })} style={{ alignSelf: 'flex-start', marginTop: 8, minHeight: 40, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
              <T w={600} style={{ fontSize: 14, color: C.white }}>Se connecter</T>
            </Pressable>
          )}
        </View>

        {connected && (
          <View style={{ marginTop: -8, backgroundColor: C.white }}>
            <Pressable onPress={() => nav.navigate('Commandes')} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingLeft: 16, paddingRight: 10 }}>
              <T style={{ fontSize: 16 }}>Mes commandes</T>
              <T style={{ marginLeft: 'auto', fontSize: 14, color: C.grey5 }}>{orders.length ? plural(orders.length, 'commande') : ''}</T>
              <Chevron size={16} color={C.grey7} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 4, paddingTop: 6, paddingHorizontal: 4, paddingBottom: 10 }}>
              {GROUP_TABS.filter(([g]) => GROUP_ICONS[g]).map(([g, label]) => {
                const n = count(g);
                return (
                  <Pressable key={g} onPress={() => nav.navigate('Commandes', { tab: g })} accessibilityLabel={`${label} : ${n}`} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 6, minHeight: 56 }}>
                    <View>
                      <Icon name={GROUP_ICONS[g] as IconName} size={28} color={C.grey2} weight={0.75} />
                      {n > 0 && g !== 'done' && (
                        <View style={{ position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 999, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                          <T w={500} style={{ fontSize: 10, lineHeight: 12, color: C.white }}>{n}</T>
                        </View>
                      )}
                    </View>
                    <T numberOfLines={1} style={{ fontSize: 12, color: C.greyIcon }}>{label}</T>
                  </Pressable>
                );
              })}
            </View>
            {active && (
              <Pressable onPress={() => nav.navigate('Commande', { ref: active.ref })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 12, padding: 8, borderRadius: 8, backgroundColor: C.bg }}>
                {!!active.lines[0] && <Thumb img={active.lines[0].img} qty={active.lines[0].qty} size={40} />}
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <T numberOfLines={1} style={{ fontSize: 13 }}>{statusLabel(active.status, active.kin)}</T>
                  <T style={{ fontSize: 12, color: C.grey4 }}>{`Commande ${active.ref} · ${plural(active.count, 'article')}`}</T>
                </View>
                <Chevron size={16} color={C.grey7} />
              </Pressable>
            )}
          </View>
        )}

        <View>
          {connected && <Row label="Mes adresses" value={addresses.length ? String(addresses.length) : ''} onPress={() => nav.navigate('Adresses')} />}
          {(!connected || addresses.length === 0) && <Row label="Zone de livraison" value={commune} onPress={() => nav.navigate('Commune')} />}
        </View>

        {connected && (
          <Pressable onPress={logout} style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
            <T style={{ fontSize: 16, color: C.red }}>Se déconnecter</T>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
