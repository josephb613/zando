import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Header, Appear, Tap as Pressable, Thumb } from '../ui';
import { SkeletonOrderCard } from '../skeleton';
import { RootParams, useNav } from '../nav';
import { useOrders } from '../store';
import { money, plural, shortDate } from '../format';
import type { Order } from '../firebase';
import { GROUP_TABS, ORDER_GROUP, OrderGroup, STATUS_COLOR, orderSteps, statusLabel } from '../orderStatus';
import { Chevron, PinIcon, PlaneIcon } from '../icons';

type Tab = 'all' | OrderGroup;

function OrderCard({ o, onOpen }: { o: Order; onOpen: () => void }) {
  const color = STATUS_COLOR[o.status];
  const steps = orderSteps(o);
  const at = steps.indexOf(o.status);
  const progress = o.status === 'cancelled' || at < 0 ? 0 : Math.round((at / (steps.length - 1)) * 100);
  return (
    <Pressable onPress={onOpen} accessibilityLabel={`Commande ${o.ref}, ${statusLabel(o.status, o.kin)}`} style={{ borderRadius: 14, backgroundColor: C.white, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: o.kin ? C.greenSoft : C.blueSoft }}>
        {o.kin ? <PinIcon size={13} color={C.green} /> : <PlaneIcon size={13} color={C.blue} />}
        <T w={600} style={{ fontSize: 12, color: o.kin ? C.green : C.blue }}>{o.kin ? 'Stock Kinshasa' : 'Import Chine'}</T>
        <T style={{ marginLeft: 'auto', fontSize: 12, color: C.grey }}>{`N° ${o.ref}${o.createdAt ? ' · ' + shortDate(o.createdAt) : ''}`}</T>
      </View>
      <View style={{ gap: 10, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 9, height: 9, flexShrink: 0, borderRadius: 4.5, backgroundColor: color }} />
          <T w={600} style={{ fontSize: 15, color }}>{statusLabel(o.status, o.kin)}</T>
          <View style={{ marginLeft: 'auto' }}><Chevron size={16} color={C.grey4} /></View>
        </View>
        {progress > 0 && (
          <View style={{ height: 5, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden', flexDirection: 'row' }}>
            <View style={{ width: `${progress}%`, backgroundColor: color, borderRadius: 999 }} />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8 }}>
            {o.lines.map((l, i) => <Thumb key={i} img={l.img} qty={l.qty} size={56} />)}
          </ScrollView>
          <View style={{ alignItems: 'flex-end', gap: 1 }}>
            <T style={{ fontSize: 12, color: C.grey }}>{plural(o.count, 'article')}</T>
            <T w={600} style={{ fontSize: 16 }}>{money(o.total)}</T>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function Commandes() {
  const route = useRoute<RouteProp<RootParams, 'Commandes'>>();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [chosen, setTab] = useState<Tab | null>(null);
  const tab: Tab = chosen ?? route.params?.tab ?? 'all';
  const { orders, ordersReady } = useOrders();
  const ready = ordersReady;
  const counts = useMemo(() => {
    const c: Partial<Record<OrderGroup, number>> = {};
    for (const o of orders) c[ORDER_GROUP[o.status]] = (c[ORDER_GROUP[o.status]] ?? 0) + 1;
    return c;
  }, [orders]);
  const list = orders.filter(o => tab === 'all' || ORDER_GROUP[o.status] === tab);
  const tabs: [Tab, string][] = [['all', 'Toutes'], ...GROUP_TABS];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mes commandes" border={false} />
      <View style={{ backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 4 }}>
          {tabs.map(([id, label]) => {
            const a = id === tab;
            const n = id === 'all' ? 0 : counts[id] ?? 0;
            return (
              <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: a }} onPress={() => setTab(id)} style={{ height: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <T w={a ? 600 : 400} style={{ fontSize: 13, color: a ? C.red : C.inkSoft }}>{label}</T>
                {n > 0 && (id === 'pay' || id === 'prep' || id === 'route') && (
                  <View style={{ minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 999, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                    <T w={600} style={{ fontSize: 10, color: C.white }}>{n}</T>
                  </View>
                )}
                <View style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: a ? C.red : 'transparent' }} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10, paddingHorizontal: 10, paddingBottom: 14 + insets.bottom }}>
        {ready
          ? list.map((o, i) => <Appear key={o.id} i={i}><OrderCard o={o} onOpen={() => nav.navigate('Commande', { ref: o.ref })} /></Appear>)
          : [0, 1, 2].map(i => <SkeletonOrderCard key={i} />)}
        {ready && list.length === 0 && (
          <View style={{ marginTop: 60, alignItems: 'center', gap: 12 }}>
            <T w={600} style={{ fontSize: 16, textAlign: 'center' }}>{orders.length ? 'Aucune commande dans cet onglet' : 'Aucune commande'}</T>
            {!orders.length && (
              <Pressable onPress={() => nav.popTo('Tabs', { screen: 'Accueil' })} style={{ minHeight: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
                <T w={600} style={{ fontSize: 14, color: C.white }}>Voir les articles</T>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
