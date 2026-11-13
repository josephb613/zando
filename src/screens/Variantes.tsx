import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, TextInput, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, T } from '../theme';
import { Img, Tap as Pressable } from '../ui';
import { RootParams, useNav } from '../nav';
import { isDeliverable, selectedQty, unitPrice, useAddresses, useCart, useCatalog, useLots } from '../store';
import { SIZES, currentPrice } from '../catalog';
import { ORIGIN } from '../delivery';
import { money, plural } from '../format';
import { LOT_HOURS, lotTier } from '../shared/lots';
import { MAX_QTY } from '../shared/pricing';
import { CloseIcon, PinIcon, PlaneIcon } from '../icons';

const STANDARD = 'Standard';

/** Quantité d'une taille : −, champ numérique, +. */
function Stepper({ label, value, max = MAX_QTY, onChange }: { label: string; value: number; max?: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, Math.min(max, v)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line2, borderRadius: 10, overflow: 'hidden' }}>
      <Pressable onPress={() => set(value - 1)} disabled={value === 0} accessibilityLabel={'Diminuer ' + label} style={{ width: 40, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
        <T style={{ fontSize: 20, color: value > 0 ? C.ink : C.grey7 }}>−</T>
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={t => set(Number(t.replace(/\D/g, '')) || 0)}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={'Quantité ' + label}
        style={{ width: 48, height: 38, padding: 0, textAlign: 'center', fontSize: 15, color: value > 0 ? C.ink : C.grey5, fontFamily: 'InstrumentSans_600SemiBold', outlineStyle: 'none' } as never}
      />
      <Pressable onPress={() => set(value + 1)} disabled={value >= max} accessibilityLabel={'Augmenter ' + label} style={{ width: 40, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white }}>
        <T style={{ fontSize: 20, color: value < max ? C.ink : C.grey7 }}>+</T>
      </Pressable>
    </View>
  );
}

/**
 * Feuille de choix des tailles et quantités, ouverte depuis la fiche produit, les résultats ou les lots.
 * Mode `lot` : les pièces sont réservées dans le lot groupé de l'article, au prix du lot, sans paiement.
 */
export default function Variantes() {
  const route = useRoute<RouteProp<RootParams, 'Variantes'>>();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { byKey } = useCatalog();
  const { add, items } = useCart();
  const { lotOf, reserve } = useLots();
  const { address } = useAddresses();
  const buy = route.params.buy === true;
  const p = byKey.get(route.params.id);
  const tier = p ? lotTier(p.t) : null;
  const lotMode = route.params.lot === true && !!tier;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sizes = p ? SIZES[p.kd] : undefined;
  const labels = sizes?.values ?? [STANDARD];
  /** Quantité choisie par taille (ou « Standard » sans taille). */
  const [q, setQ] = useState<Record<string, number>>({});
  const qty = (label: string) => q[label] ?? 0;
  const up = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(up, { toValue: 1, speed: 14, bounciness: 4, useNativeDriver: true }).start();
  }, [up]);

  const close = () => nav.goBack();
  const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: [{ translateY: up.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }] } as const;

  if (!p) {
    return (
      <View style={{ flex: 1 }}>
        <Pressable scale={1} accessibilityLabel="Fermer" onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <Animated.View style={[sheet, { padding: 24, paddingBottom: 24 + insets.bottom, gap: 14, alignItems: 'center' }]}>
          <T w={600} style={{ fontSize: 16 }}>Cet article n’est plus disponible.</T>
          <Pressable onPress={close} style={{ minHeight: 44, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 999, backgroundColor: C.red }}>
            <T w={600} style={{ fontSize: 14, color: C.white }}>Fermer</T>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  const chosen = labels.reduce((a, label) => a + qty(label), 0);
  // Ajout au panier : le palier tient compte des pièces de cet article déjà cochées au panier.
  const already = buy || lotMode ? 0 : selectedQty(items, p.k);
  const n = chosen + already;
  // Lot groupé : taille et prix du lot ouvert, sinon ceux du premier palier de gros.
  const lot = lotMode ? lotOf.get(p.k) : undefined;
  const target = lot?.target ?? tier?.[0] ?? 0;
  const taken = lot?.taken ?? 0;
  const left = target - taken;
  const unit = lotMode ? lot?.unit ?? tier?.[1] ?? currentPrice(p) : unitPrice(p, n);
  const ti = p.t.reduce((t, [min], i) => (n >= min ? i : t), 0);
  const next = p.t[ti + 1];
  const pct = next ? Math.min(100, Math.round((n / next[0]) * 100)) : 100;
  const gros = unit < currentPrice(p);
  const kin = p.o === 'kin';
  const hint = chosen === 0
    ? (sizes ? `Choisissez au moins une ${sizes.label.toLowerCase()}.` : 'Choisissez une quantité.')
    : next
      ? `Encore ${plural(next[0] - n, 'pièce')} pour passer à ${money(next[1])} / pièce`
      : `Meilleur prix atteint : ${money(unit)} / pièce`;

  const reserveLot = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await reserve(p.k, labels.flatMap(variant => (qty(variant) > 0 ? [{ variant, qty: qty(variant) }] : [])));
      // Lot complété par cette réservation : la commande à payer existe déjà.
      if (res.ref) nav.replace('Commande', { ref: res.ref });
      else nav.goBack();
    } catch (e) {
      setError((e as Error).message || 'Échec, réessayez.');
      setBusy(false);
    }
  };

  const confirm = () => {
    add(labels.flatMap(variant => (qty(variant) > 0 ? [{ k: p.k, variant, qty: qty(variant) }] : [])), buy);
    if (buy) nav.replace('Paiement');
    else nav.popTo('Tabs', { screen: 'Panier' });
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable scale={1} accessibilityLabel="Fermer" onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />

      <Animated.View accessibilityLabel={sizes ? `Choisir la ${sizes.label.toLowerCase()} et la quantité` : 'Choisir la quantité'} style={[sheet, { top: Math.max(84, insets.top + 40) }]}>
        <View style={{ flexDirection: 'row', gap: 12, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ width: 92, height: 92, borderRadius: 10, overflow: 'hidden', backgroundColor: C.bg }}>
            <Img uri={p.b} style={{ width: 92, height: 92 }} />
          </View>
          <View style={{ flex: 1, gap: 4, paddingRight: 34 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T w={600} style={{ fontSize: 26, color: gros ? C.green : C.red }}>{money(unit)}</T>
              <T w={500} style={{ fontSize: 13, color: gros ? C.green : C.red }}>/ pièce</T>
            </View>
            {gros && (
              <View style={{ alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4, backgroundColor: C.greenSoft }}>
                <T w={600} style={{ fontSize: 12, color: C.green }}>{lotMode ? `Prix du lot de ${target}` : 'Prix de gros appliqué'}</T>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {kin ? <PinIcon size={13} /> : <PlaneIcon size={13} />}
              <T w={500} style={{ fontSize: 12, color: kin ? C.green : C.blue }}>{ORIGIN[p.o].long}</T>
            </View>
          </View>
          <Pressable accessibilityLabel="Fermer" onPress={close} style={{ position: 'absolute', top: 4, right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <CloseIcon size={20} color={C.ink} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 12 }}>
          <View>
            <T w={600} style={{ fontSize: 14, marginBottom: 2 }}>{sizes ? `${sizes.label} et quantité` : 'Quantité'}</T>
            {labels.map(label => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, borderBottomWidth: 1, borderBottomColor: C.bg2 }}>
                {sizes ? (
                  <View style={{ width: 46, height: 36, borderRadius: 8, backgroundColor: qty(label) > 0 ? C.redSoft : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <T w={600} style={{ fontSize: 14, color: qty(label) > 0 ? C.red : C.ink }}>{label}</T>
                  </View>
                ) : <T style={{ fontSize: 14, color: C.grey }}>Pièces</T>}
                <View style={{ marginLeft: 'auto' }}>
                  <Stepper label={label} value={qty(label)} max={lotMode ? left - (chosen - qty(label)) : MAX_QTY} onChange={v => setQ(cur => ({ ...cur, [label]: v }))} />
                </View>
              </View>
            ))}
            {already > 0 && <T style={{ marginTop: 8, fontSize: 13, color: C.grey }}>{`Déjà au panier : ${plural(already, 'pièce')}`}</T>}
          </View>

          {lotMode && (
            <View style={{ gap: 5 }}>
              <View style={{ height: 6, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: C.green, width: `${Math.round(((taken + chosen) / target) * 100)}%` }} />
              </View>
              <T w={500} style={{ fontSize: 13, color: chosen === left ? C.green : C.ink }}>
                {chosen === left ? 'Votre réservation complète le lot.' : `${taken + chosen} sur ${target} pièces réservées`}
              </T>
              <T style={{ fontSize: 13, lineHeight: 18, color: C.grey }}>
                {`Rien à payer maintenant. Vous payez ${money(unit)} la pièce quand le lot est complet ; s’il ne l’est pas ${lot ? 'à l’échéance' : `sous ${LOT_HOURS} h`}, la réservation s’annule.`}
              </T>
            </View>
          )}
          {!lotMode && p.t.length > 1 && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {p.t.map(([min, price], i) => {
                  const a = i === ti;
                  return (
                    <View key={min} style={{ flex: 1, alignItems: 'center', gap: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, borderColor: a ? C.green : C.line, backgroundColor: a ? C.greenSoft2 : C.white }}>
                      <T w={600} style={{ fontSize: 15, color: a ? C.green : C.ink }}>{money(price)}</T>
                      <T style={{ fontSize: 11, color: C.grey }}>{i === 0 ? 'à l’unité' : `dès ${min}`}</T>
                    </View>
                  );
                })}
              </View>
              <View style={{ gap: 5 }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: C.line, overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: C.green, width: `${pct}%` }} />
                </View>
                <T w={500} style={{ fontSize: 13, color: next ? C.ink : C.green }}>{hint}</T>
              </View>
            </View>
          )}
          {!lotMode && p.t.length < 2 && chosen === 0 && <T w={500} style={{ fontSize: 13 }}>{hint}</T>}
        </ScrollView>

        <View style={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: C.line, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <T w={500} style={{ fontSize: 14 }}>{plural(chosen, 'pièce')}</T>
            {gros && chosen > 0 && (
              <View style={{ paddingVertical: 1, paddingHorizontal: 7, borderRadius: 4, backgroundColor: C.greenSoft }}>
                <T w={600} style={{ fontSize: 12, color: C.green }}>{'−' + money(chosen * (currentPrice(p) - unit))}</T>
              </View>
            )}
            <T w={600} style={{ marginLeft: 'auto', fontSize: 20 }}>{money(chosen * unit)}</T>
          </View>
          {lotMode && isDeliverable(address) && (
            <Pressable onPress={() => nav.navigate('Adresses', { pick: true })} accessibilityLabel="Changer l’adresse de livraison" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
              <PinIcon size={14} color={C.grey} />
              <T numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.grey }}>{`${address.line}, ${address.commune}`}</T>
              <T w={600} style={{ fontSize: 13, color: C.red }}>Changer</T>
            </Pressable>
          )}
          {!!error && <T w={500} accessibilityLiveRegion="polite" style={{ fontSize: 13, color: C.red }}>{error}</T>}
          {lotMode && !isDeliverable(address) ? (
            <Pressable onPress={() => nav.navigate('Adresse')} style={{ height: 50, borderRadius: 999, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
              <T w={600} style={{ fontSize: 16, color: C.white }}>Ajouter une adresse de livraison</T>
            </Pressable>
          ) : (
            <Pressable disabled={chosen === 0 || busy} accessibilityState={{ disabled: chosen === 0 || busy, busy }} onPress={lotMode ? reserveLot : confirm} style={{ height: 50, borderRadius: 999, backgroundColor: chosen === 0 ? C.redDisabled : C.red, alignItems: 'center', justifyContent: 'center' }}>
              {busy
                ? <ActivityIndicator color={C.white} />
                : <T w={600} style={{ fontSize: 16, color: C.white }}>{lotMode ? (lot ? 'Réserver dans le lot' : 'Ouvrir le lot') : buy ? 'Acheter' : 'Ajouter au panier'}</T>}
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
