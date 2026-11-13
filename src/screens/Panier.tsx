import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Img, Appear, Tap as Pressable, Grad, Pop } from '../ui';
import { SkeletonCartRow } from '../skeleton';
import { useNav, useOpenProduct } from '../nav';
import { CartItem, selectedQty, unitPrice, useAddresses, useAuth, useCart, useCatalog } from '../store';
import { currentPrice } from '../catalog';
import { FREE_SHIP, ORIGIN, shipPrice, zoneOf } from '../delivery';
import { money, plural } from '../format';
import { CheckIcon, Chevron, Icon, PinIcon, PlaneIcon } from '../icons';

function CheckDot({ on }: { on: boolean }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: on ? C.red : C.grey7, backgroundColor: on ? C.red : C.white, alignItems: 'center', justifyContent: 'center' }}>
      <CheckIcon size={12} />
    </View>
  );
}
function Check({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: on }} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <CheckDot on={on} />
    </Pressable>
  );
}

function Item({ it }: { it: CartItem & { p: NonNullable<CartItem['p']> } }) {
  const { items, setQty, setSelected, remove } = useCart();
  const open = useOpenProduct();
  const { p } = it;
  const total = selectedQty(items, it.k);
  const unit = unitPrice(p, total);
  const gros = unit < currentPrice(p);
  const next = p.t.find(([min]) => total < min);
  const miss = next ? next[0] - total : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingRight: 12, paddingBottom: 12, paddingLeft: 4, borderTopWidth: 1, borderTopColor: C.bg }}>
      <Check on={it.selected} label={'Commander ' + p.n} onPress={() => setSelected([it.id], !it.selected)} />
      <Pressable onPress={() => open(p.k)} accessibilityLabel={p.n} style={{ width: 88, height: 88, borderRadius: 6, overflow: 'hidden', backgroundColor: C.bg }}>
        <Img uri={p.b} style={{ width: 88, height: 88 }} />
      </Pressable>
      <View style={{ flex: 1, gap: 5, paddingLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
          <T numberOfLines={1} style={{ flex: 1, fontSize: 14, lineHeight: 19 }}>{p.n}</T>
          <Pressable onPress={() => remove([it.id])} accessibilityLabel={'Retirer ' + p.n} style={{ width: 28, height: 28, marginTop: -5, marginRight: -8, marginBottom: -4, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={14} color={C.grey5} weight={0.95} />
          </Pressable>
        </View>
        <View style={{ alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 4, backgroundColor: C.bg }}>
          <T style={{ fontSize: 12, color: C.grey }}>{it.variant}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <View style={{ gap: 1, flexShrink: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Pop trigger={unit}><T w={600} style={{ fontSize: 17, color: C.red }}>{money(unit)}</T></Pop>
              {gros && <T style={{ fontSize: 12, color: C.grey5, textDecorationLine: 'line-through' }}>{money(currentPrice(p))}</T>}
            </View>
            {gros && (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 3, backgroundColor: '#2A2A2E' }}>
                <T w={500} numberOfLines={1} style={{ fontSize: 10, lineHeight: 16, color: C.gold }}>Prix de gros</T>
              </View>
            )}
          </View>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => setQty(it.id, it.qty - 1)} disabled={it.qty <= 1} accessibilityLabel="Diminuer" style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 18, lineHeight: 20, color: it.qty > 1 ? C.ink : C.grey6 }}>−</T>
            </Pressable>
            <T w={500} style={{ minWidth: 32, textAlign: 'center', fontSize: 14 }}>{it.qty}</T>
            <Pressable onPress={() => setQty(it.id, it.qty + 1)} accessibilityLabel="Augmenter" style={{ width: 30, height: 30, borderRadius: 4, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
              <T style={{ fontSize: 18, lineHeight: 20 }}>+</T>
            </Pressable>
          </View>
        </View>
        {it.selected && next && miss > 0 && (
          <Pressable onPress={() => setQty(it.id, it.qty + miss)} style={{ alignSelf: 'flex-start', minHeight: 24, justifyContent: 'center' }}>
            <T numberOfLines={1} style={{ fontSize: 12, color: C.grey }}>
              {`Encore ${miss} pour ${money(next[1])} l’unité`}
              <T w={500} style={{ fontSize: 12, color: C.red }}>{'  Ajouter'}</T>
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function Panier() {
  const { items, totals, itemCount, setSelected, remove, commune } = useCart();
  const { connected } = useAuth();
  const { address } = useAddresses();
  const { catalogReady } = useCatalog();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const ready = catalogReady;

  const available = items.filter((it): it is CartItem & { p: NonNullable<CartItem['p']> } => !!it.p);
  const gone = items.filter(it => !it.p);
  const allSelected = available.length > 0 && available.every(it => it.selected);
  // Livraison standard : offerte dès FREE_SHIP en zone 0, prix fixe ailleurs.
  const zone0 = zoneOf(commune) === 0;
  const std = shipPrice(0, commune, totals.subtotal) ?? 0;
  const shipMsg = std === 0
    ? 'Livraison standard offerte'
    : zone0
      ? `Plus que ${money(FREE_SHIP - totals.subtotal)} pour la livraison standard offerte`
      : `Livraison standard ${money(std)} vers ${commune}`;
  const shipPct = zone0 ? Math.min(100, Math.round((totals.subtotal / FREE_SHIP) * 100)) : 100;
  const shipColor = std === 0 ? C.green2 : C.redShadow;
  const where = connected && address ? `${commune} · ${address.line}` : commune;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top, paddingBottom: 10, backgroundImage: 'linear-gradient(180deg, #FFE3D3 0%, #FFF3EC 60%, #FFFFFF 100%)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 14 }}>
          <T w={700} accessibilityRole="header" style={{ fontSize: 24 }}>Panier</T>
          {itemCount > 0 && (
            <View style={{ paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999, backgroundColor: C.red }}>
              <T w={600} style={{ fontSize: 12, color: C.white }}>{plural(itemCount, 'article')}</T>
            </View>
          )}
        </View>
        <Pressable onPress={() => (connected ? nav.navigate('Adresses', { pick: true }) : nav.navigate('Commune'))} accessibilityLabel="Changer le lieu de livraison" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, marginHorizontal: 12, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.white }}>
          <PinIcon size={14} color={C.red} />
          <T numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, color: C.grey }}>{'Livrer à ' + where}</T>
          <Chevron size={13} color={C.grey5} width={2} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
        {!ready && items.length > 0 && (
          <View style={{ marginHorizontal: 8, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden' }}>
            {items.slice(0, 3).map(it => <SkeletonCartRow key={it.id} />)}
          </View>
        )}

        {ready && totals.count > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, paddingHorizontal: 14, backgroundColor: std === 0 ? C.greenPale : C.redSoft }}>
            <Icon name="truck" size={18} color={shipColor} weight={0.9} knockout={std === 0 ? C.greenPale : C.redSoft} />
            <T numberOfLines={1} style={{ flex: 1, fontSize: 13, color: shipColor }}>{shipMsg}</T>
            <View style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${shipPct}%`, backgroundColor: shipColor }} />
          </View>
        )}

        {ready && (['kin', 'cn'] as const).map(o => {
          const group = available.filter(it => it.p.o === o);
          if (!group.length) return null;
          const allSel = group.every(it => it.selected);
          const name = o === 'kin' ? 'En stock à Kinshasa' : 'Import Chine';
          return (
            <View key={o} style={{ marginHorizontal: 8, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 4, paddingRight: 12 }}>
                <Check on={allSel} label={'Tout cocher : ' + name} onPress={() => setSelected(group.map(it => it.id), !allSel)} />
                {o === 'kin' ? <PinIcon size={14} /> : <PlaneIcon size={14} />}
                <T w={500} style={{ fontSize: 14 }}>{name}</T>
                <T style={{ marginLeft: 'auto', fontSize: 12, color: C.grey4 }}>{ORIGIN[o].delay}</T>
              </View>
              {group.map((it, i) => <Appear key={it.id} i={i}><Item it={it} /></Appear>)}
            </View>
          );
        })}

        {ready && gone.length > 0 && (
          <View style={{ marginHorizontal: 8, borderRadius: 10, backgroundColor: C.white, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 14 }}>
              <T w={500} style={{ fontSize: 14 }}>{gone.length > 1 ? 'Articles retirés du catalogue' : 'Article retiré du catalogue'}</T>
              <Pressable onPress={() => remove(gone.map(it => it.id))} style={{ marginLeft: 'auto', minHeight: 44, justifyContent: 'center' }}>
                <T w={600} style={{ fontSize: 13, color: C.red }}>Retirer</T>
              </Pressable>
            </View>
          </View>
        )}

        {items.length === 0 && (
          <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 28, backgroundColor: C.white, alignItems: 'center', gap: 8 }}>
            <Icon name="basket" size={64} color={C.grey6} weight={0.75} />
            <T w={500} style={{ fontSize: 16, textAlign: 'center' }}>Votre panier est vide</T>
            <Pressable onPress={() => nav.popTo('Tabs', { screen: 'Accueil' })} style={{ marginTop: 8, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
              <T w={500} style={{ fontSize: 14, color: C.white }}>Voir les articles</T>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {ready && available.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6, paddingRight: 12, paddingBottom: 10, paddingLeft: 4, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line }}>
          <Pressable onPress={() => setSelected(available.map(it => it.id), !allSelected)} accessibilityRole="checkbox" accessibilityState={{ checked: allSelected }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingLeft: 9, paddingRight: 6 }}>
            <CheckDot on={allSelected} />
            <T style={{ fontSize: 14 }}>Tout</T>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 1, paddingRight: 8 }}>
            <Pop trigger={`${totals.subtotal}|${totals.count}`}>
              <T w={600} style={{ fontSize: 19, color: C.red }}>{money(totals.subtotal)}</T>
            </Pop>
            <T numberOfLines={1} style={{ fontSize: 11, color: totals.savings > 0.004 ? C.green2 : C.grey }}>
              {totals.savings > 0.004 ? `Prix de gros −${money(totals.savings)}` : 'Hors livraison'}
            </T>
          </View>
          <Pressable disabled={totals.count === 0} accessibilityState={{ disabled: totals.count === 0 }} onPress={() => nav.navigate('Paiement')} style={{ height: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: 999, overflow: 'hidden', backgroundColor: totals.count > 0 ? undefined : C.grey7 }}>
            {totals.count > 0 && <Grad from={C.brandLight} to={C.red} radius={999} />}
            <T w={500} numberOfLines={1} style={{ fontSize: 15, color: C.white }}>{`Commander (${totals.count})`}</T>
          </Pressable>
        </View>
      )}
    </View>
  );
}
