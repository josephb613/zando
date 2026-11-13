import React from 'react';
import { ScrollView, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { C, T } from '../theme';
import { Header, Img, Pulse } from '../ui';
import { SkeletonTracking } from '../skeleton';
import { RootParams } from '../nav';
import { useOrders } from '../store';
import { money, plural, shortDate } from '../format';
import { ORIGIN, SHIPS } from '../delivery';
import { CASH } from '../payments';
import { STATUS_COLOR, orderSteps, statusLabel, stepLabel } from '../orderStatus';
import { CheckIcon, PinIcon, PlaneIcon } from '../icons';

const SECTION = { backgroundColor: C.white, paddingVertical: 14, paddingHorizontal: 16, gap: 10 } as const;

/** Suivi d'une commande : statut réel, étapes, articles, paiement et adresse, tels qu'enregistrés par le serveur. */
export default function Commande() {
  const route = useRoute<RouteProp<RootParams, 'Commande'>>();
  const { orders, ordersReady } = useOrders();
  const ready = ordersReady;
  const o = orders.find(x => x.ref === route.params.ref || x.id === route.params.ref);

  if (!o) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title={`Commande ${route.params.ref}`} />
        {ready
          ? <T style={{ padding: 24, fontSize: 15, color: C.grey, textAlign: 'center' }}>Commande introuvable sur ce compte.</T>
          : <SkeletonTracking />}
      </View>
    );
  }

  const cancelled = o.status === 'cancelled';
  const steps = orderSteps(o);
  const cur = steps.indexOf(o.status);
  const accent = o.kin ? C.green : C.blue;
  const subtotal = o.lines.reduce((n, l) => n + (l.unit ?? 0) * l.qty, 0);
  const ship = o.shipIndex !== undefined ? SHIPS[o.shipIndex]?.label : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`Commande ${o.ref}`} />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
        <View style={SECTION}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {o.kin ? <PinIcon size={13} color={C.green} /> : <PlaneIcon size={13} color={C.blue} />}
            <T w={600} style={{ fontSize: 12, color: accent }}>{ORIGIN[o.kin ? 'kin' : 'cn'].long}</T>
          </View>
          <T w={600} style={{ fontSize: 20, color: STATUS_COLOR[o.status] }}>{statusLabel(o.status, o.kin)}</T>
          {!!o.createdAt && <T style={{ fontSize: 13, color: C.grey }}>Passée le {shortDate(o.createdAt)}</T>}
        </View>

        {!cancelled && (
          <View style={SECTION}>
            {steps.map((s, i) => {
              const done = i < cur || o.status === 'delivered';
              const current = i === cur && o.status !== 'delivered';
              return (
                <View key={s} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center', width: 22 }}>
                    <View style={{ width: 22, height: 22 }}>
                      {current && <Pulse size={22} style={{ left: 0, top: 0 }} />}
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done || current ? accent : C.white, borderWidth: 2, borderColor: done || current ? accent : C.grey6, alignItems: 'center', justifyContent: 'center' }}>
                        {done && <CheckIcon size={12} color={C.white} />}
                        {current && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.white }} />}
                      </View>
                    </View>
                    {i < steps.length - 1 && <View style={{ flex: 1, width: 2, minHeight: 18, backgroundColor: done ? accent : C.line }} />}
                  </View>
                  <T w={current ? 600 : 400} style={{ flex: 1, paddingTop: 1, paddingBottom: 14, fontSize: 14, color: current ? accent : done ? C.ink : C.grey4 }}>{stepLabel(s, o.kin)}</T>
                </View>
              );
            })}
          </View>
        )}

        <View style={SECTION}>
          <T w={500} style={{ fontSize: 15 }}>{plural(o.count, 'article')}</T>
          {o.lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', backgroundColor: C.bg }}>
                <Img uri={l.img} style={{ width: 52, height: 52 }} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T numberOfLines={1} style={{ fontSize: 14 }}>{l.name ?? 'Article'}</T>
                <T style={{ fontSize: 12, color: C.grey }}>{[l.variant, l.unit !== undefined ? `${l.qty} × ${money(l.unit)}` : `× ${l.qty}`].filter(Boolean).join(' · ')}</T>
              </View>
            </View>
          ))}
          <View style={{ gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.bg }}>
            {subtotal > 0 && (
              <View style={{ flexDirection: 'row' }}>
                <T style={{ fontSize: 13, color: C.grey }}>Articles</T>
                <T style={{ marginLeft: 'auto', fontSize: 13 }}>{money(subtotal)}</T>
              </View>
            )}
            <View style={{ flexDirection: 'row' }}>
              <T style={{ fontSize: 13, color: C.grey }}>{ship ?? 'Livraison'}</T>
              <T style={{ marginLeft: 'auto', fontSize: 13 }}>{o.ship === 0 ? 'Gratuite' : money(o.ship)}</T>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <T w={700} style={{ fontSize: 15 }}>Total</T>
              <T w={700} style={{ marginLeft: 'auto', fontSize: 15, color: C.red }}>{money(o.total)}</T>
            </View>
          </View>
        </View>

        <View style={SECTION}>
          <T w={500} style={{ fontSize: 15 }}>Paiement</T>
          <T style={{ fontSize: 13, color: C.inkSoft }}>
            {o.payMethod === CASH ? 'À la livraison, en espèces' : [o.payMethod, o.payPhone].filter(Boolean).join(' · ')}
          </T>
        </View>

        {!!o.address && (
          <View style={SECTION}>
            <T w={500} style={{ fontSize: 15 }}>Livraison</T>
            <T style={{ fontSize: 13, lineHeight: 19, color: C.inkSoft }}>{`${o.address.name} · ${o.address.phone}`}</T>
            <T style={{ fontSize: 13, lineHeight: 19, color: C.inkSoft }}>{[o.address.line, o.address.commune, o.address.landmark].filter(Boolean).join(' · ')}</T>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
